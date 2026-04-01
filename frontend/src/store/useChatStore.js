import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import { fetchWithCache, invalidateApiCache } from "../lib/apiCache";

const CONTACTS_CACHE_TTL_MS = 60_000;
const CHATS_CACHE_TTL_MS = 20_000;
const MESSAGES_CACHE_TTL_MS = 15_000;

const normalizeCollection = (data, primaryKey) =>
  data?.[primaryKey] ??
  data?.users ??
  data?.data ??
  (Array.isArray(data) ? data : []);

const isFresh = (timestamp, ttlMs) =>
  typeof timestamp === "number" && Date.now() - timestamp < ttlMs;

const buildMessagesCacheKey = (viewerId, userId, params) =>
  `messages:${viewerId}:${userId}:${params.toString()}`;

const getConversationSnapshotKey = (viewerId, userId) =>
  `${viewerId}:${userId}`;

const invalidateConversationCache = (viewerId, userId) => {
  invalidateApiCache(`messages:${viewerId}:${userId}:`);
  invalidateApiCache(`messages:${userId}:${viewerId}:`);
};

export const useChatStore = create((set, get) => ({
  allContacts: [],
  contactsFetchedAt: 0,
  chats: [],
  chatsFetchedAt: 0,
  messages: [],
  conversationSnapshots: {},
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  oldestMessageCursor: null,
  hasMoreMessages: true,

  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    const nextValue = !get().isSoundEnabled;
    localStorage.setItem("isSoundEnabled", nextValue);
    set({ isSoundEnabled: nextValue });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedUser: (selectedUser) => {
    if (!selectedUser) {
      set({
        selectedUser: null,
        messages: [],
        oldestMessageCursor: null,
        hasMoreMessages: true,
        replyToMessage: null,
      });
      return;
    }

    const authUserId = useAuthStore.getState().authUser?._id;
    const snapshotKey = authUserId
      ? getConversationSnapshotKey(authUserId, selectedUser._id)
      : null;
    const snapshot = snapshotKey
      ? get().conversationSnapshots[snapshotKey]
      : null;

    if (snapshot && isFresh(snapshot.fetchedAt, MESSAGES_CACHE_TTL_MS)) {
      set({
        selectedUser,
        messages: snapshot.messages,
        oldestMessageCursor: snapshot.oldestMessageCursor,
        hasMoreMessages: snapshot.hasMoreMessages,
      });
      return;
    }

    set({
      selectedUser,
      messages: [],
      oldestMessageCursor: null,
      hasMoreMessages: true,
    });
  },

  replyToMessage: null,
  setReplyToMessage: (message) => set({ replyToMessage: message }),
  clearReplyToMessage: () => set({ replyToMessage: null }),

  getAllContacts: async () => {
    const { allContacts, contactsFetchedAt } = get();
    if (allContacts.length > 0 && isFresh(contactsFetchedAt, CONTACTS_CACHE_TTL_MS)) {
      return;
    }

    set({ isUsersLoading: true });
    try {
      const authUserId = useAuthStore.getState().authUser?._id ?? "guest";
      const data = await fetchWithCache(
        `contacts:${authUserId}`,
        async () => {
          const res = await axiosInstance.get("/messages/contacts");
          return res.data;
        },
        { ttlMs: CONTACTS_CACHE_TTL_MS }
      );
      const contactsArray = normalizeCollection(data, "contacts");
      set({ allContacts: contactsArray, contactsFetchedAt: Date.now() });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    const { chats, chatsFetchedAt } = get();
    if (chats.length > 0 && isFresh(chatsFetchedAt, CHATS_CACHE_TTL_MS)) {
      return;
    }

    set({ isUsersLoading: true });
    try {
      const authUserId = useAuthStore.getState().authUser?._id ?? "guest";
      const data = await fetchWithCache(
        `chats:${authUserId}`,
        async () => {
          const res = await axiosInstance.get("/messages/chats");
          return res.data;
        },
        { ttlMs: CHATS_CACHE_TTL_MS }
      );
      const chatsArray = normalizeCollection(data, "chats");
      set({ chats: chatsArray, chatsFetchedAt: Date.now() });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load chats");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  fetchMessagesByUserId: async (userId, reset = false) => {
    if (get().isMessagesLoading) return;

    const authUserId = useAuthStore.getState().authUser?._id ?? "guest";
    const snapshotKey = getConversationSnapshotKey(authUserId, userId);
    const snapshot = get().conversationSnapshots[snapshotKey];

    if (reset && snapshot && isFresh(snapshot.fetchedAt, MESSAGES_CACHE_TTL_MS)) {
      set({
        messages: snapshot.messages,
        oldestMessageCursor: snapshot.oldestMessageCursor,
        hasMoreMessages: snapshot.hasMoreMessages,
      });
      return;
    }

    if (reset) {
      set({ messages: [], oldestMessageCursor: null, hasMoreMessages: true });
    }

    const { messages, hasMoreMessages, oldestMessageCursor } = get();
    if (!hasMoreMessages) return;

    set({ isMessagesLoading: true });

    try {
      const params = new URLSearchParams({ limit: "50" });

      if (!reset && oldestMessageCursor?._id && oldestMessageCursor?.createdAt) {
        params.set("before", oldestMessageCursor.createdAt);
        params.set("beforeId", oldestMessageCursor._id);
      }

      const data = await fetchWithCache(
        buildMessagesCacheKey(authUserId, userId, params),
        async () => {
          const res = await axiosInstance.get(`/messages/${userId}?${params}`);
          return res.data;
        },
        { ttlMs: MESSAGES_CACHE_TTL_MS }
      );
      const newMessages = data?.messages ?? [];
      const hasMore = data?.hasMore ?? newMessages.length === 50;

      const nextCursor =
        data?.nextCursor ??
        (newMessages.length > 0
          ? {
              _id: newMessages[0]._id,
              createdAt: newMessages[0].createdAt,
            }
          : oldestMessageCursor);

      set({
        messages: reset ? newMessages : [...newMessages, ...messages],
        oldestMessageCursor: nextCursor,
        hasMoreMessages: hasMore,
        conversationSnapshots: {
          ...get().conversationSnapshots,
          [snapshotKey]: {
            messages: reset ? newMessages : [...newMessages, ...messages],
            oldestMessageCursor: nextCursor,
            hasMoreMessages: hasMore,
            fetchedAt: Date.now(),
          },
        },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      replyTo: messageData.replyTo || null,
      createdAt: new Date().toISOString(),
      seenAt: null,
      isOptimistic: true,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      invalidateConversationCache(authUser._id, selectedUser._id);
      invalidateApiCache(`chats:${authUser._id}`);

      set((state) => ({
        messages: state.messages
          .filter((message) => message._id !== tempId)
          .concat(res.data.newMessage),
        chatsFetchedAt: 0,
        conversationSnapshots: {
          ...state.conversationSnapshots,
          [getConversationSnapshotKey(authUser._id, selectedUser._id)]: {
            messages: state.messages
              .filter((message) => message._id !== tempId)
              .concat(res.data.newMessage),
            oldestMessageCursor: state.oldestMessageCursor,
            hasMoreMessages: state.hasMoreMessages,
            fetchedAt: Date.now(),
          },
        },
      }));
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((message) => message._id !== tempId),
      }));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  markMessagesAsSeen: async (userId) => {
    try {
      await axiosInstance.put(`/messages/seen/${userId}`);
      const authUserId = useAuthStore.getState().authUser?._id;
      if (authUserId) {
        invalidateConversationCache(authUserId, userId);
      }

      set((state) => ({
        messages: state.messages.map((message) =>
          message.senderId === userId && !message.seenAt
            ? { ...message, seenAt: new Date() }
            : message
        ),
        conversationSnapshots: authUserId
          ? {
              ...state.conversationSnapshots,
              [getConversationSnapshotKey(authUserId, userId)]: {
                messages: state.messages.map((message) =>
                  message.senderId === userId && !message.seenAt
                    ? { ...message, seenAt: new Date() }
                    : message
                ),
                oldestMessageCursor: state.oldestMessageCursor,
                hasMoreMessages: state.hasMoreMessages,
                fetchedAt: Date.now(),
              },
            }
          : state.conversationSnapshots,
      }));
    } catch (error) {
      console.error("Failed to mark messages as seen", error);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesSeen");

    socket.on("newMessage", (newMessage) => {
      if (String(newMessage.senderId) !== String(selectedUser._id)) return;
      invalidateConversationCache(authUser._id, selectedUser._id);
      invalidateApiCache(`chats:${authUser._id}`);

      set((state) => ({
        messages: [...state.messages, newMessage],
        chatsFetchedAt: 0,
        conversationSnapshots: {
          ...state.conversationSnapshots,
          [getConversationSnapshotKey(authUser._id, selectedUser._id)]: {
            messages: [...state.messages, newMessage],
            oldestMessageCursor: state.oldestMessageCursor,
            hasMoreMessages: state.hasMoreMessages,
            fetchedAt: Date.now(),
          },
        },
      }));

      if (isSoundEnabled) {
        const audio = new Audio("/sounds/notification.mp3");
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    });

    socket.on("messagesSeen", ({ by }) => {
      invalidateConversationCache(authUser._id, by);
      set((state) => ({
        messages: state.messages.map((message) => {
          if (
            message.senderId === authUser._id &&
            message.receiverId === by &&
            !message.seenAt
          ) {
            return { ...message, seenAt: new Date() };
          }

          return message;
        }),
        conversationSnapshots: {
          ...state.conversationSnapshots,
          [getConversationSnapshotKey(authUser._id, by)]: {
            messages: state.messages.map((message) => {
              if (
                message.senderId === authUser._id &&
                message.receiverId === by &&
                !message.seenAt
              ) {
                return { ...message, seenAt: new Date() };
              }

              return message;
            }),
            oldestMessageCursor: state.oldestMessageCursor,
            hasMoreMessages: state.hasMoreMessages,
            fetchedAt: Date.now(),
          },
        },
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
    socket.off("messagesSeen");
  },
}));

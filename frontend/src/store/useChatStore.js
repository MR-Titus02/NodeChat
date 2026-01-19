import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  messagesOffset: 0,
  hasMoreMessages: true,

  // 🔊 sound
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  // 🧭 UI
  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedUser: (selectedUser) => {
    set({
      selectedUser,
      messages: [],
      messagesOffset: 0,
      hasMoreMessages: true,
    });
  },

  // 🔁 reply
  replyToMessage: null,
  setReplyToMessage: (message) => set({ replyToMessage: message }),
  clearReplyToMessage: () => set({ replyToMessage: null }),

  // 👥 contacts
  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      const data = res.data;
      const contactsArray =
        data?.contacts ??
        data?.users ??
        data?.data ??
        (Array.isArray(data) ? data : []);
      set({ allContacts: contactsArray });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      const data = res.data;
      const chatsArray =
        data?.chats ??
        data?.users ??
        data?.data ??
        (Array.isArray(data) ? data : []);
      set({ chats: chatsArray });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load chats");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // 💬 messages (pagination)
  fetchMessagesByUserId: async (userId, reset = false) => {
    if (get().isMessagesLoading) return;

    if (reset) {
      set({ messages: [], messagesOffset: 0, hasMoreMessages: true });
    }

    const { messagesOffset, messages, hasMoreMessages } = get();
    if (!hasMoreMessages) return;

    set({ isMessagesLoading: true });

    try {
      const res = await axiosInstance.get(
        `/messages/${userId}?limit=50&offset=${reset ? 0 : messagesOffset}`
      );

      const newMessages = res.data?.messages ?? [];
      const fetchedCount = res.data?.fetchedCount ?? newMessages.length;
      const hasMore = res.data?.hasMore ?? fetchedCount === 50;

      set({
        messages: reset ? newMessages : [...newMessages, ...messages],
        messagesOffset: messagesOffset + fetchedCount,
        hasMoreMessages: hasMore,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // ✉️ send
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

      set((state) => ({
        messages: state.messages
          .filter((m) => m._id !== tempId)
          .concat(res.data.newMessage),
      }));
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  // 👁️ MARK AS SEEN (RECEIVER SIDE)
markMessagesAsSeen: async (userId) => {
  try {
    await axiosInstance.put(`/messages/seen/${userId}`);

    set((state) => ({
      messages: state.messages.map((msg) =>
        // ONLY update messages sent by the OTHER user
        msg.senderId === userId && !msg.seenAt
          ? { ...msg, seenAt: new Date() }
          : msg
      ),
    }));
  } catch (err) {
    console.error("Failed to mark messages as seen", err);
  }
},

  // 🔌 sockets
  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messagesSeen");

    // 📩 new message
    socket.on("newMessage", (newMessage) => {
      if (String(newMessage.senderId) !== String(selectedUser._id)) return;

      set((state) => ({
        messages: [...state.messages, newMessage],
      }));

      if (isSoundEnabled) {
        const audio = new Audio("/sounds/notification.mp3");
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    });

    // 👁️ seen event (SENDER SIDE)
    socket.on("messagesSeen", ({ by }) => {
      set((state) => ({
        messages: state.messages.map((msg) => {
          if (
            msg.senderId === authUser._id &&
            msg.receiverId === by &&
            !msg.seenAt
          ) {
            return { ...msg, seenAt: new Date() };
          }
          return msg;
        }),
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

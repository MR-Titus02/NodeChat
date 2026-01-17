import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";
import {
  getChatKey,
  encryptText,
  decryptText,
} from "../lib/chatCrypto";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

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

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const data =
        res.data?.messages ?? (Array.isArray(res.data) ? res.data : []);

      const chatKey = getChatKey(userId);

      const decryptedMessages = data.map((msg) => ({
        ...msg,
        text: decryptText(msg.text, chatKey),
      }));

      set({ messages: decryptedMessages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();

    const chatKey = getChatKey(selectedUser._id);
    const encryptedText = encryptText(messageData.text, chatKey);

    const tempId = `temp-${Date.now()}`;

    // optimistic UI (plaintext)
    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      senderName: authUser.fullName || authUser.username || "Unknown",
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        {
          text: encryptedText,
          image: messageData.image,
          senderName: authUser.fullName || authUser.username || "Unknown",
        }
      );

      const decryptedServerMessage = {
        ...res.data.newMessage,
        text: decryptText(res.data.newMessage.text, chatKey),
      };

      set((state) => ({
        messages: state.messages
          .filter((m) => m._id !== tempId)
          .concat(decryptedServerMessage),
      }));
    } catch (error) {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== tempId),
      }));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const senderIdStr = String(newMessage.senderId);
      const selectedIdStr = String(selectedUser._id);
      if (senderIdStr !== selectedIdStr) return;

      const chatKey = getChatKey(selectedUser._id);

      const decryptedMessage = {
        ...newMessage,
        text: decryptText(newMessage.text, chatKey),
      };

      set((state) => ({
        messages: [...state.messages, decryptedMessage],
      }));

      if (isSoundEnabled) {
        const audio = new Audio("/sounds/notification.mp3");
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) socket.off("newMessage");
  },
}));

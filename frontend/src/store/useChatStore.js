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
      res.data?.messages ??
      (Array.isArray(res.data) ? res.data : []);

    set({ messages: data });
  } catch (error) {
    toast.error(error.response?.data?.message || "Something went wrong");
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
    createdAt: new Date().toISOString(),
    isOptimistic: true
  };

  // Add optimistic message using latest state
  set(state => ({
    messages: [...state.messages, optimisticMessage]
  }));

  try {
    const res = await axiosInstance.post(
      `/messages/send/${selectedUser._id}`,
      messageData
    );

    // Replace optimistic message with real one
    set(state => ({
      messages: state.messages
        .filter(m => m._id !== tempId)
        .concat(res.data.newMessage)
    }));

  } catch (error) {
    // rollback
    set(state => ({
      messages: state.messages.filter(m => m._id !== tempId)
    }));

    toast.error(error.response?.data?.message || "Something went wrong");
  }
},
}
));
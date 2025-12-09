import { create } from 'zustand';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast';

export const useChatStore  = create((set, get) => ({
    allContacts: [],
    chats: [],
    messages: [],
    activeTab: 'chats',
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
<<<<<<< HEAD
    isSoundEnabled: JSON.parse(localStorage.getItem('isSoundEnabled')) === true,
=======
    isSoundEnabled: localStorage.getItem('isSoundEnabled') === true,
>>>>>>> 458dbe8ad80ac0b01269aea18e0ef2ea95df006e


    toggleSound : () => {
        localStorage.setItem('isSoundEnabled', !get().isSoundEnabled);
        set({isSoundEnabled: !get().isSoundEnabled})
    },

    setActiveTab: (tab) => set({ activeTab: tab}),
    setSelectedUser: (selectedUser) => set({ selectedUser}),

    getAllContacts: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get('/messages/contacts');
            set({ allContacts: res.data})
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isUsersLoading: false } );
        }
    },
    getMyChatPartners: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get('/messages/chats ');
            set({ chats: res.data})
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            set({ isUsersLoading: false } );
        }
    },


}));
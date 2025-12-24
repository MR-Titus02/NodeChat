import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client"

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set,get) => ({
    // initialize with the user object stored in localStorage (if any)
    authUser: JSON.parse(localStorage.getItem("authUser")) || null,
    isCheckingAuth : true,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    socket: null,
    onlineUsers: [],

   checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      const user = res?.data?.user ?? res?.data ?? null;
      set({ authUser: user });
      if (user) {
        localStorage.setItem("authUser", JSON.stringify(user));
        // ensure socket connects when auth restored (e.g., page reload)
        get().connectSocket();
      } else localStorage.removeItem("authUser");
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
      localStorage.removeItem("authUser");
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      const user = res?.data?.user ?? res?.data ?? null;
      set({ authUser: user });
      if (user) localStorage.setItem("authUser", JSON.stringify(user));
      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

    login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      const user = res?.data?.user ?? res?.data ?? null;
  
      set({ authUser: user });
      if (user) localStorage.setItem("authUser", JSON.stringify(user));
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

    logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      localStorage.removeItem("authUser");
      toast.success("Logged out successfully!");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
      console.log("Logout Error:", error);
    } finally {
      // nothing to keep true here; ensure flags cleared
      set({ isLoggingIn: false, isSigningUp: false, isUpdatingProfile: false });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      const updatedUser = res?.data?.user ?? res?.data ?? null;
      set({ authUser: updatedUser });
      if (updatedUser) localStorage.setItem("authUser", JSON.stringify(updatedUser));
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get()
    if (!authUser || get().socket?.connected) return

    const socket = io(BASE_URL, {
      withCredentials: true // this ensures cookies are sent
    })

    socket.connect()

    set({socket})

    // prevent duplicate handlers then listen for online users event
    socket.off("getOnlineUsers")
    socket.on("getOnlineUsers", (userIds) => {
      // normalize IDs to strings for consistent comparisons across components
      set({onlineUsers: userIds.map(String)})
    })
  },

  disconnectSocket: () => {
    try {
      if (get().socket) get().socket.disconnect()
    } finally {
      set({ socket: null, onlineUsers: [] })
    }
  }
  
}));
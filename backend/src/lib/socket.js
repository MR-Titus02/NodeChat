import { Server } from "socket.io";
import http from "http";
import express from "express";
import dotenv from "dotenv";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import User from "../models/User.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL],
    credentials: true,
  },
});

// Apply auth middleware to all sockets
io.use(socketAuthMiddleware);

// Map to track connected users: { userId: socketId }
const userSocketMap = {};

// Utility to get a user’s socket id
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  const userId = socket.userId;
  const userName = socket.user.fullName;

  console.log("A user connected:", userName);

  // Add to connected users
  userSocketMap[userId] = socket.id;

  // Notify all clients of online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Notify others this user is online
  socket.broadcast.emit("user:online", userId);

  // --- Typing indicator ---
  socket.on("typing", ({ toUserId, isTyping }) => {
    const receiverSocketId = getReceiverSocketId(toUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", {
        fromUserId: userId,
        isTyping,
      });
    }
  });

  // --- Handle disconnect ---
  socket.on("disconnect", async () => {
    console.log("A user disconnected:", userName);
    delete userSocketMap[userId];

    // Update lastSeen in DB
    try {
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { lastSeen });

      // Notify all clients this user is offline
      io.emit("user:offline", { userId, lastSeen });
    } catch (err) {
      console.error("Failed to update lastSeen:", err.message);
    }

    // Update online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };

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

//apply auth middleware to all socket connections
io.use(socketAuthMiddleware);

//we will use this to check the user is on or not
export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log("A user connected", socket.user.fullName);

  userSocketMap[userId] = socket.id;

  // io.emit is used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // notify others this user is online
  socket.broadcast.emit("user:online", userId);

  //with socket.on  we listen from clients
  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.user.fullName);
    delete userSocketMap[userId];

    // update last seen in DB
    try {
      const lastSeen = new Date();

      await User.findByIdAndUpdate(userId, {
        lastSeen,
      });

      // notify clients
      io.emit("user:offline", {
        userId,
        lastSeen,
      });
    } catch (err) {
      console.error("Failed to update lastSeen:", err.message);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };

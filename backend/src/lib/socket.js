import { Server } from "socket.io";
import http from "http";
import express from "express"
import dotenv from "dotenv"
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

dotenv.config();

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors : {
        origin: [process.env.CLIENT_URL],
        credentials: true
    },
})

//apply auth middleware to all socket connections
io.use(socketAuthMiddleware)

//we will use this to check the user is on or not
export function getReceiverSocketId(userId) {
    return userSocketMap[userId]
}

const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.user.fullName)

    const userId = socket.userId
    userSocketMap[userId] = socket.id

    // io.emit is used to send events to all connected clients
     io.emit("getOnlineUsers", Object.keys(userSocketMap))

     //with socket.on  we listen from clients
     socket.on("disconnect", () => {
        console.log("A user disconnected", socket.user.fullName)
        delete userSocketMap[userId]
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
     });
});

export {io, app, server};
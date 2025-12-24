import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js"
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getAllContacts = async (req,res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select('-password');

        res.status(200).json({ contacts: filteredUsers });

    } catch (error) {
        console.log("Error in getAllContacts:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
 }

 export const getMessagesByUserId = async (req, res) => {
    try {
        const myId = req.user._id;
        const { id: userToChatId } = req.params;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: userToChatId },
                { senderId: userToChatId, receiverId: myId }

            ]
        })

        res.status(200).json({ messages });
    } catch (error) {
        console.log("Error in getMessagesByUserId:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
 }

export const sendMessage = async (req,res) => {
    try {
        const { text, image } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        if (!text && !image) {
            return res.status(400).json({ message: "Message text or image is required" });
        }

        if (senderId.equals(receiverId)) {
            return  res.status(400).json({ message: "Cannot send message to yourself" });
        }

        const receiverExists = await User.exists({ _id: receiverId });
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        let imageUrl;

        if (image) {
            //upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image)
                imageUrl = uploadResponse.secure_url;
            };

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl
        });

        await newMessage.save();

        // send message in real time using sockets (emit plain JS object)
        const savedMessage = newMessage.toObject();
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", savedMessage);
            console.log(`Emitted newMessage to socket ${receiverSocketId} for user ${receiverId}`);
        } else {
            console.log(`Receiver ${receiverId} is offline; message saved`);
        }

        res.status(201).json({ message: "Message sent successfully", newMessage: savedMessage });


    } catch (error) {
        console.log("Error in sendMessage:", error);
        res.status(500).json({ message: "Server error", error: error.message });

    }
}

export const getChatPartners = async (req,res) => {
    try {
        const loggedInUserId = req.user._id;

        //find all mesages where user is either sender or receiver
            const messages = await Message.find({
            $or: [
                { senderId: loggedInUserId },
                { receiverId: loggedInUserId }
            ]
            });


        const chatPartnerIds = [
        ...new Set(
        messages.map((msg) => 
            msg.senderId.toString() === loggedInUserId.toString()
                ? msg.receiverId.toString() 
                : msg.senderId.toString()
            )
        ),
        ];

        const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select('-password');
        res.status(200).json({ chatPartners });

    } catch (error) {
        console.log("Error in getChatPartners:", error.message);
        res.status(500).json({ message: "Server error", error });
    }

}

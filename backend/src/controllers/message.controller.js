import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { sendTelegramMessage } from "../lib/telegram.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json({ contacts: filteredUsers });
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json({ messages });
  } catch (error) {
    console.log("Error in getMessagesByUserId:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validation
    if (!text && !image)
      return res
        .status(400)
        .json({ message: "Message text or image is required" });

    if (senderId.equals(receiverId))
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists)
      return res.status(404).json({ message: "Receiver not found" });

    // Upload image if present
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Save message (WITH REPLY SUPPORT)
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      replyTo: replyTo
        ? {
            messageId: replyTo.messageId,
            text: replyTo.text,
            senderId: replyTo.senderId,
          }
        : null,
    });

    await newMessage.save();
    const savedMessage = {
  ...newMessage.toObject(),
  replyTo: newMessage.replyTo || null,
};

    // Real-time socket delivery
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", savedMessage);
    }

    // Telegram alert (unchanged)
    const ADMIN_USER_ID = process.env.ADMIN_USER_ID;
    if (receiverId.toString() === ADMIN_USER_ID) {
      const senderName =
        req.user?.fullName || req.user?.username || "Unknown";

      const telegramText = `
📩 *New Message*
From: ${senderName}
${text || "📷 Image"}
      `.trim();

      await sendTelegramMessage(telegramText);
    }

    return res.status(201).json({
      message: "Message sent successfully",
      newMessage: savedMessage,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Find all messages where user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).sort({ createdAt: -1 }); // sort descending to get last message first

    // Get unique chat partner IDs
    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    // Fetch chat partners from users collection
    const chatPartners = await User.find({
      _id: { $in: chatPartnerIds },
    }).select("-password");

    // Map last message to each partner
    const chatPartnersWithLastMessage = chatPartners.map((partner) => {
      // find the latest message between logged in user and this partner
      const lastMessage = messages.find(
        (msg) =>
          (msg.senderId.toString() === partner._id.toString() &&
            msg.receiverId.toString() === loggedInUserId.toString()) ||
          (msg.senderId.toString() === loggedInUserId.toString() &&
            msg.receiverId.toString() === partner._id.toString())
      );

      return {
        ...partner.toObject(),
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              image: lastMessage.image || null,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

    res.status(200).json({ chats: chatPartnersWithLastMessage });
  } catch (error) {
    console.log("Error in getChatPartners:", error.message);
    res.status(500).json({ message: "Server error", error });
  }
};

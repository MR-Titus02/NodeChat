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

    if (!text && !image) {
      return res.status(400).json({
        message: "Message text or image is required",
      });
    }

    if (senderId.equals(receiverId)) {
      return res.status(400).json({
        message: "Cannot send message to yourself",
      });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({
        message: "Receiver not found",
      });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

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

    const receiverSocketId = getReceiverSocketId(receiverId.toString());

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", savedMessage);
    } else {
      const adminUserId = process.env.ADMIN_USER_ID;

      if (receiverId.toString() === adminUserId) {
        const senderName =
          req.user?.fullName || req.user?.username || "Unknown";

        const telegramText = `
New Message
From: ${senderName}
${text || "Image"}
        `.trim();

        await sendTelegramMessage(telegramText);
      }
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

    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    }).sort({ createdAt: -1 });

    const chatPartnerIds = [
      ...new Set(
        messages.map((message) =>
          message.senderId.toString() === loggedInUserId.toString()
            ? message.receiverId.toString()
            : message.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({
      _id: { $in: chatPartnerIds },
    }).select("-password");

    const chatPartnersWithLastMessage = chatPartners.map((partner) => {
      const lastMessage = messages.find(
        (message) =>
          (message.senderId.toString() === partner._id.toString() &&
            message.receiverId.toString() === loggedInUserId.toString()) ||
          (message.senderId.toString() === loggedInUserId.toString() &&
            message.receiverId.toString() === partner._id.toString())
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

export const getMessagesByUserIdPaginated = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const { before, beforeId } = req.query;

    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    if (before && beforeId) {
      const beforeDate = new Date(before);

      if (!Number.isNaN(beforeDate.getTime())) {
        query.$and = [
          {
            $or: [
              { createdAt: { $lt: beforeDate } },
              { createdAt: beforeDate, _id: { $lt: beforeId } },
            ],
          },
        ];
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit);

    const messagesReversed = messages.reverse();
    const oldestMessage = messagesReversed[0] ?? null;

    res.status(200).json({
      messages: messagesReversed,
      fetchedCount: messagesReversed.length,
      hasMore: messages.length === limit,
      nextCursor: oldestMessage
        ? {
            _id: oldestMessage._id,
            createdAt: oldestMessage.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.log("Error in getMessagesByUserIdPaginated:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const markMessagesAsSeen = async (req, res) => {
  const loggedInUserId = req.user._id;
  const { userId } = req.params;

  await Message.updateMany(
    {
      senderId: userId,
      receiverId: loggedInUserId,
      seenAt: null,
    },
    { $set: { seenAt: new Date() } }
  );

  const senderSocketId = getReceiverSocketId(userId);
  if (senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen", {
      by: loggedInUserId,
    });
  }

  res.status(200).json({ success: true });
};

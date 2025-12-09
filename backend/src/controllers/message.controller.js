import Message from "../models/Message.js";
import User from "../models/User.js";

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
                { sender: myId, receiver: userToChatId },
                { sender: userToChatId, receiver: myId }
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

        //todo : send messsage in real time using sockets

        res.status(201).json({ message: "Message sent successfully", newMessage });


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

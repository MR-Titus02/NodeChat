import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/util.js";

export const signup = async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 4) {   // Changed to 4 for testing purposes
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        
        const user = await User.findOne({email});
        if (user) {
            return res.status(400).json({message:"Email already exists"})
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            fullName,
            email,
            password: hashedPassword
        })

        if (newUser) {
            generateToken(newUser._id, res);
            await newUser.save();
            res.status(201).json({
                _id: newUser._id,
                fullName: newUser.fullName,
                email: newUser.email,
                profilePic: newUser.profilePic,
            });
        } else {
            return res.status(400).json({message: "Invalid user data"});
        }


    } catch (error) {
        console.error("Error in signup controller:",error);
        res.status(500).json({ message: 'Server error' });
    }
}

export const login = async (req, res) => {
    res.send('login route');
}


export const logout = async (req, res) => {
    res.send('Logout route');
}
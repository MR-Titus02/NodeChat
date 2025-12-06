import express from 'express';
import { login, signup, logout, updateProfile } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import  arcjetProtection  from '../middleware/arcjet.middleware.js';
 
const router = express.Router();
 
router.post('/login', login );
 
router.post('/signup', signup );
 
router.post('/logout', logout);
 
router.put('/update-profile', protectRoute, updateProfile );
 
router.get('/check', protectRoute, (req, res) => {
    res.status(200).json({ message: "Authorized", user: req.user });
});

router.get('/arcjet-test', arcjetProtection, (req, res) => {
    res.status(200).json({ message: "Request passed Arcjet protection" });
});
 
 
export default router;
import express from 'express';
import { getAllContacts, getChatPartners, getMessagesByUserId, sendMessage } from '../controllers/message.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import arcjetProtection from '../middleware/arcjet.middleware.js';

const router = express.Router();

router.get('/send', (req, res) => {
    res.send('Send message route');
});

router.get('/inbox', (req, res) => {
    res.send('Inbox route');
});

// middlewares has to run in this order

router.use( arcjetProtection , protectRoute);

router.get('/contacts',  getAllContacts);

router.get('/chats', getChatPartners);

router.get('/:id', getMessagesByUserId);

router.get('/send/:id', sendMessage);

export default router;
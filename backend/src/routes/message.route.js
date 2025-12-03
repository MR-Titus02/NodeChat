import express from 'express';

const router = express.Router();

router.get('/send', (req, res) => {
    res.send('Send message route');
});

router.get('/inbox', (req, res) => {
    res.send('Inbox route');
});

export default router;
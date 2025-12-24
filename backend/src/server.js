import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { app, server } from './lib/socket.js';

dotenv.config();


const __dirname = path.resolve();

const PORT = process.env.PORT;

app.use(express.json({ limit: '5mb' }));
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}));
app.use(cookieParser());

app.get('/status', (req, res) => {
  res.send('Hello, World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

//make ready for production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    app.get('*', (_, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
  }


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}` );
  connectDB();
}   );

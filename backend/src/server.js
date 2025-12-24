import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.route.js';
import messageRoutes from './routes/message.route.js';
import { connectDB } from './lib/db.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { app, server } from './lib/socket.js';

dotenv.config();

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use PORT from environment or fallback
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production' ? true : process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());

// Test route
app.get('/status', (req, res) => {
  res.send('Hello, World!');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // Adjust path relative to backend/src
  const frontendPath = path.join(__dirname, '../../frontend/dist');

  app.use(express.static(frontendPath));

  // SPA fallback
  app.get('*', (_, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Start server and connect to DB
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

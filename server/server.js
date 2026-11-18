import './config/instrument.js';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/db.js';
import connectCloudinary from './config/cloudinary.js';
import { clerkWebhooks } from './controllers/webhooks.js';
import companyRoutes from './routes/companyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import userRoutes from './routes/userRoutes.js';
import atsRoutes from './routes/atsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { clerkMiddleware } from '@clerk/express';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('register_user', (userId) => {
    if (!userId) return;
    const key = String(userId);
    socket.data.userId = key;
    if (!onlineUsers.has(key)) onlineUsers.set(key, new Set());
    onlineUsers.get(key).add(socket.id);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('join_chat', (chatId) => {
    if (chatId) socket.join(String(chatId));
  });

  socket.on('leave_chat', (chatId) => {
    if (chatId) socket.leave(String(chatId));
  });

  socket.on('typing', ({ chatId, userId }) => {
    if (chatId) socket.to(String(chatId)).emit('user_typing', { chatId: String(chatId), userId: String(userId) });
  });

  socket.on('stop_typing', ({ chatId, userId }) => {
    if (chatId) socket.to(String(chatId)).emit('user_stop_typing', { chatId: String(chatId), userId: String(userId) });
  });

  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (userId && onlineUsers.has(userId)) {
      const set = onlineUsers.get(userId);
      set.delete(socket.id);
      if (set.size === 0) onlineUsers.delete(userId);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    }
  });
});

await connectDB();
await connectCloudinary();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('API Working'));
app.post('/webhooks', clerkWebhooks);
app.use('/api/company', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
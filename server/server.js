import './config/instrument.js';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import * as Sentry from '@sentry/node';
import { clerkMiddleware } from '@clerk/express';
import connectDB from './config/db.js';
import connectCloudinary from './config/cloudinary.js';
import companyRoutes from './routes/companyRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import atsRoutes from './routes/atsRoutes.js';
import { registerChatSocketHandlers } from './socket/chatSocket.js';

const app = express();

// Connect to MongoDB & Cloudinary
await connectDB();
await connectCloudinary();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Routes
app.get('/', (req, res) => res.send('API Working'));
app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});

app.use('/api/company', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ats', atsRoutes);

// Sentry error handler
Sentry.setupExpressErrorHandler(app);

// HTTP + Socket.io Server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

app.set('io', io);
registerChatSocketHandlers(io);

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
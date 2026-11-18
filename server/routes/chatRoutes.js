import express from 'express';
import {
  getOrCreateChat,
  getChatById,
  getUserChats,
  sendMessageHttp,
} from '../controllers/chatController.js';
import { protectChatUser } from '../middlewares/chatAuthMiddleware.js';

const router = express.Router();

router.post('/room', protectChatUser, getOrCreateChat);
router.get('/user/:userId', protectChatUser, getUserChats);
router.get('/:chatId', protectChatUser, getChatById);
router.post('/message', protectChatUser, sendMessageHttp);

export default router;
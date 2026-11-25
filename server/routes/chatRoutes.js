// server/routes/chatRoutes.js
import express from 'express';
import {
  getOrCreateChat,
  getChatById,
  getUserChats,
  sendMessageHttp,
  clearChat,
  togglePinChat,
  toggleUnreadChat,
  deleteChat,
} from '../controllers/chatController.js';
import { protectChatUser } from '../middlewares/chatAuthMiddleware.js';

const router = express.Router();

router.post('/room', protectChatUser, getOrCreateChat);
router.get('/user/:userId', protectChatUser, getUserChats);
router.get('/:chatId', protectChatUser, getChatById);
router.post('/message', protectChatUser, sendMessageHttp);
router.post('/:chatId/clear', protectChatUser, clearChat);
router.post('/:chatId/pin', protectChatUser, togglePinChat);
router.post('/:chatId/unread', protectChatUser, toggleUnreadChat);
router.delete('/:chatId', protectChatUser, deleteChat);

export default router;
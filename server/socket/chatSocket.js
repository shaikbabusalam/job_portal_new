import { Chat } from '../models/chatModel.js';

export const registerChatSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.on('join_chat', ({ chatId }) => {
      if (!chatId) return;
      socket.join(String(chatId));
    });

    socket.on('leave_chat', ({ chatId }) => {
      if (!chatId) return;
      socket.leave(String(chatId));
    });

    socket.on('typing', ({ chatId, senderId, isTyping }) => {
      if (!chatId) return;
      socket.to(String(chatId)).emit('user_typing', {
        chatId: String(chatId),
        senderId,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on('send_message', async ({ chatId, senderId, text }, callback) => {
      try {
        if (!chatId || !senderId || !text?.trim()) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Missing message fields.' });
          }
          return;
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Chat not found.' });
          }
          return;
        }

        const senderKey = String(senderId);
        const newTotal = chat.messages.length + 1;
        const readField =
          String(chat.applicantId) === senderKey
            ? 'applicantLastReadCount'
            : 'recruiterLastReadCount';

        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          {
            $push: { messages: { sender: senderKey, text: text.trim() } },
            $set: { [readField]: newTotal },
            $pull: { forceUnreadBy: senderKey },
          },
          { new: true }
        );

        const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];

        io.to(String(chatId)).emit('receive_message', {
          chatId: String(chatId),
          message: savedMessage,
        });

        if (typeof callback === 'function') {
          callback({ success: true, message: savedMessage });
        }
      } catch (error) {
        console.error('Socket send_message error:', error);
        if (typeof callback === 'function') {
          callback({ success: false, message: error.message });
        }
      }
    });

    socket.on('disconnect', () => {});
  });
};
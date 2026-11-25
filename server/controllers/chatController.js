// server/controllers/chatController.js
import { Chat } from '../models/chatModel.js';
import User from '../models/user.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';

const isParticipant = (chat, userId) =>
  String(chat.applicantId) === String(userId) || String(chat.recruiterId) === String(userId);

export async function getOrCreateChat(req, res) {
  try {
    let { jobId, applicantId, recruiterId } = req.body;
    const caller = req.chatUser;

    if (jobId && typeof jobId === 'object') jobId = jobId._id;
    if (applicantId && typeof applicantId === 'object') applicantId = applicantId._id;
    if (recruiterId && typeof recruiterId === 'object') recruiterId = recruiterId._id;

    if (jobId && !recruiterId) {
      const job = await Job.findById(jobId).select('companyId');
      if (job?.companyId) {
        recruiterId = String(job.companyId);
      }
    }

    if (!jobId || !applicantId || !recruiterId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required chat parameters.',
      });
    }

    if (String(caller.id) !== String(applicantId) && String(caller.id) !== String(recruiterId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot open a chat for another user.',
      });
    }

    const application = await JobApplication.findOne({
      jobId,
      userId: String(applicantId),
      status: { $regex: /^accepted$/i },
    });

    if (!application) {
      return res.status(403).json({
        success: false,
        message: 'Chat is only available for accepted applications.',
      });
    }

    let chat = await Chat.findOne({
      jobId,
      applicantId: String(applicantId),
      recruiterId: String(recruiterId),
    });

    if (!chat) {
      chat = await Chat.create({
        jobId,
        applicantId: String(applicantId),
        recruiterId: String(recruiterId),
        messages: [],
      });
    }

    return res.json({ success: true, chat });
  } catch (error) {
    console.error('getOrCreateChat error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getChatById(req, res) {
  try {
    const { chatId } = req.params;
    const caller = req.chatUser;
    const callerKey = String(caller.id);

    const chat = await Chat.findById(chatId).populate('jobId', 'title location category salary');
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(chat, callerKey)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const totalMessages = chat.messages.length;
    let shouldSave = false;

    if (String(chat.applicantId) === callerKey && chat.applicantLastReadCount < totalMessages) {
      chat.applicantLastReadCount = totalMessages;
      shouldSave = true;
    } else if (String(chat.recruiterId) === callerKey && chat.recruiterLastReadCount < totalMessages) {
      chat.recruiterLastReadCount = totalMessages;
      shouldSave = true;
    }

    if (chat.forceUnreadBy?.includes(callerKey)) {
      chat.forceUnreadBy = chat.forceUnreadBy.filter((id) => id !== callerKey);
      shouldSave = true;
    }

    if (shouldSave) {
      await chat.save();
    }

    const [applicant, recruiter] = await Promise.all([
      User.findById(chat.applicantId).select('name email image resume'),
      Company.findById(chat.recruiterId).select('name email image'),
    ]);

    return res.json({
      success: true,
      chat,
      applicant: applicant || null,
      recruiter: recruiter || null,
    });
  } catch (error) {
    console.error('getChatById error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getUserChats(req, res) {
  try {
    const { userId } = req.params;
    const caller = req.chatUser;
    const callerKey = String(userId);

    if (String(caller.id) !== callerKey) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot list another user’s chats.' });
    }

    const chats = await Chat.find({
      $or: [{ applicantId: callerKey }, { recruiterId: callerKey }],
    })
      .populate('jobId', 'title location')
      .sort({ updatedAt: -1 });

    const enrichedChats = await Promise.all(
      chats.map(async (chatDoc) => {
        const chatObj = chatDoc.toObject();
        const total = chatObj.messages?.length || 0;
        const lastRead =
          String(chatObj.applicantId) === callerKey
            ? chatObj.applicantLastReadCount || 0
            : chatObj.recruiterLastReadCount || 0;

        const computedUnread = Math.max(0, total - lastRead);
        const isForcedUnread = Array.isArray(chatObj.forceUnreadBy) && chatObj.forceUnreadBy.includes(callerKey);
        const unreadCount = computedUnread > 0 ? computedUnread : isForcedUnread ? 1 : 0;
        const isPinned = Array.isArray(chatObj.pinnedBy) && chatObj.pinnedBy.includes(callerKey);

        const [applicant, recruiter] = await Promise.all([
          User.findById(chatObj.applicantId).select('name email image'),
          Company.findById(chatObj.recruiterId).select('name email image'),
        ]);

        return {
          ...chatObj,
          unreadCount,
          isPinned,
          applicant: applicant || null,
          recruiter: recruiter || null,
        };
      })
    );

    enrichedChats.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    return res.json({ success: true, chats: enrichedChats });
  } catch (error) {
    console.error('getUserChats error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function sendMessageHttp(req, res) {
  try {
    const { chatId, text } = req.body;
    const caller = req.chatUser;
    const callerKey = String(caller.id);

    if (!chatId || !text?.trim()) {
      return res.status(400).json({ success: false, message: 'Missing message fields.' });
    }

    const existingChat = await Chat.findById(chatId);
    if (!existingChat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(existingChat, callerKey)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const newTotal = existingChat.messages.length + 1;
    const readField =
      String(existingChat.applicantId) === callerKey
        ? 'applicantLastReadCount'
        : 'recruiterLastReadCount';

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { messages: { sender: callerKey, text: text.trim() } },
        $set: { [readField]: newTotal },
        $pull: { forceUnreadBy: callerKey },
      },
      { new: true }
    );

    const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];

    const io = req.app.get('io');
    if (io) {
      io.to(String(chatId)).emit('receive_message', {
        chatId: String(chatId),
        message: savedMessage,
      });
    }

    return res.json({ success: true, message: savedMessage });
  } catch (error) {
    console.error('sendMessageHttp error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function clearChat(req, res) {
  try {
    const { chatId } = req.params;
    const caller = req.chatUser;

    const existingChat = await Chat.findById(chatId);
    if (!existingChat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(existingChat, caller.id)) {
      return res.status(403).json({ success: false, message: 'Access denied to clear this conversation.' });
    }

    await Chat.findByIdAndUpdate(chatId, {
      $set: {
        messages: [],
        applicantLastReadCount: 0,
        recruiterLastReadCount: 0,
        forceUnreadBy: [],
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(String(chatId)).emit('chat_cleared', { chatId: String(chatId) });
    }

    return res.json({ success: true, message: 'Chat history cleared.' });
  } catch (error) {
    console.error('clearChat error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function togglePinChat(req, res) {
  try {
    const { chatId } = req.params;
    const callerKey = String(req.chatUser.id);

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(chat, callerKey)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const alreadyPinned = Array.isArray(chat.pinnedBy) && chat.pinnedBy.includes(callerKey);
    const updated = await Chat.findByIdAndUpdate(
      chatId,
      alreadyPinned
        ? { $pull: { pinnedBy: callerKey } }
        : { $addToSet: { pinnedBy: callerKey } },
      { new: true }
    );

    return res.json({
      success: true,
      isPinned: !alreadyPinned,
      pinnedBy: updated.pinnedBy,
    });
  } catch (error) {
    console.error('togglePinChat error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function toggleUnreadChat(req, res) {
  try {
    const { chatId } = req.params;
    const callerKey = String(req.chatUser.id);
    const { unread } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(chat, callerKey)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const shouldMarkUnread = typeof unread === 'boolean' ? unread : !chat.forceUnreadBy?.includes(callerKey);
    const readField =
      String(chat.applicantId) === callerKey
        ? 'applicantLastReadCount'
        : 'recruiterLastReadCount';

    await Chat.findByIdAndUpdate(
      chatId,
      shouldMarkUnread
        ? { $addToSet: { forceUnreadBy: callerKey } }
        : {
            $pull: { forceUnreadBy: callerKey },
            $set: { [readField]: chat.messages?.length || 0 },
          }
    );

    return res.json({
      success: true,
      unread: shouldMarkUnread,
    });
  } catch (error) {
    console.error('toggleUnreadChat error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteChat(req, res) {
  try {
    const { chatId } = req.params;
    const callerKey = String(req.chatUser.id);

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(chat, callerKey)) {
      return res.status(403).json({ success: false, message: 'Access denied to delete this chat.' });
    }

    await Chat.findByIdAndDelete(chatId);

    const io = req.app.get('io');
    if (io) {
      io.to(String(chatId)).emit('chat_deleted', { chatId: String(chatId) });
    }

    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    console.error('deleteChat error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
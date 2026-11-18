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

    // Verify caller is one of the two participants
    if (String(caller.id) !== String(applicantId) && String(caller.id) !== String(recruiterId)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot open a chat for another user.',
      });
    }

    // Verify application exists and is Accepted
    const application = await JobApplication.findOne({
      jobId,
      userId: String(applicantId),
      status: { $regex: /^accepted$/i },
    });

    if (!application) {
      return res.status(403).json({
        success: false,
        message: 'Chat unlocks once the application is accepted.',
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

    const chat = await Chat.findById(chatId).populate('jobId', 'title location category salary');
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(chat, caller.id)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    // Update read count for the caller on the server
    const totalMessages = chat.messages.length;
    if (String(chat.applicantId) === String(caller.id) && chat.applicantLastReadCount < totalMessages) {
      chat.applicantLastReadCount = totalMessages;
      await chat.save();
    } else if (String(chat.recruiterId) === String(caller.id) && chat.recruiterLastReadCount < totalMessages) {
      chat.recruiterLastReadCount = totalMessages;
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

    if (String(caller.id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot list another user’s chats.' });
    }

    const chats = await Chat.find({
      $or: [{ applicantId: String(userId) }, { recruiterId: String(userId) }],
    })
      .populate('jobId', 'title location')
      .sort({ updatedAt: -1 });

    const enrichedChats = await Promise.all(
      chats.map(async (chatDoc) => {
        const chatObj = chatDoc.toObject();
        const total = chatObj.messages?.length || 0;
        const lastRead =
          String(chatObj.applicantId) === String(userId)
            ? chatObj.applicantLastReadCount || 0
            : chatObj.recruiterLastReadCount || 0;

        const [applicant, recruiter] = await Promise.all([
          User.findById(chatObj.applicantId).select('name email image'),
          Company.findById(chatObj.recruiterId).select('name email image'),
        ]);

        return {
          ...chatObj,
          unreadCount: Math.max(0, total - lastRead),
          applicant: applicant || null,
          recruiter: recruiter || null,
        };
      })
    );

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

    if (!chatId || !text?.trim()) {
      return res.status(400).json({ success: false, message: 'Missing message fields.' });
    }

    const existingChat = await Chat.findById(chatId);
    if (!existingChat) {
      return res.status(404).json({ success: false, message: 'Chat not found.' });
    }

    if (!isParticipant(existingChat, caller.id)) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation.' });
    }

    const newTotal = existingChat.messages.length + 1;
    const readField =
      String(existingChat.applicantId) === String(caller.id)
        ? 'applicantLastReadCount'
        : 'recruiterLastReadCount';

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { messages: { sender: String(caller.id), text: text.trim() } },
        $set: { [readField]: newTotal },
      },
      { new: true }
    );

    const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];

    // Broadcast immediately via Socket.io if attached to app
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
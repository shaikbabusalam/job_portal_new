import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicantId: {
      type: String,
      required: true,
    },
    recruiterId: {
      type: String,
      required: true,
    },
    messages: [messageSchema],
    applicantLastReadCount: {
      type: Number,
      default: 0,
    },
    recruiterLastReadCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

chatSchema.index({ jobId: 1, applicantId: 1, recruiterId: 1 }, { unique: true });

export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
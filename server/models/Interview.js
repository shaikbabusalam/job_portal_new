import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobApplication', required: true },
    userId: { type: String, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    note: { type: String },
    createdAt: { type: Number, default: Date.now }
});

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;
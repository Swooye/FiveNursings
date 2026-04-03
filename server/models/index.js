const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firebaseUid: { type: String, index: true, unique: true }
}, { strict: false, collection: 'users', timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true },
    password: { type: String, required: true },
    username: String
}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema, 'admins');

const MallItem = mongoose.model('MallItem', new mongoose.Schema({}, { strict: false }), 'mall_items');
const Protocol = mongoose.model('Protocol', new mongoose.Schema({}, { strict: false }), 'protocols');

const chatMessageSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    sessionTitle: { type: String },
    role: String,
    text: String,
    type: { type: String, default: 'chat' },
    category: { type: String },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}, { strict: false });

chatMessageSchema.index({ userId: 1, timestamp: -1 });
chatMessageSchema.index({ sessionId: 1, timestamp: -1 });
chatMessageSchema.index({ userId: 1, isRead: 1 });

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema, 'chat_messages');

const Role = mongoose.model('Role', new mongoose.Schema({
    name: { type: String, required: true },
    key: String
}, { strict: false }), 'roles');

const Plan = mongoose.model('Plan', new mongoose.Schema({}, { strict: false }), 'plans');

const voiceLogSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    date: { type: String, index: true },
    timestamp: { type: Date, default: Date.now },
    summary: String,
    impact: {
        category: String,
        change: Number
    }
}, { strict: false });
const VoiceLog = mongoose.models.VoiceLog || mongoose.model('VoiceLog', voiceLogSchema, 'voice_logs');

const dailyTaskSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    date: { type: String, index: true },
    category: String,
    title: String,
    completed: { type: Boolean, default: false },
    isInfeasible: { type: Boolean, default: false },
    suggestedTimes: [String]
}, { strict: false });
const DailyTask = mongoose.models.DailyTask || mongoose.model('DailyTask', dailyTaskSchema, 'daily_tasks');

const TaskTemplate = require('./TaskTemplate');

const diaryEntrySchema = new mongoose.Schema({
    userId: { type: String, index: true },
    date: { type: String, index: true },
    content: String,
    timestamp: { type: Date, default: Date.now }
}, { strict: false });
const DiaryEntry = mongoose.models.DiaryEntry || mongoose.model('DiaryEntry', diaryEntrySchema, 'diary_entries');

const dailySymptomSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    date: { type: String, index: true },
    symptoms: [String],
    updatedAt: { type: Date, default: Date.now }
}, { strict: false });
const DailySymptom = mongoose.models.DailySymptom || mongoose.model('DailySymptom', dailySymptomSchema, 'daily_symptoms');

module.exports = {
    User,
    Admin,
    MallItem,
    Protocol,
    ChatMessage,
    Role,
    Plan,
    VoiceLog,
    DailyTask,
    DiaryEntry,
    TaskTemplate,
    DailySymptom
};

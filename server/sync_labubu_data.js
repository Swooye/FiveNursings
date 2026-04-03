const mongoose = require('mongoose');
const { User, DailyTask, VoiceLog, DailySymptom } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/';
const LABUBU_ID = '6986ec04c82327ca27776556';

async function syncData() {
  const proDB = 'fivenursing_pro';
  const devDB = 'fivenursing_dev';
  
  const proUri = MONGODB_URI.includes('?') ? MONGODB_URI.replace(/\?/, `${proDB}?`) : `${MONGODB_URI}${proDB}?retryWrites=true&w=majority`;
  const devUri = MONGODB_URI.includes('?') ? MONGODB_URI.replace(/\?/, `${devDB}?`) : `${MONGODB_URI}${devDB}?retryWrites=true&w=majority`;

  try {
    // 1. Fetch from PRO
    await mongoose.connect(proUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Connected to PRO: ${proDB}`);

    const user = await User.findById(LABUBU_ID).lean();
    const tasks = await DailyTask.find({ userId: LABUBU_ID, date: '2026-04-02' }).lean();
    const logs = await VoiceLog.find({ userId: LABUBU_ID, date: '2026-04-02' }).lean();
    const symptoms = await DailySymptom.find({ userId: LABUBU_ID, date: '2026-04-02' }).lean();

    console.log(`Fetched from PRO: ${tasks.length} tasks, ${logs.length} logs, ${symptoms.length} symptoms.`);
    await mongoose.disconnect();

    // 2. Put into DEV
    await mongoose.connect(devUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Connected to DEV: ${devDB}`);

    // Upsert User
    if (user) {
      await User.updateOne({ _id: user._id }, { $set: user }, { upsert: true });
      console.log(`Synced User profile: ${user.nickname}`);
    }

    // Upsert Tasks
    for (const t of tasks) {
      delete t.__v;
      await DailyTask.updateOne({ _id: t._id }, { $set: t }, { upsert: true });
    }
    console.log(`Synced ${tasks.length} tasks to DEV.`);

    // Upsert Logs
    for (const l of logs) {
      delete l.__v;
      await VoiceLog.updateOne({ _id: l._id }, { $set: l }, { upsert: true });
    }
    console.log(`Synced ${logs.length} logs to DEV.`);

    // Upsert Symptoms
    for (const s of symptoms) {
      delete s.__v;
      await DailySymptom.updateOne({ _id: s._id }, { $set: s }, { upsert: true });
    }
    console.log(`Synced ${symptoms.length} symptoms to DEV.`);

    await mongoose.disconnect();
    console.log(`Sync completed successfully.`);
  } catch (err) {
    console.error(`Sync error:`, err.message);
  }
  process.exit(0);
}

syncData();

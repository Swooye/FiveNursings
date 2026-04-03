const mongoose = require('mongoose');
const { User, DailyTask, VoiceLog, DailySymptom } = require('./models');
require('dotenv').config();

const ACTIVE_ID = '698428cae828963b0019597d'; // Admin 截图中的 ID
const OLD_ID = '6986ec04c82327ca27776556';    // 我之前同步的目标 ID

async function mergeData() {
  const DB_NAME = 'fivenursing_dev';
  const BASE_URI = (process.env.MONGODB_URI?.includes('?') 
    ? process.env.MONGODB_URI.replace(/\?/, `${DB_NAME}?`) 
    : (process.env.MONGODB_URI + `${DB_NAME}?`)) + 'retryWrites=true&w=majority';

  try {
    console.log(`Connecting to: ${BASE_URI}`);
    await mongoose.connect(BASE_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`Connected to DEV database.`);

    // 1. Move all Tasks from OLD_ID to ACTIVE_ID
    const taskRes = await DailyTask.updateMany({ userId: OLD_ID }, { $set: { userId: ACTIVE_ID } });
    console.log(`Updated ${taskRes.nModified || taskRes.modifiedCount || 0} tasks to ${ACTIVE_ID}.`);

    // 2. Move all VoiceLogs from OLD_ID to ACTIVE_ID
    const logRes = await VoiceLog.updateMany({ userId: OLD_ID }, { $set: { userId: ACTIVE_ID } });
    console.log(`Updated ${logRes.nModified || logRes.modifiedCount || 0} logs to ${ACTIVE_ID}.`);

    // 3. Move all Symptoms from OLD_ID to ACTIVE_ID
    const symRes = await DailySymptom.updateMany({ userId: OLD_ID }, { $set: { userId: ACTIVE_ID } });
    console.log(`Updated ${symRes.nModified || symRes.modifiedCount || 0} symptoms to ${ACTIVE_ID}.`);

    // 4. Manually Create 4/2 symptoms for ACTIVE_ID (fatigue, appetite)
    // First, check if there's any symptom for 4/2 under ACTIVE_ID or OLD_ID
    const existingSymptom = await DailySymptom.findOne({ 
        $or: [
            { userId: ACTIVE_ID, date: '2026-04-02' },
            { userId: OLD_ID, date: '2026-04-02' }
        ] 
    });

    if (!existingSymptom) {
      await DailySymptom.create({
        userId: ACTIVE_ID,
        date: '2026-04-02',
        symptoms: ['fatigue', 'appetite'],
        createdAt: new Date('2026-04-02T10:00:00Z'),
        updatedAt: new Date()
      });
      console.log(`Manually created 4/2 symptoms for ${ACTIVE_ID}.`);
    } else {
      console.log(`Symptom record for 4/2 already exists. Updating to ensure correct content.`);
      await DailySymptom.updateOne(
        { _id: existingSymptom._id },
        { $set: { userId: ACTIVE_ID, symptoms: ['fatigue', 'appetite'], date: '2026-04-02' } }
      );
    }

    // 5. Cleanup Old User
    const delRes = await User.deleteOne({ _id: OLD_ID });
    console.log(`Deleted redundant User record ${OLD_ID}: ${delRes.deletedCount}`);

    await mongoose.disconnect();
    console.log(`Merge & Fix completed successfully.`);
  } catch (err) {
    console.error(`Merge error:`, err.message);
  }
  process.exit(0);
}

mergeData();

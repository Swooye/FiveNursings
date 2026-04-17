const mongoose = require('mongoose');
const { VoiceLog } = require('./models');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://admin:5Nursings%2BA@cluster0.k2sadls.mongodb.net/';

async function fixDates() {
  const dbs = ['fivenursing_pro', 'fivenursing_dev'];
  
  for (const dbName of dbs) {
    console.log(`\n>>> Processing database: ${dbName}`);
    const uri = MONGODB_URI.includes('?') 
      ? MONGODB_URI.replace(/\?/, `${dbName}?`) 
      : `${MONGODB_URI}${dbName}?retryWrites=true&w=majority`;
      
    try {
      const conn = await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log(`Connected to ${dbName}`);

      const logs = await VoiceLog.find({ date: { $exists: false } });
      console.log(`Found ${logs.length} logs without date field in ${dbName}.`);

      for (const log of logs) {
        const ts = log.timestamp || log.createdAt;
        if (ts) {
          const date = new Date(ts);
          // Apply UTC+8 offset if needed, but for YYYY-MM-DD it usually matches the date part
          const dateStr = date.toISOString().split('T')[0];
          log.date = dateStr;
          await log.save();
          console.log(`Updated log ${log._id}: ${dateStr}`);
        }
      }
      
      await mongoose.disconnect();
      console.log(`Disconnected from ${dbName}`);
    } catch (err) {
      console.error(`Error processing ${dbName}:`, err.message);
    }
  }
  process.exit(0);
}

fixDates();

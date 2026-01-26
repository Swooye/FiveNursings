import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected (Ready for 10M users!)');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};
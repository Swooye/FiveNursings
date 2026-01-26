import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

export const connectDB = async () => {
    console.log("正在尝试连接数据库...");
    // 打印连接串长度，确认它不是空的（不要直接打印整个串，不安全）
    console.log("URI 长度:", process.env.MONGODB_URI?.length || 0);
  
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI 未定义！请检查 GitHub Secrets 或 Firebase 配置。");
    }
  
  if (mongoose.connection.readyState >= 1) return;

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected (Ready for 10M users!)');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};
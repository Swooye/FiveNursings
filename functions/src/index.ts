import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { connectDB } from "./db";

// 初始化 Firebase 管理员 SDK
admin.initializeApp();

/**
 * [测试接口] 验证数据库连通性
 */
export const checkDatabase = functions.https.onRequest(async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({
      status: "success",
      message: "🚀 MongoDB 连接成功！可以承载千万级用户。",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: "❌ 数据库连接失败",
      error: error.message
    });
  }
});

/**
 * [业务接口] 处理 AI 护理逻辑 (Firebase Functions v2 语法)
 */
export const processNursingAI = functions.https.onCall(async (request) => {
  // v2 语法中，auth 和 data 都在 request 对象里
  const { data, auth } = request;

  // 1. 安全检查：确保用户已登录
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "必须是经过身份验证的用户才能调用此函数。"
    );
  }

  try {
    await connectDB();
    
    // 这里未来会接入 AI (Gemini/OpenRouter)
    console.log("调用者 UID:", auth.uid);
    console.log("收到的数据:", data);

    return {
      status: "success",
      reply: "后端已收到指令，数据库连接正常，AI 准备就绪。",
    };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
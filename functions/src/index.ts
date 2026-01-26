import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { connectDB } from "./db";
import { Request, Response } from "express"; // 显式导入类型

admin.initializeApp();

/**
 * [测试接口] 验证数据库连通性
 */
export const checkDatabase = functions.https.onRequest(async (req: Request, res: Response) => {
  try {
    await connectDB();
    res.status(200).json({
      status: "success",
      message: "🚀 MongoDB 连接成功！",
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
 * [业务接口] 处理 AI 护理逻辑
 */
export const processNursingAI = functions.https.onCall(async (request: functions.https.CallableRequest<any>) => {
  const { data: _data, auth } = request;

  if (!auth) {
    throw new functions.https.HttpsError("unauthenticated", "请先登录");
  }

  try {
    await connectDB();
    return {
      status: "success",
      reply: "后端已收到指令，数据库连接正常。",
    };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
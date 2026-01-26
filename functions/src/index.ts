import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { connectDB } from "./db";
import { Request, Response } from "express";

// 初始化 Firebase 管理员 SDK
admin.initializeApp();

/**
 * [测试接口] 验证数据库连通性
 * 显式声明需要使用的 secrets 并在 us-central1 区域运行
 */
export const checkDatabase = onRequest(
  { 
    region: "us-central1", 
    secrets: ["MONGODB_URI"] 
  }, 
  async (req: Request, res: Response) => {
    try {
      console.log("正在通过 checkDatabase 接口验证数据库连接...");
      await connectDB();
      res.status(200).json({
        status: "success",
        message: "🚀 MongoDB 连接成功！",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("checkDatabase 错误:", error.message);
      res.status(500).json({
        status: "error",
        message: "❌ 数据库连接失败",
        error: error.message
      });
    }
  }
);

/**
 * [业务接口] 处理 AI 护理逻辑
 * 显式声明需要使用的 secrets 并在 us-central1 区域运行
 */
export const processNursingAI = onCall(
  { 
    region: "us-central1", 
    secrets: ["MONGODB_URI"] 
  }, 
  async (request) => {
    // v2 中 data 和 auth 都在 request 对象中
    const { data, auth } = request;

    // 1. 安全检查：确保用户已登录
    if (!auth) {
      throw new Error("unauthenticated: 必须是经过身份验证的用户才能调用此函数。");
    }

    try {
      await connectDB();
      
      // 这里的 data 会承载前端传来的护理记录内容
      console.log("调用者 UID:", auth.uid);
      console.log("收到护理数据:", data);

      return {
        status: "success",
        reply: "后端已收到指令，数据库连接正常，AI 准备就绪。",
      };
    } catch (error: any) {
      console.error("processNursingAI 内部错误:", error.message);
      throw new Error(error.message);
    }
  }
);
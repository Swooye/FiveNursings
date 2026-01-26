import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { connectDB } from "./db";
import { Request, Response } from "express";

admin.initializeApp();

/**
 * [测试接口] 验证数据库连通性
 */
export const checkDatabase = onRequest(
  { region: "us-central1", secrets: ["MONGODB_URI"] }, 
  async (req: Request, res: Response) => {
    try {
      console.info("Health Check: Checking MongoDB connection..."); 
      await connectDB();
      res.status(200).json({
        status: "success",
        message: "🚀 MongoDB 已就绪",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Health Check Failed:", error.message);
      res.status(500).json({ status: "error", error: "Database connection failed" });
    }
  }
);

/**
 * [业务接口] 处理 AI 护理逻辑
 * 整合 OpenRouter 与专业护理提示词
 */
export const processNursingAI = onCall(
  { 
    region: "us-central1", 
    secrets: ["MONGODB_URI", "OPENROUTER_API_KEY"] 
  }, 
  async (request) => {
    const { data, auth } = request;

    // 1. 权限校验
    if (!auth) {
      throw new Error("unauthenticated: 请先登录。");
    }

    const userText = data.text || data.message; // 兼容前端不同的传参习惯
    if (!userText) {
      throw new Error("invalid-argument: 内容不能为空。");
    }

    try {
      // 2. 连接数据库（用于后续保存记录）
      await connectDB();
      console.log(`AI Processing for UID: ${auth.uid}`);

      // 3. 构建专业护理 Prompt
      const systemPrompt = "你是一位经验丰富的专业养老护理专家。请根据护工输入的观察记录，提供专业的分析和建议。要求：语气温和、具备医学常识、建议简洁具体（150字以内）。";

      // 4. 调用 OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fivenursings.web.app", // 你的项目地址
          "X-Title": "FiveNursings AI"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001", // 或者使用 "openai/gpt-3.5-turbo"
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText }
          ]
        })
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`OpenRouter API 响应异常: ${errorDetail}`);
      }

      const aiData = await response.json();
      const aiReply = aiData.choices[0]?.message?.content || "AI 暂时无法生成回复。";

      // 5. [扩展] 这里可以添加 Mongoose 代码将记录存入 MongoDB
      // await NursingRecord.create({ uid: auth.uid, content: userText, advice: aiReply });

      return {
        status: "success",
        reply: aiReply,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error("AI Service Error:", error.message);
      // 这里的错误会返回给前端 AIChat.tsx 的 catch 块
      throw new Error(`AI 服务异常: ${error.message}`);
    }
  }
);
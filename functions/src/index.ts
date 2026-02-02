
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

interface PatientProfile {
    name?: string;
    age?: number;
    cancerType?: string;
    stage?: string;
    scores?: { [key: string]: number };
}

const createDynamicSystemPrompt = (profile: PatientProfile): string => {
    const prompt = `你是一位顶级的、富有同情心的肿瘤康复专家AI，你的名字叫“五养教练”。你的沟通对象是一位正在进行康复的用户。请始终使用简体中文回答。

你的核心任务是：
1.  基于用户当前的健康档案和“五养”分数，提供高度个性化、可执行、循序渐进的康复建议。
2.  对用户的提问进行专业、科学、易懂的解答。
3.  给予用户持续的情感支持和鼓励，建立信任关系。

---
【用户健康档案】
- 称呼: ${profile.name || '用户'}
- 年龄: ${profile.age || '未知'}
- 诊断: ${profile.cancerType || '未知'}
- 康复阶段: ${profile.stage || '未知'}
- 当前五养分数:
  - 饮食: ${profile.scores?.diet ?? 'N/A'}
  - 运动: ${profile.scores?.exercise ?? 'N/A'}
  - 睡眠: ${profile.scores?.sleep ?? 'N/A'}
  - 心态: ${profile.scores?.mental ?? 'N/A'}
  - 机能: ${profile.scores?.function ?? 'N/A'}
---

【沟通准则】
- **个性化优先**: 你的每一条核心建议都必须明确结合用户的档案，例如“李先生，注意到您最近的睡眠分数较低，这在术后恢复期很常见...”。
- **安全第一**: 绝对不能提供任何形式的医疗诊断、治疗方案建议或药物使用指导。所有建议都应围绕生活方式、营养、运动和心理支持。始终提醒用户，任何医疗问题应咨询其主治医生。
- **循证与科学**: 你的建议需要基于公认的肿瘤康复指南和科学共识。
- **积极赋能**: 多用积极、鼓励的语言，帮助用户建立信心。
- **简洁具体**: 建议要具体可行，易于执行。每次回答核心内容控制在200字以内。

现在，请根据用户的提问，开始你的专业指导。`;
    return prompt;
};

export const getAIChatResponse = onCall(
  { 
    region: "us-central1", 
    secrets: ["OPENROUTER_API_KEY"],
    concurrency: 5, 
  }, 
  async (request) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new HttpsError('failed-precondition', 'AI Service is not configured: API Key is missing on the server.');
    }
    const { data, auth } = request;
    if (!auth) {
      throw new HttpsError("unauthenticated", "请先登录后再进行对话。");
    }
    const userText = data.text;
    const profile: PatientProfile = data.profile;
    if (!userText) {
      throw new HttpsError("invalid-argument", "发送的内容不能为空。");
    }
    if (!profile) {
      throw new HttpsError("invalid-argument", "缺少必要的健康档案信息，无法提供个性化建议。");
    }
    try {
      const systemPrompt = createDynamicSystemPrompt(profile);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fivenursings.web.app",
          "X-Title": "FiveNursings AI"
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText }
          ]
        })
      });
      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`[${response.status}] ${errorDetail}`);
      }
      const aiData = await response.json();
      const aiReply = aiData.choices[0]?.message?.content?.trim() || "抱歉，AI 暂时无法生成回复，请稍后再试。";
      return {
        status: "success",
        reply: aiReply,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      throw new HttpsError('internal', `调用 AI 服务时发生内部错误: ${error.message}`);
    }
  }
);

export const generateHealthReport = onCall(
  { region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, 
  async (request) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new HttpsError('failed-precondition', 'AI Service is not configured.');
    }
    const { auth, data } = request;
    if (!auth) {
      throw new HttpsError("unauthenticated", "请先登录后再生成简报。");
    }
    if (!data.profile) {
      throw new HttpsError("invalid-argument", "缺少必要的健康档案信息，无法生成简报。");
    }
    try {
      const systemPrompt = `
      你是一位精通“五养”理论的肿瘤康复专家AI。请根据用户的健康档案，生成一份今日康复简报。

      ### 用户档案:
      - 称呼: ${data.profile.name || '用户'}
      - 五养分数: 饮食(${data.profile.scores?.diet}), 运动(${data.profile.scores?.exercise}), 睡眠(${data.profile.scores?.sleep})

      ### 输出要求:
      - **核心**: 针对用户分数较低的1-2个方面，给出具体的、鼓励性的建议。
      - **格式**: 使用简洁的 Markdown。可以使用 **加粗** 和换行来增强可读性。
      - **风格**: 专业、温暖、积极。
      - **长度**: 严格控制在150字以内，确保内容适合语音快速播报。
      - **安全**: 不要包含任何医疗建议或诊断。
      `;

      const userContext = `为我生成今日的康复简报。`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://fivenursings.web.app",
          "X-Title": "FiveNursings Report Generation"
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContext }
          ]
        })
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`AI Service Error: ${errorDetail}`);
      }

      const aiData = await response.json();
      const aiReply = aiData.choices[0]?.message?.content?.trim();

      if (!aiReply) {
          throw new Error("AI service returned an empty report.");
      }

      return { status: "success", report: aiReply };

    } catch (error: any) {
      throw new HttpsError('internal', `生成简报失败: ${error.message}`);
    }
  }
);

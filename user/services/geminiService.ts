
import { GoogleGenAI, Type } from "@google/genai";
import { PatientProfile, TCMAnalysisResult } from "../types";

// Initialize AI with the VITE environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("An API Key must be set when running in a browser. Please create a .env file and add VITE_GEMINI_API_KEY=YOUR_API_KEY");
}
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医并升级人工。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;

const TCM_SYSTEM_INSTRUCTION = `你是一位拥有30年临床经验的中医肿瘤康复专家。你的任务是通过患者提供的舌苔（舌诊）和面部（面诊）照片进行辅助分析，并判定其“中医体质”。
体质判定标准（九种）：平和质、气虚质、阳虚质、阴虚质、痰湿质、湿热质、血瘀质、气郁质、特秉质。
分析维度：
1. 舌诊：舌质颜色（淡白、红、绛、青紫）、舌体形状（胖大、瘦薄、齿痕）、苔质与苔色。
2. 面诊：面色（青、赤、黄、白、黑）、光泽度、局部异常。
3. 体质判定：根据影像特征判定最符合的偏颇体质。
4. 康复指导：结合肿瘤康复阶段，给出调养方向。
要求：
- 语气专业、客观、严谨。
- 必须包含“主导体质”的明确结论。
- 必须声明：分析结果仅供康养参考，不作为临床诊断依据。`;

/**
 * 非流式响应（保留用于兼容性）
 */
export const generateHealthResponse = async (
  message: string, 
  profile: PatientProfile,
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = []
) => {
  try {
    const contextPrompt = `患者当前：${profile.cancerType}, 阶段：${profile.stage}, 五养状态：饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}。
    用户问题：${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: contextPrompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    return response.text || "抱歉，我现在无法回答。如果身体严重不适，请立即前往医院。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "网络繁忙，请稍后再试。如有紧急情况请直接联系医生。";
  }
};

/**
 * 流式响应接口
 */
export const generateHealthResponseStream = async (
  message: string,
  profile: PatientProfile,
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = []
) => {
  const contextPrompt = `患者当前：${profile.cancerType}, 阶段：${profile.stage}, 五养状态：饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}。
  用户问题：${message}`;

  return ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: [...history, { role: 'user', parts: [{ text: contextPrompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    },
  });
};

/**
 * 动态生成对话引导建议
 */
export const generateQuickReplies = async (
  lastAiResponse: string,
  profile: PatientProfile
): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `基于AI教练刚才的回答：\n"${lastAiResponse}"\n\n请为患者提供3个最可能的简短后续问题或指令。要求：
1. 每个建议不超过15个字。
2. 贴合肿瘤康复和“五养”体系。
3. 语气积极。
请仅返回JSON字符串数组。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    return JSON.parse(text || "[]").slice(0, 3);
  } catch (error) {
    console.error("Generate Quick Replies Error:", error);
    return ["想了解更多饮食禁忌", "推荐今天的康复运动", "如何缓解目前的焦虑"];
  }
};

/**
 * 生成个性化康复方案
 */
export interface PersonalizedPlan {
  title: string;
  summary: string;
  items: {
    category: 'diet' | 'exercise' | 'sleep' | 'mental' | 'function';
    title: string;
    description: string;
    action: string;
  }[];
}

export const generatePersonalizedPlan = async (profile: PatientProfile): Promise<PersonalizedPlan> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `基于患者当前五养评分（饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}）和疾病类型（${profile.cancerType}），生成一份包含3-4项核心建议的今日康复方案。
要求：
1. 建议必须具体、可执行。
2. 针对分数较低的项进行重点突破。
3. 语气专业且有温度。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: ['diet', 'exercise', 'sleep', 'mental', 'function'] },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  action: { type: Type.STRING }
                },
                required: ['category', 'title', 'description', 'action']
              }
            }
          },
          required: ['title', 'summary', 'items']
        }
      }
    });

    const text = response.text;
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("Generate Plan Error:", error);
    throw new Error('Failed to generate personalized plan.');
  }
};

/**
 * Perform AI TCM analysis using vision
 */
export const analyzeTCMImages = async (tongueBase64?: string, faceBase64?: string): Promise<TCMAnalysisResult> => {
  const parts: any[] = [];
  
  if (tongueBase64) {
    parts.push({
      inlineData: {
        data: tongueBase64.split(',')[1] || tongueBase64,
        mimeType: 'image/png'
      }
    });
    parts.push({ text: "请分析这张舌苔照片，重点观察舌质、舌体和苔色。" });
  }

  if (faceBase64) {
    parts.push({
      inlineData: {
        data: faceBase64.split(',')[1] || faceBase64,
        mimeType: 'image/png'
      }
    });
    parts.push({ text: "请分析这张面部照片，重点观察面色和光泽。" });
  }

  if (parts.length === 0) throw new Error("No images provided for analysis");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction: TCM_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            constitutionType: { type: Type.STRING, description: "九种体质中的一种" },
            constitutionAnalysis: { type: Type.STRING, description: "为什么判定为这种体质" },
            tongueDiagnosis: {
              type: Type.OBJECT,
              properties: {
                color: { type: Type.STRING },
                shape: { type: Type.STRING },
                coating: { type: Type.STRING },
                clinicalMeaning: { type: Type.STRING }
              },
              required: ['color', 'shape', 'coating', 'clinicalMeaning']
            },
            faceDiagnosis: {
              type: Type.OBJECT,
              properties: {
                complexion: { type: Type.STRING },
                luster: { type: Type.STRING },
                organReflex: { type: Type.STRING },
                clinicalMeaning: { type: Type.STRING }
              },
              required: ['complexion', 'luster', 'organReflex', 'clinicalMeaning']
            },
            syndromeDifferentiation: { type: Type.STRING },
            rehabAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
            dietaryTaboos: { type: Type.ARRAY, items: { type: Type.STRING }, description: "适合该体质的饮食禁忌" }
          },
          required: ['constitutionType', 'constitutionAnalysis', 'tongueDiagnosis', 'faceDiagnosis', 'syndromeDifferentiation', 'rehabAdvice', 'dietaryTaboos']
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("TCM Analysis Error:", error);
    throw new Error('Failed to analyze TCM images.');
  }
};

/**
 * Edits an image using Gemini 2.5 Flash Image
 */
export const editWellnessImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: 'image/png',
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Edit Error:", error);
    return null;
  }
};


import { PatientProfile, TCMAnalysisResult } from "../types";

// Initialize AI with the VITE environment variable
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY is missing. AI features will be disabled.");
}

const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医并升级人工。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;

const TCM_SYSTEM_INSTRUCTION = `你是一位拥有30年临床经验的中医肿瘤康复专家。你的任务是通过患者提供的症状描述、主诉、既往史以及舌面照片（如有）进行综合辨证。
要求：
- 语气专业、客观、严谨。
- 必须包含“主导体质”的明确结论。
- 必须包含“辨证分析”、“康复建议”（至少3条）和“饮食禁忌”。
- 必须声明：分析结果仅供康养参考，不作为临床诊断依据。`;

/**
 * OpenRouter Helper to call models
 */
const callOpenRouter = async (messages: any[], systemPrompt: string, responseJson = false) => {
  if (!apiKey) throw new Error("API key missing.");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://fivenursings.com", // Optional, for OpenRouter analytics
      "X-Title": "FiveNursings Rehabilitation",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001", // Unified model with backend
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      response_format: responseJson ? { type: "json_object" } : undefined,
      temperature: 0.7,
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenRouter Error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
};

/**
 * Response Generation
 */
export const generateHealthResponse = async (
  message: string, 
  profile: PatientProfile,
  history: { role: 'user' | 'model', content: string }[] = []
) => {
  try {
    const contextPrompt = `患者当前：${profile.cancerType}, 阶段：${profile.stage}, 五养状态：饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}。
    用户问题：${message}`;

    const messages = history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content }));
    messages.push({ role: "user", content: contextPrompt });

    return await callOpenRouter(messages, SYSTEM_INSTRUCTION);
  } catch (error) {
    console.error("OpenRouter API Error:", error);
    return "网络繁忙，请稍后再试。如有紧急情况请直接联系医生。";
  }
};

/**
 * Quick Replies Generation
 */
export const generateQuickReplies = async (
  lastAiResponse: string,
  profile: PatientProfile
): Promise<string[]> => {
  try {
    const prompt = `基于AI教练刚才的回答：\n"${lastAiResponse}"\n\n请为患者提供3个最可能的简短后续问题或指令。要求：
1. 每个建议不超过15个字。
2. 贴合肿瘤康复和“五养”体系。
3. 语气积极。
请仅返回JSON字符串数组。`;

    const result = await callOpenRouter([{ role: "user", content: prompt }], "You are a helpful assistant that returns JSON arrays.", true);
    return JSON.parse(result || "[]").slice(0, 3);
  } catch (error) {
    console.error("Generate Quick Replies Error:", error);
    return ["想了解更多饮食禁忌", "推荐今天的康复运动", "如何缓解目前的焦虑"];
  }
};

/**
 * Comprehensive Health Analysis
 */
export const analyzeHealthProfile = async (profile: PatientProfile): Promise<TCMAnalysisResult> => {
  const q = profile.questionnaire;
  const messages: any[] = [];
  
  let textPrompt = `请基于以下患者档案进行综合康复分析：
  病种：${profile.cancerType}
  阶段：${profile.stage}
  主诉：${q?.chiefComplaint || '无详细描述'}
  当前不适：${q?.currentDiscomfort || '无'}
  既往治疗：${q?.pastTreatments?.join(', ') || '无'}
  慢性病：${q?.chronicDiseases?.join(', ') || '无'}
  饮食习惯：${q?.lifestyle?.dietHabit || '未知'}
  五养评分：饮食${profile.scores?.diet}, 运动${profile.scores?.exercise}, 睡眠${profile.scores?.sleep}, 心理${profile.scores?.mental}, 功能${profile.scores?.function}
  
  要求（返回 JSON 对象）：
  - constitutionType: 判定体质（九体质中的最符合项）
  - constitutionAnalysis: 为什么判定为这种体质
  - tongueDiagnosis: { color: string, shape: string, coating: string, clinicalMeaning: string }
  - faceDiagnosis: { complexion: string, luster: string, organReflex: string, clinicalMeaning: string }
  - syndromeDifferentiation: 辨证结论
  - rehabAdvice: 康复建议（数组）
  - dietaryTaboos: 饮食禁忌（数组）`;

  const contentParts: any[] = [{ type: "text", text: textPrompt }];

  if (q?.tonguePhoto) {
    contentParts.push({ type: "image_url", image_url: { url: q.tonguePhoto } });
  }
  if (q?.facePhoto) {
    contentParts.push({ type: "image_url", image_url: { url: q.facePhoto } });
  }

  messages.push({ role: "user", content: contentParts });

  try {
    const result = await callOpenRouter(messages, TCM_SYSTEM_INSTRUCTION, true);
    return JSON.parse(result || "{}");
  } catch (error) {
    console.error("Health Profile Analysis Error:", error);
    throw new Error('Failed to analyze health profile.');
  }
};

export const generatePersonalizedPlan = async (profile: PatientProfile): Promise<any> => {
  try {
    const prompt = `基于患者当前五养评分（饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}）和疾病类型（${profile.cancerType}），生成一份昨日康复方案。`;
    const result = await callOpenRouter([{ role: "user", content: prompt }], SYSTEM_INSTRUCTION, true);
    return JSON.parse(result || "{}");
  } catch (error) {
    console.error("Generate Plan Error:", error);
    throw new Error('Failed to generate personalized plan.');
  }
};

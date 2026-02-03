
import React, { useState, useEffect, useRef } from 'react';
import { PatientProfile } from '../types';
import { Mic, Square, X, BrainCircuit, Volume2, Waves } from 'lucide-react';
import { createClient, LiveClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { Tool, GenerativeModel, FunctionDeclaration, Part } from '@google/generative-ai';

const PROCESSING_STAGES = [
  "正在倾听您的反馈...",
  "深入理解您的语义...",
  "分析潜在的康复需求...",
  "正在组织更人性化的语言...",
  "即将为您提供回复..."
];

interface LiveVoiceAssistantProps {
  profile: PatientProfile;
  onClose: () => void;
  onConfirmLog: (log: string) => void;
}

const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = ({ profile, onClose, onConfirmLog }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  
  const deepgramConnection = useRef<LiveClient | null>(null);
  const microphone = useRef<MediaRecorder | null>(null);
  const model = useRef<GenerativeModel | null>(null);
  const chat = useRef<any>(null); // Using 'any' for chat because the type is complex

  // Define function calling tools
  const recordLogFunction: FunctionDeclaration = {
    name: 'start_logging_intent',
    description: '当用户明确表示想要记录今天的健康状况、饮食、运动或想要把当前谈话内容存入日志/看板时调用。',
    parameters: {
      type: "OBJECT",
      properties: {
        reason: { type: "STRING", description: '用户想要记录的原因或提到的关键词' }
      }
    }
  };

  const tools: Tool[] = [{ functionDeclarations: [recordLogFunction] }];
  
  // Initialize and clean up Deepgram connection
  useEffect(() => {
    const initialize = async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      model.current = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    };
    initialize();

    return () => {
      stopSession();
    };
  }, []);

  // Handle stage cycle animation when processing
  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setProcessingStage((prev) => (prev + 1) % PROCESSING_STAGES.length);
      }, 1500);
    } else {
      setProcessingStage(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const startSession = async () => {
    if (isListening || isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stream) {
        console.error("No audio stream found.");
        return;
      }

      const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error("Deepgram API Key not found.");
        return;
      }
      
      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'zh-CN',
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
      });

      connection.on(LiveTranscriptionEvents.Open, () => {
        microphone.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        microphone.current.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        };
        microphone.current.start(250);
        setIsListening(true);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const sentence = data.channel.alternatives[0].transcript;
        if (data.is_final) {
          setTranscript(prev => `${prev} ${sentence}`.trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(sentence);
        }
      });
      
      connection.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
        if(transcript.trim()) {
           await getAIResponse(transcript);
        }
      });

      connection.on(LiveTranscriptionEvents.Close, () => console.log("Deepgram connection closed."));
      connection.on(LiveTranscriptionEvents.Error, (e) => console.error("Deepgram error:", e));
      
      deepgramConnection.current = connection;
    } catch (error) {
      console.error("Failed to start voice session:", error);
    }
  };

  const getAIResponse = async (text: string) => {
    if (!model.current) return;

    setIsListening(false);
    setIsProcessing(true);

    try {
       if (!chat.current) {
         chat.current = model.current.startChat({
           tools,
           system: `
            你是一个顶级的、富有同情心的 AI 康复教练，名叫“五养教练”。你的主要职责是与癌症康复期患者进行开放式、支持性的对话，并帮助他们记录健康日志。
            - 你的沟通风格必须是：友好、耐心、积极、充满鼓励，像一个真实的朋友。
            - **核心任务**：倾听用户的任何想法，无论是关于他们当天的感受、饮食、运动、睡眠、情绪，还是任何生活琐事。
            - **日志记录**：当用户在谈话中明确表达了想要“记录”或“记一下”今天的状况时（例如“我想记录一下今天吃了什么”或“帮我记一下今天感觉不错”），你必须调用 'start_logging_intent' 函数。在调用函数时，要在 'reason' 参数中简要说明用户想要记录的原因。
            - **禁止行为**：绝对不能提供任何医疗建议、诊断或治疗方案。如果被问到，必须委婉地拒绝并说明“我只是一个负责陪伴和记录的AI助手，任何医疗问题都需要咨询您的医生或专业康复师。”
            - **用户信息**：你知道当前用户是 ${profile.name}，${profile.age}岁，正在进行 ${profile.cancerType} 的 ${profile.treatmentStage} 康复。请在对话中适当地、自然地体现出你了解这些背景信息，让用户感到被专属服务。
            - **简化互动**：你的回答应该简洁明了，易于理解。
           `
         });
       }

      const result = await chat.current.sendMessage(text);
      const response = result.response;
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'start_logging_intent') {
            const fullLog = `${transcript} - ${aiResponse}`.trim();
            onConfirmLog(fullLog);
        }
        // If needed, you can send function results back to the model, but here we just trigger the app logic.
      } else {
        const aiText = response.text();
        setAiResponse(aiText);
        speakResponse(aiText);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = "抱歉，我的大脑好像断线了，请稍后再试。";
      setAiResponse(errorMessage);
      speakResponse(errorMessage);
    } finally {
      setIsProcessing(false);
      setTranscript('');
      setAiResponse('');
    }
  };

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.onend = () => {
        // Potentially restart listening after AI speaks
        startSession(); 
    };
    speechSynthesis.speak(utterance);
  };

  const stopSession = () => {
    if (microphone.current) {
      microphone.current.stop();
      microphone.current = null;
    }
    if (deepgramConnection.current) {
      deepgramConnection.current.finish();
      deepgramConnection.current = null;
    }
    speechSynthesis.cancel(); // Stop any ongoing speech
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setInterimTranscript('');
    setAiResponse('');
  };
  

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xl z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="text-center p-8">
        <h1 className="text-5xl font-black text-white drop-shadow-lg mb-2">{isListening ? '请讲...' : (isProcessing ? '请稍候...' : '准备就绪')}</h1>
        <p className="text-white/70 font-medium text-lg">{isProcessing ? PROCESSING_STAGES[processingStage] : '我正在听您分享今天的点滴'}</p>
      </div>

      <div className="absolute top-8 right-8">
        <button onClick={() => { stopSession(); onClose(); }} className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
          <X size={28} />
        </button>
      </div>
      
      <div className="absolute bottom-16 flex flex-col items-center space-y-8">
        <div className="w-80 h-40 bg-transparent text-white p-4 text-center flex items-center justify-center">
            {isProcessing ? 
                <p className="text-xl font-bold">{aiResponse}</p> : 
                <p className="text-2xl font-bold">{transcript} <span className="text-white/50">{interimTranscript}</span></p>
            }
        </div>
        
        <button 
            onClick={isListening ? stopSession : startSession} 
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${isListening ? 'bg-red-500' : 'bg-emerald-500'}`}
        >
          {isListening ? <Square size={40} className="text-white" /> : <Mic size={40} className="text-white" />}
        </button>
      </div>
    </div>
  );
};

export default LiveVoiceAssistant;

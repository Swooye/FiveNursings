
import React, { useState, useRef, useEffect } from 'react';
// Corrected import path
import { getAiResponse } from '../src/lib/ai'; 
import { PatientProfile, ChatSession, ChatMessage } from '../types';
import { Send, Mic, History, Plus, X, Calendar, MessageSquare, ArrowLeft, PhoneCall, AlertTriangle, ChevronRight } from 'lucide-react';

// --- Constants for Prompts ---
const SYSTEM_INSTRUCTION = `你是一位专业的肿瘤康复AI教练。基于“五治五养”体系（饮食养、运动养、睡眠养、心理养、功能养）为患者提供支持。
核心原则：
1. 只提供康养建议，不代替诊断与处方。
2. 语言通俗易懂，给出明确的可执行方案。
3. 识别“危险信号”（高热、剧痛、大出血、呼吸困难），一旦发现立即建议线下就医并升级人工。
4. 所有回答必须包含：[解释]、[今日行动建议]、[注意事项]。
5. 永远带免责声明：本建议不构成医疗诊断。`;

const WELCOME_TEXT = (name: string) => `您好，**${name}**。我是您的五养 AI 康复教练。

今天我将通过 OpenRouter 为您服务。有什么可以帮助您的吗？`;

// A simplified Markdown parser, similar to the original
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-emerald-700 dark:text-emerald-400">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-base font-black mt-3 mb-1">{parseInlineStyles(trimmed.substring(4))}</h3>;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <li key={idx} className="ml-4 list-disc">{parseInlineStyles(trimmed.substring(2))}</li>;
        const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numberedMatch) return <li key={idx} className="ml-4">{numberedMatch[1]}. {parseInlineStyles(numberedMatch[2])}</li>;
        return <p key={idx}>{parseInlineStyles(trimmed)}</p>;
      })}
    </div>
  );
};


interface AIChatProps {
  profile: PatientProfile;
  onStartVoice: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSetActiveSession: (id: string | null) => void;
  onSaveSession: (session: ChatSession) => void;
  onClearAllSessions: () => void;
  onBack: () => void;
  onStartAssessment: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ profile, onStartVoice, sessions, activeSessionId, onSetActiveSession, onSaveSession, onBack, onStartAssessment }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) setMessages(session.messages);
    } else {
      setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
    }
  }, [activeSessionId, sessions, profile.name]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText || loading) return;

    setInput('');
    const newUserMsg: ChatMessage = { role: 'user', text: messageText, timestamp: new Date().toISOString() };
    const tempAiMsg: ChatMessage = { role: 'model', text: '', timestamp: new Date().toISOString() }; // Placeholder for loading
    
    setMessages(prev => [...prev, newUserMsg, tempAiMsg]);
    setLoading(true);

    try {
      // Construct a detailed user message including profile context
      const fullUserMessage = `患者当前：${profile.cancerType}, 阶段：${profile.stage}, 五养状态：饮食${profile.scores.diet}, 运动${profile.scores.exercise}, 睡眠${profile.scores.sleep}, 心理${profile.scores.mental}, 功能${profile.scores.function}。
用户问题：${messageText}`;

      // Call the new OpenRouter function
      const responseText = await getAiResponse(fullUserMessage, SYSTEM_INSTRUCTION);

      const aiResponseMsg: ChatMessage = { role: 'model', text: responseText, timestamp: new Date().toISOString() };

      // Replace the placeholder with the actual response
      setMessages(prev => {
        const newMessages = prev.slice(0, -1); // Remove placeholder
        return [...newMessages, aiResponseMsg];
      });

      // --- Session Saving Logic ---
      const updatedMessages = [...messages, newUserMsg, aiResponseMsg];
      const sessionId = activeSessionId || `session_${Date.now()}`;
      const sessionTitle = activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.title || messageText.substring(0, 20)) : messageText.substring(0, 20);
      onSaveSession({ id: sessionId, title: sessionTitle, messages: updatedMessages, lastModified: new Date().toISOString() });
      if (!activeSessionId) onSetActiveSession(sessionId);

    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMsg: ChatMessage = { role: 'model', text: "抱歉，服务出现问题，请稍后再试。", timestamp: new Date().toISOString() };
      setMessages(prev => {
        const newMessages = prev.slice(0, -1);
        return [...newMessages, errorMsg];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => { onSetActiveSession(null); setShowHistory(false); };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* History Panel (Simplified) */}
      {showHistory && (
        <div className="absolute inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-[85%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
            <div className="p-6 pt-12 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black flex items-center space-x-2"><History size={20} /><span>对话历史</span></h3>
              <button onClick={() => setShowHistory(false)}><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button onClick={handleNewChat} className="w-full flex items-center space-x-3 p-4 rounded-2xl border-2 border-dashed text-emerald-600 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><Plus size={20} /><span>新对话</span></button>
              {sessions.sort((a,b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).map(s => (
                <button key={s.id} onClick={() => { onSetActiveSession(s.id); setShowHistory(false); }} className={`w-full text-left p-4 rounded-2xl border ${activeSessionId === s.id ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${activeSessionId === s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}><MessageSquare size={16} /></div>
                    <div className="flex-1 min-w-0"><h4 className="font-bold text-sm truncate">{s.title}</h4><p className="text-xs text-slate-400 flex items-center mt-1"><Calendar size={12} className="mr-1" />{new Date(s.lastModified).toLocaleDateString()}</p></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 p-6 pt-12 flex justify-between items-center">
        <button onClick={onBack} className="w-11 h-11 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-md">
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowHistory(true)} className="w-11 h-11 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-md">
            <History size={20} />
          </button>
          <button onClick={onStartVoice} className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <PhoneCall size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-8 pb-40 pt-32">
        {!profile.isQuestionnaireComplete && (
          <button onClick={onStartAssessment} className="w-full bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex items-center space-x-4 border border-amber-200 dark:border-amber-800">
            <div className="p-2 bg-amber-500 text-white rounded-lg"><AlertTriangle size={18} /></div>
            <div className="flex-1 text-left">
               <p className="font-bold text-amber-800 dark:text-amber-300">提示：完成康复评估</p>
               <p className="text-xs text-amber-600 dark:text-amber-400/80">提供更精准的 AI 建议</p>
            </div>
            <ChevronRight size={16} className="text-amber-400" />
          </button>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] inline-block px-5 py-4 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-600 text-white font-bold' : 'bg-white dark:bg-slate-800'}`}>
              {msg.role === 'model' ? (
                  msg.text ? <MarkdownContent content={msg.text} /> : (
                    <div className="flex space-x-1.5 items-center h-5">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  )
                ) : msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="absolute bottom-6 left-4 right-4 z-40">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-2 flex items-center space-x-2 border border-slate-200 dark:border-slate-700 shadow-2xl">
          <button className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500">
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="在此输入您的问题..."
            className="flex-1 bg-transparent border-none focus:ring-0 font-medium text-slate-800 dark:text-white"
          />
          <button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || loading} 
            className="bg-slate-800 dark:bg-emerald-500 text-white p-3 rounded-2xl disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;

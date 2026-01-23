
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateHealthResponseStream, generateQuickReplies } from '../services/geminiService';
import { PatientProfile, ChatSession, ChatMessage } from '../types';
import { Send, User, Bot, Mic, MicOff, Headphones, Sparkles, MessageSquare, ChevronRight, Zap, History, Plus, X, Calendar, Trash2, Loader2, ArrowLeft, PhoneCall, AlertTriangle } from 'lucide-react';

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

const INITIAL_SUGGESTIONS = [
  "帮我推荐今日康复午餐食谱",
  "我想解读最近的化验单异常",
  "感觉压力大该如何调节？"
];

const WELCOME_TEXT = (name: string) => `您好，**${name}**。我是您的五养 AI 康复教练。\n\n今天您的体能评分有所提升，但在饮食上有什么疑问吗？我随时为您解读病历或提供方案。\n\n### 您可以尝试问我：\n1. **个性化食谱**：为您推荐低卡高蛋白午餐。\n2. **指标分析**：深度解读您昨日的血象指标。\n3. **运动建议**：基于今日天气推荐呼吸训练计划。`;

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const parseInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 font-black text-[13px]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        if (trimmed.startsWith('### ')) return <h3 key={idx} className="text-base font-black text-slate-900 dark:text-slate-100 mt-4 mb-2 flex items-center space-x-2"><span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span><span>{parseInlineStyles(trimmed.substring(4))}</span></h3>;
        if (trimmed.startsWith('## ')) return <h2 key={idx} className="text-lg font-black text-slate-900 dark:text-slate-100 mt-5 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">{parseInlineStyles(trimmed.substring(3))}</h2>;
        if (trimmed.startsWith('# ')) return <h1 key={idx} className="text-xl font-black text-slate-900 dark:text-slate-100 mt-6 mb-4">{parseInlineStyles(trimmed.substring(2))}</h1>;
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <div key={idx} className="flex items-start space-x-3 pl-2 py-0.5"><span className="text-emerald-500 font-bold mt-1.5 shrink-0 text-[10px]">●</span><span className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed text-[13.5px]">{parseInlineStyles(trimmed.substring(2))}</span></div>;
        const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numberedMatch) return <div key={idx} className="flex items-start space-x-3 pl-2 py-0.5"><span className="text-emerald-600 dark:text-emerald-400 font-black mt-1 shrink-0 text-xs bg-emerald-50 dark:bg-emerald-900/30 w-5 h-5 flex items-center justify-center rounded-lg border border-emerald-100/50 dark:border-emerald-800">{numberedMatch[1]}</span><span className="flex-1 text-slate-700 dark:text-slate-300 leading-relaxed text-[13.5px]">{parseInlineStyles(numberedMatch[2])}</span></div>;
        return <p key={idx} className="leading-relaxed text-slate-700 dark:text-slate-300 text-[13.5px] font-medium">{parseInlineStyles(trimmed)}</p>;
      })}
    </div>
  );
};

const AIChat: React.FC<AIChatProps> = ({ profile, onStartVoice, sessions, activeSessionId, onSetActiveSession, onSaveSession, onClearAllSessions, onBack, onStartAssessment }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [showHistory, setShowHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
        setInput(transcript);
      };
      recognition.onerror = (event: any) => { setIsRecording(false); };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) recognitionRef.current?.stop();
    else { setInput(''); recognitionRef.current?.start(); }
  };

  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) setMessages(session.messages);
    } else {
      setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
      setSuggestions(INITIAL_SUGGESTIONS);
    }
  }, [activeSessionId, sessions, profile.name]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (customText?: string) => {
    const messageText = customText || input;
    if (!messageText.trim() || loading) return;
    if (!customText) setInput('');
    setSuggestions([]);
    const newUserMsg: ChatMessage = { role: 'user', text: messageText, timestamp: new Date().toISOString() };
    const tempAiMsg: ChatMessage = { role: 'model', text: '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newUserMsg, tempAiMsg]);
    setLoading(true);
    try {
      const currentHistory = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const responseStream = await generateHealthResponseStream(messageText, profile, currentHistory);
      let fullResponseText = '';
      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullResponseText += chunkText;
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', text: fullResponseText, timestamp: new Date().toISOString() };
            return newMessages;
          });
        }
      }
      const nextSuggestions = await generateQuickReplies(fullResponseText, profile);
      setSuggestions(nextSuggestions);
      const updatedMessages = [...messages, newUserMsg, { role: 'model', text: fullResponseText, timestamp: new Date().toISOString() }];
      const sessionId = activeSessionId || `session_${Date.now()}`;
      const sessionTitle = activeSessionId ? (sessions.find(s => s.id === activeSessionId)?.title || messageText.substring(0, 20)) : messageText.substring(0, 20);
      onSaveSession({ id: sessionId, title: sessionTitle, messages: updatedMessages, lastModified: new Date().toISOString() });
      if (!activeSessionId) onSetActiveSession(sessionId);
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'model', text: "网络波动，请重试。", timestamp: new Date().toISOString() };
        return newMessages;
      });
    } finally { setLoading(false); }
  };

  const handleNewChat = () => { onSetActiveSession(null); setShowHistory(false); };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-500">
      {/* History Overlay */}
      {showHistory && (
        <div className="absolute inset-0 z-[100] flex animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-[85%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-500">
            <div className="p-6 pt-12 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <History size={20} className="text-emerald-500" />
                <span>对话历史</span>
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              <button onClick={handleNewChat} className="w-full flex items-center space-x-3 p-5 rounded-[24px] border-2 border-dashed border-slate-100 dark:border-emerald-900/30 text-emerald-600 font-black text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all active:scale-95"><Plus size={20} /><span>开启新对话</span></button>
              {sessions.sort((a,b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).map(s => (
                <button key={s.id} onClick={() => { onSetActiveSession(s.id); setShowHistory(false); }} className={`w-full text-left p-4 rounded-[24px] border transition-all ${activeSessionId === s.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-500 shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${activeSessionId === s.id ? 'bg-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400'}`}><MessageSquare size={16} /></div>
                    <div className="flex-1 min-w-0"><h4 className={`font-black text-[13px] truncate ${activeSessionId === s.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{s.title}</h4><p className="text-[10px] text-slate-400 font-bold flex items-center mt-1 uppercase tracking-widest"><Calendar size={10} className="mr-1.5" />{new Date(s.lastModified).toLocaleDateString()}</p></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Header - Immersive Design */}
      <div className="fixed top-0 left-0 right-0 z-50 p-6 pt-12 flex justify-between items-center pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <button 
            onClick={onBack}
            className="w-11 h-11 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[18px] flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-800 shadow-xl active:scale-90"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-[18px] border border-slate-100 dark:border-slate-800 shadow-xl flex items-center space-x-3">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-black text-slate-800 dark:text-white tracking-tight">AI 专家连线</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 pointer-events-auto">
          <button 
            onClick={() => setShowHistory(true)}
            className="w-11 h-11 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[18px] flex items-center justify-center text-slate-400 transition-all border border-slate-100 dark:border-slate-800 shadow-xl active:scale-90"
          >
            <History size={20} />
          </button>
          <button 
            onClick={onStartVoice}
            className="w-11 h-11 bg-emerald-500 rounded-[18px] flex items-center justify-center text-white shadow-[0_10px_20px_rgba(16,185,129,0.3)] active:scale-90 transition-all"
          >
            <PhoneCall size={20} />
          </button>
        </div>
      </div>

      {/* Messages - Expanded Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-10 pb-48 pt-32 no-scrollbar">
        {/* Missing Assessment Reminder in Chat */}
        {!profile.isQuestionnaireComplete && (
          <div className="animate-in fade-in slide-in-from-top duration-700">
             <button 
              onClick={onStartAssessment}
              className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-5 rounded-[28px] flex items-center space-x-4 group active:scale-[0.98] transition-all"
             >
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/10"><AlertTriangle size={18} /></div>
                <div className="flex-1 text-left">
                   <p className="text-[13px] font-black text-amber-800 dark:text-amber-400">系统提示：缺少康复评估数据</p>
                   <p className="text-[11px] text-amber-600 dark:text-amber-500/70 font-medium">点击此处完成评估，以便 AI 教练给出更精准的建议。</p>
                </div>
                <ChevronRight size={16} className="text-amber-300" />
             </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
            <div className={`max-w-[92%] relative ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block px-6 py-5 rounded-[32px] text-sm shadow-sm transition-all ${
                msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none font-bold shadow-lg shadow-emerald-500/10' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.03)]'
              }`}>
                {msg.role === 'model' ? (
                  msg.text ? <MarkdownContent content={msg.text} /> : (
                    <div className="flex space-x-2 items-center h-6 px-2">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s]"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]"></div>
                    </div>
                  )
                ) : msg.text}
              </div>
              <div className={`text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 mt-2 ${msg.role === 'user' ? 'mr-2' : 'ml-2'}`}>
                {msg.role === 'user' ? 'Patient Input' : 'Expert Analysis'}
              </div>
            </div>
          </div>
        ))}

        {suggestions.length > 0 && !loading && (
          <div className="flex flex-wrap gap-2 pt-4 animate-in fade-in slide-in-from-left-4 duration-700">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(s)}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-emerald-600 dark:text-emerald-400 px-5 py-3 rounded-full text-[11px] font-black shadow-sm border border-slate-100 dark:border-slate-700 hover:border-emerald-300 active:scale-95 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Box - Positioned at Bottom with Blur */}
      <div className="absolute bottom-10 left-4 right-4 z-40">
        <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[36px] p-2 flex items-center space-x-3 transition-all border shadow-[0_20px_60px_rgba(0,0,0,0.15)] ${isRecording ? 'border-emerald-500 ring-8 ring-emerald-500/10' : 'border-slate-100 dark:border-slate-800'}`}>
          <button 
            onClick={toggleRecording} 
            className={`p-4 rounded-[28px] transition-all active:scale-90 ${isRecording ? 'bg-emerald-500 text-white shadow-lg animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'}`}
          >
            {isRecording ? <Mic size={22} strokeWidth={3} /> : <Mic size={22} />}
          </button>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            placeholder={isRecording ? "正在倾听..." : "输入康复疑问..."} 
            className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 h-14" 
          />
          <button 
            onClick={() => handleSend()} 
            disabled={!input.trim() || loading} 
            className="bg-slate-800 dark:bg-emerald-600 text-white p-4 rounded-[28px] shadow-lg active:scale-90 transition-all disabled:opacity-30 disabled:grayscale"
          >
            <Send size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      
      {/* Immersive background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
};

export default AIChat;

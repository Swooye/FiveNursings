
import React, { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { PatientProfile, ChatSession, ChatMessage } from '../types';
import { Send, Mic, History, Plus, X, Calendar, MessageSquare, ArrowLeft, PhoneCall, AlertTriangle, ChevronRight, Square } from 'lucide-react';
import { auth, functions } from '../src/firebase';
import { ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar } from 'recharts';

const ChartRenderer: React.FC<{ chartData: any }> = ({ chartData }) => {
  const { type, data, xAxisKey, grid, tooltip, lines, bars } = chartData;
  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%" minHeight={1}>
        {type === 'line' ? (
          <LineChart data={data}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />}
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            {tooltip && <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                borderColor: '#334155',
                borderRadius: '12px'
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />}
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {lines?.map((line: any, index: number) => <Line key={index} type={line.type} dataKey={line.dataKey} stroke={line.stroke} strokeWidth={2} />)}
          </LineChart>
        ) : (
          <BarChart data={data}>
            {grid && <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />}
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            {tooltip && <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                borderColor: '#334155',
                borderRadius: '12px'
              }}
              labelStyle={{ color: '#f1f5f9' }}
            />}
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {bars?.map((bar: any, index: number) => <Bar key={index} dataKey={bar.dataKey} fill={bar.fill} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

const WELCOME_TEXT = (name: string) => `您好，**${name || '用户'}**。我是您的五养 AI 康复教练“五养教练”。\n\n您可以向我咨询任何关于“五养”康复（饮食、运动、睡眠、心态、机能）的问题，我将根据您的个人健康档案提供个性化建议。`;

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
    const parts = content.split(/(\[CHART\].*?\[\/CHART\])/s);
    return (
        <div className="space-y-3 text-slate-800 dark:text-slate-200 leading-relaxed text-sm font-medium">
            {parts.map((part, index) => {
                if (part.startsWith('[CHART]')) {
                    try {
                        const chartJson = part.substring(7, part.length - 8);
                        const chartData = JSON.parse(chartJson);
                        return <ChartRenderer key={index} chartData={chartData} />;
                    } catch (e) {
                        console.error("Chart JSON parsing error:", e);
                        return <div key={index} className="text-red-500">[图表渲染错误]</div>;
                    }
                }
                const lines = part.split('\n');
                const parseInlineStyles = (text: string) => {
                    const elements = text.split(/(\*\*.*?\*\*)/g);
                    return elements.map((el, i) => {
                        if (el.startsWith('**') && el.endsWith('**')) {
                            return <strong key={i} className="font-black text-emerald-700 dark:text-emerald-400">{el.slice(2, -2)}</strong>;
                        }
                        return el;
                    });
                };
                return lines.map((line, idx) => {
                    const trimmed = line.trim();
                    if (trimmed === '') return <div key={`${index}-${idx}`} className="h-1" />;
                    if (trimmed.startsWith('### ')) return <h3 key={`${index}-${idx}`} className="text-base font-black mt-4 mb-2">{parseInlineStyles(trimmed.substring(4))}</h3>;
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return <li key={`${index}-${idx}`} className="ml-5 list-disc list-outside">{parseInlineStyles(trimmed.substring(2))}</li>;
                    const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
                    if (numberedMatch) return <li key={`${index}-${idx}`} className="ml-5 list-decimal list-outside">{parseInlineStyles(numberedMatch[2])}</li>;
                    return <p key={`${index}-${idx}`}>{parseInlineStyles(trimmed)}</p>;
                });
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
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasLoading = useRef(false);

  const saveCurrentSession = (currentMessages: ChatMessage[]) => {
    const lastUserMessage = currentMessages.findLast(m => m.role === 'user');
    if (!lastUserMessage) return;

    const lastModelMessage = currentMessages.findLast(m => m.role === 'model');
    if (!lastModelMessage || !lastModelMessage.text) return;

    const sessionId = activeSessionId || `session_${Date.now()}`;
    const sessionTitle = activeSessionId 
      ? (sessions.find(s => s.id === activeSessionId)?.title || lastUserMessage.text.substring(0, 20)) 
      : lastUserMessage.text.substring(0, 20);
      
    onSaveSession({ id: sessionId, title: sessionTitle, messages: currentMessages, lastModified: new Date().toISOString() });
    if (!activeSessionId) onSetActiveSession(sessionId);
  };

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) setMessages(session.messages);
    } else {
      setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
    }
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      setLoading(false);
    }
  }, [activeSessionId, sessions, profile.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (wasLoading.current && !loading) {
      saveCurrentSession(messages);
    }
    wasLoading.current = loading;
  }, [loading]);

  const handleStopStreaming = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!auth.currentUser) {
      alert("请先登录后再进行操作。");
      return;
    }
    const messageText = input.trim();
    if (!messageText) return;

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    setInput('');
    const newUserMsg: ChatMessage = { role: 'user', text: messageText, timestamp: new Date().toISOString() };
    const currentMessages = [...messages, newUserMsg];
    
    setMessages([...currentMessages, { role: 'model', text: '', timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const getAIChatResponse = httpsCallable(functions, 'getAIChatResponse');
      const response: any = await getAIChatResponse({ text: messageText, profile });
      const responseText = response.data.reply;
      
      let index = 0;
      streamIntervalRef.current = setInterval(() => {
        if (index < responseText.length) {
          const currentText = responseText.substring(0, index + 1);
          setMessages(prev => {
            const messagesWithoutLast = prev.slice(0, -1);
            const updatedLastMessage = { ...prev[prev.length - 1], text: currentText };
            return [...messagesWithoutLast, updatedLastMessage];
          });
          index++;
        } else {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          setLoading(false);
        }
      }, 30);

    } catch (error: any) {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      console.error("Firebase Function Error:", { code: error.code, message: error.message, details: error.details });
      
      let errorMessage = "抱歉，AI 服务暂时遇到问题，请稍后重试。";
      if (error.code === 'unauthenticated') {
        errorMessage = "身份验证失败，请重新登录。";
      } else if (error.code === 'invalid-argument') {
        errorMessage = "请求数据不完整，无法获取个性化建议。";
      }

      setMessages(prev => prev.slice(0, -1).concat([{ role: 'model', text: errorMessage, timestamp: new Date().toISOString() }]));
      setLoading(false);
    }
  };

  const handleNewChat = () => { onSetActiveSession(null); setShowHistory(false); };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden animate-in fade-in-25 duration-300">
      {/* History Panel */}
      {showHistory && (
        <div className="absolute inset-0 z-[100] flex animate-in fade-in-25 duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-[85%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-500">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black flex items-center space-x-2 text-slate-800 dark:text-slate-100"><History size={20} /><span>对话历史</span></h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-500 dark:text-slate-400"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button onClick={handleNewChat} className="w-full flex items-center space-x-3 p-4 rounded-2xl border-2 border-dashed text-emerald-600 dark:text-emerald-500 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><Plus size={20} /><span>新对话</span></button>
              {sessions.sort((a,b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).map(s => (
                <button key={s.id} onClick={() => { onSetActiveSession(s.id); setShowHistory(false); }} className={`w-full text-left p-4 rounded-2xl border transition-colors ${activeSessionId === s.id ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${activeSessionId === s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}><MessageSquare size={16} /></div>
                    <div className="flex-1 min-w-0"><h4 className="font-bold text-sm truncate text-slate-800 dark:text-slate-200">{s.title}</h4><p className="text-xs text-slate-400 dark:text-slate-500 flex items-center mt-1"><Calendar size={12} className="mr-1" />{new Date(s.lastModified).toLocaleDateString()}</p></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

       {/* Header */}
       <header className="absolute top-0 left-0 right-0 z-50 p-6 pt-12 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
          <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300"/>
        </button>
        <div className="text-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">五养教练</h3>
            <p className="text-xs text-emerald-600 font-bold">AI 正在提供服务</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => setShowHistory(true)} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
            <History size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-8 pb-40 pt-40">
        {!profile.isQuestionnaireComplete && (
            <button onClick={onStartAssessment} className="w-full bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex items-center space-x-4 border border-amber-200 dark:border-amber-800 animate-in fade-in">
                <div className="p-2 bg-amber-500 text-white rounded-lg"><AlertTriangle size={18} /></div>
                <div className="flex-1 text-left">
                   <p className="font-bold text-amber-800 dark:text-amber-300">立即完成康复评估</p>
                   <p className="text-xs text-amber-600 dark:text-amber-400/80">解锁更精准的 AI 个性化建议</p>
                </div>
                <ChevronRight size={16} className="text-amber-400" />
            </button>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             {msg.role === 'model' && <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg shrink-0 border-4 border-white dark:border-slate-900 shadow-sm">🤖</div>}
            <div className={`max-w-[85%] inline-block px-5 py-4 rounded-t-2xl shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white font-bold rounded-l-2xl' : 'bg-white dark:bg-slate-800 rounded-r-2xl'}`}>
              {msg.role === 'model' ? (
                  msg.text ? <MarkdownContent content={msg.text} /> : (
                    <div className="flex space-x-1.5 items-center h-5 px-2">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  )
                ) : msg.text}
            </div>
          </div>
        ))}
      </main>

      {/* Input */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-100/80 to-transparent dark:from-slate-950/80 dark:to-transparent z-40">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-2 flex items-center space-x-2 border border-slate-200 dark:border-slate-700 shadow-2xl">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder={loading ? "AI 正在回复..." : "输入您的问题..."}
            className="flex-1 bg-transparent border-none focus:ring-0 font-medium text-slate-800 dark:text-white px-3"
            disabled={loading}
          />
          <button 
            onClick={onStartVoice}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            <Mic size={20} />
          </button>
          <button 
            onClick={loading ? handleStopStreaming : handleSend} 
            disabled={!loading && !input.trim()} 
            className={`p-3 rounded-2xl disabled:opacity-50 active:scale-90 transition-all ${loading ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
            {loading ? <Square size={20} /> : <Send size={20} />}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AIChat;

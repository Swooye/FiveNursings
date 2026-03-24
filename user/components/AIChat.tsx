
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { PatientProfile, ChatMessage } from '../types';
import { Send, Mic, X, Calendar, MessageSquare, ArrowLeft, PhoneCall, AlertTriangle, ChevronRight, Square, Sparkles, Loader2, History } from 'lucide-react';
import { auth, functions } from '../src/firebase';
import { ResponsiveContainer, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar } from 'recharts';

const API_URL = import.meta.env.DEV ? "" : "https://api-u46fik5vcq-uc.a.run.app";

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
  onBack: () => void;
  onStartAssessment: () => void;
  onReadMessages: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ profile, onStartVoice, onBack, onStartAssessment, onReadMessages }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async (before?: string) => {
    if (!auth.currentUser) return;
    try {
        let endpoint = `${API_URL}/api/messages/${auth.currentUser.uid}`;
        if (before) {
            endpoint += `?before=${encodeURIComponent(before)}`;
        }
        
        const res = await fetch(endpoint);
        if (res.ok) {
            const data = await res.json();
            if (data.length < 20) setHasMore(false);
            
            if (before) {
                setMessages(prev => [...data, ...prev]);
            } else {
                setMessages(data);
                if (data.length === 0) {
                   setMessages([{ role: 'model', text: WELCOME_TEXT(profile.name), timestamp: new Date().toISOString() }]);
                }
                
                setTimeout(async () => {
                    try {
                        await fetch(`${API_URL}/api/messages/read-all/${auth.currentUser?.uid}`, { method: 'PATCH' });
                        onReadMessages();
                    } catch (e) {}
                }, 800);
            }
        }
    } catch (e) { console.error("Fetch failed", e); }
    finally {
        setIsInitialLoading(false);
        setIsHistoryLoading(false);
    }
  }, [profile.name, onReadMessages]);

  useEffect(() => {
    fetchMessages();
    return () => { if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); };
  }, [fetchMessages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !isHistoryLoading) {
      setIsHistoryLoading(true);
      const oldestMsg = messages[0];
      if (oldestMsg && oldestMsg.timestamp) {
          fetchMessages(oldestMsg.timestamp);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current && !isHistoryLoading) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isHistoryLoading]);

  const handleSend = async () => {
    if (!auth.currentUser) return;
    const messageText = input.trim();
    if (!messageText) return;

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    setInput('');
    const userMsg: ChatMessage = { role: 'user', text: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    
    setMessages(prev => [...prev, { role: 'model', text: '', timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      let responseText = "";
      
      // 精准修复：开发环境下直接请求本地 Server，避开由于 Firebase Functions 拦截引发的问题
      if (import.meta.env.DEV) {
          console.log("[DEV] Calling local API proxy /api/ai-chat");
          const res = await fetch("/api/ai-chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  prompt: messageText, 
                  userId: auth.currentUser.uid, 
                  profile 
              })
          });
          
          if (!res.ok) {
             const errText = await res.text();
             console.error("[DEV] Server returned error:", res.status, errText);
             throw new Error(`Server returned ${res.status}`);
          }
          
          const result = await res.json();
          responseText = result.reply || "我收到您的消息了。";
          
      } else {
          // 生产环境继续使用云函数
          const getAIChatResponse = httpsCallable(functions, 'getAIChatResponse');
          const response: any = await getAIChatResponse({ text: messageText, profile });
          responseText = response.data.reply;
      }
      
      let index = 0;
      streamIntervalRef.current = setInterval(() => {
        if (index < responseText.length) {
          const currentText = responseText.substring(0, index + 1);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            return [...prev.slice(0, -1), { ...last, text: currentText }];
          });
          index++;
        } else {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
          setLoading(false);
        }
      }, 25);
    } catch (error: any) {
      setLoading(false);
      console.error("Chat Error:", error);
      const errorMsg = { role: 'model' as const, text: "抱歉，由于网络问题，我现在无法回答。请检查您的连接或稍后再试。", timestamp: new Date().toISOString() };
      setMessages(prev => [...prev.slice(0, -1), errorMsg]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
       {/* Header */}
       <header className="absolute top-0 left-0 right-0 z-50 p-6 pt-12 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <button onClick={onBack} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm active:scale-90 transition-transform">
          <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300"/>
        </button>
        <div className="text-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">五养教练</h3>
            <p className="text-xs text-emerald-600 font-bold">AI 康复指导中</p>
        </div>
        <div className="w-11"></div>
      </header>

      {/* Messages */}
      <main ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 space-y-8 pb-40 pt-40 custom-scrollbar">
        {isInitialLoading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : (
            <>
                {hasMore && (
                    <div className="flex justify-center py-4">
                        {isHistoryLoading ? <Loader2 size={16} className="animate-spin text-slate-300" /> : <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest flex items-center"><History size={12} className="mr-1" /> 向上滑动加载历史</div>}
                    </div>
                )}
                {!profile.isQuestionnaireComplete && (
                    <button onClick={onStartAssessment} className="w-full bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex items-center space-x-4 border border-amber-200 dark:border-amber-800 animate-in fade-in">
                        <div className="p-2 bg-amber-500 text-white rounded-lg"><AlertTriangle size={18} /></div>
                        <div className="flex-1 text-left"><p className="font-bold text-amber-800 dark:text-amber-300 text-sm">立即完成康复评估</p><p className="text-[10px] text-amber-600">获取更精准的建议</p></div>
                        <ChevronRight size={16} className="text-amber-400" />
                    </button>
                )}
                {messages.map((msg, i) => (
                <div key={i} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-lg shrink-0 border-4 border-white dark:border-slate-900 shadow-sm">🤖</div>}
                    <div className={`max-w-[85%] inline-block px-5 py-4 rounded-t-2xl shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white font-bold rounded-l-2xl' : 'bg-white dark:bg-slate-800 rounded-r-2xl'}`}>
                    <div className="flex flex-col">
                        {(msg as any).type === 'intervention' && (
                            <div className="flex items-center space-x-1.5 mb-2 py-1 px-2 bg-emerald-500/10 rounded-lg w-fit">
                                <Sparkles size={10} className="text-emerald-500" />
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">干预建议</span>
                            </div>
                        )}
                        {msg.role === 'model' ? (
                        msg.text ? <MarkdownContent content={msg.text} /> : (
                            <div className="flex space-x-1.5 items-center h-5 px-2">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            </div>
                        )
                        ) : <p className="text-sm leading-relaxed">{msg.text}</p>}
                    </div>
                    </div>
                </div>
                ))}
            </>
        )}
      </main>

      {/* Input */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-100/80 to-transparent dark:from-slate-950/80 dark:to-transparent z-40">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-2 flex items-center space-x-2 border border-slate-200 dark:border-slate-700 shadow-2xl">
          <input 
            type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder={loading ? "AI 正在思考..." : "输入您的问题..."}
            className="flex-1 bg-transparent border-none focus:ring-0 font-medium text-slate-800 dark:text-white px-3 text-sm"
            disabled={loading}
          />
          <button onClick={onStartVoice} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 disabled:opacity-50" disabled={loading}>
            <Mic size={20} />
          </button>
          <button onClick={handleSend} disabled={loading || !input.trim()} className="p-3 rounded-2xl bg-emerald-600 text-white disabled:opacity-50 active:scale-95 transition-all">
            {loading ? <Square size={20} className="animate-pulse" /> : <Send size={20} />}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AIChat;

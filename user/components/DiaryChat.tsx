
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Check, Plus, Mic, Image as ImageIcon, Camera, PhoneCall, MapPin, X, Trash2, Send, Loader2, MicVocal, AudioLines } from 'lucide-react';
import { PatientProfile, ChatMessage } from '../types';

const API_URL = import.meta.env.DEV ? "" : "https://api-u46fik5vcq-uc.a.run.app";

interface DiaryChatProps {
    profile: PatientProfile;
    onBack: () => void;
    onComplete: (summary: string, impact: any) => void;
    isDark?: boolean;
}

const DiaryChat: React.FC<DiaryChatProps> = ({ profile, onBack, onComplete, isDark }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Greeting
    useEffect(() => {
        const name = profile.nickname || profile.name || '朋友';
        const greeting = `您好，**${name}**。我是您的日记助手，专门为您记录康复的点滴。\n\n您今天过得怎么样？午餐吃了些什么呢？也可以上传照片，我会帮您自动同步到计划中。`;
        setMessages([{ role: 'model', text: greeting, timestamp: new Date().toISOString() }]);
    }, [profile]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { role: 'user', text: input.trim(), timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
    };

    const handleFinish = async () => {
        if (messages.length <= 1) { // Only greeting
            onBack();
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/diary/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: messages, profile })
            });
            if (res.ok) {
                const data = await res.json();
                onComplete(data.summary, data.impact);
            } else {
                alert("总结失败，请稍后重试");
            }
        } catch (e) {
            console.error("Diary summary failed", e);
            alert("网络异常，总结失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-screen fixed inset-0 z-[120] max-w-md mx-auto animate-in slide-in-from-right duration-300 ${isDark ? 'bg-[#050912]' : 'bg-[#F8FAFC]'}`}>
            {/* Header */}
            <header className={`p-6 pt-12 flex justify-between items-center backdrop-blur-md border-b transition-colors duration-500 ${isDark ? 'bg-[#050912]/80 border-white/5' : 'bg-white/80 border-slate-100'}`}>
                <button onClick={onBack} className="w-11 h-11 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm active:scale-90 transition-transform">
                    <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
                </button>
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                        <h3 className="font-black text-base text-slate-800 dark:text-white tracking-tight">康复日记助手</h3>
                    </div>
                    <div className="flex items-center justify-center space-x-1 mt-0.5">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">正在记录日记</p>
                    </div>
                </div>
                <button
                    disabled={loading}
                    onClick={handleFinish}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-sm font-black disabled:opacity-50"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                    <span>完成记录</span>
                </button>
            </header>

            {/* Message List */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-5 py-4 rounded-[28px] shadow-sm relative group ${msg.role === 'user'
                            ? 'bg-emerald-600 text-white font-black rounded-tr-none'
                            : 'bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.text?.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                        return <strong key={index} className={msg.role === 'user' ? 'text-white underline' : 'text-emerald-600 dark:text-emerald-400'}>{part.slice(2, -2)}</strong>;
                                    }
                                    return part;
                                })}
                            </p>
                            <span className={`text-[8px] absolute -bottom-6 uppercase tracking-widest opacity-80 ${msg.role === 'user' ? 'right-2 text-slate-300' : 'left-2 text-slate-300'}`}>
                                {new Date(msg.timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </main>

            {/* Input Bar */}
            <footer className="p-6 pb-10">
                <div className={`relative bg-white dark:bg-[#111827] rounded-[40px] shadow-2xl border transition-all duration-500 ${isMoreMenuOpen ? 'pb-32' : 'pb-0'} ${isDark ? 'border-white/5' : 'border-slate-100'}`}>

                    {/* Expansion Menu Content */}
                    {isMoreMenuOpen && (
                        <div className="absolute top-20 left-0 right-0 px-8 py-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { icon: ImageIcon, label: '相册', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                                    { icon: Camera, label: '拍摄', color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
                                    { icon: PhoneCall, label: '语音通话', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                                    { icon: MapPin, label: '位置', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
                                ].map((item, idx) => (
                                    <button key={idx} className="flex flex-col items-center space-y-2 group">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all group-active:scale-90 ${item.color}`}>
                                            <item.icon size={22} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-tight">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-20 px-4 flex items-center space-x-3">
                        <button
                            onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
                            className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors"
                        >
                            {inputMode === 'text' ? <AudioLines size={22} /> : <X size={22} />}
                        </button>

                        <div className="flex-1 relative">
                            {inputMode === 'text' ? (
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="记一记今日康复情况..."
                                    className="w-full h-12 bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 ring-emerald-500/20 rounded-full px-6 pr-12 text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                            ) : (
                                <button
                                    onMouseDown={() => { setIsRecording(true); if (window.navigator.vibrate) window.navigator.vibrate(50); }}
                                    onMouseUp={() => setIsRecording(false)}
                                    onTouchStart={() => { setIsRecording(true); if (window.navigator.vibrate) window.navigator.vibrate(50); }}
                                    onTouchEnd={() => setIsRecording(false)}
                                    className={`w-full h-12 rounded-full font-black text-sm transition-all flex items-center justify-center space-x-2 ${isRecording ? 'bg-emerald-600 text-white scale-95' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                                >
                                    {isRecording ? <div className="flex items-center space-x-1"><div className="w-1 h-3 bg-white/50 animate-pulse"></div><div className="w-1 h-5 bg-white animate-pulse [animation-delay:0.1s]"></div><div className="w-1 h-3 bg-white/50 animate-pulse [animation-delay:0.2s]"></div><span>录制中...</span></div> : <span>按住 说话</span>}
                                </button>
                            )}
                            {inputMode === 'text' && (
                                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors">
                                    <Mic size={20} />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => input.trim() ? handleSend() : setIsMoreMenuOpen(!isMoreMenuOpen)}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isMoreMenuOpen
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 rotate-45'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'
                                }`}
                        >
                            {input.trim() ? <Send size={20} className="text-emerald-600" /> : <Plus size={24} />}
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DiaryChat;

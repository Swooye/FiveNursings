
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Phone, MoreHorizontal, Image, Mic, Paperclip, CheckCheck, Loader2, UserHeadset, Headset, Calendar, AlertCircle, Zap } from 'lucide-react';
import { PatientProfile } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
}

interface HumanCoachChatProps {
  onBack: () => void;
  profile: PatientProfile;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
}

const HumanCoachChat: React.FC<HumanCoachChatProps> = ({ onBack, profile, onUpdateProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate connection to a real coach
    const timer = setTimeout(() => {
      setIsConnecting(false);
      
      // Proactive Check-in Logic Simulation
      const lastCheckIn = localStorage.getItem('last_coach_checkin');
      const now = new Date();
      const needsProactive = !lastCheckIn || (now.getMonth() !== new Date(lastCheckIn).getMonth());
      
      const welcomeMsg: Message = {
        id: '1',
        sender: 'coach',
        text: needsProactive 
          ? `您好，${profile.name}。我是您的教练李明，这是本月的定期康复回访。我看您最近睡眠评分有所提升，但饮食记录频率略低，是有什么困扰吗？`
          : `您好，${profile.name}。我是您的专属康复教练李明。目前身体有什么不适或者需要我协助调整方案的地方吗？`,
        timestamp: now.toISOString()
      };
      
      if (needsProactive) {
        localStorage.setItem('last_coach_checkin', now.toISOString());
      }
      
      setMessages([welcomeMsg]);
    }, 2000);
    return () => clearTimeout(timer);
  }, [profile.name]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isConnecting]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Check session limits
    if (profile.coachSessionsRemaining <= 0 && !profile.isVIP) {
      setShowPaidDialog(true);
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    
    // Deduct a session if it was the first interaction of this turn
    if (messages.length === 1 && profile.coachSessionsRemaining > 0) {
      onUpdateProfile({ coachSessionsRemaining: profile.coachSessionsRemaining - 1 });
    }
  };

  const handlePayForSession = () => {
    // Simulate payment
    alert("支付成功！100元已扣除，获得1次深度咨询机会。");
    onUpdateProfile({ coachSessionsRemaining: profile.coachSessionsRemaining + 1 });
    setShowPaidDialog(false);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <header className="px-6 pt-12 pb-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Coach" className="w-full h-full" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">李明 · 康复教练</h2>
              <div className="flex items-center space-x-2">
                 <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">在线进行中</span>
                 <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">本月余额: {profile.coachSessionsRemaining}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-transform"><Phone size={18} /></button>
          <button className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-transform"><MoreHorizontal size={18} /></button>
        </div>
      </header>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {isConnecting ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">正在接入人工教练服务...</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-4 rounded-[28px] text-[13.5px] leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none font-bold' 
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none font-medium'
                  }`}>
                    {msg.text}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-2 px-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender === 'user' && <CheckCheck size={10} className="text-blue-500" />}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Paid Dialog */}
      {showPaidDialog && (
        <div className="mx-6 mb-4 p-6 bg-slate-800 dark:bg-slate-900 rounded-[32px] text-white shadow-2xl animate-in slide-in-from-bottom duration-300 border border-slate-700">
           <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl"><AlertCircle size={20} /></div>
              <h4 className="font-black text-sm tracking-tight">本月免费额度已用完</h4>
           </div>
           <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">您的本月一次免费人工咨询已结束。开通尊享会员可获得更多深度服务，或按次加购。</p>
           <div className="flex space-x-3">
              <button onClick={() => setShowPaidDialog(false)} className="flex-1 bg-slate-700 py-3 rounded-xl text-[11px] font-black">取消</button>
              <button onClick={handlePayForSession} className="flex-[2] bg-blue-600 py-3 rounded-xl text-[11px] font-black flex items-center justify-center space-x-2">
                 <Zap size={14} fill="currentColor" />
                 <span>100元/次 立即加购</span>
              </button>
           </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-5 pb-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3 mb-4 overflow-x-auto no-scrollbar py-1">
          {['发送检查单', '请求通话', '康复疑问', '饮食建议'].map(tag => (
            <button key={tag} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-[11px] font-black text-slate-500 whitespace-nowrap border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
              {tag}
            </button>
          ))}
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-[28px] p-2 flex items-center space-x-2 border border-slate-100 dark:border-slate-800 focus-within:border-blue-500/50 transition-colors">
          <button className="p-3 text-slate-400 hover:text-blue-500 transition-colors"><Image size={20} /></button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="与教练在线交流..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-300"
          />
          <button className="p-3 text-slate-400 hover:text-blue-500 transition-colors"><Mic size={20} /></button>
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-90 transition-all disabled:opacity-30"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HumanCoachChat;

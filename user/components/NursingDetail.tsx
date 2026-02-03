
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NursingScores } from '../types';
import { NURSING_ICONS } from '../constants';
import { ArrowLeft, Sparkles, TrendingUp, Info, ChevronRight, Zap, Target, BookOpen, Share2, ShieldCheck, Activity } from 'lucide-react';

interface NursingDetailProps {
  category: keyof NursingScores;
  onBack: () => void;
  currentScore: number;
}

const NursingDetail: React.FC<NursingDetailProps> = ({ category, onBack, currentScore }) => {
  // Dynamically generate the last 7 days of trend data ending today
  const trendData = useMemo(() => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const data = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      
      const offset = i === 0 ? 0 : Math.floor(Math.random() * 15) - 7;
      const score = Math.max(0, Math.min(100, currentScore + offset));
      
      data.push({
        day: i === 0 ? '今天' : days[d.getDay()],
        score: score,
      });
    }
    return data;
  }, [currentScore]);

  const categoryLabels: Record<keyof NursingScores, string> = {
    diet: '饮食调养',
    exercise: '运动调养',
    sleep: '睡眠调养',
    mental: '心理调养',
    function: '功能调养'
  };

  const categoryDescriptions: Record<keyof NursingScores, string> = {
    diet: '合理的饮食摄入是康复的基础，重点在于高蛋白、低油脂与忌口管理。',
    exercise: '适度的康复运动可增强机体免疫力，预防肺部并发症。',
    sleep: '高质量睡眠是细胞修复的关键，建议每日深度睡眠不少于 1.5 小时。',
    mental: '良好的心理状态能显著提升治疗效果，缓解复发焦虑。',
    function: '功能训练关注躯体能力的维持，包括呼吸肌训练与耐力提升。'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 animate-in slide-in-from-right duration-500 no-scrollbar">
      {/* Premium Immersive Header */}
      <div className="relative bg-slate-900 dark:bg-slate-950 pt-12 pb-28 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] -mr-32 -mt-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] -ml-20 -mb-20"></div>
        
        <header className="relative z-10 flex items-center justify-between mb-10">
          <div className="flex items-center space-x-4 text-left">
            <button onClick={onBack} className="p-2.5 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/10 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black text-white tracking-tight">{categoryLabels[category]}</h1>
          </div>
          <div className="flex space-x-2">
            <button className="p-2.5 bg-white/10 backdrop-blur-xl rounded-2xl text-white border border-white/10 active:scale-90 transition-all">
              <Share2 size={20} />
            </button>
          </div>
        </header>

        <div className="relative z-10 flex items-center justify-between text-left">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                {NURSING_ICONS[category]}
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">数据详情分析</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              {currentScore}<span className="text-lg text-white/40 ml-1">分</span>
            </h1>
            <div className="flex items-center text-emerald-400 text-[10px] font-black space-x-2">
              <TrendingUp size={12} />
              <span className="uppercase tracking-widest">超越 85% 同病种患者</span>
            </div>
          </div>

          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
              <circle cx="56" cy="56" r="48" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray={301.59} strokeDashoffset={301.59 * (1 - currentScore / 100)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-white/30 text-[8px] font-black uppercase tracking-tighter">Status</span>
               <span className="text-white font-black text-lg">良好</span>
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-16 px-5 space-y-6 relative z-20">
        {/* Trend Visualization Card - Optimized for Maximum Fill */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6 px-3">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">健康指数趋势</span>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">最近 7 日动态</h3>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
               <Activity size={18} />
            </div>
          </div>
          
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={trendData}
                margin={{ top: 10, right: 20, bottom: 0, left: 20 }}
              >
                <defs>
                  <linearGradient id="detailScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-5" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  interval={0}
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 800, letterSpacing: '-0.02em' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: '#1e293b', color: '#fff' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#detailScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 dark:bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 text-left">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] block">Expert Recovery Insight</span>
                <span className="text-base font-black tracking-tight">AI 智能康复洞察</span>
              </div>
            </div>
            
            <div className="space-y-4">
               <div className="p-5 bg-white/5 rounded-[28px] border border-white/5">
                 <p className="text-slate-300 text-[13px] leading-relaxed font-bold italic">
                   “{categoryDescriptions[category]} 您目前的评分处于<span className="text-emerald-400 font-black">上升活跃期</span>。建议本阶段继续保持目前的执行强度。”
                 </p>
               </div>
               
               <div className="flex items-center space-x-3 px-2">
                 <ShieldCheck size={16} className="text-emerald-500" />
                 <span className="text-[11px] font-bold text-slate-400">方案已根据您的确诊病种完成二级优化</span>
               </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <GuidelineCard title="康复目标" desc="维持机体活力" icon={<Target size={18} />} color="emerald" />
           <GuidelineCard title="科普知识" desc="五养核心逻辑" icon={<BookOpen size={18} />} color="blue" />
        </div>

        <div className="space-y-4 pb-12">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
              <Zap size={18} className="mr-2 text-emerald-500" />
              今日执行策略
            </h3>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action Required</span>
          </div>
          <div className="space-y-3">
             <StrategyItem title="晚间温水足浴" desc="促进末梢血液循环，缓解化疗引起的手足麻木感。" tag="提升指标" />
             <StrategyItem title="忌食生冷海鲜" desc="当前胃肠粘膜较薄，生冷食物可能引起急性腹泻。" tag="安全预警" />
          </div>
        </div>
      </div>
    </div>
  );
};

const GuidelineCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; color: string }> = ({ title, desc, icon, color }) => (
  <button className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm text-left group active:scale-95 transition-all">
    <div className={`p-2.5 rounded-xl w-fit mb-4 transition-transform group-hover:scale-110 ${
      color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
    }`}>
      {icon}
    </div>
    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{title}</div>
    <div className="text-sm font-black text-slate-800 dark:text-slate-100">{desc}</div>
  </button>
);

const StrategyItem: React.FC<{ title: string; desc: string; tag: string }> = ({ title, desc, tag }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-start space-x-4 group active:bg-slate-50 dark:active:bg-slate-800/50 transition-all cursor-pointer">
    <div className="flex-1 text-left">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h4>
        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md uppercase tracking-widest">{tag}</span>
      </div>
      <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium pr-4">{desc}</p>
    </div>
    <ChevronRight size={18} className="text-slate-200 mt-1 transition-transform group-hover:translate-x-1" />
  </div>
);

export default NursingDetail;

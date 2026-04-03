import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { NursingScores, PatientProfile, DailyTask } from '../types';
import { NURSING_ICONS } from '../constants';
import { 
  ArrowLeft, Sparkles, TrendingUp, ChevronRight, Zap, Target, BookOpen, Share2, 
  ShieldCheck, Activity, Info, PlusCircle, MinusCircle, MessageSquare
} from 'lucide-react';

interface NursingDetailProps {
  category: keyof NursingScores;
  profile: PatientProfile;
  tasks: DailyTask[];
  onBack: () => void;
  onAskCoach?: (context: string) => void;
  currentScore: number;
  isDark?: boolean;
}

const NursingDetail: React.FC<NursingDetailProps> = ({ category, profile, tasks, onBack, onAskCoach, currentScore, isDark }) => {
  const baselines: Record<string, number> = { diet: 60, exercise: 40, sleep: 70, mental: 80, function: 80 };
  const baseline = baselines[category] || 80;
  const diff = currentScore - baseline;
  const isHealthy = diff >= 0;
  const isWarning = diff < -20;
  
  const accentColor = isWarning ? 'rose' : isHealthy ? 'emerald' : 'amber';
  const accentHex = isWarning ? '#f43f5e' : isHealthy ? '#10b981' : '#f59e0b';

  // --- 1. Scoring Logic Replication (Frontend for Display) ---
  const scoringLedger = useMemo(() => {
    const base = baseline;
    const ledger: { label: string; value: number; type: 'base' | 'plus' | 'minus' }[] = [
      { label: '医学健康基准', value: base, type: 'base' }
    ];

    if (category === 'exercise') {
      const steps = profile.wearable?.steps || 0;
      if (steps >= 6000) {
        ledger.push({ label: '达标基础奖励', value: 20, type: 'plus' });
        const extra = Math.min(40, ((steps - 6000) / 4000) * 40);
        if (extra > 0) ledger.push({ label: '超量运动加成', value: Math.round(extra), type: 'plus' });
      } else if (steps >= 3000) {
        const plus = ((steps - 3000) / 3000) * 20;
        if (plus > 0) ledger.push({ label: '起步阶段激励', value: Math.round(plus), type: 'plus' });
      } else {
        const minus = Math.min(40, ((3000 - steps) / 3000) * 40);
        if (minus > 0) ledger.push({ label: '运动量严重缺口', value: -Math.round(minus), type: 'minus' });
      }
    } else if (category === 'function') {
      const functionTasks = tasks.filter(t => t.category === 'function' && t.completed);
      if (functionTasks.length > 0) ledger.push({ label: '主动康复训练奖励', value: functionTasks.length * 10, type: 'plus' });
      const symptoms = profile.todaySymptoms || [];
      if (symptoms.length > 0) ledger.push({ label: '症状状态负向反馈', value: -(symptoms.length * 15), type: 'minus' });
    }

    return ledger;
  }, [category, profile, tasks, baseline]);

  // --- 2. Dynamic Advice Factory ---
  const recoveryStrategies = useMemo(() => {
    const strategyMap: Record<string, { title: string; desc: string; tag: string }[]> = {
      exercise: [
        { title: '分段式快走', desc: '目前步数不足，建议饭后分 3 次进行 10 分钟快走，可有效降低胰岛素抵抗。', tag: '核心策略' },
        { title: '坐位膝伸展', desc: '若体力较弱，可坐在椅子上进行双腿交替水平伸展，维持大腿肌力。', tag: '辅助训练' }
      ],
      diet: [
        { title: '高蛋白营养早餐', desc: '建议增加鸡蛋、牛奶或豆浆摄入，为全天免疫细胞生成储备原料。', tag: '营养强化' },
        { title: '避免加工糖分', desc: '隐藏的工业糖分可能加重炎症反应，建议以天然水果代替甜食。', tag: '安全红线' }
      ],
      function: [
        { title: '缩唇呼吸训练', desc: '通过延长呼气时间增加气道压力，防止肺泡塌陷，建议早晚各 2 组。', tag: '呼吸机能' },
        { title: '穴位按压引导', desc: '轻按合谷、内关穴，有助于调节神经系统，缓解化疗后的功能性乏力。', tag: '中医微调' }
      ]
    };
    return strategyMap[category] || [
      { title: '保持规律生活', desc: '根据系统干预计划，保持饮食、作息与心态的动态平衡。', tag: '通用建议' }
    ];
  }, [category]);

  const trendData = useMemo(() => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const score = i === 0 ? currentScore : (currentScore + (i % 2 === 0 ? 5 : -3));
      data.push({ day: i === 0 ? '今天' : days[d.getDay()], score: Math.max(0, Math.min(100, score)) });
    }
    return data;
  }, [currentScore]);

  const categoryLabels: Record<string, string> = {
    diet: '饮食调养', exercise: '运动调养', sleep: '膏方调养', mental: '心理调养', function: '功能调养', environment: '环境调养'
  };

  const aiInsight = useMemo(() => {
    const status = currentScore >= baseline ? '稳定上扬' : '一定波动';
    const recommendation = currentScore < baseline 
      ? (category === 'exercise' ? '目前步数距离康复标准仍有缺口，建议在身体允许的情况下适度增加频次。' : `目前的${categoryLabels[category]}分值偏低，建议加强相关任务的执行力度。`)
      : '目前的方案执行效果显著，请继续保持优质的康复状态。';
    return `根据近 7 天的数据分析，您的${categoryLabels[category]}分值展现出${status}。${recommendation}`;
  }, [category, currentScore, baseline]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-32 animate-in fade-in duration-700 no-scrollbar overflow-x-hidden">
      {/* Premium Header - Airy & Breathing */}
      <div className="relative pt-10 pb-32 px-6 overflow-hidden">
        {/* Soft Ambient Glows */}
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-${accentColor}-500/10 rounded-full blur-[120px] -mr-64 -mt-64 transition-colors duration-1000`}></div>
        <div className={`absolute top-1/2 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] -ml-40 transition-colors duration-1000`}></div>

        <header className="relative z-10 flex items-center justify-between mb-12">
          <div className="flex items-center space-x-5">
            <button 
              onClick={onBack} 
              className="w-12 h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-slate-800 dark:text-white border border-slate-200/50 dark:border-white/10 shadow-sm active:scale-95 transition-all"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{categoryLabels[category]}</h1>
            </div>
          </div>
          <button className="w-12 h-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-slate-800 dark:text-white border border-slate-200/50 dark:border-white/10 shadow-sm active:scale-95 transition-all">
            <Share2 size={22} />
          </button>
        </header>

        {/* Hero Score Display */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-2">
            <div className={`flex items-center space-x-2.5 py-1.5 px-3 bg-${accentColor}-500/10 rounded-full w-fit border border-${accentColor}-500/20 shadow-sm`}>
               <Sparkles size={14} className={`text-${accentColor}-500`} />
               <span className={`text-[11px] font-black text-${accentColor}-600 dark:text-${accentColor}-400 uppercase tracking-widest`}>维度健康评分</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className={`text-7xl font-black tracking-tighter ${isHealthy ? 'text-slate-900 dark:text-white' : 'text-amber-500'} drop-shadow-sm`}>
                {currentScore}
              </h2>
              <span className="text-xl font-bold text-slate-300 dark:text-slate-700">/ 100</span>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <div className={`p-1 bg-${accentColor}-500/20 rounded-md`}>
                <TrendingUp size={14} className={`text-${accentColor}-600`} />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">目前处于{isHealthy ? '理想康复' : (isWarning ? '预警管控' : '待优化')}水平</span>
            </div>
          </div>

          {/* Artistic Icon Container */}
          <div className="relative group">
            <div className={`absolute inset-0 bg-${accentColor}-500/20 rounded-[40px] blur-2xl group-hover:scale-125 transition-transform duration-700`}></div>
            <div className="relative w-32 h-32 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[36px] border border-white/20 dark:border-white/5 flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.05)] transform-gpu hover:rotate-6 transition-transform duration-500">
               <div className="scale-[1.8] opacity-80 dark:opacity-100">{NURSING_ICONS[category]}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Region */}
      <div className="-mt-16 px-5 space-y-6 relative z-20 pb-20">
        
        {/* Glassmorphism Trend Card */}
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/5 animate-in slide-in-from-bottom-4 duration-700 delay-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className={`p-2 bg-${accentColor}-500/10 rounded-xl`}><Activity size={20} className={`text-${accentColor}-500`}/></div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">康复值趋势变化</h3>
            </div>
          </div>
          <div className="h-48 w-full -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentHex} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={accentHex} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={isDark ? '#ffffff05' : '#00000005'} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 800 }} 
                  dy={10}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    background: 'rgba(30, 41, 59, 0.8)', 
                    backdropFilter: 'blur(12px)',
                    color: '#fff', 
                    fontSize: '13px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke={accentHex} 
                  strokeWidth={4} 
                  fill="url(#scoreColor)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Improved Scoring Detail - Clean List */}
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 dark:border-white/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-700 delay-200">
           <div className="p-8 pb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center tracking-widest uppercase">
                <Target size={18} className={`mr-2.5 text-${accentColor}-500`}/>评分核心构成
              </h3>
           </div>
           <div className="px-8 pb-8 space-y-3">
              {scoringLedger.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-5 rounded-3xl transition-all hover:translate-x-1 duration-300 ${
                  item.type === 'base' ? 'bg-slate-50/80 dark:bg-slate-800/40' : 
                  item.type === 'plus' ? 'bg-emerald-50/50 dark:bg-emerald-500/10' : 'bg-rose-50/50 dark:bg-rose-500/10'
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      item.type === 'base' ? 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-400' : 
                      item.type === 'plus' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                    }`}>
                      {item.type === 'base' && <Activity size={16} />}
                      {item.type === 'plus' && <PlusCircle size={16} />}
                      {item.type === 'minus' && <MinusCircle size={16} />}
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                  </div>
                  <span className={`text-base font-black ${
                    item.type === 'base' ? 'text-slate-900 dark:text-white' : 
                    item.type === 'plus' ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {item.value > 0 && item.type !== 'base' ? `+${item.value}` : item.value}
                  </span>
                </div>
              ))}
              
              <div className="h-px bg-slate-200/50 dark:bg-slate-800/50 my-6" />
              
              <div className="flex justify-between items-center px-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">核算维度总分</span>
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{currentScore}</span>
                  <span className="text-[10px] font-black text-slate-400">分</span>
                </div>
              </div>
           </div>
        </section>

        {/* AI Insight Report Card - Redesigned for Premium Look */}
        <section className="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[44px] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-emerald-100/50 dark:border-white/5 animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-[44px]"></div>
          <div className="relative p-7">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3.5">
                <div className="relative w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none hover:scale-105 transition-transform">
                  <Sparkles size={28} />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-ping"></div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">AI 数据洞察报告</h3>
                </div>
              </div>
            </div>

            <div className="mb-10 px-1">
              <div className="flex space-x-3 mb-4">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-emerald-200 rounded-full"></div>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed font-bold italic">
                “{aiInsight}”
              </p>
            </div>

            <button 
              onClick={() => onAskCoach?.(`【AI洞察】您的${categoryLabels[category]}动态分析如下：\n\n${aiInsight}\n\n针对以上分析，您想深入了解如何优化目前的康复方案吗？`)}
              className="w-full h-18 py-5 bg-emerald-600 text-white rounded-[28px] font-black text-lg shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center space-x-3 group"
            >
              <MessageSquare size={22} className="group-hover:rotate-12 transition-transform" />
              <span>深度咨询五养教练</span>
              <ChevronRight size={18} className="opacity-60" />
            </button>
          </div>
        </section>

        {/* Optimized Dynamic Strategy Component */}
        <section className="space-y-5 pb-10 animate-in slide-in-from-bottom-4 duration-700 delay-400">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center space-x-3">
              <Zap size={20} className={`text-${accentColor}-500`} />
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">专属精准复建策略</h3>
            </div>
            <BookOpen size={18} className="text-slate-300 dark:text-slate-600" />
          </div>

          <div className="grid gap-5">
            {recoveryStrategies.map((strategy, idx) => (
               <div 
                 key={idx} 
                 className={`group bg-white dark:bg-slate-900 flex flex-col p-7 rounded-[40px] text-left relative overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-500 active:scale-[0.98] ${
                   idx === 0 ? `border-l-4 border-l-${accentColor}-500` : ''
                 }`}
               >
                 <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className={`px-4 py-1.5 bg-${accentColor}-50/50 dark:bg-${accentColor}-500/10 rounded-xl`}>
                     <span className={`text-[10px] font-black tracking-widest uppercase text-${accentColor}-600 dark:text-${accentColor}-400`}>{strategy.tag}</span>
                   </div>
                   <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600 group-hover:rotate-12 transition-transform">
                     {idx === 0 ? <Target size={18} /> : <Info size={18} />}
                   </div>
                 </div>
                 <h4 className="text-slate-900 dark:text-white font-black text-lg mb-2.5 relative z-10">{strategy.title}</h4>
                 <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-bold relative z-10">{strategy.desc}</p>
                 
                 {/* Decorative background element */}
                 <div className={`absolute top-0 right-0 w-32 h-32 bg-${accentColor}-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -mr-16 -mt-16`}></div>
               </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// Simplified export to match the rest of the app's pattern
export default NursingDetail;

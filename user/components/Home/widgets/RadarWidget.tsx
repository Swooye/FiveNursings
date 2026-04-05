import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { PatientProfile } from '../../../types';

interface RadarWidgetProps {
  profile: PatientProfile;
  onSync: () => void;
  isSyncing: boolean;
  isDark?: boolean;
}

const RadarWidget: React.FC<RadarWidgetProps> = ({ profile, onSync, isSyncing, isDark }) => {
  // 使用动态下发的健康基准线，若无则使用默认基准
  // 统一康复基准线为 70%，形成规则的参考区域，避免视觉上的“畸形”和断裂感
  const baselines = {
    diet: 70,
    exercise: 70,
    sleep: 70,
    mental: 70,
    function: 70
  };

  const chartData = [
    { subject: '饮食', A: profile.scores.diet, B: baselines.diet },
    { subject: '运动', A: profile.scores.exercise, B: baselines.exercise },
    { subject: '睡眠', A: profile.scores.sleep, B: baselines.sleep },
    { subject: '心理', A: profile.scores.mental, B: baselines.mental },
    { subject: '功能', A: profile.scores.function, B: baselines.function },
  ];

  const avgScore = profile.coreRecoveryIndex || Math.round(
    (profile.scores.diet + profile.scores.exercise + profile.scores.sleep + profile.scores.mental + profile.scores.function) / 5
  ) || 84.2;

  // 使用动态下发的康复变动率，或显示默认
  const dailyChange = profile.dailyChange || "0.0%";

  return (
    <div className="bg-white dark:bg-[#111827] rounded-[48px] p-8 shadow-sm border border-slate-100 dark:border-white/5 relative overflow-hidden backdrop-blur-xl">
      {/* 装饰性光晕 */}
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px]"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">康复指数</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="font-black text-slate-800 dark:text-slate-100 tracking-tighter leading-none" style={{ fontSize: '3.2rem' }}>
                {avgScore}
            </span>
            <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-black bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100/50 dark:border-emerald-800">
              <TrendingUp size={16} className="mr-1" />{dailyChange}
            </div>
          </div>
        </div>
        <button onClick={onSync} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all btn-active-scale border border-slate-100 dark:border-slate-800/50">
          <RefreshCw size={28} className={isSyncing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="h-80 min-h-[320px] w-full flex items-center justify-center relative z-10">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="82%" 
            data={chartData}
            margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
          >
            <PolarGrid stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)"} gridType="polygon" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 800 }} 
            />
            {/* 康复基准线 - 采用统一 70 分参考线，且 fillOpacity={0} 强制闭合路径 */}
            <Radar 
              name="Baseline" 
              dataKey="B" 
              stroke={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"} 
              strokeWidth={2} 
              strokeDasharray="4 4"
              fill={isDark ? "#fff" : "#000"} 
              fillOpacity={0}
              isAnimationActive={false}
              dot={false}
            />
            {/* 今日当前状态 - 实线层 */}
            <Radar 
              name="Current" 
              dataKey="A" 
              stroke="#10b981" 
              strokeWidth={3} 
              fill="#10b981" 
              fillOpacity={isDark ? 0.15 : 0.1}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 图例说明 */}
      <div className="flex justify-center items-center space-x-6 mt-2 opacity-60">
        <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-emerald-500"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">当前状态</span>
        </div>
        <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 border-b border-dashed border-slate-400"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">健康基准线</span>
        </div>
      </div>
    </div>
  );
};

export default RadarWidget;

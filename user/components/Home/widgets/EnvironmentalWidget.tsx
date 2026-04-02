import React from 'react';
import { Wind, Sun, CloudRain, Thermometer, Info } from 'lucide-react';
import { PatientProfile } from '../../../types';
import { StatusPill } from './Shared';

interface EnvironmentalWidgetProps {
  profile: PatientProfile;
}

const EnvironmentalWidget: React.FC<EnvironmentalWidgetProps> = ({ profile }) => {
  const envScore = profile.scores.environment || 85;
  
  // 模拟从 profile 中提取的环境标签，实际可从后端分析接口返回
  const airQuality = "优 (AQI 32)";
  const recommendation = envScore >= 80 ? "空气质量极佳，建议今日下午进行 20 分钟户外慢走。" : 
                        envScore >= 60 ? "环境适中，外出请注意温差，防止感冒。" :
                        "室内空气质量欠佳，建议开启空气净化器并避免长时间户外活动。";

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-emerald-500/10 dark:from-blue-500/5 dark:to-emerald-500/5 rounded-[48px] p-8 border border-blue-100 dark:border-white/5 relative overflow-hidden backdrop-blur-3xl group">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex flex-col text-left">
          <span className="text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.3em] mb-2">环境康复养护</span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">为您守护外部屏障</h3>
        </div>
        <StatusPill score={envScore} baseline={60} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
        <div className="bg-white/60 dark:bg-white/5 p-5 rounded-[32px] flex items-center space-x-4 border border-white/50 dark:border-white/5">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Wind size={20} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">空气质量</p>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{airQuality}</p>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-white/5 p-5 rounded-[32px] flex items-center space-x-4 border border-white/50 dark:border-white/5">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Sun size={20} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">紫外线</p>
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">弱 (适宜外出)</p>
          </div>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-white/5 rounded-[32px] p-6 border border-white/40 dark:border-white/5 flex items-start space-x-4 relative z-10">
        <div className="mt-1 text-blue-500 dark:text-blue-400">
          <Info size={18} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-left flex-1 italic">
          "{recommendation}"
        </p>
      </div>
    </div>
  );
};

export default EnvironmentalWidget;

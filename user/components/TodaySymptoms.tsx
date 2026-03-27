import React from 'react';
import { Stethoscope, Ghost, CloudDrizzle, Utensils, Thermometer } from 'lucide-react';

const symptoms = [
  { name: '疲劳乏力', icon: <Ghost size={32} className="text-slate-400" /> },
  { name: '局部疼痛', icon: <CloudDrizzle size={32} className="text-slate-400" /> },
  { name: '恶心呕吐', icon: <Utensils size={32} className="text-slate-400" /> },
  { name: '身体发热', icon: <Thermometer size={32} className="text-slate-400" /> },
];

const TodaySymptoms: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-[32px] p-8 my-6 border border-slate-100 dark:border-white/5 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Stethoscope size={22} className="text-emerald-500" />
          <h2 className="text-lg font-black ml-2 text-slate-800 dark:text-white tracking-tight">今日症状</h2>
        </div>
        <button className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-emerald-500 transition-colors">
          症状追踪
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {symptoms.map((symptom, index) => (
          <button key={index} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-[#1F2937] border border-transparent dark:border-white/5 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all group">
            <div className="mb-3 transition-transform group-hover:scale-110 duration-300 opacity-80 group-hover:opacity-100">{symptom.icon}</div>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">{symptom.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TodaySymptoms;

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 my-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Stethoscope size={24} className="text-emerald-500" />
          <h2 className="text-lg font-bold ml-2 text-slate-800 dark:text-slate-200">今日症状</h2>
        </div>
        <button className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-500">
          症状追踪
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {symptoms.map((symptom, index) => (
          <button key={index} className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
            <div className="mb-2">{symptom.icon}</div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{symptom.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TodaySymptoms;

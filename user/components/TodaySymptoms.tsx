import React from 'react';
import { Stethoscope, Ghost, CloudDrizzle, Utensils, Thermometer, Check, UtensilsCrossed, MoonStar } from 'lucide-react';

const symptomsData = [
  { id: 'fatigue', name: '疲劳乏力', icon: Ghost },
  { id: 'pain', name: '局部疼痛', icon: CloudDrizzle },
  { id: 'nausea', name: '恶心呕吐', icon: Utensils },
  { id: 'fever', name: '身体发热', icon: Thermometer },
  { id: 'appetite', name: '食欲不振', icon: UtensilsCrossed },
  { id: 'sleep', name: '入睡困难', icon: MoonStar },
];

interface TodaySymptomsProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const TodaySymptoms: React.FC<TodaySymptomsProps> = ({ selectedIds, onChange }) => {
  const toggleSymptom = (id: string) => {
    const newIds = selectedIds.includes(id) 
      ? selectedIds.filter(i => i !== id) 
      : [...selectedIds, id];
    onChange(newIds);
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-[32px] p-8 my-6 border border-slate-100 dark:border-white/5 shadow-sm">
      <div className="flex justify-between items-center mb-6 px-1">
        <div className="flex items-center">
          <Stethoscope size={22} className="text-emerald-500" />
          <h2 className="text-lg font-black ml-2 text-slate-800 dark:text-white tracking-tight">今日症状</h2>
        </div>
        <button className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-emerald-500 transition-colors">
          症状追踪
        </button>
      </div>

      <div className="flex space-x-4 overflow-x-auto no-scrollbar py-4 px-8 -mx-8">
        {symptomsData.map((symptom) => {
          const isSelected = selectedIds.includes(symptom.id);
          const Icon = symptom.icon;
          
          return (
            <button 
              key={symptom.id} 
              onClick={() => toggleSymptom(symptom.id)}
              className={`flex flex-col items-center justify-center min-w-[104px] h-[148px] p-4 rounded-[32px] transition-all duration-300 relative border-2 ${
                isSelected 
                  ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-500 shadow-lg scale-105' 
                  : 'bg-white dark:bg-[#1F2937] border-slate-50 dark:border-white/5 shadow-sm hover:border-emerald-200'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 bg-emerald-500 rounded-full p-0.5 shadow-sm animate-in zoom-in-50 duration-300">
                  <Check size={10} className="text-white" strokeWidth={4} />
                </div>
              )}
              
              <div className={`mb-4 transition-all duration-500 ${
                isSelected ? 'text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-slate-400 dark:text-slate-500'
              }`}>
                <Icon size={32} strokeWidth={1.5} />
              </div>
              
              <span className={`text-[13px] font-black tracking-tight whitespace-nowrap transition-colors duration-300 ${
                isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
              }`}>
                {symptom.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TodaySymptoms;

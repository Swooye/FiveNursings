import React from 'react';
import { Play } from 'lucide-react';

interface ReportBannerWidgetProps {
  onStartReport: () => void;
}

const ReportBannerWidget: React.FC<ReportBannerWidgetProps> = ({ onStartReport }) => {
  return (
    <button 
      onClick={onStartReport}
      className="w-full bg-slate-800 dark:bg-[#111827] rounded-[36px] p-7 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group btn-active-scale transition-all border border-slate-700 dark:border-white/5"
    >
      <div className="relative z-10 flex justify-between items-center text-left">
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Personal Broadcast</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">收听康复简报</h2>
          <p className="text-slate-400 text-xs mt-1 font-bold">林教练已为您准备好今日洞察</p>
        </div>
        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform duration-500">
          <Play fill="white" size={28} className="ml-1 text-white" />
        </div>
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
    </button>
  );
};

export default ReportBannerWidget;

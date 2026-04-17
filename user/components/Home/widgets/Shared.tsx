import React from 'react';
import { ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export const StatusPill: React.FC<{ 
  score: number, 
  baseline: number, 
  labelOverride?: string,
  severity?: 'normal' | 'warning' | 'critical'
}> = ({ score, baseline, labelOverride, severity }) => {
  const diff = score - baseline;
  
  let label = labelOverride || '已达标';
  let colorClass = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
  let Icon = CheckCircle2;

  // Determine severity if not explicitly provided
  const effectiveSeverity = severity || (diff < -20 ? 'critical' : diff < 0 ? 'warning' : 'normal');

  if (effectiveSeverity === 'critical') {
    label = labelOverride || '警示';
    colorClass = 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
    Icon = XCircle;
  } else if (effectiveSeverity === 'warning') {
    label = labelOverride || '待提高';
    colorClass = 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
    Icon = AlertCircle;
  }

  return (
    <div className={`flex items-center px-3 py-1.5 rounded-full border text-[11px] font-black tracking-widest uppercase shrink-0 space-x-1 ${colorClass}`}>
      <Icon size={12} />
      <span>{label}</span>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  score: number;
  baseline: number;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isHighlighted?: boolean;
  horizontal?: boolean;
  statusOverride?: string;
  severity?: 'normal' | 'warning' | 'critical';
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, score, baseline, label, icon, onClick, isHighlighted, horizontal, statusOverride, severity }) => {
  const diff = score - baseline;
  
  // Calculate effective severity for background colors
  const effectiveSeverity = severity || (diff < -20 ? 'critical' : diff < 0 ? 'warning' : 'normal');
  
  const isHealthy = effectiveSeverity === 'normal';
  const isCritical = effectiveSeverity === 'critical';
  const isWarning = effectiveSeverity === 'warning';
  
  const accentColor = isCritical ? 'rose' : isWarning ? 'amber' : 'emerald';
  const accentHex = isCritical ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981';

  const borderClasses: Record<string, string> = {
    rose: 'border-rose-200/50 dark:border-rose-500/20',
    emerald: 'border-emerald-200/50 dark:border-emerald-500/20',
    amber: 'border-amber-200/50 dark:border-amber-500/20'
  };

  const highlightBorderClasses: Record<string, string> = {
    rose: 'border-rose-500',
    emerald: 'border-emerald-500',
    amber: 'border-amber-500'
  };

  return (
    <button onClick={onClick} className={`p-8 rounded-[48px] border-2 transition-all active:scale-[0.97] group w-full relative overflow-hidden flex flex-col items-start ${
      isHighlighted ? `bg-${accentColor}-50 dark:bg-${accentColor}-500/10 ${highlightBorderClasses[accentColor]} shadow-xl scale-105 z-10` : 
      !isHealthy ? `bg-${accentColor}-50/30 dark:bg-${accentColor}-900/5 ${borderClasses[accentColor]} shadow-sm` :
      `bg-white dark:bg-[#111827] border-slate-50 dark:border-white/5 shadow-sm hover:border-emerald-200/50`
    }`}>
      <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] -mr-16 -mt-16 opacity-10 transition-colors ${
        isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
      }`}></div>
      
      <div className="flex w-full justify-between items-start relative z-10 mb-6">
        <div className={`p-2 rounded-2xl bg-slate-50 dark:bg-white/5 text-${accentColor}-500 dark:text-${accentColor}-400 transition-transform group-hover:scale-110 scale-125`}>
          {icon}
        </div>
        <StatusPill score={score} baseline={baseline} labelOverride={statusOverride} severity={severity} />
      </div>
      
      <div className={`relative z-10 w-full text-left flex ${horizontal ? 'flex-row items-center justify-between' : 'flex-col'}`}>
        <div className="flex flex-col flex-1 space-y-3">
          <div className="text-base text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">{title}</div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className={`text-6xl font-black tracking-tight leading-none ${
                isCritical ? 'text-rose-600 dark:text-rose-400' : 
                isHealthy ? 'text-slate-800 dark:text-white' : 
                'text-amber-600 dark:text-amber-400'
              }`}>{Math.round(score)}</span>
              <ChevronRight size={24} className={`text-slate-200 dark:text-slate-700 group-hover:text-${accentColor}-500 group-hover:translate-x-1 transition-all`} />
            </div>
          </div>
          <div className="text-sm text-slate-400 dark:text-slate-500 font-black truncate tracking-tight opacity-90 mt-4">{label}</div>
        </div>
        
        {horizontal && (
          <div className="flex items-end space-x-2 h-16 ml-8 pb-1 shrink-0">
            {[40, 55, 48, 62, 58, 70, score].map((h, i) => (
              <div key={i} className={`w-2 rounded-full transition-all duration-1000 ${
                i === 6 ? `bg-${accentColor}-500 shadow-[0_0_15px_${accentHex}cc]` : `bg-${accentColor}-500 opacity-20`
              }`} style={{ height: `${(h / 100) * 100}%` }}></div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

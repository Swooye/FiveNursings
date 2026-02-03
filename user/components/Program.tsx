
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DailyTask, VoiceLog } from '../types';
import { NURSING_ICONS } from '../constants';
import { Check, Calendar as CalendarIcon, Mic, Sparkles, ChevronRight, History, Info, X, ChevronLeft } from 'lucide-react';

interface ProgramProps {
  onStartVoice: () => void;
  recentLogs: VoiceLog[];
  onViewJournal: () => void;
}

const Program: React.FC<ProgramProps> = ({ onStartVoice, recentLogs, onViewJournal }) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dateStrip = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);

  // Optimized scroll logic to ensure 'Today' is centered on first mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
        if (selectedEl) {
          selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }, 150); // Small delay to wait for tab transition animations
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const [tasks, setTasks] = useState<DailyTask[]>([
    { id: '1', category: 'diet', title: '早起温开水 200ml', time: '07:00', completed: true, description: '唤醒肠胃，促进新陈代谢。' },
    { id: '2', category: 'function', title: '呼吸功能训练', time: '08:30', completed: false, description: '深慢呼吸 10 组，增强肺部代偿。' },
    { id: '3', category: 'exercise', title: '慢走 20 分钟', time: '10:00', completed: false, description: '林主任建议：心率保持在 105 以下。' },
    { id: '4', category: 'diet', title: '优质蛋白补给', time: '12:00', completed: false, description: '鱼肉或豆腐，忌重油重盐。' },
    { id: '5', category: 'mental', title: '午间情绪冥想', time: '14:00', completed: false, description: '闭目聆听白噪音，放松紧绷神经。' },
  ]);

  const toggleTask = (id: string) => {
    if (selectedDate.getTime() !== today.getTime()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const filteredLogs = useMemo(() => {
    return recentLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === selectedDate.getTime();
    });
  }, [recentLogs, selectedDate]);

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);
  const isToday = selectedDate.getTime() === today.getTime();

  const getDayName = (date: Date) => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (date.getTime() === today.getTime()) return '今日';
    return days[date.getDay()];
  };

  return (
    <div className="p-5 space-y-6 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500 relative transition-colors duration-300">
      {showCalendar && (
        <CalendarPicker 
          selectedDate={selectedDate} 
          onSelect={(d) => { setSelectedDate(d); setShowCalendar(false); }} 
          onClose={() => setShowCalendar(false)}
          today={today}
        />
      )}

      {/* Date Navigation Header */}
      <div className="flex items-center space-x-3">
        <div ref={scrollRef} className="flex-1 flex space-x-2.5 overflow-x-auto no-scrollbar py-2 pr-2">
          {dateStrip.map((date) => {
            const isSelected = date.getTime() === selectedDate.getTime();
            const isTodayItem = date.getTime() === today.getTime();
            return (
              <button
                key={date.toISOString()}
                data-selected={isSelected}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center min-w-[54px] h-20 rounded-[24px] transition-all duration-300 shrink-0 border-2 ${
                  isSelected 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg scale-105' 
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-200 shadow-sm'
                }`}
              >
                <span className={`text-[9px] font-black mb-1.5 uppercase tracking-tighter ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-60'}`}>
                  {getDayName(date)}
                </span>
                <span className="text-lg font-black">{date.getDate()}</span>
                {isTodayItem && (
                  <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-emerald-500' : 'bg-emerald-500'}`}></div>
                )}
              </button>
            );
          })}
        </div>
        <button 
          onClick={() => setShowCalendar(true)}
          className="w-14 h-20 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm active:scale-95 transition-transform shrink-0"
        >
          <CalendarIcon size={22} />
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative group">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {isToday ? '今日康复进度' : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日回顾`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
              {isToday ? `已完成 ${completedCount}/${tasks.length} 项任务` : '历史康复数据已归档'}
            </p>
          </div>
          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
            {isToday ? progressPercent : 100}%
          </div>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full relative z-10 overflow-hidden p-0.5">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
            style={{ width: `${isToday ? progressPercent : 100}%` }}
          ></div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
      </div>

      {/* Voice Entry */}
      {isToday ? (
        <div 
          onClick={onStartVoice}
          className="bg-slate-800 dark:bg-slate-900 rounded-[32px] p-7 text-white shadow-2xl shadow-slate-200/50 dark:shadow-none cursor-pointer group active:scale-95 transition-all relative overflow-hidden border border-slate-700"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
                  <Mic size={22} className="text-white" />
                </div>
                <span className="text-lg font-black tracking-tight">语音更新康复看板</span>
              </div>
              <Sparkles size={18} className="text-emerald-400 animate-pulse" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed font-bold">
              林教练将为您分析今日动态并同步至您的健康评分。
            </p>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-3xl -ml-10 -mb-10"></div>
        </div>
      ) : (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800">
            <History size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">历史回顾模式</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              {selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
            <History size={18} className="mr-2 text-slate-400 dark:text-slate-600" />
            康复动态
          </h3>
          <button 
            onClick={onViewJournal}
            className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3.5 py-1.5 rounded-full border border-emerald-100/50 dark:border-emerald-800/50 uppercase tracking-wider"
          >
            查看全志
          </button>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="space-y-4">
            {filteredLogs.map(log => (
              <div key={log.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <Mic size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg shadow-emerald-500/10 dark:shadow-none">
                    +{log.impact.change} 指标提升
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic">“{log.summary}”</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800 border-dashed text-center">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl mx-auto flex items-center justify-center text-slate-300 dark:text-slate-700 mb-3">
              <Info size={24} />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold italic">该日期下没有记录任何康复日志</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-slate-800 dark:text-slate-100 ml-1 tracking-tight flex items-center">
          <Check size={18} className="mr-2 text-emerald-500" />
          每日必做任务
        </h3>
        {tasks.map(task => (
          <div 
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`flex items-center space-x-5 p-6 rounded-[36px] transition-all cursor-pointer border ${
              task.completed 
              ? 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60' 
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-emerald-200'
            } ${!isToday ? 'cursor-default pointer-events-none' : ''}`}
          >
            <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              task.completed ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-105' : 'bg-slate-50 dark:bg-slate-800 text-emerald-600'
            }`}>
              {task.completed ? <Check size={26} strokeWidth={4} /> : NURSING_ICONS[task.category]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5">
                <h4 className={`font-black text-base truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {task.title}
                </h4>
                <div className={`text-[10px] font-black uppercase tracking-widest ${task.completed ? 'text-slate-300' : 'text-slate-400'}`}>
                  {task.time}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 pr-4">{task.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarPicker: React.FC<{ 
  selectedDate: Date; 
  today: Date;
  onSelect: (date: Date) => void; 
  onClose: () => void 
}> = ({ selectedDate, today, onSelect, onClose }) => {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const daysInMonth = useMemo(() => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
    return d.getDate();
  }, [viewMonth]);

  const startDay = useMemo(() => {
    return new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  }, [viewMonth]);

  const monthName = viewMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{monthName}</h3>
          <div className="flex space-x-2">
            <button onClick={prevMonth} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><ChevronRight size={20} /></button>
            <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 ml-2"><X size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-8">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1);
            const isSelected = date.getTime() === selectedDate.getTime();
            const isToday = date.getTime() === today.getTime();
            const isFuture = date.getTime() > today.getTime();

            return (
              <button
                key={i}
                disabled={isFuture}
                onClick={() => onSelect(date)}
                className={`aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all border-2 ${
                  isSelected 
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-md scale-110' 
                  : isToday 
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 border-emerald-100' 
                    : isFuture 
                      ? 'text-slate-100 dark:text-slate-800 border-transparent' 
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 border-transparent'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => onSelect(today)}
          className="w-full bg-slate-100 dark:bg-slate-800 py-4 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-200 transition-colors"
        >
          回到今天
        </button>
      </div>
    </div>
  );
};

export default Program;

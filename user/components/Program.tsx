
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DailyTask, VoiceLog, PatientProfile } from '../types';
import { NURSING_ICONS } from '../constants';
import { Check, Calendar as CalendarIcon, Mic, Sparkles, ChevronRight, History, Info, X, ChevronLeft, Plus, TrendingUp, Clock, ShieldOff, Eye, EyeOff, Trash2, Wand2, Bell } from 'lucide-react';
import TodaySymptoms from './TodaySymptoms';

interface ProgramProps {
  profile: PatientProfile;
  tasks: DailyTask[];
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<DailyTask>) => void;
  onGeneratePlan: () => void;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
  onStartVoice: () => void;
  recentLogs: VoiceLog[];
  onViewJournal: () => void;
  onAddDiary: () => void;
  isDark?: boolean;
}

const Program: React.FC<ProgramProps> = ({ profile, tasks, onToggleTask, onUpdateTask, onGeneratePlan, onUpdateProfile, onStartVoice, recentLogs, onViewJournal, onAddDiary, isDark }) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [showInfeasible, setShowInfeasible] = useState(false);
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

  const toggleTask = (id: string) => {
    if (selectedDate.getTime() !== today.getTime()) return;
    onToggleTask(id);
  };

  const filteredLogs = useMemo(() => {
    return recentLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === selectedDate.getTime();
    });
  }, [recentLogs, selectedDate]);

  const infeasibleTasks = tasks.filter(t => t.isInfeasible);
  const visibleTasks = tasks.filter(t => !t.isInfeasible);
  const displayedTasks = showInfeasible ? tasks : visibleTasks;

  const completedCount = visibleTasks.filter(t => t.completed).length;
  const progressPercent = Math.round((completedCount / (visibleTasks.length || 1)) * 100);
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
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-lg scale-105' 
                  : 'bg-white dark:bg-[#111827] text-slate-400 dark:text-slate-500 border-slate-100 dark:border-white/5 hover:border-emerald-200'
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
          className="w-14 h-20 rounded-[24px] bg-white dark:bg-[#111827] border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 active:scale-95 transition-transform shrink-0"
        >
          <CalendarIcon size={22} />
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white dark:bg-[#111827] rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden relative group">
        <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              {isToday ? '今日康复进度' : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日回顾`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
              {isToday ? `已完成 ${completedCount}/${visibleTasks.length} 项任务` : '历史康复数据已归档'}
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


      
      {isToday && (
        <TodaySymptoms 
          selectedIds={profile.todaySymptoms || []} 
          onChange={(ids) => onUpdateProfile({ todaySymptoms: ids, lastSymptomUpdate: new Date().toISOString() })} 
        />
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center">
            <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
              <History size={18} className="mr-2 text-slate-400 dark:text-slate-600" />
              康复日记
            </h3>
            <button 
              onClick={onAddDiary}
              className="ml-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform"
            >
              <Plus size={18} />
            </button>
          </div>
          <button 
            onClick={onViewJournal}
            className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-500/10 uppercase tracking-widest hover:bg-emerald-100 transition-colors"
          >
            查看全部
          </button>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="relative pl-3">
            {/* 竖向时间轴线 - 仅在多条记录时显示 */}
            {filteredLogs.length > 1 && (
              <div className="absolute left-[30px] top-12 bottom-12 w-[1.5px] bg-gradient-to-b from-emerald-500/50 via-slate-200 to-transparent z-0" />
            )}
            
            <div className="space-y-6 relative z-10">
              {[...filteredLogs]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((log, index) => (
                <div key={log.id} className="relative pl-11 group">
                  {/* 时间轴节点 (图标) */}
                  <div className={`absolute left-0 top-4 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg z-20 transition-transform group-hover:scale-110 ${
                    index === 0 ? 'bg-emerald-500 text-white animate-pulse shadow-emerald-500/20' : 'bg-white dark:bg-[#111827] text-slate-400 border border-slate-100 dark:border-white/10'
                  }`}>
                    <Clock size={16} />
                  </div>

                  {/* 记录卡片 */}
                  <div className="bg-white dark:bg-[#111827] p-5 rounded-[28px] border border-slate-100 dark:border-white/5 shadow-sm group-hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp size={12} className="opacity-70" />
                        <span className="text-[10px] font-black">+{log.impact?.change || 2} 指标提升</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic">“{log.summary}”</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] p-12 rounded-[48px] border border-slate-100 dark:border-white/5 shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6 group-hover:scale-110 transition-transform duration-500">
              <Info size={32} />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-bold italic mb-8">该日期下没有记录任何康复日志</p>
            <button 
              onClick={onAddDiary}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] font-black text-base shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center mx-auto space-x-2"
            >
              <Plus size={20} strokeWidth={3} />
              <span>添加日记</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-slate-800 dark:text-slate-100 ml-1 tracking-tight flex items-center">
          <Check size={18} className="mr-2 text-emerald-500" />
          每日必做任务
          <button 
            onClick={onGeneratePlan}
            className="ml-auto flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <Wand2 size={12} className="text-emerald-500" />
            <span>定制计划</span>
          </button>
          
          {infeasibleTasks.length > 0 && (
            <button 
              onClick={() => setShowInfeasible(!showInfeasible)}
              className="ml-auto flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 hover:text-emerald-500 transition-colors"
            >
              {showInfeasible ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showInfeasible ? '隐藏不可行项' : `查看不可行项 (${infeasibleTasks.length})`}</span>
            </button>
          )}
        </h3>

        {displayedTasks.length === 0 && !showInfeasible ? (
          <div className="bg-white dark:bg-[#111827] p-12 rounded-[48px] border border-slate-100 dark:border-white/5 shadow-sm text-center">
            <p className="text-sm text-slate-400 font-bold italic">今日暂无康复任务</p>
          </div>
        ) : (
          displayedTasks.map(task => (
            <div 
              key={task.id}
              className={`flex items-center space-x-5 p-6 rounded-[36px] transition-all cursor-pointer border ${
                task.isInfeasible
                ? 'bg-slate-100/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800'
                : task.completed 
                  ? 'bg-slate-50/50 dark:bg-[#111827]/50 border-slate-100 dark:border-white/5 opacity-60' 
                  : 'bg-white dark:bg-[#111827] border-slate-100 dark:border-white/5 shadow-sm hover:border-emerald-200'
              } ${!isToday ? 'cursor-default pointer-events-none' : ''}`}
            >
              <div 
                onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  task.completed ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-105' : 'bg-slate-50 dark:bg-slate-800 text-emerald-600'
                }`}
              >
                {task.completed ? <Check size={26} strokeWidth={4} /> : NURSING_ICONS[task.category]}
              </div>
              <div className="flex-1 min-w-0" onClick={() => setEditingTask(task)}>
                <div className="flex justify-between items-start mb-0.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <h4 className={`font-black text-base truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {task.title}
                    </h4>
                    {task.isInfeasible && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-tighter border border-rose-500/10">
                        不可行
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest flex items-center shrink-0 ml-2 ${task.completed ? 'text-slate-300' : 'text-emerald-500'}`}>
                    {task.time && task.time.trim() !== '' && task.time !== '全天' && (
                      <Bell size={10} className="mr-1" />
                    )}
                    {task.time}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 mt-1">
                  {/* Source Tag */}
                  {task.source?.toLowerCase() === 'doctor' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black text-blue-600 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">医嘱</span>
                  )}
                  {task.source?.toLowerCase() === 'ai' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">五养建议</span>
                  )}
                  {task.source?.toLowerCase() === 'custom' && (
                    <span className="inline-flex items-center text-[9px] font-black text-slate-500 dark:text-slate-400">自定义</span>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{task.description}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Adjustment Modal */}
      {editingTask && (
        <TaskAdjustmentModal 
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdate={(updates) => {
            onUpdateTask(editingTask.id, updates);
            setEditingTask(null);
          }}
        />
      )}
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

const TaskAdjustmentModal: React.FC<{ 
    task: DailyTask; 
    onClose: () => void; 
    onUpdate: (updates: Partial<DailyTask>) => void;
}> = ({ task, onClose, onUpdate }) => {
    const suggestions = task.suggestedTimes || ["07:30", "09:00", "15:30"]; // Fallback if no AI suggestions

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500 border-x border-t border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
                            {NURSING_ICONS[task.category]}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{task.category}</span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{task.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium pr-8">{task.description}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><X size={22} /></button>
                </div>

                <div className="space-y-8">
                    <div>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                          <Sparkles size={14} className="mr-2 text-emerald-500" />
                          AI 建议执行时间
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            {suggestions.map(time => (
                                <button 
                                    key={time}
                                    onClick={() => onUpdate({ time })}
                                    className={`py-4 rounded-[24px] font-black text-sm border-2 transition-all ${
                                        task.time === time 
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' 
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={() => onUpdate({ isInfeasible: !task.isInfeasible })}
                            className={`w-full py-5 rounded-[32px] font-black text-sm flex items-center justify-center space-x-3 transition-all ${
                                task.isInfeasible
                                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                                : 'bg-rose-500 text-white shadow-xl shadow-rose-500/20 active:scale-95'
                            }`}
                        >
                            {task.isInfeasible ? <Eye size={18} strokeWidth={3} /> : <ShieldOff size={18} strokeWidth={3} />}
                            <span>{task.isInfeasible ? '恢复此任务' : '标记为不可行'}</span>
                        </button>
                        <p className="text-center text-[10px] text-slate-400 font-bold">
                          {task.isInfeasible ? '点击恢复将该任务重新加入康复计划' : '被标记为不可行后任务将从主清单中隐藏'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Program;


import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  Trash2,
  Info,
  AlertCircle,
  Plus,
  ClipboardList,
  Star
} from 'lucide-react';
import { PatientProfile, DailyTask } from '../types';
import { NURSING_ICONS } from '../constants';

// --- Copied TaskAdjustmentModal from Program.tsx for consistency ---
const TaskAdjustmentModal: React.FC<{
  task: DailyTask;
  onClose: () => void;
  onUpdate: (updates: Partial<DailyTask>) => void;
}> = ({ task, onClose, onUpdate }) => {
  // Normalize frequency to lowercase and handle possible translations or spaces
  const normalizeFreq = (f: string) => {
    if (!f) return 'daily';
    const clean = f.toLowerCase().trim();
    if (clean.includes('每日') || clean === 'daily') return 'daily';
    if (clean.includes('每周') || clean === 'weekly') return 'weekly';
    if (clean.includes('每月') || clean === 'monthly') return 'monthly';
    return 'daily';
  };

  const [frequency, setFrequency] = useState(normalizeFreq((task as any).frequency));
  const [startDate, setStartDate] = useState((task as any).startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState((task as any).endDate || '');

  // Synchronize local state when task prop changes from parent
  useEffect(() => {
    setFrequency(normalizeFreq((task as any).frequency));
    setStartDate((task as any).startDate || new Date().toISOString().split('T')[0]);
    setEndDate((task as any).endDate || '');
  }, [task.id, (task as any)._id, (task as any).frequency, (task as any).startDate, (task as any).endDate]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600">
              {NURSING_ICONS[task.category]}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{task.title}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">计划属性微调</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><X size={20} /></button>
        </div>

        <div className="space-y-6">
          <section>
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">执行频次</h4>
            <div className="flex space-x-2 mb-4">
              {['daily', 'weekly', 'monthly'].map(f => (
                <button
                  key={f}
                  onClick={() => { setFrequency(f); onUpdate({ frequency: f } as any); }}
                  className={`flex-1 py-3 rounded-2xl text-[11px] font-black uppercase transition-all ${frequency === f ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                  {f === 'daily' ? '每日' : f === 'weekly' ? '每周' : '每月'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {frequency === 'daily' ? '每日' : frequency === 'weekly' ? '每周' : '每月'}执行次数
              </span>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => onUpdate({ targetCount: Math.max(1, (task.targetCount || 1) - 1) })}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-400 border border-slate-100 dark:border-white/5"
                >–</button>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{(task.targetCount || 1)}</span>
                <button 
                  onClick={() => onUpdate({ targetCount: (task.targetCount || 1) + 1 })}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-sm text-slate-400 border border-slate-100 dark:border-white/5"
                >+</button>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">起止日期</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[8px] text-slate-400 font-bold ml-2">开始</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); onUpdate({ startDate: e.target.value } as any); }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-xs font-bold outline-none"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[8px] text-slate-400 font-bold ml-2">结束</span>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => { setEndDate(e.target.value); onUpdate({ endDate: e.target.value } as any); }}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-xs font-bold outline-none ${!endDate ? 'text-slate-300' : ''}`}
                  />
                  {!endDate && <div className="absolute inset-0 flex items-center px-4 pointer-events-none text-xs font-bold text-slate-400">长期有效</div>}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">执行时间</h4>
            <div className="grid grid-cols-3 gap-3">
              {(task.suggestedTimes || ['08:00', '14:30', '21:00']).map(time => (
                <button
                  key={time}
                  onClick={() => onUpdate({ time })}
                  className={`py-4 rounded-2xl border-2 transition-all font-black text-sm ${task.time === time ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300'}`}
                >
                  {time}
                </button>
              ))}
            </div>
          </section>

          <footer className="pt-4 flex space-x-3">
            <button
              onClick={() => onUpdate({ isInfeasible: !task.isInfeasible })}
              className={`flex-1 h-16 rounded-[24px] font-black text-xs flex items-center justify-center space-x-2 border transition-all ${task.isInfeasible ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600'}`}
            >
              {task.isInfeasible ? <><ShieldOff size={16} /><span>恢复并开启</span></> : <><Trash2 size={16} /><span>暂时标记为不可执行</span></>}
            </button>
          </footer>
          <p className="text-[10px] text-slate-400 font-bold text-center">不可执行项将不会展现在未来日期的任务清单中</p>
        </div>
      </div>
    </div>
  );
};

// Add Task Input Modal
const AddTaskModal: React.FC<{
  source: 'doctor' | 'custom';
  onClose: () => void;
  onAdd: (task: Partial<DailyTask>) => void;
  isDark?: boolean;
}> = ({ source, onClose, onAdd, isDark }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [frequency, setFrequency] = useState('daily');
  const [targetCount, setTargetCount] = useState(1);

  const label = source === 'doctor' ? '医嘱任务' : '自定义习惯';
  const placeholder = source === 'doctor' ? '例如：早晚呼吸功能训练' : '例如：练习八段锦';

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-[340px] rounded-[36px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black tracking-tight">添加{label}</h3>
          <button onClick={onClose} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">任务内容</label>
            <input
              autoFocus
              className={`w-full px-4 py-3 rounded-2xl text-sm font-medium outline-none border-2 transition-all focus:border-emerald-400 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800 focus:bg-white'}`}
              placeholder={placeholder}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">执行频次</label>
            <div className="flex space-x-2 mb-3">
              {['daily', 'weekly', 'monthly'].map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${frequency === f ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}
                >
                  {f === 'daily' ? '每日' : f === 'weekly' ? '每周' : '每月'}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500">周期内次数</span>
              <div className="flex items-center space-x-3">
                <button onClick={() => setTargetCount(Math.max(1, targetCount - 1))} className="w-7 h-7 bg-white dark:bg-slate-700 rounded-md shadow-sm border border-slate-100 dark:border-white/5 text-slate-400">–</button>
                <span className="text-sm font-black text-emerald-600">{targetCount}</span>
                <button onClick={() => setTargetCount(targetCount + 1)} className="w-7 h-7 bg-white dark:bg-slate-700 rounded-md shadow-sm border border-slate-100 dark:border-white/5 text-slate-400">+</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl text-[11px] font-medium outline-none border-2 transition-all focus:border-emerald-400 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800 focus:bg-white'}`}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">执行时间</label>
              <input
                className={`w-full px-4 py-3 rounded-2xl text-[11px] font-medium outline-none border-2 transition-all focus:border-emerald-400 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-800 focus:bg-white'}`}
                placeholder="如 08:00"
                value={time}
                onChange={e => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-3 mt-8">
          <button
            disabled={!title.trim()}
            onClick={() => {
              if (!title.trim()) return;
              onAdd({ 
                title: title.trim(), 
                time: time.trim(), 
                source, 
                category: 'function', 
                completed: false, 
                description: '',
                startDate,
                frequency: frequency as any,
                targetCount
              });
              onClose();
            }}
            className="w-full h-14 bg-emerald-600 text-white rounded-[20px] font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-40"
          >
            确认添加
          </button>
          <button
            onClick={onClose}
            className="w-full h-14 rounded-[20px] font-black text-sm text-slate-400 active:scale-95 transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

interface PlanCustomizerProps {
  profile: PatientProfile;
  existingTasks?: DailyTask[];
  selectedDate: string;
  onBack: () => void;
  onConfirm: () => void;
  isDark?: boolean;
}

const PlanCustomizer: React.FC<PlanCustomizerProps> = ({ profile, existingTasks, selectedDate, onBack, onConfirm, isDark }) => {
  const toLocalDateString = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  // Tasks split by source
  const [aiTasks, setAiTasks] = useState<DailyTask[]>([]);
  const [doctorTasks, setDoctorTasks] = useState<DailyTask[]>([]);
  const [customTasks, setCustomTasks] = useState<DailyTask[]>([]);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [addingSource, setAddingSource] = useState<'doctor' | 'custom' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.PROD ? "" : "http://localhost:3002";

  // Merged task list for submission
  const planProposal = [...aiTasks, ...doctorTasks, ...customTasks];
  const hasAnyTasks = planProposal.length > 0;

  useEffect(() => {
    if (existingTasks && existingTasks.length > 0) {
      // Distribute existing tasks by source
      setAiTasks(existingTasks.filter(t => !t.source || t.source.toLowerCase() === 'ai'));
      setDoctorTasks(existingTasks.filter(t => t.source?.toLowerCase() === 'doctor'));
      setCustomTasks(existingTasks.filter(t => t.source?.toLowerCase() === 'custom'));
    } else {
      handleGeneratePlan();
    }
  }, [existingTasks]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    setAiTasks([]);
    setDoctorTasks([]);
    setCustomTasks([]);
    setIsManuallyEdited(false);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/daily_tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, profile, date: selectedDate, commit: false })
      });
      if (res.ok) {
        const tasks: DailyTask[] = await res.json();
        // Mark all AI-generated tasks with source='ai'
        setAiTasks(tasks.map(t => ({ ...t, source: 'ai' as const })));
      } else {
        setError("生成计划失败，请重试");
      }
    } catch (e) {
      setError("网络连接异常，请检查网络后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmPlan = async () => {
    setIsConfirming(true);
    try {
      if (!isManuallyEdited && (!existingTasks || existingTasks.length === 0)) {
        // New Plan via AI Commit + manual additions
        const res = await fetch(`${API_URL}/api/daily_tasks/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id, profile, date: selectedDate, commit: true })
        });
        if (!res.ok) { setError("确认计划失败，请重试"); return; }
        // Also commit doctor & custom tasks
        const targetDate = selectedDate;
        for (const t of [...doctorTasks, ...customTasks]) {
          await fetch(`${API_URL}/api/daily_tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...t, userId: profile.id, date: targetDate })
          });
        }
        onConfirm();
      } else {
        // Identify deleted tasks (present in existingTasks but absent in planProposal)
        const currentIds = new Set(planProposal.map(t => (t as any).id || (t as any)._id).filter(Boolean));
        if (existingTasks) {
          for (const ext of existingTasks) {
            const id = (ext as any).id || (ext as any)._id;
            if (id && !currentIds.has(id)) {
              await fetch(`${API_URL}/api/daily_tasks/${id}`, { method: 'DELETE' });
            }
          }
        }

        // Sync all remaining tasks (Update or Create) + Templates
        for (const t of planProposal) {
          const id = (t as any)._id || (t as any).id;
          
          // [ALIGNMENT] 同步模板信息 (Templates ensure persistence across days)
          const templatePayload = {
            userId: profile.id,
            category: t.category,
            title: t.title,
            description: t.description,
            time: t.time,
            frequency: (t as any).frequency || 'daily',
            startDate: (t as any).startDate || selectedDate,
            endDate: (t as any).endDate,
            targetCount: (t as any).targetCount || 1,
            isInfeasible: t.isInfeasible || false,
            isActive: true,
            source: t.source || 'ai'
          };

          await fetch(`${API_URL}/api/task_templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templatePayload)
          });

          if (id && id.length > 20 && id.indexOf('temp-') === -1) {
            // Update existing instance
            await fetch(`${API_URL}/api/daily_tasks/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                time: t.time, 
                isInfeasible: t.isInfeasible, 
                source: t.source,
                frequency: (t as any).frequency,
                targetCount: (t as any).targetCount || 1,
                startDate: (t as any).startDate,
                endDate: (t as any).endDate
              })
            });
          } else {
            // New tasks (doctor/custom added in this session)
            const targetDate = selectedDate;
            await fetch(`${API_URL}/api/daily_tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                ...t, 
                userId: profile.id, 
                date: targetDate,
                frequency: (t as any).frequency || 'daily',
                targetCount: (t as any).targetCount || 1,
                startDate: (t as any).startDate || targetDate,
                endDate: (t as any).endDate
              })
            });
          }
        }
        onConfirm();
      }
    } catch (e) {
      setError("同步异常，请检查网络后再试");
    } finally {
      setIsConfirming(false);
    }
  };

  const updateAiTask = (idx: number, updates: Partial<DailyTask>) => {
    setAiTasks(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
    setIsManuallyEdited(true);
    setEditingTask(null);
  };

  const removeTask = (source: 'ai' | 'doctor' | 'custom', idx: number) => {
    if (source === 'ai') setAiTasks(prev => prev.filter((_, i) => i !== idx));
    if (source === 'doctor') setDoctorTasks(prev => prev.filter((_, i) => i !== idx));
    if (source === 'custom') setCustomTasks(prev => prev.filter((_, i) => i !== idx));
    setIsManuallyEdited(true);
  };

  const addTask = (task: Partial<DailyTask>) => {
    const newTask: DailyTask = {
      id: `temp-${Date.now()}`,
      category: task.category || 'function',
      title: task.title || '',
      time: task.time || '',
      completed: false,
      description: task.description || '',
      source: task.source,
    };
    if (task.source === 'doctor') setDoctorTasks(prev => [...prev, newTask]);
    if (task.source === 'custom') setCustomTasks(prev => [...prev, newTask]);
    setIsManuallyEdited(true);
  };

  const TaskRow = ({ task, onEdit, onRemove }: { task: DailyTask; onEdit?: () => void; onRemove: () => void }) => (
    <div className={`p-5 rounded-[24px] border flex items-center space-x-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="flex items-center space-x-2">
          <h4 className="font-black text-sm truncate">{task.title}</h4>
          {task.frequency && (
            <span className="shrink-0 text-[8px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-500/20">
              {task.frequency === 'weekly' ? '每周' : task.frequency === 'monthly' ? '每月' : '每日'}
              {task.targetCount && task.targetCount > 1 ? ` ${task.targetCount}次` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-1 text-[9px] text-slate-400 font-bold">
          {task.time && <span className="flex items-center"><Clock size={10} className="mr-1" />{task.time}</span>}
          {(task.startDate || task.endDate) && (
            <span className="flex items-center">
              <CalendarIcon size={10} className="mr-1" />
              {task.startDate ? task.startDate.split('-').slice(1).join('/') : '长期'}{task.endDate ? ` - ${task.endDate.split('-').slice(1).join('/')}` : ''}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 p-2 rounded-xl text-slate-300 dark:text-slate-700 hover:text-rose-400 transition-colors active:scale-95"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[150] flex justify-center overflow-hidden h-full">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onBack} />

      {/* Main App Container Overlay */}
      <div className={`relative w-full max-w-md flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
        {/* Header */}
        <header className={`px-6 pt-12 pb-4 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className={`p-2 rounded-xl text-slate-400 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}><ArrowLeft size={18} /></button>
            <h1 className="text-lg font-black tracking-tight">定制我的计划</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-8 pb-40">

          {/* Section 1: 五养建议 (AI Generated) */}
          <section className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base flex items-center space-x-2">
                <Sparkles size={18} className="text-emerald-500" />
                <span>五养建议</span>
              </h3>
              {!isGenerating && aiTasks.length > 0 && (
                <button onClick={handleGeneratePlan} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">重新生成</button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <Loader2 size={40} className="text-emerald-500 animate-spin" />
                  <Sparkles size={16} className="text-emerald-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <p className="text-xs font-black text-slate-400 animate-pulse uppercase tracking-[0.2em]">正在为您精算最佳计划...</p>
              </div>
            ) : error ? (
              <div className="bg-rose-50 dark:bg-rose-500/10 p-6 rounded-[28px] border border-rose-100 dark:border-rose-500/20 text-center space-y-3">
                <X size={28} className="text-rose-500 mx-auto" />
                <p className="text-sm font-black text-rose-500">{error}</p>
                <button onClick={handleGeneratePlan} className="px-5 py-2 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">重试</button>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in duration-700">
                {aiTasks.length === 0 && <p className="text-xs text-slate-400 font-medium text-center py-4">暂无五养建议，点击重新生成</p>}
                {aiTasks.map((task, idx) => (
                  <TaskRow
                    key={idx}
                    task={task}
                    onEdit={() => setEditingTask({ ...task, __idx: idx, __source: 'ai' } as any)}
                    onRemove={() => removeTask('ai', idx)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Section 2: 同步医院医嘱 (Doctor) */}
          <section className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base flex items-center space-x-2">
                <ClipboardList size={18} className="text-blue-500" />
                <span>同步医院医嘱</span>
              </h3>
              <button
                onClick={() => setAddingSource('doctor')}
                className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 active:scale-95 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {doctorTasks.length === 0 ? (
                <div className={`p-5 rounded-[24px] border-dashed border-2 text-center ${isDark ? 'border-slate-700 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
                  <p className="text-xs font-bold">点击 + 添加医院医嘱任务</p>
                </div>
              ) : doctorTasks.map((task, idx) => (
                <TaskRow key={idx} task={task} onRemove={() => removeTask('doctor', idx)} />
              ))}
            </div>
          </section>

          {/* Section 3: 自定义个人习惯 (Custom) */}
          <section className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base flex items-center space-x-2">
                <Star size={18} className="text-amber-500" />
                <span>自定义个人习惯</span>
              </h3>
              <button
                onClick={() => setAddingSource('custom')}
                className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 active:scale-95 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {customTasks.length === 0 ? (
                <div className={`p-5 rounded-[24px] border-dashed border-2 text-center ${isDark ? 'border-slate-700 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
                  <p className="text-xs font-bold">点击 + 添加您自己的日常习惯</p>
                </div>
              ) : customTasks.map((task, idx) => (
                <TaskRow key={idx} task={task} onRemove={() => removeTask('custom', idx)} />
              ))}
            </div>
          </section>
        </main>

        {/* Task Adjustment Modal overlay (AI tasks only) */}
        {editingTask && (
          <TaskAdjustmentModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onUpdate={(updates) => {
              const idx = (editingTask as any).__idx;
              if (idx !== undefined) {
                updateAiTask(idx, updates);
                // 同步本地编辑状态，确保弹窗内 UI 实时刷新且不关闭
                setEditingTask({ ...editingTask, ...updates });
              }
            }}
          />
        )}

        {/* Add Task Modal */}
        {addingSource && (
          <AddTaskModal
            source={addingSource}
            isDark={isDark}
            onClose={() => setAddingSource(null)}
            onAdd={addTask}
          />
        )}

        {/* Footer Confirmation */}
        {!isGenerating && !error && (
          <div className={`absolute bottom-0 left-0 right-0 p-8 border-t z-[160] ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/90 border-slate-100'} backdrop-blur-2xl`}>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isConfirming}
              className="w-full h-16 bg-emerald-600 text-white rounded-[24px] font-black text-sm flex items-center justify-center space-x-3 shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /><span>保存并应用计划</span></>}
            </button>
          </div>
        )}

        {/* Sync Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowConfirmModal(false)} />
            <div className={`relative w-full max-w-[320px] rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
              <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-center mb-4 tracking-tight">应用新任务？</h3>
              <div className={`p-5 rounded-3xl mb-8 leading-relaxed text-[11px] font-medium ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-500'}`}>
                提示：更改计划后，AI 助理会在 5 分钟内完成今日方案的动态调整，并在您的康复看板中进行同步。
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    handleConfirmPlan();
                  }}
                  className="w-full h-14 bg-emerald-600 text-white rounded-[20px] font-black text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  确认应用
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className={`w-full h-14 rounded-[20px] font-black text-sm active:scale-95 transition-all ${isDark ? 'text-slate-400' : 'text-slate-400'}`}
                >
                  返回修改
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanCustomizer;

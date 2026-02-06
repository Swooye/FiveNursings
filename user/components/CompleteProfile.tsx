
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, X, Check } from 'lucide-react';
import { PatientProfile } from '../types';

interface CompleteProfileProps {
  profile: PatientProfile;
  onUpdate: (updates: Partial<PatientProfile>) => void;
  onClose: () => void;
  mode?: 'onboarding' | 'edit';
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ profile, onUpdate, onClose, mode = 'onboarding' }) => {
  const isEditMode = mode === 'edit';
  const today = new Date();
  
  const [formData, setFormData] = useState({
    nickname: profile.nickname || (isEditMode ? '' : '五养用户8030'),
    name: profile.name || '',
    birthDate: profile.birthDate || '',
    gender: profile.gender || '',
    height: profile.height ? String(profile.height) : '',
    weight: profile.weight ? String(profile.weight) : ''
  });

  const [activePicker, setActivePicker] = useState<'gender' | 'height' | 'weight' | 'birthDate' | null>(null);
  
  const [tempDate, setTempDate] = useState({
    year: '1980',
    month: String(today.getMonth() + 1).padStart(2, '0'),
    day: String(today.getDate()).padStart(2, '0')
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);

  const scrollToValue = (container: HTMLDivElement | null, value: string | number) => {
    if (!container) return;
    const target = container.querySelector(`[data-value="${value}"]`);
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  };

  useEffect(() => {
    if (activePicker === 'birthDate') {
      setTimeout(() => {
        scrollToValue(yearScrollRef.current, tempDate.year);
        scrollToValue(monthScrollRef.current, Number(tempDate.month));
        scrollToValue(dayScrollRef.current, Number(tempDate.day));
      }, 50);
    } else if (activePicker && scrollRef.current) {
      setTimeout(() => {
        let valToScroll = '';
        if (activePicker === 'gender') valToScroll = formData.gender || '男';
        if (activePicker === 'height') valToScroll = formData.height || '170';
        if (activePicker === 'weight') valToScroll = formData.weight || '70';
        scrollToValue(scrollRef.current, valToScroll);
      }, 50);
    }
  }, [activePicker]);

  const isFormValid = formData.nickname && formData.name && formData.birthDate && formData.gender && formData.height && formData.weight;

  const handleSave = () => {
    onUpdate({
      ...formData,
      isProfileComplete: true,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined
    } as any);
    onClose();
  };

  const renderPicker = () => {
    if (!activePicker) return null;

    let title = '';
    let options: (string | number)[] = [];
    let unit = '';
    let selectedValue = '';
    let defaultValue = '';

    if (activePicker === 'gender') {
      title = '性别';
      options = ['男', '女', '不愿透露'];
      selectedValue = formData.gender;
      defaultValue = '男';
    } else if (activePicker === 'height') {
      title = '身高';
      options = Array.from({ length: 101 }, (_, i) => 120 + i);
      unit = ' cm';
      selectedValue = formData.height;
      defaultValue = '170';
    } else if (activePicker === 'weight') {
      title = '体重';
      options = Array.from({ length: 171 }, (_, i) => 30 + i);
      unit = ' kg';
      selectedValue = formData.weight;
      defaultValue = '70';
    } else if (activePicker === 'birthDate') {
      title = '出生日期';
    }

    const handleConfirm = (val?: string) => {
      if (activePicker === 'birthDate') {
        setFormData({ ...formData, birthDate: `${tempDate.year}-${tempDate.month}-${tempDate.day}` });
      } else if (val) {
        setFormData({ ...formData, [activePicker]: val });
      }
      setActivePicker(null);
    };

    return (
      <div className="fixed inset-0 z-[100] flex flex-col justify-end items-center">
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300 w-full max-w-md mx-auto" onClick={() => setActivePicker(null)} />
        
        <div className="relative bg-white dark:bg-slate-900 rounded-t-[40px] animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col max-h-[70vh] w-full max-w-md mx-auto">
          <div className="flex justify-between items-center p-8 border-b border-slate-50 dark:border-slate-800">
            <button onClick={() => setActivePicker(null)} className="text-lg font-bold text-slate-400">取消</button>
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{title}</h3>
            <button onClick={() => handleConfirm()} className="text-lg font-bold text-emerald-600">确定</button>
          </div>

          {activePicker === 'birthDate' ? (
            <div className="flex-1 overflow-hidden flex p-8 gap-4">
              <div ref={yearScrollRef} className="flex-1 overflow-y-auto no-scrollbar h-64 snap-y snap-mandatory">
                {Array.from({ length: 100 }, (_, i) => 2024 - i).map(year => (
                  <button 
                    key={year} 
                    data-value={year}
                    onClick={() => setTempDate({...tempDate, year: String(year)})}
                    className={`w-full py-4 text-xl font-black transition-all snap-center ${tempDate.year === String(year) ? 'text-emerald-600 scale-125' : 'text-slate-300 opacity-50'}`}
                  >
                    {year}
                  </button>
                ))}
              </div>
              <div ref={monthScrollRef} className="flex-1 overflow-y-auto no-scrollbar h-64 snap-y snap-mandatory">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <button 
                    key={month} 
                    data-value={month}
                    onClick={() => setTempDate({...tempDate, month: String(month).padStart(2, '0')})}
                    className={`w-full py-4 text-xl font-black transition-all snap-center ${Number(tempDate.month) === month ? 'text-emerald-600 scale-125' : 'text-slate-300 opacity-50'}`}
                  >
                    {month}月
                  </button>
                ))}
              </div>
              <div ref={dayScrollRef} className="flex-1 overflow-y-auto no-scrollbar h-64 snap-y snap-mandatory">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <button 
                    key={day} 
                    data-value={day}
                    onClick={() => setTempDate({...tempDate, day: String(day).padStart(2, '0')})}
                    className={`w-full py-4 text-xl font-black transition-all snap-center ${Number(tempDate.day) === day ? 'text-emerald-600 scale-125' : 'text-slate-300 opacity-50'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-8 pt-4 space-y-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  data-value={opt}
                  onClick={() => handleConfirm(String(opt))}
                  className={`w-full p-6 rounded-3xl font-black text-xl flex justify-between items-center transition-all ${
                    (String(selectedValue) === String(opt) || (!selectedValue && String(opt) === defaultValue))
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' 
                    : 'text-slate-400'
                  }`}
                >
                  <span>{opt}{unit}</span>
                  {(String(selectedValue) === String(opt) || (!selectedValue && String(opt) === defaultValue)) && <Check size={24} strokeWidth={4} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 no-scrollbar relative max-w-md mx-auto">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">完善个人信息</h1>
        <div className="w-10 text-right">
          {!isEditMode && (
            <button onClick={onClose} className="text-slate-400 dark:text-slate-500 font-bold text-sm hover:text-slate-600 dark:hover:text-slate-300">
              跳过
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="text-slate-400 dark:text-slate-500 font-bold px-2 pt-2">
          {isEditMode ? '修改您的健康基准信息' : '请完善您的个人信息'}
        </div>

        <div className="space-y-4">
          {/* Nickname Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-sm group focus-within:border-emerald-500/50 transition-all">
            <label className="block text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1 ml-1">昵称</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="请输入昵称"
              className="w-full bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 text-2xl"
            />
          </div>

          {/* Real Name Input (mapping to db.name) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-sm group focus-within:border-emerald-500/50 transition-all">
            <label className="block text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1 ml-1">真实姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入真实姓名"
              className="w-full bg-transparent font-black text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-200 dark:placeholder:text-slate-700 text-2xl"
            />
          </div>

          <button 
            onClick={() => {
              if (formData.birthDate) {
                const [y, m, d] = formData.birthDate.split('-');
                setTempDate({ year: y, month: m, day: d });
              }
              setActivePicker('birthDate');
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-7 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group"
          >
            <span className="font-black text-slate-800 dark:text-slate-200 text-xl">出生日期</span>
            <div className="flex items-center space-x-2 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500">
              <span className="text-lg font-bold">{formData.birthDate ? formData.birthDate.replace(/-/g, '/') : '点击选择'}</span>
              <ChevronDown size={20} />
            </div>
          </button>

          <button 
            onClick={() => setActivePicker('gender')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-7 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group"
          >
            <span className="font-black text-slate-800 dark:text-slate-200 text-xl">性别</span>
            <div className="flex items-center space-x-2 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500">
              <span className="text-lg font-bold">{formData.gender || '点击选择'}</span>
              <ChevronDown size={20} />
            </div>
          </button>

          <button 
            onClick={() => setActivePicker('height')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-7 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group"
          >
            <span className="font-black text-slate-800 dark:text-slate-200 text-xl">身高</span>
            <div className="flex items-center space-x-2 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500">
              <span className="text-lg font-bold">{formData.height ? `${formData.height} cm` : '点击选择'}</span>
              <ChevronDown size={20} />
            </div>
          </button>

          <button 
            onClick={() => setActivePicker('weight')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-7 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group"
          >
            <span className="font-black text-slate-800 dark:text-slate-200 text-xl">体重</span>
            <div className="flex items-center space-x-2 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500">
              <span className="text-lg font-bold">{formData.weight ? `${formData.weight} kg` : '点击选择'}</span>
              <ChevronDown size={20} />
            </div>
          </button>
        </div>

        <footer className="pt-4 px-2">
          <p className="text-[12px] text-slate-300 dark:text-slate-600 leading-relaxed font-bold">
            注意：姓名、性别、身高、体重和生日将用于个性化计算消耗的卡路里、运动时的心率范围以及其他指标。我们尊重您的隐私 and 数据安全，这些信息仅用于为您提供更准确的健康数据分析。
          </p>
        </footer>
      </main>

      <div className="p-6 pb-12 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <button
          onClick={handleSave}
          disabled={!isFormValid}
          className={`w-full py-5 rounded-full font-black text-xl transition-all shadow-2xl flex items-center justify-center ${
            isFormValid 
            ? 'bg-emerald-600 text-white shadow-emerald-500/20 active:scale-95' 
            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-700 shadow-none cursor-not-allowed'
          }`}
        >
          {isEditMode ? '保存修改' : '继续'}
        </button>
      </div>

      {renderPicker()}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default CompleteProfile;

const ChevronDown = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

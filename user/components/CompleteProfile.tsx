
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PatientProfile } from '../types';

interface CompleteProfileProps {
  profile: PatientProfile;
  onUpdate: (updates: Partial<PatientProfile>) => void;
  onClose: () => void;
  mode?: 'onboarding' | 'edit';
}

const CompleteProfile: React.FC<CompleteProfileProps> = ({ profile, onUpdate, onClose, mode = 'onboarding' }) => {
  const isEditMode = mode === 'edit';
  
  const [formData, setFormData] = useState({
    name: profile.name || '五养用户6838',
    birthDate: profile.birthDate || '',
    gender: profile.gender || '',
    height: profile.height || '',
    weight: profile.weight || ''
  });

  const isFormValid = formData.name && formData.birthDate && formData.gender && formData.height && formData.weight;

  const handleSave = () => {
    onUpdate({
      ...formData,
      isProfileComplete: true,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined
    } as Partial<PatientProfile>);
    onClose();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 no-scrollbar">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">完善个人信息</h1>
        <div className="w-10">
          {!isEditMode && (
            <button onClick={onClose} className="text-slate-400 dark:text-slate-500 font-bold text-sm hover:text-slate-600 dark:hover:text-slate-300">
              跳过
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        <div className="text-slate-500 dark:text-slate-400 font-bold">
          {isEditMode ? '修改您的健康基准信息' : '请完善您的个人信息'}
        </div>

        <div className="space-y-4">
          {/* Nickname Input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入昵称"
              className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 text-lg"
            />
          </div>

          {/* Birth Date Picker */}
          <button className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">出生日期</span>
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500">
              <span className="text-base">{formData.birthDate || '点击选择'}</span>
              <ChevronRight size={20} />
            </div>
          </button>

          {/* Gender Picker */}
          <button className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">性别</span>
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500">
              <span className="text-base">{formData.gender || '点击选择'}</span>
              <ChevronRight size={20} />
            </div>
          </button>

          {/* Height Picker */}
          <button className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">身高</span>
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500">
              <span className="text-base">{formData.height ? `${formData.height} cm` : '点击选择'}</span>
              <ChevronRight size={20} />
            </div>
          </button>

          {/* Weight Picker */}
          <button className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-6 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all group">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-lg">体重</span>
            <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500">
              <span className="text-base">{formData.weight ? `${formData.weight} kg` : '点击选择'}</span>
              <ChevronRight size={20} />
            </div>
          </button>
        </div>

        <footer className="pt-4">
          <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
            注意：性别、身高、体重和生日将用于个性化计算消耗的卡路里、运动时的心率范围以及其他指标。我们尊重您的隐私和数据安全，这些信息仅用于为您提供更准确的健康数据分析。
          </p>
        </footer>
      </main>

      <div className="p-6 pb-12">
        <button
          onClick={handleSave}
          disabled={!isFormValid}
          className={`w-full py-5 rounded-full font-black text-lg transition-all shadow-xl flex items-center justify-center ${
            isFormValid 
            ? 'bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 shadow-none cursor-not-allowed'
          }`}
        >
          {isEditMode ? '保存修改' : '继续'}
        </button>
      </div>
    </div>
  );
};

export default CompleteProfile;

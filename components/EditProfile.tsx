
import React, { useState } from 'react';
import { PatientProfile, CancerType, TreatmentStage } from '../types';
import { ArrowLeft, Save, User, Hash, Briefcase, Activity, Sparkles, Check, CheckCircle2 } from 'lucide-react';

interface EditProfileProps {
  profile: PatientProfile;
  onUpdate: (updates: Partial<PatientProfile>) => void;
  onBack: () => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ profile, onUpdate, onBack }) => {
  const [formData, setFormData] = useState({
    name: profile.name,
    age: profile.age,
    cancerType: profile.cancerType,
    stage: profile.stage
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdate(formData);
      setIsSaving(false);
      onBack();
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 pb-20 no-scrollbar">
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">编辑个人资料</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-2xl text-[11px] font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          {isSaving ? <span className="flex items-center space-x-2"><span>正在保存</span></span> : <><Save size={14} strokeWidth={2.5} /><span>保存修改</span></>}
        </button>
      </header>

      <div className="p-6 space-y-10">
        {/* Avatar Preview Section */}
        <div className="flex flex-col items-center justify-center space-y-5">
          <div className="relative group">
            <div className="w-36 h-36 rounded-[44px] bg-white dark:bg-slate-900 border-4 border-emerald-500/10 shadow-2xl overflow-hidden p-1.5 transition-all group-hover:border-emerald-500">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`} 
                alt="Avatar Preview" 
                className="w-full h-full rounded-[36px] bg-slate-50 dark:bg-slate-950"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-3.5 rounded-2xl shadow-xl border-4 border-slate-50 dark:border-slate-950">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Smart Identity Sync
            </p>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">头像随姓名变动实时更新</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-8">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2 flex items-center space-x-2">
              <User size={12} />
              <span>患者姓名 / 昵称</span>
            </label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[24px] font-black text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none transition-all shadow-sm focus:bg-emerald-50/5"
              placeholder="请输入您的姓名"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2 flex items-center space-x-2">
              <Hash size={12} />
              <span>患者年龄</span>
            </label>
            <input 
              type="number" 
              value={formData.age}
              onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
              className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[24px] font-black text-slate-800 dark:text-slate-100 focus:border-emerald-500 outline-none transition-all shadow-sm focus:bg-emerald-50/5"
              placeholder="请输入年龄"
            />
          </div>

          {/* Cancer Type Selector - Optimized for Light Green Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2 flex items-center space-x-2">
              <Activity size={12} />
              <span>确诊病种</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(CancerType).map(type => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({ ...prev, cancerType: type }))}
                  className={`p-5 rounded-[24px] border-2 text-[11px] font-black transition-all flex justify-between items-center ${
                    formData.cancerType === type 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-md scale-105' 
                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-200'
                  }`}
                >
                  <span>{type}</span>
                  {formData.cancerType === type && <CheckCircle2 size={14} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Treatment Stage Selector */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2 flex items-center space-x-2">
              <Briefcase size={12} />
              <span>康复随访阶段</span>
            </label>
            <div className="flex flex-col space-y-3">
              {Object.values(TreatmentStage).map(stage => (
                <button
                  key={stage}
                  onClick={() => setFormData(prev => ({ ...prev, stage: stage }))}
                  className={`p-6 rounded-[24px] border-2 text-xs font-black transition-all flex justify-between items-center ${
                    formData.stage === stage 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-md' 
                    : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-200'
                  }`}
                >
                  <span>{stage}</span>
                  {formData.stage === stage && <CheckCircle2 size={16} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center pt-8 opacity-40">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Nursing Plus Profile Authority</p>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;

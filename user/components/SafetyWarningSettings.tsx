
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Bell, 
  Phone, 
  User, 
  AlertTriangle, 
  ChevronRight, 
  Save, 
  Info, 
  Zap, 
  Heart, 
  Activity, 
  Loader2, 
  Plus, 
  X, 
  Check, 
  Trash2,
  Users,
  Edit2,
  CheckCircle2
} from 'lucide-react';
import { RISK_SIGNALS } from '../constants';
import { PatientProfile, FamilyMember } from '../types';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isFromFamily?: boolean;
}

interface SafetyWarningSettingsProps {
  profile: PatientProfile;
  onBack: () => void;
}

const RELATIONSHIP_OPTIONS = [
  '配偶', '子女', '父母', '兄弟姐妹', '朋友', '其他'
];

const SafetyWarningSettings: React.FC<SafetyWarningSettingsProps> = ({ profile, onBack }) => {
  const [settings, setSettings] = useState({
    vitalSignsAlert: true,
    autoCoachAlert: true,
    symptomDetection: true,
    scoreDropAlert: true,
    emergencyContacts: [
      { id: '1', name: '李女士', phone: '13812345678', relation: '配偶' }
    ] as EmergencyContact[],
    thresholds: {
      heartRateMax: 100,
      heartRateMin: 50,
      scoreDrop: 15
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({
    name: '',
    phone: '',
    relation: '其他'
  });

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onBack();
    }, 1000);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setNewContact({ name: '', phone: '', relation: '其他' });
    setShowModal(true);
  };

  const handleOpenEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setNewContact(contact);
    setShowModal(true);
  };

  const handleDeleteContact = (id: string) => {
    setSettings({
      ...settings,
      emergencyContacts: settings.emergencyContacts.filter(c => c.id !== id)
    });
    if (editingId === id) setShowModal(false);
  };

  const handleSaveContact = () => {
    if (!newContact.name || !newContact.phone) return;
    if (editingId) {
      setSettings({
        ...settings, 
        emergencyContacts: settings.emergencyContacts.map(c => 
          c.id === editingId ? { ...c, ...newContact as EmergencyContact } : c
        )
      });
    } else {
      setSettings({
        ...settings, 
        emergencyContacts: [...settings.emergencyContacts, { 
          id: Date.now().toString(), 
          name: newContact.name!, 
          phone: newContact.phone!, 
          relation: newContact.relation! 
        }]
      });
    }
    setShowModal(false);
  };

  const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button 
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-all relative ${checked ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-200 dark:bg-slate-800'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  );

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">{title}</h3>
      <div className="bg-white dark:bg-slate-900 rounded-[36px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );

  const SettingRow: React.FC<{ icon: React.ReactNode; label: string; sublabel?: string; action: React.ReactNode }> = ({ icon, label, sublabel, action }) => (
    <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800 last:border-0">
      <div className="flex items-center space-x-5 flex-1">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-black text-slate-800 dark:text-slate-100 tracking-tight">{label}</span>
          {sublabel && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{sublabel}</span>}
        </div>
      </div>
      <div>{action}</div>
    </div>
  );

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-500 pb-32 no-scrollbar relative shadow-2xl border-x border-slate-200 dark:border-slate-800">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">安全与预警</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               <span className="text-[9px] text-emerald-600 dark:text-emerald-400/80 font-black uppercase tracking-widest">Active Protection</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-5 py-3 rounded-[18px] text-[11px] font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>保存</span>
        </button>
      </header>

      <main className="p-6 space-y-10">
        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
           <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1.5">
                 <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">全时守护已开启</h2>
                 <p className="text-xs text-slate-400 dark:text-slate-500 font-bold max-w-[80%]">系统正在后台分析来自穿戴设备与日志的风险信号。</p>
              </div>
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-[22px] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform">
                 <ShieldCheck size={32} />
              </div>
           </div>
           <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mb-10"></div>
        </div>

        <Section title="智能监控维度">
          <SettingRow icon={<Heart size={22} />} label="心率偏移预警" sublabel="Vital Signs Alert" action={<Toggle checked={settings.vitalSignsAlert} onChange={() => setSettings({...settings, vitalSignsAlert: !settings.vitalSignsAlert})} />} />
          <SettingRow icon={<AlertTriangle size={22} />} label="危险症状识别" sublabel="Clinical Signals" action={<Toggle checked={settings.symptomDetection} onChange={() => setSettings({...settings, symptomDetection: !settings.symptomDetection})} />} />
          <SettingRow icon={<Zap size={22} />} label="康复分大幅波动" sublabel="Score Drop Guard" action={<Toggle checked={settings.scoreDropAlert} onChange={() => setSettings({...settings, scoreDropAlert: !settings.scoreDropAlert})} />} />
        </Section>

        <div className="space-y-4">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">紧急联系人</h3>
              <button 
                onClick={handleOpenAdd} 
                className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3.5 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800 active:scale-95 transition-all"
              >
                添加
              </button>
           </div>
           {settings.emergencyContacts.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => handleOpenEdit(contact)}
                className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 flex justify-between items-center group cursor-pointer active:scale-[0.98] transition-all"
              >
                 <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 transition-colors group-hover:text-emerald-500"><User size={24} /></div>
                    <div>
                       <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-800 dark:text-slate-100 text-[15px]">{contact.name}</span>
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md uppercase tracking-widest border border-emerald-100/50 dark:border-emerald-800/50">{contact.relation}</span>
                       </div>
                       <div className="text-xs text-slate-400 font-bold mt-0.5">{contact.phone}</div>
                    </div>
                 </div>
                 <ChevronRight size={20} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
              </div>
           ))}
        </div>
      </main>

      {/* Emergency Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-950 rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                {editingId ? '编辑联系人' : '添加紧急联系人'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">姓名</label>
                <input 
                  type="text" 
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] font-black text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 transition-all"
                  placeholder="请输入联系人姓名"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">电话号码</label>
                <input 
                  type="tel" 
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-[24px] font-black text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 transition-all"
                  placeholder="请输入电话号码"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">关系</label>
                <div className="grid grid-cols-3 gap-2">
                  {RELATIONSHIP_OPTIONS.map(rel => (
                    <button
                      key={rel}
                      onClick={() => setNewContact({...newContact, relation: rel})}
                      className={`py-3 rounded-xl text-[11px] font-black transition-all border-2 ${
                        newContact.relation === rel 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                {editingId && (
                  <button 
                    onClick={() => handleDeleteContact(editingId)}
                    className="p-5 bg-rose-50 text-rose-500 rounded-[24px] active:scale-95 transition-transform border border-rose-100"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
                <button 
                  onClick={handleSaveContact}
                  className="flex-1 bg-slate-800 dark:bg-slate-800 text-white py-5 rounded-[24px] font-black text-sm shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 size={18} />
                  <span>确定并保存</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyWarningSettings;

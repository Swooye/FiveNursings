
import React, { useState, useEffect, useCallback } from 'react';
import { PatientProfile } from '../types';
import { 
  ArrowLeft, 
  LogOut, 
  UserX, 
  Link2Off, 
  ChevronRight, 
  AlertTriangle, 
  Type, 
  Moon, 
  Languages, 
  Smartphone, 
  Ruler,
  Check,
  Voicemail
} from 'lucide-react';

interface SettingsViewProps {
  onBack: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onUnbindDevice?: () => void;
  isDeviceConnected: boolean;
  profile: PatientProfile;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  language: string;
  setLanguage: (lang: string) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (val: boolean) => void;
  unitSystem: string;
  setUnitSystem: (system: string) => void;
}

const FONT_SIZE_LABELS: Record<string, string> = {
  'standard': '标准',
  'large': '较大',
  'extra': '超大',
  'max': '最大'
};

const THEME_LABELS: Record<string, string> = {
  'light': '关闭',
  'dark': '开启',
  'system': '跟随系统'
};

const LANGUAGE_LABELS: Record<string, string> = {
  'zh': '简体中文',
  'en': 'English'
};

const UNIT_LABELS: Record<string, string> = {
  'metric': '公制',
  'imperial': '英制'
};

const VOICE_DISPLAY_MAP: Record<string, { displayName: string; gender: '男' | '女' }> = {
  'Ting-Ting': { displayName: '婷婷', gender: '女' },
  'Li-Mu': { displayName: '立牧', gender: '男' },
  'Yu-shu': { displayName: '语书', gender: '女' },
  'Xiaoyun': { displayName: '晓云', gender: '女' },
  'Yunxi': { displayName: '云溪', gender: '男' },
  'Zhiqi': { displayName: '知琦', gender: '女' },
  'Yunjian': { displayName: '云健', gender: '男' },
};

const SettingsView: React.FC<SettingsViewProps> = ({ 
  onBack, onLogout, onDeleteAccount, onUnbindDevice, isDeviceConnected,
  profile, onUpdateProfile,
  fontSize, setFontSize, themeMode, setThemeMode, language, setLanguage, hapticFeedback, setHapticFeedback, unitSystem, setUnitSystem
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentSubPage, setCurrentSubPage] = useState<'main' | 'font-size' | 'theme' | 'language' | 'unit' | 'voice'>('main');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'));
      setAvailableVoices(voices);
    };
    // Voices may load asynchronously. Call it once and also set up the event listener.
    getVoices();
    window.speechSynthesis.onvoiceschanged = getVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string, voiceName?: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    if (voiceName && voiceName !== 'default') {
      const allVoices = window.speechSynthesis.getVoices();
      const selectedVoice = allVoices.find(v => v.name === voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    }
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleVoiceSelection = (voiceName: string) => {
    onUpdateProfile({ voicePreference: voiceName });
    speak(`你好！${profile.name || '用户'}`, voiceName);
    if (hapticFeedback && navigator.vibrate) navigator.vibrate(10);
  };
  
  const getVoiceDisplayName = (voiceName: string) => {
    if (voiceName === 'default') return '默认';
    for (const key in VOICE_DISPLAY_MAP) {
      if (voiceName.toLowerCase().includes(key.toLowerCase())) {
        return VOICE_DISPLAY_MAP[key as keyof typeof VOICE_DISPLAY_MAP].displayName;
      }
    }
    return voiceName.split(' ')[0];
  };

  const SettingCard: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    value?: string; 
    onClick: () => void;
    showChevron?: boolean;
    description?: string;
  }> = ({ icon, label, value, onClick, showChevron = true, description }) => (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-5 border-b border-slate-50 dark:border-slate-800 last:border-0 group active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-center space-x-4 text-left">
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-slate-700 dark:text-slate-200">{label}</span>
          {description && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        {value && <span className="text-sm font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">{value}</span>}
        {showChevron && <ChevronRight size={18} className="text-slate-300" />}
      </div>
    </button>
  );

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.1em] ml-2 mb-3 mt-8">
      {children}
    </h3>
  );

  const renderSelectionPage = (title: string, options: {key: string, label: string, desc?: string, gender?: '男' | '女'}[], currentKey: string, onSelect: (key: any) => void) => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 flex flex-col no-scrollbar">
      <header className="px-6 pt-12 pb-6 flex items-center space-x-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => setCurrentSubPage('main')} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h1>
      </header>
      <div className="p-4 pt-8 space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          {options.map((opt) => (
            <button 
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className="w-full flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800 last:border-0 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex flex-col">
                <span className={`font-bold ${currentKey === opt.key ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                  {opt.label}
                  {opt.gender && <span className="text-xs ml-2 font-medium text-slate-400">【{opt.gender}】</span>}
                </span>
                {opt.desc && <span className="text-[10px] text-slate-400 mt-1">{opt.desc}</span>}
              </div>
              {currentKey === opt.key && <Check size={20} className="text-emerald-500" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (currentSubPage === 'font-size') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 flex flex-col no-scrollbar">
        <header className="px-6 pt-12 pb-6 flex items-center space-x-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => setCurrentSubPage('main')} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">字体大小</h1>
        </header>
        <div className="flex-1 p-6 space-y-12">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex justify-end">
               <div className="bg-emerald-600 text-white px-6 py-4 rounded-[28px] rounded-tr-none text-sm font-bold shadow-lg shadow-emerald-500/10">
                 帮我预览一下字体大小
               </div>
            </div>
            <div className="flex justify-start">
               <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-6 py-4 rounded-[28px] rounded-tl-none text-sm font-medium border border-slate-200 dark:border-slate-700">
                 你可以通过拖动滑块来调整字体大小。
               </div>
            </div>
          </div>
          <div className="space-y-8 px-4">
            <div className="relative pt-10 pb-6">
               <input 
                 type="range" 
                 min="0" 
                 max="3" 
                 step="1" 
                 value={['standard', 'large', 'extra', 'max'].indexOf(fontSize)}
                 onChange={(e) => {
                   const val = parseInt(e.target.value);
                   setFontSize(['standard', 'large', 'extra', 'max'][val]);
                   if (hapticFeedback && navigator.vibrate) navigator.vibrate(10);
                 }}
                 className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
               />
               <div className="flex justify-between mt-4 text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                  <span className={fontSize === 'standard' ? 'text-emerald-500' : ''}>标准</span>
                  <span className={fontSize === 'large' ? 'text-emerald-500' : ''}>较大</span>
                  <span className={fontSize === 'extra' ? 'text-emerald-500' : ''}>超大</span>
                  <span className={fontSize === 'max' ? 'text-emerald-500' : ''}>最大</span>
               </div>
            </div>
            <button 
              onClick={() => setCurrentSubPage('main')}
              className="w-full bg-emerald-600 text-white py-5 rounded-[28px] font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentSubPage === 'theme') {
    return renderSelectionPage(
      '深色模式',
      [
        { key: 'dark', label: '开启' },
        { key: 'light', label: '关闭' },
        { key: 'system', label: '跟随系统', desc: '根据设备的系统设置自动切换' }
      ],
      themeMode,
      (key) => setThemeMode(key)
    );
  }

  if (currentSubPage === 'language') {
    return renderSelectionPage(
      '语言',
      [
        { key: 'zh', label: '简体中文' },
        { key: 'en', label: 'English' }
      ],
      language,
      (key) => setLanguage(key)
    );
  }

  if (currentSubPage === 'unit') {
    return renderSelectionPage(
      '单位制',
      [
        { key: 'metric', label: '公制', desc: '使用千克(kg)、厘米(cm)、摄氏度(℃)' },
        { key: 'imperial', label: '英制', desc: '使用磅(lb)、英尺(ft)、华氏度(℉)' }
      ],
      unitSystem,
      (key) => setUnitSystem(key)
    );
  }

  if (currentSubPage === 'voice') {
    const voiceOptions = [
      { key: 'default', label: '默认音色', desc: '使用您设备或浏览器的默认中文语音' },
      ...availableVoices.map(v => {
        const displayNameInfo = Object.entries(VOICE_DISPLAY_MAP).find(([key, _]) => v.name.toLowerCase().includes(key.toLowerCase()));
        const label = displayNameInfo ? displayNameInfo[1].displayName : v.name.split(' ')[0];
        
        let gender: '男' | '女' | undefined = undefined;
        if (displayNameInfo) {
          gender = displayNameInfo[1].gender;
        } else {
          const lowerCaseName = v.name.toLowerCase();
          if (lowerCaseName.includes('male') || lowerCaseName.includes('男')) {
            gender = '男';
          } else if (lowerCaseName.includes('female') || lowerCaseName.includes('女')) {
            gender = '女';
          }
        }

        return {
          key: v.name,
          label: label,
          gender: gender,
          desc: `${v.localService ? '本地' : '在线'} · ${v.lang}`
        }
      })
    ];
    return renderSelectionPage(
      'AI 语音音色',
      voiceOptions,
      profile.voicePreference || 'default',
      handleVoiceSelection
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 pb-20 no-scrollbar">
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-4 shadow-sm">
        <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">设置</h1>
      </header>

      <main className="p-4 flex flex-col flex-1 pb-24">
        <SectionTitle>显示</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingCard icon={<Type size={18} />} label="字体大小" value={FONT_SIZE_LABELS[fontSize]} onClick={() => setCurrentSubPage('font-size')} />
          <SettingCard icon={<Moon size={18} />} label="深色模式" value={THEME_LABELS[themeMode]} onClick={() => setCurrentSubPage('theme')} />
        </div>

        <SectionTitle>通用</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingCard 
            icon={<Voicemail size={18} />} 
            label="AI 语音音色" 
            value={getVoiceDisplayName(profile.voicePreference || 'default')}
            onClick={() => setCurrentSubPage('voice')}
            description="选择AI健康报告的播报声音"
          />
          <SettingCard icon={<Languages size={18} />} label="语言" value={LANGUAGE_LABELS[language]} onClick={() => setCurrentSubPage('language')} />
          <SettingCard icon={<Smartphone size={18} />} label="震动反馈" value={hapticFeedback ? '开启' : '关闭'} onClick={() => setHapticFeedback(!hapticFeedback)} showChevron={false} />
        </div>

        <SectionTitle>数据</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingCard icon={<Ruler size={18} />} label="单位制" value={UNIT_LABELS[unitSystem]} onClick={() => setCurrentSubPage('unit')} />
        </div>

        <SectionTitle>账号与安全</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          {isDeviceConnected && onUnbindDevice && (
            <button 
              onClick={onUnbindDevice}
              className="w-full p-5 flex justify-between items-center border-b border-slate-50 dark:border-slate-800 group active:bg-rose-50/10 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Link2Off size={18} className="text-slate-400 group-hover:text-rose-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-500">解绑穿戴设备</span>
              </div>
              <ChevronRight size={16} className="text-slate-200" />
            </button>
          )}
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full p-5 flex justify-between items-center group active:bg-rose-50/30 transition-colors"
          >
            <div className="flex items-center space-x-3 text-rose-500">
              <UserX size={18} />
              <span className="font-bold">注销账号</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[9px] font-black text-rose-200 dark:text-rose-900/50 uppercase tracking-widest">危险操作</span>
              <ChevronRight size={16} className="text-slate-200" />
            </div>
          </button>
        </div>

        <div className="mt-12 pt-6">
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 py-5 rounded-[28px] flex items-center justify-center space-x-3 text-rose-500 font-black text-sm shadow-sm active:bg-rose-50 dark:active:bg-rose-950/20 active:scale-95 transition-all"
          >
            <LogOut size={18} />
            <span className="uppercase tracking-widest">退出登录</span>
          </button>
        </div>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative w-full max-w-xs bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl text-center border border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6"><AlertTriangle size={32} /></div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">确定要退出吗？</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold leading-relaxed px-4">退出后您的对话记录和购物车将在此设备清除。</p>
            <div className="flex flex-col space-y-3 mt-8">
              <button onClick={onLogout} className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-rose-500/20 active:scale-95 transition-all">确认退出</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full bg-slate-50 dark:bg-slate-800 text-slate-500 py-4 rounded-2xl font-black text-sm active:scale-95 transition-all">我再想想</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-2xl text-center border border-rose-500/20">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-[30px] flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-lg shadow-rose-500/10"><UserX size={40} /></div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tight">永久注销账号？</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10">
              注销后，您的所有<span className="text-rose-500 font-black">康复档案、对话历史、订单记录</span>将被永久删除且无法恢复。
            </p>
            <div className="flex flex-col space-y-4">
              <button onClick={onDeleteAccount} className="w-full bg-rose-500 text-white py-5 rounded-[24px] font-black text-sm shadow-xl shadow-rose-500/30 active:scale-95 transition-all">申请永久注销</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-[24px] font-black text-sm active:scale-95 transition-all">返回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

import React, { useState, useEffect, useCallback } from 'react';
import { PatientProfile } from '../types';
import { 
  User, 
  Settings as SettingsIcon, 
  ChevronRight, 
  Bell, 
  Moon, 
  Languages, 
  Smartphone, 
  Ruler,
  Check,
  Voicemail,
  FileText,
  Shield,
  ArrowLeft,
  X,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import ProtocolView from './ProtocolView';

const LANGUAGE_LABELS: Record<string, string> = {
  'zh-CN': '简体中文',
  'en-US': 'English'
};

const UNIT_LABELS: Record<string, string> = {
  'metric': '公制',
  'imperial': '英制'
};

const VOICE_DISPLAY_MAP: Record<string, { displayName: string; gender: '男' | '女' }> = {
  'Meijia': { displayName: '美佳', gender: '女' },
  'Ting-Ting': { displayName: '婷婷', gender: '女' },
  'Li-Mu': { displayName: '立牧', gender: '男' },
  'Yu-shu': { displayName: '语书', gender: '女' },
  'Xiaoyun': { displayName: '晓云', gender: '女' },
  'Yunxi': { displayName: '云溪', gender: '男' },
  'Yunxia': { displayName: '云夏', gender: '女' },
  'Yunyang': { displayName: '云扬', gender: '男' },
  'Zhiqi': { displayName: '知琦', gender: '女' },
  'Yunjian': { displayName: '云健', gender: '男' },
  'Google 普通话': { displayName: 'Google 官方', gender: '女' },
  'Google Mandarin': { displayName: 'Google 官方', gender: '女' },
};

interface SettingsViewProps {
  onBack: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  profile: PatientProfile;
  onUpdateProfile: (updates: Partial<PatientProfile>) => void;
  fontSize: 'small' | 'normal' | 'large' | 'extra-large';
  setFontSize: (size: 'small' | 'normal' | 'large' | 'extra-large') => void;
  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  language: string;
  setLanguage: (lang: string) => void;
  hapticFeedback: boolean;
  setHapticFeedback: (enabled: boolean) => void;
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (unit: 'metric' | 'imperial') => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  onBack, onLogout, onDeleteAccount, 
  profile, onUpdateProfile,
  fontSize, setFontSize, themeMode, setThemeMode, language, setLanguage, hapticFeedback, setHapticFeedback, unitSystem, setUnitSystem
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentSubPage, setCurrentSubPage] = useState<'main' | 'font-size' | 'theme' | 'language' | 'unit' | 'voice' | 'protocol_service' | 'protocol_privacy'>('main');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('zh'));
      setAvailableVoices(voices);
    };
    getVoices();
    window.speechSynthesis.onvoiceschanged = getVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string, voiceName?: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    
    const trySpeak = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          trySpeak();
          window.speechSynthesis.onvoiceschanged = null;
        };
        return;
      }
      
      let selectedVoice = null;
      if (voiceName && voiceName !== 'default') {
        selectedVoice = allVoices.find(v => v.name === voiceName);
      }
      
      if (!selectedVoice) {
        // Fallback or explicit request for Meijia
        if (!voiceName || voiceName === 'default') {
            selectedVoice = allVoices.find(v => v.name.toLowerCase().includes('meijia'));
        }
      }

      if (!selectedVoice) {
        selectedVoice = allVoices.find(v => 
          v.name.includes('Google') && 
          (v.name.includes('普通话') || v.name.includes('Mandarin')) &&
          (v.lang.includes('zh') || v.lang.includes('CN'))
        );
      }
      
      if (selectedVoice) utterance.voice = selectedVoice;
      window.speechSynthesis.speak(utterance);
    };

    trySpeak();
  }, []);

  const handleVoiceSelection = (voiceName: string) => {
    onUpdateProfile({ voicePreference: voiceName });
    speak(`你好！我是${profile.name || '五养教练'}`, voiceName);
    if (hapticFeedback && navigator.vibrate) navigator.vibrate(10);
  };
  
  const getVoiceDisplayName = (voiceName: string) => {
    if (voiceName === 'default' || !voiceName) return '默认 (美佳/Google 官方)';
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
    onClick?: () => void; 
    showChevron?: boolean;
    description?: string;
  }> = ({ icon, label, value, onClick, showChevron = true, description }) => (
    <button 
      onClick={onClick}
      className="w-full bg-white dark:bg-slate-900 p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          {icon}
        </div>
        <div className="text-left flex flex-col">
           <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
           {description && <span className="text-xs text-slate-400 mt-0.5">{description}</span>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {value && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{value}</span>}
        {showChevron && <ChevronRight size={18} className="text-slate-300" />}
      </div>
    </button>
  );

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 mt-8">{children}</h3>
  );

  const renderSelectionPage = (
    title: string, 
    options: { key: string, label: string, desc?: string, rightLabel?: string }[], 
    currentValue: string, 
    onSelect: (key: string) => void
  ) => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 absolute inset-0 z-50">
      <header className="p-6 pb-4 flex items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
        <button onClick={() => setCurrentSubPage('main')} className="mr-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-slate-800 dark:text-white">{title}</h2>
      </header>
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className="w-full p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-0 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
            >
              <div className="text-left flex flex-col">
                 <div className="flex items-center space-x-2">
                    <span className={`font-bold ${currentValue === opt.key ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {opt.label}
                    </span>
                    {opt.rightLabel && (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px] font-black">{opt.rightLabel}</span>
                    )}
                 </div>
                 {opt.desc && <span className="text-xs text-slate-400 mt-1">{opt.desc}</span>}
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${currentValue === opt.key ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 dark:border-slate-700'}`}>
                {currentValue === opt.key && <Check size={14} className="text-white" />}
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );

  if (currentSubPage === 'font-size') {
    return renderSelectionPage(
      '字体大小',
      [
        { key: 'small', label: '小号' },
        { key: 'normal', label: '标准', desc: '推荐使用' },
        { key: 'large', label: '大号' },
        { key: 'extra-large', label: '特大号', desc: '适合需要更大字体的用户' },
      ],
      fontSize,
      (key) => setFontSize(key as 'small' | 'normal' | 'large' | 'extra-large')
    );
  }

  if (currentSubPage === 'theme') {
    return renderSelectionPage(
      '显示模式',
      [
        { key: 'system', label: '跟随系统', desc: '根据您的设备设置自动切换' },
        { key: 'light', label: '浅色模式' },
        { key: 'dark', label: '深色模式', desc: '在夜间使用以保护视力' },
      ],
      themeMode,
      (key) => setThemeMode(key as 'system' | 'light' | 'dark')
    );
  }

  if (currentSubPage === 'language') {
    return renderSelectionPage(
      '语言',
      [
        { key: 'zh-CN', label: '简体中文' },
        { key: 'en-US', label: 'English' }
      ],
      language,
      (key) => setLanguage(key)
    );
  }

  if (currentSubPage === 'unit') {
    return renderSelectionPage(
      '单位制',
      [
        { key: 'metric', label: '公制', desc: '千克 (kg), 厘米 (cm), 摄氏度 (°C)' },
        { key: 'imperial', label: '英制', desc: '磅 (lbs), 英寸 (in), 华氏度 (°F)' }
      ],
      unitSystem,
      (key) => setUnitSystem(key as 'metric' | 'imperial')
    );
  }

  if (currentSubPage === 'voice') {
    const hasMeijia = availableVoices.some(v => v.name.toLowerCase().includes('meijia'));
    const voiceOptions = [
      { 
        key: 'default', 
        label: '系统默认', 
        desc: hasMeijia ? '已自动为您匹配专属音色：美佳' : '系统首选 Google 普通话（中国大陆）语音',
        rightLabel: hasMeijia ? '女' : undefined
      },
      ...availableVoices.map(v => {
        const displayNameInfo = Object.entries(VOICE_DISPLAY_MAP).find(([key, _]) => v.name.toLowerCase().includes(key.toLowerCase()));
        const label = displayNameInfo ? displayNameInfo[1].displayName : v.name.split(' ')[0];
        let gender: '男' | '女' | undefined = undefined;
        if (displayNameInfo) gender = displayNameInfo[1].gender;
        return {
          key: v.name,
          label: label,
          desc: v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Microsoft') ? '高音质云端合成' : '本地合成',
          rightLabel: gender
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

  if (currentSubPage === 'protocol_service' || currentSubPage === 'protocol_privacy') {
    return (
      <div className="absolute inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col">
        <ProtocolView protocolKey={currentSubPage === 'protocol_service' ? 'user_service' : 'privacy_policy'} onClose={() => setCurrentSubPage('main')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 pb-24">
      <header className="p-6 pb-2 pt-12 flex items-center bg-slate-50 dark:bg-slate-950 sticky top-0 z-10">
        <button onClick={onBack} className="mr-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"><ArrowLeft size={20} /></button><h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">系统设置</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-500/20 mb-8 mt-4">
           <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/40">
                <User size={32} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-xl">{profile.name || profile.nickname || '患者'}</h3>
                <p className="text-emerald-100 font-medium mt-0.5 opacity-90">{profile.phoneNumber || '未绑定手机号'}</p>
              </div>
           </div>
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

        <SectionTitle>外观与显示</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingCard 
             icon={<Moon size={18} />} 
             label="显示模式" 
             value={themeMode === 'system' ? '跟随系统' : themeMode === 'light' ? '浅色' : '深色'} 
             onClick={() => setCurrentSubPage('theme')} 
          />
          <SettingCard 
             icon={<SettingsIcon size={18} />} 
             label="字体大小" 
             value={fontSize === 'small' ? '小号' : fontSize === 'normal' ? '标准' : fontSize === 'large' ? '大号' : '特大号'} 
             onClick={() => setCurrentSubPage('font-size')} 
          />
          <SettingCard 
             icon={<Ruler size={18} />} 
             label="单位制" 
             value={UNIT_LABELS[unitSystem]} 
             onClick={() => setCurrentSubPage('unit')} 
          />
        </div>

        <SectionTitle>消息与通知</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingCard icon={<Bell size={18} />} label="应用通知" value="已开启" onClick={() => {}} />
          <SettingCard icon={<Check size={18} />} label="服药提醒" value="已开启" onClick={() => {}} />
        </div>
        
        <SectionTitle>关于</SectionTitle>
        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <SettingCard icon={<FileText size={18} />} label="用户服务协议" onClick={() => setCurrentSubPage('protocol_service')} />
          <SettingCard icon={<Shield size={18} />} label="隐私政策" onClick={() => setCurrentSubPage('protocol_privacy')} />
          <div className="p-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
             <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Sparkles size={18} />
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200">当前版本</span>
             </div>
             <span className="text-sm font-bold text-slate-400">v2.4.5</span>
          </div>
        </div>

        <div className="mt-8 space-y-4">
           <button 
             onClick={() => setShowLogoutConfirm(true)}
             className="w-full bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 active:bg-slate-50 dark:active:bg-slate-800/50"
           >
             退出登录
           </button>
           <button 
             onClick={() => setShowDeleteConfirm(true)}
             className="w-full p-4 font-bold text-rose-500 opacity-80 hover:opacity-100 transition-opacity"
           >
             注销账号
           </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <SettingsIcon size={24} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">确定要退出登录吗？</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">退出后将无法接收今日康复简报和服药提醒。</p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50">取消</button>
              <div className="w-[1px] bg-slate-100 dark:bg-slate-800"></div>
              <button onClick={onLogout} className="flex-1 py-4 font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20">确认退出</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-rose-100 dark:border-rose-900/30">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">永久注销账号？</h3>
              <p className="text-rose-500 dark:text-rose-400 text-sm font-bold bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl mb-4">警告：此操作不可逆！</p>
              <ul className="text-left text-sm text-slate-500 dark:text-slate-400 space-y-2 mb-2 ml-2">
                 <li className="flex items-center space-x-2"><div className="w-1 h-1 bg-slate-400 rounded-full"></div><span>清除所有健康档案与数据</span></li>
                 <li className="flex items-center space-x-2"><div className="w-1 h-1 bg-slate-400 rounded-full"></div><span>清除服务订阅与积分</span></li>
                 <li className="flex items-center space-x-2"><div className="w-1 h-1 bg-slate-400 rounded-full"></div><span>解除手机号与第三方绑定</span></li>
              </ul>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-800 flex-col-reverse sm:flex-row">
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full sm:flex-1 py-4 font-bold text-slate-600 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent">保留账号</button>
              <div className="hidden sm:block w-[1px] bg-slate-100 dark:bg-slate-800"></div>
              <button onClick={onDeleteAccount} className="w-full sm:flex-1 py-4 font-black text-rose-500 bg-white dark:bg-slate-900">确认永久注销</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;

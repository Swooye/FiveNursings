import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, ShieldCheck, X, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../src/firebase';

interface LoginViewProps {
  onLogin: () => void;
}

declare global {
  interface Window {
    confirmationResult?: ConfirmationResult;
    recaptchaVerifier: any;
    grecaptcha: any;
  }
}

type LoginStep = 'none' | 'phone' | 'code';

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [step, setStep] = useState<LoginStep>('none');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vCode, setVCode] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(59);
  const [shakeAgreement, setShakeAgreement] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const vCodeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 针对本地开发模式启用 Firebase 模拟器手机号测试逻辑
  useEffect(() => {
    if (auth) {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('cloudworkstations.dev');
      if (isDev) {
        auth.settings.appVerificationDisabledForTesting = true;
      }
    }
  }, []);

  // Timer for verification code countdown
  useEffect(() => {
    let timer: any;
    if (step === 'code' && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);
  
  // Clear error message when the login step changes
  useEffect(() => {
    setError('');
  }, [step]);

  // Cleanup reCAPTCHA
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier && typeof window.recaptchaVerifier.clear === 'function') {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const triggerReminder = () => {
    setShakeAgreement(true);
    setShowTip(true);
    setTimeout(() => setShakeAgreement(false), 500);
    setTimeout(() => setShowTip(false), 2500);
  };

  const handleOneClickLogin = () => {
    if (!acceptedTerms) {
      triggerReminder();
      return;
    }
    onLogin();
  };

  const openSmsLogin = () => {
    if (!acceptedTerms) {
      triggerReminder();
      return;
    }
    setStep('phone');
  };

  const handlePhoneSubmit = async () => {
    if (phoneNumber.length < 11) return;
    
    setLoading(true);
    setError('');
    
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('cloudworkstations.dev');
      
      if (isDev) {
        // 关键点 1: 在初始化前确保禁用验证
        auth.settings.appVerificationDisabledForTesting = true;
        
        // 关键点 2: 开发环境下使用 Mock 对象，避免加载 reCAPTCHA 脚本
        // 修复：添加 _reset 方法以满足 Firebase Auth 内部调用需求
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = {
            type: 'recaptcha',
            verify: async () => 'fake-token',
            render: async () => 0,
            clear: () => {},
            _reset: () => {} 
          };
        }
      } else {
        // 生产环境逻辑
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'sign-in-button', {
            'size': 'invisible',
            'callback': () => {
              console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
            }
          });
        }
      }

      // 关键点 3: 手动触发验证 (Mock 对象也会返回)
      await window.recaptchaVerifier.verify();

      const fullPhoneNumber = `+86${phoneNumber}`;
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
      setStep('code');
      setCountdown(59);
    } catch (err: any) {
      console.error("SMS send error:", err);
      setError('发送失败，请稍后重试。');
      // 发生错误时尝试重置 (仅在非 Mock 且 grecaptcha 存在时)
      if (window.recaptchaVerifier && window.grecaptcha && typeof window.recaptchaVerifier.render === 'function') {
        window.recaptchaVerifier.render().then((widgetId: any) => {
          window.grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleCodeSubmit = async (code: string) => {
      if (code.length < 6 || !window.confirmationResult) return;
      setLoading(true);
      setError('');
      try {
          await window.confirmationResult.confirm(code);
          onLogin(); 
      } catch (err: any) {
          console.error("Code verification error:", err);
          setError(`验证失败: 验证码无效或已过期。`);
          setVCode(['', '', '', '', '', '']);
          vCodeRefs.current[0]?.focus();
      } finally {
          setLoading(false);
      }
  }

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value) || loading) return;
    
    const newCode = [...vCode];
    newCode[index] = value.slice(-1);
    setVCode(newCode);

    if (value && index < 5) {
      vCodeRefs.current[index + 1]?.focus();
    }
    
    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      handleCodeSubmit(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !vCode[index] && index > 0) {
      vCodeRefs.current[index - 1]?.focus();
    }
  };

  const closeModal = () => {
    setStep('none');
    setVCode(['', '', '', '', '', '']);
    if (window.recaptchaVerifier) {
      if (typeof window.recaptchaVerifier.clear === 'function') {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = null;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col items-center px-10 pt-32 pb-16 animate-in fade-in duration-700 relative shadow-2xl border-x border-slate-200 dark:border-slate-800 no-scrollbar">
      
      <div className="flex flex-col items-center space-y-4 mb-32 z-10">
        <h1 className="text-5xl font-black text-emerald-600 tracking-tighter drop-shadow-sm">
          康养家
        </h1>
        <p className="text-xl font-bold text-slate-500 tracking-wide">
          你的私人健康管家
        </p>
      </div>

      <div className="w-full flex flex-col items-center space-y-12 z-10">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-400 mb-2">当前手机号</p>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">
            186****1010
          </h2>
        </div>

        <div className="w-full space-y-6">
          <button
            onClick={handleOneClickLogin}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-5 rounded-full font-black text-lg shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center space-x-3"
          >
            <Smartphone size={22} strokeWidth={2.5} />
            <span>本机号码一键登录</span>
          </button>

          <button 
            onClick={openSmsLogin}
            className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors underline underline-offset-4 decoration-slate-300"
          >
            短信验证码登录
          </button>
        </div>
      </div>

      <div className="mt-auto relative w-full flex flex-col items-center">
        {showTip && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-800/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[11px] font-bold flex items-center space-x-2 shadow-xl whitespace-nowrap">
              <AlertCircle size={14} className="text-emerald-400" />
              <span>请先阅读并勾选同意相关协议</span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800/90 rotate-45"></div>
            </div>
          </div>
        )}
        <div className={`flex items-center space-x-2.5 transition-transform ${shakeAgreement ? 'animate-shake' : ''}`}>
          <button 
            onClick={() => {
              setAcceptedTerms(!acceptedTerms);
              if (!acceptedTerms) setShowTip(false);
            }}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
              acceptedTerms ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'border-slate-300 bg-white hover:border-emerald-300'
            }`}
            aria-label="同意协议"
          >
            {acceptedTerms && <ShieldCheck size={14} strokeWidth={3} />}
          </button>
          <p className="text-[11px] text-slate-400 font-medium leading-none">
            已阅读并同意 <button className="text-emerald-600 font-bold hover:underline">服务协议</button> 和 <button className="text-emerald-600 font-bold hover:underline">隐私政策</button>
          </p>
        </div>
      </div>

      {step !== 'none' && (
        <>
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-300" 
            onClick={closeModal}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] p-8 pb-12 z-50 animate-in slide-in-from-bottom-out duration-500 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">{step === 'phone' ? '手机号登录' : '输入验证码'}</h3>
              <button onClick={closeModal} className="p-2 text-slate-300 hover:text-slate-500">
                <X size={24} />
              </button>
            </div>

            {step === 'phone' && (
              <div className="space-y-8">
                <div className="flex items-center space-x-0 bg-emerald-50/50 border-2 border-emerald-600/30 rounded-3xl overflow-hidden focus-within:border-emerald-600 transition-colors">
                  <div className="flex items-center space-x-1 px-5 py-4 text-slate-700 font-bold border-r border-emerald-600/20">
                    <span>+86</span>
                  </div>
                  <input 
                    autoFocus
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="请输入手机号"
                    className="flex-1 bg-transparent px-5 py-4 font-bold text-slate-800 outline-none placeholder:text-slate-300"
                  />
                </div>
                <button 
                  id="sign-in-button"
                  disabled={phoneNumber.length < 11 || loading}
                  onClick={handlePhoneSubmit}
                  className="w-full bg-emerald-700 disabled:opacity-50 text-white py-5 rounded-full font-black text-lg shadow-xl shadow-emerald-500/10 active:scale-95 transition-all flex items-center justify-center"
                >
                  {loading ? <Loader2 className="animate-spin" size={24} /> : '获取验证码'}
                </button>
                {error && <p className="text-center text-red-500 text-sm font-bold">{error}</p>}
              </div>
            )}

            {step === 'code' && (
              <div className="space-y-10">
                <p className="text-sm text-slate-400 font-medium">
                  验证码已发送至 +86 {phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                </p>
                <div className="flex justify-between gap-2">
                  {vCode.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (vCodeRefs.current[i] = el)}
                      type="tel"
                      maxLength={1}
                      value={digit}
                      autoFocus={i === 0}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-12 h-16 sm:w-14 sm:h-20 bg-emerald-50/50 border-2 border-emerald-600/20 rounded-2xl text-center text-2xl font-black text-slate-800 focus:border-emerald-600 focus:bg-white outline-none transition-all shadow-sm"
                    />
                  ))}
                </div>
                 {loading ? (
                    <div className="flex justify-center items-center space-x-2 text-slate-400 font-bold">
                        <Loader2 className="animate-spin" size={18} />
                        <span>正在验证...</span>
                    </div>
                 ) : (
                    <div className="text-center">
                        <button 
                            disabled={countdown > 0}
                            onClick={handlePhoneSubmit}
                            className={`text-sm font-bold ${countdown > 0 ? 'text-slate-400' : 'text-emerald-600'}`}
                        >
                            重新发送 {countdown > 0 ? `(${countdown}s)` : ''}
                        </button>
                    </div>
                 )}
                {error && <p className="text-center text-red-500 text-sm font-bold">{error}</p>}
              </div>
            )}
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; animation-iteration-count: 2; }
        .slide-in-from-bottom-out { animation-direction: reverse; }
      `}} />
    </div>
  );
};

export default LoginView;

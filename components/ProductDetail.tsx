
import React, { useState } from 'react';
import { SKU, PatientProfile } from '../types';
import { ArrowLeft, Share2, Star, ShieldCheck, Zap, Heart, Info, ChevronRight, CheckCircle2, ShoppingCart, Plus, Minus, Sparkles } from 'lucide-react';

interface ProductDetailProps {
  sku: SKU;
  profile: PatientProfile;
  onBack: () => void;
  onPurchase: (sku: SKU) => void;
  onAddToCart: (sku: SKU, quantity: number) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ sku, profile, onBack, onPurchase, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);

  const handleAdd = () => {
    onAddToCart(sku, quantity);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const details = {
    diet: {
      tags: ['高生物价蛋白', '无添加', '慢消化'],
      highlights: ['采用超低温冻干技术', '林主任科研团队配方', '针对术后吸收率优化'],
      spec: '500g / 盒',
      usage: '每日晨起温水冲服 30g'
    },
    sleep: {
      tags: ['非药物', '草本安神', '助眠环境'],
      highlights: ['精选道地陈皮与合欢花', '经 108 小时缓慢萃取', '配合 AI 助眠音乐包使用'],
      spec: '30ml * 10 支 / 盒',
      usage: '睡前 30 分钟使用或熏香'
    },
    mental: {
      tags: ['正念辅助', '解压疗愈', '感官唤醒'],
      highlights: ['包含专家音频导引', '特调舒缓芳香成分', '提升抗压能力评估分'],
      spec: '套装礼盒',
      usage: '建议在心理养评分低于 60 分时启用'
    },
    function: {
      tags: ['专业康复', '分级训练', '耐力提升'],
      highlights: ['符合人体工学设计', '配备 21 天康复打卡表', '实时同步功能养数据'],
      spec: '标准康复套装',
      usage: '配合呼吸训练计划，每日 2 组'
    }
  }[sku.nursingType as keyof typeof details] || {
    tags: ['品质严选', '安全可靠'],
    highlights: ['权威专家联合推荐', '高标准质检'],
    spec: '标准规格',
    usage: '遵循包装说明使用'
  };

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black/20 dark:bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onBack}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="h-full max-w-md mx-auto bg-white dark:bg-slate-950 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-500 no-scrollbar shadow-2xl border-x border-slate-200 dark:border-slate-800 relative"
      >
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span className="text-sm font-black">已成功加入购物车</span>
            </div>
          </div>
        )}

        {/* Top Navigation */}
        <div className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-50 dark:border-slate-800">
          <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex space-x-2">
            <button className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400"><Share2 size={20} /></button>
            <button className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400"><Heart size={20} /></button>
          </div>
        </div>

        <div className="px-5 mt-4">
          <div className="relative h-80 rounded-[44px] overflow-hidden shadow-2xl">
            <img src={sku.image} alt={sku.name} className="w-full h-full object-cover" />
            <div className="absolute bottom-6 left-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 shadow-lg">
              <div className="flex items-center space-x-2">
                <Star size={14} className="text-amber-500" fill="currentColor" />
                <span className="text-sm font-black text-slate-800 dark:text-white">4.9</span>
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">Clinical Choice</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 space-y-8 pb-40">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight flex-1 mr-6">{sku.name}</h1>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">¥{profile.isVIP ? sku.memberPrice : sku.price}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {details.tags.map(tag => (
                <span key={tag} className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-xl border border-emerald-100 dark:border-emerald-800/50 uppercase tracking-wider">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* AI Insight Box - Space Gray */}
          <div className="bg-slate-800 dark:bg-slate-900 rounded-[36px] p-7 text-white shadow-xl relative overflow-hidden group border border-slate-700 dark:border-slate-800">
            <div className="relative z-10">
              <div className="flex items-center space-x-2.5 mb-5">
                <div className="p-2 bg-emerald-500 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] block">Expert Recommendation</span>
                  <span className="text-sm font-black tracking-tight">专家团队·推荐理由</span>
                </div>
              </div>
              <p className="text-[13.5px] text-slate-300 dark:text-slate-400 leading-relaxed font-bold italic">
                “{sku.reason} 该产品针对您的{sku.nursingType === 'diet' ? '营养支持' : '生活康复'}需求进行了深度优化，建议在方案执行初期坚持使用。”
              </p>
            </div>
            <ShieldCheck size={100} className="absolute -right-6 -bottom-6 opacity-5 rotate-12 text-emerald-400" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[50px] -mr-16 -mt-16"></div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <span className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">购买数量</span>
            <div className="flex items-center space-x-7">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
              >
                <Minus size={20} />
              </button>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100 w-6 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 active:scale-90 transition-transform"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center tracking-tight ml-1">
              <Zap size={18} className="mr-2 text-emerald-500" />
              产品核心亮点
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {details.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-4 p-5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm group hover:border-emerald-500 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Specs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-10">
            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">产品规格说明</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold">标准规格</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{details.spec}</span>
              </div>
              <div className="flex justify-between items-center pt-5 border-t border-slate-50 dark:border-slate-800">
                <span className="text-xs text-slate-400 font-bold">建议用法</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{details.usage}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Action Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-100 dark:border-slate-800 z-50 flex items-center space-x-4">
          <button 
            onClick={handleAdd}
            className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[24px] flex items-center justify-center text-slate-600 dark:text-slate-400 active:scale-95 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
          >
            <ShoppingCart size={24} />
          </button>
          <button 
            onClick={() => onPurchase(sku)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[24px] font-black text-sm shadow-2xl shadow-emerald-500/20 dark:shadow-none active:scale-95 transition-all flex items-center justify-center space-x-2"
          >
            <span>立即结算 ¥{(profile.isVIP ? sku.memberPrice : sku.price) * quantity}</span>
            <ChevronRight size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

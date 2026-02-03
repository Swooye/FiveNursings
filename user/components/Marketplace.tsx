
import React, { useState } from 'react';
import { SKU, PatientProfile } from '../types';
import { ShoppingCart, Star, ShieldCheck, Heart, X, CreditCard, ChevronRight, PackageCheck, Truck, Plus, Minus, Sparkles, Crown } from 'lucide-react';
import ProductDetail from './ProductDetail';

interface MarketplaceProps {
  cartCount: number;
  onOpenCart: () => void;
  onAddToCart: (sku: SKU, quantity: number) => void;
  profile: PatientProfile;
}

const Marketplace: React.FC<MarketplaceProps> = ({ cartCount, onOpenCart, onAddToCart, profile }) => {
  const [selectedSKU, setSelectedSKU] = useState<SKU | null>(null);
  const [viewingProduct, setViewingProduct] = useState<SKU | null>(null);

  const skus: SKU[] = [
    { id: '1', name: '全周期·助眠滋养包', price: 298, memberPrice: 208, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400', reason: '针对您的“睡眠养”评分波动，精选助眠药浴与安神香薰。', nursingType: 'sleep' },
    { id: '2', name: '术后元气·脾胃调理包', price: 420, memberPrice: 294, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400', reason: '提升“饮食养”消化吸收率，内含林主任团队研发配方。', nursingType: 'diet' },
    { id: '3', name: '悦享·舒缓心理盒子', price: 159, memberPrice: 111, image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=400', reason: '缓解靶向/化疗心理压力，提供专属冥想与正念指导。', nursingType: 'mental' },
    { id: '4', name: '轻盈·关节功能恢复包', price: 188, memberPrice: 131, image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=400', reason: '强化“功能养”灵活度，包含康复弹力带与图文动作指南。', nursingType: 'function', isMemberOnly: true },
  ];

  const handleOpenDetail = (sku: SKU) => setViewingProduct(sku);
  
  const handleStartPurchase = (sku: SKU) => {
    setSelectedSKU(sku);
    setViewingProduct(null);
  };

  return (
    <div className="p-5 space-y-8 pb-32 animate-in fade-in duration-500 relative transition-colors duration-300">
      {/* Fixed Cart FAB */}
      <button 
        onClick={onOpenCart}
        className="fixed bottom-24 right-6 w-16 h-16 bg-slate-800 dark:bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[55] active:scale-90 transition-transform hover:bg-slate-700 dark:hover:bg-emerald-500 border border-slate-700 dark:border-transparent"
      >
        <ShoppingCart size={24} />
        {cartCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-emerald-500 dark:bg-slate-900 text-white text-[10px] font-black min-w-[20px] h-5 rounded-full px-1.5 flex items-center justify-center border-2 border-white dark:border-emerald-600">
            {cartCount}
          </div>
        )}
      </button>

      {/* Product Detail Overlay */}
      {viewingProduct && (
        <ProductDetail 
          sku={viewingProduct} 
          profile={profile}
          onBack={() => setViewingProduct(null)} 
          onPurchase={handleStartPurchase} 
          onAddToCart={onAddToCart}
        />
      )}

      {/* Featured Banner - Now Highlights Member Benefit */}
      <div className={`rounded-[36px] p-8 text-white relative overflow-hidden shadow-xl border group active:scale-[0.98] transition-all ${profile.isVIP ? 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-400' : 'bg-slate-800 dark:bg-slate-900 border-slate-700'}`}>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-4">
             <div className={`w-2 h-2 rounded-full animate-pulse ${profile.isVIP ? 'bg-white' : 'bg-emerald-400'}`}></div>
             <div className="text-[10px] font-black uppercase tracking-[0.2em]">{profile.isVIP ? 'VIP Member Privilege' : 'Limited Benefit'}</div>
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tight">{profile.isVIP ? '您的专属 7 折优惠' : '康养好物 7 折起'}</h2>
          <p className={`${profile.isVIP ? 'text-amber-100' : 'text-slate-400'} text-sm mb-7 font-bold leading-relaxed max-w-[80%]`}>由林主任专业团队严选，降低您的信息与选择成本。</p>
          {!profile.isVIP && (
             <button className="bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-slate-100 active:scale-95 transition-all shadow-lg flex items-center space-x-2">
                <span>开通会员立享折扣</span>
                <ChevronRight size={16} />
             </button>
          )}
        </div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16"></div>
        {profile.isVIP && <Crown className="absolute right-8 top-12 text-white/10 w-24 h-24" />}
      </div>

      {/* Category Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="flex justify-between items-end px-2">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">智能推荐方案</h3>
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-0.5">Endorsed By Expert Team</p>
          </div>
        </div>
        
        {skus.map(sku => (
          <div 
            key={sku.id} 
            onClick={() => handleOpenDetail(sku)}
            className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group transition-all duration-500 hover:shadow-xl cursor-pointer"
          >
            <div className="relative h-64 overflow-hidden">
              <img src={sku.image} alt={sku.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              {sku.isMemberOnly && (
                <div className="absolute top-5 left-5 bg-amber-500 text-slate-900 px-3 py-1 rounded-xl text-[9px] font-black flex items-center space-x-1 uppercase tracking-widest shadow-lg">
                  <Crown size={12} />
                  <span>会员专供</span>
                </div>
              )}
              <div className="absolute top-5 right-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-2.5 rounded-2xl shadow-lg">
                <Heart className="text-rose-500" size={20} />
              </div>
            </div>
            
            <div className="p-7">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 tracking-tight">{sku.name}</h3>
                <div className="flex items-center text-amber-500 text-xs font-black bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-xl border border-amber-100 dark:border-amber-800/50">
                  <Star size={14} fill="currentColor" className="mr-1" />
                  <span>4.9</span>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed mb-6 font-bold italic line-clamp-2">
                “{sku.reason}”
              </p>
              <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-slate-400 dark:text-slate-600 text-[11px] font-black line-through tracking-tighter opacity-60">¥{sku.price}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">¥{profile.isVIP ? sku.memberPrice : sku.price}</span>
                    {profile.isVIP && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">VIP价</span>}
                  </div>
                </div>
                <div className={`px-9 py-4 rounded-[22px] font-black text-sm shadow-xl transition-all flex items-center space-x-2 active:scale-95 ${profile.isVIP ? 'bg-amber-500 text-slate-950 shadow-amber-500/20' : 'bg-emerald-600 text-white shadow-emerald-500/20'}`}>
                  <ShoppingCart size={18} />
                  <span>了解详情</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;


import React, { useState, useEffect, useMemo } from 'react';
import { SKU, PatientProfile } from '../types';
import { ShoppingCart, Star, Crown, Search, Plus, Heart, X, Flame } from 'lucide-react';
import ProductDetail from './ProductDetail';

const API_URL = import.meta.env.DEV ? "" : "https://api-u46fik5vcq-uc.a.run.app";

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'diet', label: '饮食调理' },
  { id: 'exercise', label: '康复运动' },
  { id: 'sleep', label: '助眠修复' },
  { id: 'mental', label: '心理舒缓' },
  { id: 'function', label: '机能增强' },
];

interface MarketplaceProps {
  cartCount: number;
  onOpenCart: () => void;
  onAddToCart: (sku: SKU, quantity: number) => void;
  profile: PatientProfile;
  favorites?: SKU[];
  onToggleFavorite?: (sku: SKU) => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ cartCount, onOpenCart, onAddToCart, profile, favorites = [], onToggleFavorite }) => {
  const [viewingProduct, setViewingProduct] = useState<SKU | null>(null);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/mall_items`);
        const data = await response.json();
        
        const onSaleProducts = data
          .filter((item: any) => item.status === 'on_sale')
          .map((item: any) => ({
            id: item.id || item._id,
            name: item.name,
            price: item.price,
            memberPrice: item.memberPrice || Math.round(item.price * 0.7),
            image: item.imageUrl || item.image || 'https://via.placeholder.com/400?text=康养好物',
            reason: item.reason || '专家推荐，康复必备',
            nursingType: item.nursingType || 'diet',
            isMemberOnly: item.isMemberOnly || false,
            tags: item.tags || ['品质严选', '安全可靠'],
            highlights: item.highlights || ['权威专家联合推荐', '高标准质检'],
            spec: item.spec || '标准规格',
            usage: item.usage || '遵循包装说明使用'
          }));
        
        setSkus(onSaleProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredSkus = useMemo(() => {
    return skus.filter(sku => {
        const matchesSearch = sku.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             sku.reason.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'all' || sku.nursingType === activeCategory;
        return matchesSearch && matchesCategory;
    });
  }, [skus, searchQuery, activeCategory]);

  const isFavorited = (skuId: string) => favorites.some(f => f.id === skuId);

  if (loading) {
    return (
      <div className="p-5 flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-500 relative transition-colors duration-300">
      {/* Fixed Cart Button */}
      <button 
        onClick={onOpenCart}
        className="fixed bottom-24 right-6 w-14 h-14 bg-slate-900 dark:bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[55] active:scale-90 transition-transform border border-white/10"
      >
        <ShoppingCart size={22} />
        {cartCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-4.5 rounded-full px-1 flex items-center justify-center border-2 border-white dark:border-slate-900">
            {cartCount}
          </div>
        )}
      </button>

      {viewingProduct && (
        <ProductDetail 
          sku={viewingProduct} 
          profile={profile}
          isFavorited={isFavorited(viewingProduct.id)}
          onToggleFavorite={onToggleFavorite}
          onBack={() => setViewingProduct(null)} 
          onPurchase={(s) => { onAddToCart(s, 1); setViewingProduct(null); }} 
          onAddToCart={onAddToCart}
        />
      )}

      {/* 1. Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
            <Search size={18} />
        </div>
        <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索康复好物、营养包..."
            className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-12 shadow-sm focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400"
        />
        {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-4 flex items-center text-slate-300 hover:text-slate-500">
                <X size={16} />
            </button>
        )}
      </div>

      {/* 2. Category Filter */}
      <div className="flex space-x-3 overflow-x-auto no-scrollbar py-2 -mx-5 px-5">
        {CATEGORIES.map(cat => (
            <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black transition-all ${
                    activeCategory === cat.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
                }`}
            >
                {cat.label}
            </button>
        ))}
      </div>

      {/* 3. Promo Banner */}
      <div className="bg-slate-800 dark:bg-slate-900 rounded-[32px] p-7 text-white relative overflow-hidden shadow-xl border border-slate-700">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3">
             <Flame size={14} className="text-amber-400 fill-amber-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">新人专享福利</span>
          </div>
          <h2 className="text-3xl font-black mb-2 tracking-tighter">首单立减 ¥50</h2>
          <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-[65%]">由林主任专家团队背书，严选专业康复级产品</p>
        </div>
        <div className="absolute right-6 bottom-6 w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-95 transition-transform">
            <Plus size={24} className="text-white" />
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] -mr-16 -mt-16"></div>
      </div>

      {/* 4. Product Grid (2 columns) */}
      <div className="grid grid-cols-2 gap-4">
        {filteredSkus.map(sku => (
          <div 
            key={sku.id} 
            onClick={() => handleOpenDetail(sku)}
            className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-sm border border-slate-50 dark:border-slate-800 flex flex-col active:scale-[0.98] transition-all group"
          >
            {/* Image Area */}
            <div className="relative aspect-square overflow-hidden">
              <img src={sku.image} alt={sku.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 shadow-sm flex items-center space-x-1">
                <Star size={10} className="text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-black text-slate-800 dark:text-white">4.9</span>
              </div>
              {sku.isMemberOnly && (
                 <div className="absolute top-3 right-3 bg-amber-500 text-slate-900 p-1.5 rounded-lg shadow-lg">
                    <Crown size={12} fill="currentColor" />
                 </div>
              )}
            </div>
            
            {/* Info Area */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
                {sku.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold line-clamp-1 italic mb-4 opacity-70">
                “{sku.reason}”
              </p>
              
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                    ¥{sku.price}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">包邮免运费</div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(sku, 1);
                  }}
                  className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-white active:scale-90 transition-all border border-slate-100 dark:border-slate-700"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredSkus.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
             <Search size={32} />
          </div>
          <p className="text-slate-400 font-bold text-sm">未能找到相关商品</p>
        </div>
      )}
    </div>
  );
};

export default Marketplace;


import React, { useState, useEffect, useMemo } from 'react';
import { SKU, PatientProfile } from '../types';
import { ShoppingCart, Star, Crown, Search, Plus, Heart, X, Flame } from 'lucide-react';
import ProductDetail from './ProductDetail';
import { getAssetUrl } from '../src/utils/image';

const API_URL = (import.meta as any).env.DEV ? "" : "https://api-u46fik5vcq-uc.a.run.app";

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
            image: getAssetUrl(item.imageUrl || item.image), // Already applies getAssetUrl
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
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-500 relative transition-colors duration-300 overflow-x-hidden">
      {/* 修正后的购物车按钮：放在一个 fixed 容器中，该容器与主内容对齐 */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md pointer-events-none z-[55] px-6">
        <div className="relative w-full h-full">
            <button 
                onClick={onOpenCart}
                className="absolute right-0 bottom-0 w-14 h-14 bg-slate-900 dark:bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center pointer-events-auto active:scale-90 transition-transform border border-white/10"
            >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-4.5 rounded-full px-1 flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {cartCount}
                </div>
                )}
            </button>
        </div>
      </div>

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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索康复好物、营养包..."
            className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl py-4 pl-12 pr-4 shadow-sm text-sm font-bold text-slate-700 dark:text-white"
        />
      </div>

      {/* Category Filter */}
      <div className="flex space-x-3 overflow-x-auto no-scrollbar py-2 -mx-5 px-5">
        {CATEGORIES.map(cat => (
            <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black transition-all ${
                    activeCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'
                }`}
            >
                {cat.label}
            </button>
        ))}
      </div>

      {/* Product Grid (2 columns) */}
      <div className="grid grid-cols-2 gap-4">
        {filteredSkus.map(sku => (
          <div 
            key={sku.id} 
            onClick={() => setViewingProduct(sku)}
            className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-sm border border-slate-50 dark:border-slate-800 flex flex-col active:scale-[0.98] transition-all group"
          >
            <div className="relative aspect-square overflow-hidden">
              <img 
                src={sku.image} 
                alt={sku.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              />
              <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 shadow-sm flex items-center space-x-1">
                <Star size={10} className="text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-black text-slate-800 dark:text-white">4.9</span>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 leading-tight mb-3 line-clamp-2 min-h-[2.5rem]">
                {sku.name}
              </h3>
              
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                    ¥{sku.price}
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold mt-0.5">包邮免运费</div>
                </div>
                <div 
                  className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 active:bg-emerald-500 active:text-white transition-all border border-slate-100 dark:border-slate-700"
                >
                  <Plus size={18} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Endorsement Section */}
      <div className="pt-8 pb-12 px-2">
        <div className="bg-slate-50 dark:bg-white/5 rounded-[32px] p-8 border border-slate-100 dark:border-white/5 text-center">
            <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="h-[1px] w-8 bg-slate-200 dark:bg-white/10" />
                <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.3em]">
                    Five-Nursings Premium Selection
                </span>
                <div className="h-[1px] w-8 bg-slate-200 dark:bg-white/10" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold italic">
                所有商品均由林主任专家团队严格筛选，确保符合肿瘤康复安全标准。
            </p>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;


import React, { useState } from 'react';
import { ArrowLeft, Heart, Trash2, ChevronRight } from 'lucide-react';
import { SKU } from '../types';

interface FavoritesViewProps {
  onBack: () => void;
  favorites: SKU[];
  onRemoveFavorite: (id: string) => void;
  onSelectProduct: (sku: SKU) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ onBack, favorites, onRemoveFavorite, onSelectProduct }) => {
  const [activeType, setActiveType] = useState<'product' | 'course'>('product');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 no-scrollbar">
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-4 sticky top-0 z-40">
        <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">我的收藏</h1>
      </header>

      <div className="flex px-6 py-4 space-x-4 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800">
        <button 
          onClick={() => setActiveType('product')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeType === 'product' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}
        >
          康复好物
        </button>
        <button 
          onClick={() => setActiveType('course')}
          className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeType === 'course' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}
        >
          康复课程
        </button>
      </div>

      <main className="flex-1 p-5 space-y-4 overflow-y-auto no-scrollbar">
        {activeType === 'product' ? (
          favorites.length > 0 ? (
            favorites.map((sku) => (
              <div 
                key={sku.id}
                onClick={() => onSelectProduct(sku)}
                className="bg-white dark:bg-slate-900 rounded-[32px] p-4 flex items-center space-x-4 border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                  <img src={sku.image} className="w-full h-full object-cover" alt={sku.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{sku.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-emerald-600 font-black text-base">¥{sku.price}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFavorite(sku.id);
                  }}
                  className="p-3 text-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-2xl active:scale-90 transition-transform"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Heart size={48} strokeWidth={1} className="opacity-20" />
              <p className="font-bold text-sm">还没有收藏任何商品哦</p>
            </div>
          )
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4">
             <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
               <span className="text-xs font-black uppercase tracking-widest">即将开放</span>
             </div>
             <p className="text-xs font-medium">收藏专家课程功能正在研发中</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FavoritesView;

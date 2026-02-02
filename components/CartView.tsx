
import React from 'react';
import { CartItem } from '../types';
import { ArrowLeft, Trash2, Plus, Minus, CheckCircle2, ShoppingBag, ChevronRight, Circle } from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  onBack: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onCheckout: (selectedItems: CartItem[]) => void;
}

const CartView: React.FC<CartViewProps> = ({ 
  cart, 
  onBack, 
  onUpdateQuantity, 
  onRemove, 
  onToggleSelect, 
  onSelectAll,
  onCheckout 
}) => {
  const selectedItems = cart.filter(item => item.selected);
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isAllSelected = cart.length > 0 && cart.every(item => item.selected);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300 pb-32 shadow-2xl border-x border-slate-200 dark:border-slate-800">
      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">购物车</h1>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={() => onSelectAll(!isAllSelected)}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800"
          >
            {isAllSelected ? '取消全选' : '全选'}
          </button>
        )}
      </header>

      <div className="flex-1 p-5 space-y-4">
        {cart.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-[32px] flex items-center justify-center mb-4 text-slate-500 dark:text-slate-600">
              <ShoppingBag size={40} />
            </div>
            <p className="font-bold text-slate-500 dark:text-slate-400 text-base">购物车还是空的</p>
            <button 
              onClick={onBack}
              className="mt-6 px-8 py-3 bg-slate-800 text-white rounded-2xl text-sm font-black active:scale-95 transition-transform"
            >
              去逛逛
            </button>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-[32px] p-5 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-4">
              <button 
                onClick={() => onToggleSelect(item.id)}
                className={`shrink-0 transition-colors ${item.selected ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-700'}`}
              >
                {item.selected ? <CheckCircle2 size={24} fill="currentColor" className="text-white dark:text-slate-900 fill-emerald-500" /> : <Circle size={24} />}
              </button>
              
              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover shadow-sm" />
              
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight truncate">{item.name}</h4>
                <div className="text-emerald-600 dark:text-emerald-400 font-black text-base mt-1 tracking-tighter">¥{item.price}</div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-black w-4 text-center text-slate-800 dark:text-slate-200">{item.quantity}</span>
                    <button 
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => onRemove(item.id)}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 p-6 z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">已选 {selectedItems.length} 件商品</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">¥{total}</div>
            </div>
          </div>
          <button 
            disabled={selectedItems.length === 0}
            onClick={() => onCheckout(selectedItems)}
            className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:shadow-none"
          >
            <span>立即结算</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CartView;

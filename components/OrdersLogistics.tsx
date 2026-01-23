
import React, { useState } from 'react';
import { ArrowLeft, Truck, CheckCircle2, ChevronRight, MapPin, Box, Search, CreditCard, ShieldCheck, Clock, Trash2, HelpCircle, PackageOpen, ShoppingBag } from 'lucide-react';

interface Order {
  id: string;
  items: { id: string; name: string; image: string; quantity: number; price: number }[];
  status: 'pending' | 'shipping' | 'delivered';
  date: string;
  total: number;
  trackingNumber?: string;
  paymentMethod: string;
  address: { name: string; phone: string; location: string };
}

interface OrdersLogisticsProps {
  onBack: () => void;
  onBuyAgain: (items: any[]) => void;
}

const OrdersLogistics: React.FC<OrdersLogisticsProps> = ({ onBack, onBuyAgain }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'shipping' | 'delivered'>('all');
  const [view, setView] = useState<{ type: 'list' | 'logistics' | 'detail'; data: Order | null }>({ type: 'list', data: null });
  const [showToast, setShowToast] = useState(false);

  const mockOrders: Order[] = [
    {
      id: 'ORD-20250520-001',
      date: '2025-05-20 14:10',
      status: 'shipping',
      total: 298,
      trackingNumber: 'SF1423985721',
      paymentMethod: '微信支付',
      address: { name: '李先生', phone: '138****5678', location: '上海市黄浦区瑞金二路197号' },
      items: [{ 
        id: '1',
        name: '全周期·助眠滋养包', 
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=400', 
        quantity: 1, 
        price: 298 
      }]
    },
    {
      id: 'ORD-20250518-042',
      date: '2025-05-18 09:30',
      status: 'delivered',
      total: 420,
      paymentMethod: '支付宝',
      address: { name: '李先生', phone: '138****5678', location: '上海市黄浦区瑞金二路197号' },
      items: [{ 
        id: '2',
        name: '术后元气·脾胃调理包', 
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400', 
        quantity: 1, 
        price: 420 
      }]
    }
  ];

  const filteredOrders = mockOrders.filter(o => activeFilter === 'all' || o.status === activeFilter);

  const handleBuyAgainClick = (order: Order) => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onBuyAgain(order.items);
    }, 1500);
  };

  const renderStatusTag = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-800 uppercase">待发货</span>;
      case 'shipping': return <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800 uppercase">运输中</span>;
      case 'delivered': return <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 uppercase">已签收</span>;
    }
  };

  if (view.type === 'logistics' && view.data) {
    const order = view.data;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 pb-20">
        <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-4">
          <button onClick={() => setView({ type: 'list', data: null })} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">物流详情</h1>
        </header>
        <div className="p-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Truck size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">顺丰速运</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">{order.trackingNumber}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">预计明日 (5月22日) 送达</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative">
            <div className="space-y-10 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
              <TrackingStep title="派送中" desc="[上海市] 浦东新区派送员 张师傅 正在派送" time="今天 09:12" active />
              <TrackingStep title="到达分拨中心" desc="快件到达 [上海浦东分拨中心]" time="今天 02:45" />
              <TrackingStep title="已揽收" desc="顺丰速运 已揽收" time="昨天 15:20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view.type === 'detail' && view.data) {
    const order = view.data;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 pb-24">
        <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-4">
          <button onClick={() => setView({ type: 'list', data: null })} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">订单详情</h1>
        </header>

        <div className="p-5 space-y-5">
          <div className="bg-emerald-600 dark:bg-emerald-700 rounded-[32px] p-7 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{order.status === 'delivered' ? '订单已完成' : '订单运输中'}</h2>
                <p className="text-emerald-100/80 text-xs mt-1 font-medium">感谢您选择五养康复，祝您早日康复</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                {order.status === 'delivered' ? <CheckCircle2 size={28} /> : <Truck size={28} />}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-start space-x-4">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0">
              <MapPin size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-1">
                <span className="font-black text-slate-800 dark:text-slate-100">{order.address.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">{order.address.phone}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{order.address.location}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">商品清单</h3>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-4">
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover" />
                <div className="flex-1">
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.name}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-400 dark:text-slate-500">数量: x{item.quantity}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">¥{item.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-bold">商品总额</span>
              <span className="text-slate-800 dark:text-slate-100 font-black tracking-tighter">¥{order.total}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-bold">运费</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black tracking-tighter">¥0.00 (免运费)</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 font-bold">优惠卷</span>
              <span className="text-rose-500 dark:text-rose-400 font-black tracking-tighter">-¥0.00</span>
            </div>
            <div className="pt-3 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <span className="font-black text-slate-800 dark:text-slate-100">实付金额</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">¥{order.total}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
             <div className="flex justify-between text-xs">
               <span className="text-slate-400 dark:text-slate-500 font-bold">订单编号</span>
               <span className="text-slate-800 dark:text-slate-200 font-medium">{order.id}</span>
             </div>
             <div className="flex justify-between text-xs">
               <span className="text-slate-400 dark:text-slate-500 font-bold">下单时间</span>
               <span className="text-slate-800 dark:text-slate-200 font-medium">{order.date}</span>
             </div>
             <div className="flex justify-between text-xs">
               <span className="text-slate-400 dark:text-slate-500 font-bold">支付方式</span>
               <span className="text-slate-800 dark:text-slate-200 font-medium">{order.paymentMethod}</span>
             </div>
          </div>

          <div className="flex space-x-3">
             <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-4 rounded-2xl text-xs font-black text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-2">
               <HelpCircle size={14} />
               <span>联系客服</span>
             </button>
             <button 
               onClick={() => handleBuyAgainClick(order)}
               className="flex-[2] bg-slate-800 dark:bg-slate-800 text-white py-4 rounded-2xl text-xs font-black shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 transition-all"
             >
               再次购买
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300 relative">
      {showToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-white/10">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="text-sm font-bold">已添加到购物车</span>
          </div>
        </div>
      )}

      <header className="px-6 pt-12 pb-6 bg-white dark:bg-slate-900 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={onBack} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">我的订单</h1>
        </div>
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-2">
          {['all', 'pending', 'shipping', 'delivered'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f as any)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap border-2 ${
                activeFilter === f 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-500 shadow-md' 
                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700'
              }`}
            >
              {f === 'all' ? '全部' : f === 'pending' ? '待发货' : f === 'shipping' ? '待收货' : '已完成'}
            </button>
          ))}
        </div>
      </header>

      <div className="p-5 space-y-4 pb-32">
        {filteredOrders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[48px] flex items-center justify-center mb-8 shadow-inner">
              <PackageOpen size={64} className="text-slate-300 dark:text-slate-700" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">暂无相关订单</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed mb-10 font-medium">
              您还没有任何{activeFilter === 'all' ? '' : (activeFilter === 'pending' ? '待发货' : activeFilter === 'shipping' ? '待收货' : '已完成')}订单，快去商城挑选康复好物吧。
            </p>
            <button 
              onClick={onBack}
              className="bg-emerald-600 dark:bg-emerald-600 text-white px-10 py-4 rounded-[24px] font-black text-sm shadow-xl shadow-slate-200 dark:shadow-none hover:bg-emerald-500 dark:hover:bg-emerald-500 transition-all flex items-center space-x-2 active:scale-95"
            >
              <ShoppingBag size={18} />
              <span>去商城逛逛</span>
            </button>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{order.id}</span>
                {renderStatusTag(order.status)}
              </div>
              
              {order.items.map((item, idx) => (
                <div key={idx} onClick={() => setView({ type: 'detail', data: order })} className="flex items-center space-x-4 cursor-pointer">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm leading-tight">{item.name}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">x{item.quantity}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-slate-100">¥{item.price}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                <div className="text-xs text-slate-400 dark:text-slate-500 font-bold">实付: <span className="text-slate-900 dark:text-slate-100 font-black">¥{order.total}</span></div>
                <div className="flex space-x-2">
                  {order.status === 'shipping' && (
                    <button 
                      onClick={() => setView({ type: 'logistics', data: order })}
                      className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[11px] font-black border border-emerald-100 dark:border-emerald-800"
                    >
                      查看物流
                    </button>
                  )}
                  {order.status === 'delivered' ? (
                    <button 
                      onClick={() => handleBuyAgainClick(order)}
                      className="px-4 py-2 bg-slate-800 dark:bg-slate-800 text-white rounded-xl text-[11px] font-black shadow-lg shadow-slate-200 dark:shadow-none active:scale-95 transition-all"
                    >
                      再次购买
                    </button>
                  ) : (
                    <button 
                      onClick={() => setView({ type: 'detail', data: order })}
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-[11px] font-black"
                    >
                      订单详情
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const TrackingStep: React.FC<{ title: string; desc: string; time: string; active?: boolean }> = ({ title, desc, time, active }) => (
  <div className="relative pl-10">
    <div className={`absolute left-0 top-0 w-5 h-5 rounded-full z-10 flex items-center justify-center ${active ? 'bg-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-900/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}`}>
      <CheckCircle2 size={10} />
    </div>
    <div>
      <div className={`text-[13px] font-black mb-1 ${active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600'}`}>{title}</div>
      <p className={`text-[11px] leading-relaxed mb-1 ${active ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-400 dark:text-slate-600'}`}>{desc}</p>
      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{time}</div>
    </div>
  </div>
);

export default OrdersLogistics;

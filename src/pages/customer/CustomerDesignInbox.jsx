import React, { useState, useEffect } from 'react';
import { fetchUserOrders } from '../../services/OrdersAPI';
import { MessageSquare, User, Clock, ChevronRight, Palette } from 'lucide-react';

const CustomerDesignInbox = ({ onOpenChat }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadActiveDesigns = async () => {
            try {
                const res = await fetchUserOrders();
                const allOrders = res.data?.orders || res.data || [];
                
                // Filter for orders that have an artist assigned
                const withArtist = allOrders.filter(o => o.artist_id && o.status !== 'Cancelled' && o.status !== 'Completed');
                
                // Group by order_id to avoid duplicates if order has multiple items (though usually design is per order or per item)
                // For now, let's just show unique order-product combinations
                const uniqueDesigns = [];
                const seen = new Set();
                
                withArtist.forEach(o => {
                    const key = `${o.order_id}-${o.product_id}`;
                    if (!seen.has(key)) {
                        uniqueDesigns.push(o);
                        seen.add(key);
                    }
                });

                setOrders(uniqueDesigns);
            } catch (err) {
                console.error("Failed to load design inbox:", err);
            } finally {
                setLoading(false);
            }
        };

        loadActiveDesigns();
    }, []);

    if (loading) {
        return (
            <div className="p-10 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-yellow-100 border-t-yellow-400 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Loading your design chats...</p>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                    <Palette className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter">No Active Designs</h3>
                <p className="text-sm text-gray-400 mt-2 max-w-[280px]">
                    Once an artist is assigned to your custom order, you can chat with them here to finalize your design.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <div className="mb-6">
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Active Design Chats</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Talk directly with your assigned artists</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => (
                    <div 
                        key={`${order.order_id}-${order.product_id}`}
                        className="group bg-white border border-gray-100 rounded-[32px] p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col gap-4 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                        
                        <div className="flex items-start justify-between relative z-10">
                            <div className="flex gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-50 transition-colors">
                                    <Palette className="w-7 h-7 text-gray-300 group-hover:text-yellow-500 transition-colors" />
                                </div>
                                <div>
                                    <h4 className="font-black text-gray-900 uppercase italic tracking-tighter leading-tight group-hover:text-yellow-600 transition-colors">
                                        {order.product_name || 'Custom Sticker'}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        Order #{order.order_number}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between group-hover:bg-white group-hover:border group-hover:border-yellow-100 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-black italic text-xs shadow-lg">
                                    {order.artist?.first_name?.[0] || 'A'}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Assigned Artist</p>
                                    <p className="text-xs font-black text-gray-900">{order.artist?.first_name || 'Artist'} {order.artist?.last_name || ''}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => onOpenChat(order)}
                                className="px-5 py-2.5 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all shadow-lg active:scale-90 flex items-center gap-2"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Chat
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomerDesignInbox;

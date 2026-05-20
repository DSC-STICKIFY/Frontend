import React, { useState, useEffect, useCallback } from "react";
import { fetchUserOrders } from "../../services/OrdersAPI";
import DesignChatbox from "../../components/DesignChatbox";
import { useAuth } from "../../context/CustomerAuthContext";
import { Clock, Package, User, MessageSquare, ChevronRight, Info } from "lucide-react";
import { useLocation } from "react-router-dom";

const StatusBadge = ({ status }) => {
    const colors = {
        'Accepted': 'bg-blue-100 text-blue-700 border-blue-200',
        'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
        'Finalizing': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'For Revision': 'bg-red-100 text-red-700 border-red-200',
        'Awaiting Shipment Approval': 'bg-orange-100 text-orange-700 border-orange-200',
        'To Shipping': 'bg-green-100 text-green-700 border-green-200',
        'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
            {status}
        </span>
    );
};

const CustomerArtistInbox = () => {
    const { currentUser } = useAuth();
    const location = useLocation();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(location.state?.selectedOrder || null);
    const [loading, setLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchUserOrders();
            // Handle different response structures (sometimes it's {orders: []}, sometimes {data: {orders: []}})
            const allOrders = res.orders || res.data?.orders || res.data || [];
            
            // Only show orders that have an assigned artist and are in an active design status
            const artistOrders = allOrders.filter(o => {
                const status = String(o.status || "").toLowerCase().trim();
                const isTerminal = ['pending', 'pending payment', 'cancelled'].includes(status);
                return o.artist_id !== null && !isTerminal;
            });
            setOrders(artistOrders);
            
            if (selectedOrder) {
                const updatedSelected = artistOrders.find(o => o.order_id === selectedOrder.order_id);
                if (updatedSelected) {
                    setSelectedOrder(updatedSelected);
                }
            } else if (artistOrders.length > 0) {
                setSelectedOrder(artistOrders[0]);
            }
        } catch (err) {
            console.error("Failed to load artist orders", err);
        } finally {
            setLoading(false);
        }
    }, [selectedOrder]);

    useEffect(() => {
        loadOrders();
    }, []);

    const getImageUrl = (path) => {
        if (!path) return null;
        const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        return `${base}/storage/${path}`;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2.5rem)] bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 overflow-hidden">
            <header className="p-6 border-b border-gray-100 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-100">
                        <MessageSquare className="w-5 h-5 text-black" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Artist Design Inbox</h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Collaborate with your assigned designers</p>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Orders List */}
                <div className="w-80 border-r border-gray-50 flex flex-col bg-gray-50/30">
                    <div className="p-4 border-b border-gray-50">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Active Design Projects</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-t-yellow-400 rounded-full animate-spin"></div>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Package className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">No active designs found</p>
                                <p className="text-[10px] text-gray-300 mt-2 italic">Orders currently being designed will appear here.</p>
                            </div>
                        ) : (
                            orders.map(order => (
                                <button
                                    key={order.order_id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                                        selectedOrder?.order_id === order.order_id 
                                            ? 'bg-white border-yellow-400 shadow-md scale-[1.02]' 
                                            : 'border-transparent hover:bg-white/50 hover:border-gray-100'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-black text-gray-900">#{order.order_number}</span>
                                        <StatusBadge status={order.status} />
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-600 mb-1 truncate">
                                        {order.order_details?.[0]?.product?.product_name || order.product_name || "Custom Order"}
                                    </p>
                                    <div className="flex items-center gap-2 text-[9px] text-gray-400 font-medium">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(order.order_date).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedOrder ? (
                        <div className="flex h-full">
                            <div className="flex-1 flex flex-col min-w-0">
                                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black uppercase">
                                            {selectedOrder.artist?.first_name?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                                Artist: {selectedOrder.artist?.first_name || 'Design Staff'}
                                            </p>
                                            <p className="text-[10px] font-bold text-green-500 uppercase">Online & Ready to Chat</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 bg-gray-50/30 p-4">
                                    <DesignChatbox 
                                        productId={selectedOrder.order_details?.[0]?.product_id}
                                        orderId={selectedOrder.order_id}
                                        orderStatus={selectedOrder.status}
                                        isArtistChat={true}
                                        onImageUpload={() => {}}
                                        onNewMessage={loadOrders}
                                    />
                                </div>
                            </div>

                            {/* Context Sidebar */}
                            <div className="w-72 border-l border-gray-50 bg-white p-6 overflow-y-auto custom-scrollbar flex-shrink-0 hidden xl:block">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" />
                                    Project Context
                                </h3>
                                
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-3">Item Details</p>
                                        {selectedOrder.order_details?.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 mb-2">
                                                <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                    <img 
                                                        src={item.product?.product_image ? getImageUrl(item.product.product_image) : null} 
                                                        className="w-full h-full object-contain p-1" 
                                                        alt=""
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-gray-900 truncate">{item.product?.product_name}</p>
                                                    <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Order Info</p>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400 font-bold">Number:</span>
                                                <span className="text-gray-900 font-black">{selectedOrder.order_number}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400 font-bold">Total:</span>
                                                <span className="text-gray-900 font-black">₱{Number(selectedOrder.total_price).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedOrder.status === 'Finalizing' && selectedOrder.final_design_url && (
                                        <div className="p-4 rounded-2xl bg-green-50 border border-green-200">
                                            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-2 italic">Action Required</p>
                                            <p className="text-[10px] font-bold text-gray-700 mb-3">Your design is ready! View it in the chat or on your order page to approve.</p>
                                            <button 
                                                onClick={() => window.location.href = '/customer-orders'}
                                                className="w-full py-2 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-green-600 transition shadow-sm"
                                            >
                                                Go to Orders
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-30">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <MessageSquare className="w-10 h-10 text-gray-300" />
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-widest italic">Select a project to start chatting</h2>
                            <p className="text-sm font-bold mt-2">Design collaboration happens here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerArtistInbox;

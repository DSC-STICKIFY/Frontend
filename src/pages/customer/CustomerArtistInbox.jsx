import React, { useState, useEffect, useCallback } from "react";
import { fetchUserOrders } from "../../services/OrdersAPI";
import CustomizationAPI from "../../services/CustomizationAPI";
import DesignChatbox from "../../components/DesignChatbox";
import { Clock, Package, User, MessageSquare, ChevronRight, Info } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const StatusBadge = ({ status }) => {
    const colors = {
        'Accepted': 'bg-blue-100 text-blue-700 border-blue-200',
        'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
        'Finalizing': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'For Revision': 'bg-red-100 text-red-700 border-red-200',
        'Awaiting Shipment Approval': 'bg-orange-100 text-orange-700 border-orange-200',
        'To Shipping': 'bg-green-100 text-green-700 border-green-200',
        'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
        
        // Customization statuses
        'pending_request': 'bg-amber-100 text-amber-700 border-amber-200',
        'pending_feasibility': 'bg-amber-100 text-amber-700 border-amber-200',
        'can_accommodate': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'partially_accommodate': 'bg-orange-100 text-orange-700 border-orange-200',
        'cannot_accommodate': 'bg-red-100 text-red-700 border-red-200',
        'partial_pending_cx': 'bg-orange-100 text-orange-700 border-orange-200',
        'ready_for_artist': 'bg-blue-100 text-blue-700 border-blue-200',
        'assigned_to_artist': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'in_progress': 'bg-purple-100 text-purple-700 border-purple-200',
        'quotation_sent': 'bg-purple-100 text-purple-700 border-purple-200',
        'revision_requested': 'bg-red-100 text-red-700 border-red-200',
        'revision_period': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        'design_finalized': 'bg-green-100 text-green-700 border-green-200',
        'pending_design_approval': 'bg-amber-100 text-amber-700 border-amber-200',
        'design_approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'design_rejected': 'bg-red-100 text-red-700 border-red-200',
        'in_production': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        'qc_passed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'qc_failed': 'bg-red-100 text-red-700 border-red-200',
        'converted_to_order': 'bg-teal-100 text-teal-700 border-teal-200',
        'rejected_by_staff': 'bg-red-100 text-red-700 border-red-200',
    };

    const displayLabel = status?.replace(/_/g, ' ');

    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
            {displayLabel}
        </span>
    );
};

const CustomerArtistInbox = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersRes, custRes] = await Promise.all([
                fetchUserOrders().catch(() => ({ orders: [] })),
                CustomizationAPI.fetchMyCustomizations().catch(() => ({ data: [] }))
            ]);

            const allOrders = ordersRes.orders || ordersRes.data?.orders || ordersRes.data || [];
            const allCusts = custRes.data || custRes || [];
            
            // Only show orders that have an assigned artist and are in an active design status
            const artistOrders = allOrders.filter(o => {
                const status = String(o.status || "").toLowerCase().trim();
                const isTerminal = ['pending', 'pending payment', 'cancelled'].includes(status);
                return o.artist_id !== null && !isTerminal;
            });

            // Map customizations to match order shape
            const activeCusts = allCusts
                .filter(c => {
                    const status = String(c.status || "").toLowerCase().trim();
                    const hasArtist = c.artist_id !== null || c.artist !== null;
                    const isTerminal = ['cancelled', 'converted_to_order', 'cannot_accommodate', 'rejected_by_staff'].includes(status);
                    return hasArtist && !isTerminal;
                })
                .map(c => ({
                    order_id: `cust-${c.id}`,
                    customization_id: c.id,
                    isCustomization: true,
                    order_number: `CUSTOM-${c.id}`,
                    status: c.status,
                    product_id: c.product_id,
                    product_name: c.product_name || c.product?.product_name || "Custom Design",
                    instructions: c.instructions,
                    reference_image: c.reference_image,
                    order_details: [
                        {
                            product_id: c.product_id,
                            product: {
                                product_name: c.product_name || c.product?.product_name || "Custom Design",
                                product_image: c.reference_image
                            },
                            quantity: c.quantity
                        }
                    ],
                    total_price: c.quotation_total || c.quotation?.total || 0,
                    order_date: c.created_at,
                    artist_id: c.artist_id,
                    artist: c.artist
                }));

            const combined = [...artistOrders, ...activeCusts];

            // Read readIds from localStorage
            let readIds = [];
            try {
                readIds = JSON.parse(localStorage.getItem("dsc_read_design_projects") || "[]");
            } catch (e) {
                console.error("Failed to parse read projects", e);
            }

            const parseDate = (d) => {
                if (!d) return 0;
                const parsed = Date.parse(d);
                return isNaN(parsed) ? 0 : parsed;
            };

            // Map and add isUnread, then sort (unread first, then date descending)
            const sortedAndMarked = combined.map(o => ({
                ...o,
                isUnread: !readIds.includes(o.order_id)
            })).sort((a, b) => {
                if (a.isUnread && !b.isUnread) return -1;
                if (!a.isUnread && b.isUnread) return 1;
                return parseDate(b.order_date) - parseDate(a.order_date);
            });

            setOrders(sortedAndMarked);
            
            // Determine active selection
            let found = null;
            if (location.state?.selectedOrder) {
                found = sortedAndMarked.find(o => o.order_id === location.state.selectedOrder.order_id);
            } else if (location.state?.selectedCustomizationId) {
                found = sortedAndMarked.find(o => o.isCustomization && o.customization_id === location.state.selectedCustomizationId);
            }
            
            if (found) {
                setSelectedOrder(found);
            } else if (selectedOrder) {
                const updatedSelected = sortedAndMarked.find(o => o.order_id === selectedOrder.order_id);
                if (updatedSelected) {
                    setSelectedOrder(updatedSelected);
                }
            } else if (sortedAndMarked.length > 0) {
                setSelectedOrder(sortedAndMarked[0]);
            }
        } catch (err) {
            console.error("Failed to load artist orders", err);
        } finally {
            setLoading(false);
        }
    }, [selectedOrder, location.state]);

    const markAsRead = (orderId) => {
        try {
            const readIds = JSON.parse(localStorage.getItem("dsc_read_design_projects") || "[]");
            if (!readIds.includes(orderId)) {
                readIds.push(orderId);
                localStorage.setItem("dsc_read_design_projects", JSON.stringify(readIds));
                // Update state immediately to remove badge
                setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, isUnread: false } : o));
            }
        } catch (e) {
            console.error("Failed to mark project as read", e);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        if (selectedOrder?.order_id) {
            markAsRead(selectedOrder.order_id);
        }
    }, [selectedOrder?.order_id]);

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
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="text-xs font-black text-gray-900 truncate">#{order.order_number}</span>
                                            {order.isUnread && (
                                                <span className="self-start px-1.5 py-0.5 rounded bg-yellow-400 text-black text-[8px] font-black uppercase tracking-wider animate-pulse flex-shrink-0">
                                                    New Chat
                                                </span>
                                            )}
                                        </div>
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
                                        productId={selectedOrder.isCustomization ? selectedOrder.product_id : selectedOrder.order_details?.[0]?.product_id}
                                        orderId={selectedOrder.isCustomization ? selectedOrder.customization_id : selectedOrder.order_id}
                                        orderStatus={selectedOrder.status}
                                        isArtistChat={true}
                                        onImageUpload={() => {}}
                                        onNewMessage={loadOrders}
                                        customizationRequestId={selectedOrder.isCustomization ? selectedOrder.customization_id : null}
                                        initialInstructions={selectedOrder.isCustomization ? selectedOrder.instructions : null}
                                        initialImage={selectedOrder.isCustomization ? selectedOrder.reference_image : null}
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

                                    {selectedOrder.isCustomization && selectedOrder.status === 'quotation_sent' && (
                                        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 shadow-sm animate-pulse-subtle">
                                            <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-2 italic">Action Required</p>
                                            <p className="text-[10px] font-bold text-gray-700 mb-3">Quotation is ready! The artist has submitted the pricing breakdown for your review.</p>
                                            <button 
                                                onClick={() => navigate('/customer-inquiries', { state: { selectedCustomizationId: selectedOrder.customization_id } })}
                                                className="w-full py-2 bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-purple-700 transition shadow-sm"
                                            >
                                                📄 View & Approve Quote
                                            </button>
                                        </div>
                                    )}

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

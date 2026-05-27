import React, { useState, useEffect } from "react";
import {
    fetchArtistOrders,
    markOrderInProgress,
    uploadFinalDesign,
    requestShipmentApproval,
    approveShipmentRequest,
    rejectShipmentRequest,
    markOutForDelivery
} from "../services/artistOrderService";
import { fetchAllOrders } from "../services/OrdersAPI";
import { sendAdminMessage } from "../services/MessageAPI";
import checkIcn from "../assets/success.svg";
import uploadIcn from "../assets/links.svg";
import { useAdminAuth } from "../context/AdminAuthContext";
import DesignChatbox from "./DesignChatbox";
import messageIcn from "../assets/sidebarAdminsIcons/inbox.svg";
import { getImageUrl } from "../services/api";
import axios from "axios";

const StatusBadge = ({ status }) => {
    const colors = {
        'Accepted': 'bg-blue-100 text-blue-700 border-blue-200',
        'To Process': 'bg-blue-100 text-blue-700 border-blue-200',
        'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
        'Design In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
        'Finalizing': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Design Approved': 'bg-green-100 text-green-700 border-green-200',
        'For Revision': 'bg-red-100 text-red-700 border-red-200',
        'Awaiting Shipment Approval': 'bg-orange-100 text-orange-700 border-orange-200',
        'To Shipping': 'bg-green-100 text-green-700 border-green-200',
        'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[status] || 'bg-gray-50 text-gray-500'}`}>
            {status}
        </span>
    );
};

const getFutureDateTimeString = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function ArtistWorkflowMonitor({ isReadOnly = false, isChatReadOnly = undefined, showAllOrders = false }) {
    const { currentUser } = useAdminAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [note, setNote] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [sendingReminder, setSendingReminder] = useState(false);
    const [jtTrackingNumber, setJtTrackingNumber] = useState("");
    const [dispatching, setDispatching] = useState(false);
    const isFulfillmentHistory = selectedOrder ? ['To Shipping', 'To Receive', 'Completed'].includes(selectedOrder.status) : false;
    const isAdminOrSubAdmin = currentUser?.role === 'admin' || currentUser?.role === 'subadmin';
    const effectiveChatReadOnly = isChatReadOnly !== undefined ? isChatReadOnly : (isAdminOrSubAdmin ? false : isReadOnly);

    // Timeline States
    const [showTimelineForm, setShowTimelineForm] = useState(false);
    const [expectedShippedAt, setExpectedShippedAt] = useState("");
    const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = (isReadOnly || showAllOrders) ? await fetchAllOrders() : await fetchArtistOrders();
            const ordersData = res.data?.orders || res.data || (Array.isArray(res) ? res : []);
            const data = Array.isArray(ordersData) ? ordersData : [];

            const filtered = data.filter(o => {
                const hasArtist = o.artist_id !== null && o.artist_id !== undefined;
                const status = (o.status || "").toLowerCase();
                const isTerminal = ['completed', 'cancelled', 'refunded', 'return/refund'].includes(status);
                return hasArtist && !isTerminal;
            });

            const mapped = filtered.map(o => {
                if (['To Shipping', 'To Receive', 'Shipped'].includes(o.status)) {
                    return { ...o, status: 'To Shipping' };
                }
                return o;
            });
            setOrders(mapped);
        } catch (err) {
            console.error("Failed to load orders", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    useEffect(() => {
        setShowTimelineForm(false);
        setExpectedShippedAt(getFutureDateTimeString(2));
        setExpectedDeliveryAt(getFutureDateTimeString(5));
    }, [selectedOrder?.order_id]);

    const handleMarkInProgress = async (id) => {
        if (!expectedShippedAt || !expectedDeliveryAt) {
            alert("Please select both expected shipping and delivery dates.");
            return;
        }
        const isRescheduling = !!selectedOrder.in_progress_at;
        try {
            await markOrderInProgress(id, {
                expected_shipped_at: expectedShippedAt,
                expected_delivery_at: expectedDeliveryAt
            });

            setSelectedOrder(prev => prev ? {
                ...prev,
                expected_shipped_at: expectedShippedAt,
                expected_delivery_at: expectedDeliveryAt,
                in_progress_at: prev.in_progress_at || new Date().toISOString()
            } : prev);

            loadOrders();
            setShowTimelineForm(false);

            alert(isRescheduling
                ? "Timeline updated successfully!"
                : "Order is now In Progress with expected timeline!"
            );
        } catch (err) {
            alert("Failed to update status: " + (err.response?.data?.message || err.message));
        }
    };

    const handleUpload = async (e, id) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('final_design', file);

        try {
            const res = await uploadFinalDesign(id, formData);
            const updatedOrder = res.data?.order || res.order;
            if (updatedOrder) {
                setSelectedOrder(prev => prev ? {
                    ...prev,
                    final_design_url: updatedOrder.final_design_url,
                    status: updatedOrder.status || "Finalizing"
                } : prev);
            }
            loadOrders();
            alert("Design uploaded successfully!");
        } catch (err) {
            alert("Upload failed: " + (err.response?.data?.message || err.message));
        } finally {
            setUploading(false);
        }
    };

    const handleRequestShipment = async (id) => {
        try {
            await requestShipmentApproval(id, note);
            alert("Shipment request sent to admin!");
            setNote("");
            loadOrders();
            setIsWorkflowModalOpen(false);
        } catch (err) {
            alert("Request failed");
        }
    };

    const handleApproveForShipping = async (id) => {
        try {
            await approveShipmentRequest(id);
            alert("Order approved for physical shipping!");
            setSelectedOrder(prev => prev ? { ...prev, status: 'To Shipping' } : prev);
            loadOrders();
        } catch (err) {
            console.error("Approval failed:", err);
            alert("Failed to approve shipment: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDispatchOutForDelivery = async (id, orderDetailsId) => {
        if (!jtTrackingNumber.trim()) {
            alert("Please enter the J&T tracking number provided by courier.");
            return;
        }
        setDispatching(true);
        try {
            await markOutForDelivery(id, orderDetailsId, jtTrackingNumber.trim());
            alert(`Order #${id} has been successfully dispatched! Status is now Out for Delivery.`);
            setJtTrackingNumber("");
            loadOrders();
            setIsWorkflowModalOpen(false);
        } catch (err) {
            console.error("Dispatch failed:", err);
            alert("Failed to update status to Out for Delivery: " + (err.response?.data?.message || err.message));
        } finally {
            setDispatching(false);
        }
    };

    const handleRejectShipment = async (id) => {
        if (!rejectReason.trim()) {
            alert("Please enter a reason for rejection.");
            return;
        }
        try {
            await rejectShipmentRequest(id, rejectReason.trim());
            alert("Shipment request rejected. Artist has been notified.");
            setRejectReason("");
            setShowRejectInput(false);
            loadOrders();
            setIsWorkflowModalOpen(false);
        } catch (err) {
            console.error("Rejection failed:", err);
            alert("Failed to reject shipment.");
        }
    };

    const handleSendReminder = async () => {
        if (!selectedOrder) return;
        setSendingReminder(true);
        try {
            const reminderMsg = `[DESIGN] ⏰ Reminder: You have 1–2 days left to review and confirm your design. Please check the design and click "Confirm Final Design" or "Request Change" in your order chat.`;
            await sendAdminMessage(reminderMsg, selectedOrder.user_id, null, selectedOrder.order_details?.[0]?.product_id);
            alert("Deadline reminder sent to customer!");
        } catch (err) {
            console.error("Reminder failed:", err);
            alert("Failed to send reminder.");
        } finally {
            setSendingReminder(false);
        }
    };

    const getImageUrl = (path) => {
        if (!path) return null;
        const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        return `${base}/storage/${path}`;
    };

    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);

    return (
        <div className="flex h-full bg-white border border-gray-200 rounded-[40px] overflow-hidden shadow-2xl relative">
            {/* 1. Sidebar - Orders List */}
            <div className="w-[320px] flex flex-col border-r border-gray-100 bg-gray-50/30 flex-shrink-0">
                <div className="p-8 border-b border-gray-100 bg-white">
                    <h2 className="font-black italic uppercase tracking-tighter text-xl text-gray-900">Queue</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {loading ? "Loading..." : `${orders.length} Assigned Task${orders.length !== 1 ? "s" : ""}`}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-4 border-gray-100 border-t-yellow-400 rounded-full animate-spin"></div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Workspace Empty</p>
                        </div>
                    ) : (
                        orders.map((order, index) => {
                            const customerName = `${order.user?.first_name || 'Unknown'} ${order.user?.last_name || ''}`.trim();
                            const initial = customerName.charAt(0).toUpperCase();
                            const product = order.order_details?.[0]?.product;
                            const productName = product?.name || "Custom Design";
                            const artistName = order.artist ? `${order.artist.first_name} ${order.artist.last_name}`.trim() : "Unknown Artist";

                            return (
                                <div
                                    key={order.order_id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-4 rounded-3xl transition-all cursor-pointer group flex gap-3 items-start border-2 ${selectedOrder?.order_id === order.order_id
                                            ? 'bg-white shadow-xl shadow-gray-200/50 border-yellow-400'
                                            : 'hover:bg-white/60 border-transparent'
                                        }`}
                                >
                                    {/* Row number */}
                                    <span className="text-[11px] font-black text-gray-400 w-5 text-right flex-shrink-0 mt-2.5">{index + 1}</span>

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-black flex-shrink-0 text-gray-800 shadow-sm">
                                        {initial}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-black text-gray-900 truncate pr-2">
                                                {customerName}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-gray-400 whitespace-nowrap mt-0.5">
                                                {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>

                                        <div className="mb-2 flex flex-wrap gap-1">
                                            <span className="inline-block max-w-[140px] truncate text-[9px] font-black uppercase tracking-widest bg-[#FDE31E]/20 text-yellow-700 border border-[#FDE31E]/40 rounded-full px-2 py-0.5">
                                                {productName}
                                            </span>
                                            {isReadOnly && (
                                                <span className="inline-block max-w-[140px] truncate text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                                                    🎨 {artistName}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${selectedOrder?.order_id === order.order_id ? 'text-yellow-600' : 'text-gray-400'}`}>
                                                #{order.order_number || order.order_id}
                                            </span>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 2. Main Area - Chat & Collaboration */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                {selectedOrder ? (
                    <>
                        <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-white z-10 shadow-sm shadow-gray-50/50">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Collaboration</h2>
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-black uppercase rounded-md tracking-widest">Live</span>
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                    {isReadOnly ? (
                                        <>Artist: {selectedOrder.artist ? selectedOrder.artist.first_name : 'Unknown'} • Client: {selectedOrder.user?.first_name} — </>
                                    ) : (
                                        <>Direct Message with {selectedOrder.user?.first_name} — </>
                                    )}
                                    #{selectedOrder.order_number}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isReadOnly && ['In Progress', 'Design In Progress', 'Finalizing'].includes(selectedOrder.status) && (
                                    <button
                                        onClick={handleSendReminder}
                                        disabled={sendingReminder}
                                        className="flex items-center gap-2 px-5 py-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-2xl hover:bg-orange-100 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <span className="text-base">⏰</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {sendingReminder ? 'Sending...' : 'Send Reminder'}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsWorkflowModalOpen(true)}
                                    className="flex items-center gap-3 px-6 py-3 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all shadow-lg active:scale-95 group"
                                >
                                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">View Workflow & Specs</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            <DesignChatbox
                                productId={selectedOrder.order_details?.[0]?.product_id}
                                customerId={selectedOrder.user_id}
                                orderId={selectedOrder.order_id}
                                orderStatus={selectedOrder.status}
                                onImageUpload={() => { }}
                                onNewMessage={loadOrders}
                                isReadOnly={effectiveChatReadOnly}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/20 px-20 text-center">
                        <div className="w-24 h-24 rounded-[40px] border-4 border-dashed border-gray-200 flex items-center justify-center mb-6">
                            <img src={messageIcn} className="w-10 h-10 grayscale opacity-20" alt="" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-widest text-gray-900 italic">Work Desk</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2 max-w-xs">Select a project from the queue to start collaborating with the client.</p>
                    </div>
                )}
            </div>

            {/* 3. Workflow & Specs Modal */}
            {isWorkflowModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-end p-6 bg-black/60 backdrop-blur-sm" onClick={() => setIsWorkflowModalOpen(false)}>
                    <div
                        className="bg-white rounded-[48px] w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900">Task Control</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Manage Order #{selectedOrder.order_number}</p>
                            </div>
                            <button
                                onClick={() => setIsWorkflowModalOpen(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-gray-100 transition shadow-sm"
                            >
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</span>
                                <StatusBadge status={selectedOrder.status} />
                            </div>

                            {/* Requirements */}
                            <section>
                                <div className="flex items-center gap-2 mb-8">
                                    <div className="w-2 h-5 bg-yellow-400 rounded-full"></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Client Requirements</h3>
                                </div>
                                <div className="space-y-4">
                                    {selectedOrder.order_details?.map(item => (
                                        <div key={item.order_details_id} className="p-8 rounded-[40px] bg-white border-2 border-gray-50 shadow-sm">
                                            <div className="flex gap-6 items-start mb-6">
                                                <div className="w-20 h-20 bg-gray-50 rounded-[24px] border border-gray-100 flex-shrink-0 flex items-center justify-center p-3 overflow-hidden shadow-inner">
                                                    <img
                                                        src={item.product?.product_image ? getImageUrl(item.product.product_image) : null}
                                                        className="w-full h-full object-contain"
                                                        alt=""
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-lg text-gray-900 truncate uppercase tracking-tight">{item.product?.product_name}</h4>
                                                    <p className="text-[11px] font-black text-yellow-500 uppercase tracking-widest mt-1">Quantity: {item.quantity}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50/80 rounded-[28px] p-6 border border-gray-100/50 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400/30"></div>
                                                <p className="text-[13px] font-bold text-gray-600 leading-relaxed italic">
                                                    "{item.comments || "The client has not provided specific instructions for this item."}"
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Workflow Steps */}
                            <section>
                                <div className="flex items-center gap-2 mb-8">
                                    <div className="w-2 h-5 bg-black rounded-full"></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900">Workflow Execution</h3>
                                </div>
                                <div className="space-y-6">
                                    {isReadOnly ? (
                                        <div className="space-y-6 animate-in fade-in duration-300">
                                            {/* Design Proof Card */}
                                            <div className="p-8 rounded-[40px] border-2 border-gray-50 bg-white shadow-sm">
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Artist Uploaded Design</span>
                                                    {selectedOrder.final_design_url && <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">{isFulfillmentHistory ? 'Design Proof Approved' : 'Proof Ready'}</span>}
                                                </div>
                                                <h4 className="font-black text-xl mb-3 italic uppercase tracking-tight">Design Proof Preview</h4>

                                                {selectedOrder.final_design_url ? (
                                                    <div className="space-y-5">
                                                        <div className="w-full aspect-video rounded-[32px] bg-gray-50 border border-gray-100 flex items-center justify-center p-4 overflow-hidden shadow-inner">
                                                            <img
                                                                src={getImageUrl(selectedOrder.final_design_url)}
                                                                className="w-full h-full object-contain hover:scale-[1.02] transition-transform duration-500"
                                                                alt="Artist design proof"
                                                            />
                                                        </div>
                                                        <div className="flex justify-center">
                                                            <a
                                                                href={getImageUrl(selectedOrder.final_design_url)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                Preview Full Resolution
                                                            </a>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 border border-gray-100 rounded-[32px] text-center shadow-inner">
                                                        <span className="text-xl mb-2">⏳</span>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            Artist is still designing. Proof is not uploaded yet.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Shipment Approval Panel */}
                                            <div className={`p-8 rounded-[40px] border-2 transition-all ${isFulfillmentHistory ? 'border-green-400 bg-green-50/30 shadow-2xl shadow-green-400/10' : ['Awaiting Shipment Approval'].includes(selectedOrder.status) ? 'border-yellow-400 bg-yellow-50/30 shadow-2xl shadow-yellow-400/10' : 'border-gray-50 bg-white'}`}>
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Shipment Verification</span>
                                                    {isFulfillmentHistory ? (
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">Fulfilled</span>
                                                    ) : selectedOrder.shipment_requested_at ? (
                                                        <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-3 py-1 rounded-full animate-pulse">Action Required</span>
                                                    ) : null}
                                                </div>
                                                <h4 className="font-black text-xl mb-3 italic uppercase tracking-tight">Shipment Approval Action</h4>

                                                {isFulfillmentHistory ? (
                                                    <div className="space-y-4 animate-in fade-in duration-500">
                                                        <div className="bg-white p-6 rounded-[28px] border border-green-100 text-xs font-bold text-gray-600 shadow-sm leading-relaxed">
                                                            ✅ <span className="uppercase tracking-widest text-[9px] font-black text-green-600 block mb-2">Fulfillment Record:</span>
                                                            <p className="font-extrabold text-green-800 text-[13px] italic">"Physical shipment has been confirmed & authorized for logistics dispatch."</p>
                                                            {selectedOrder.shipment_note && (
                                                                <p className="mt-3 text-[10px] text-gray-400 uppercase tracking-widest font-black pt-3 border-t border-gray-50">
                                                                    Artist Shipping Note: <span className="text-gray-700 font-bold lowercase normal-case italic">"{selectedOrder.shipment_note}"</span>
                                                                </p>
                                                            )}
                                                        </div>

                                                        {selectedOrder.status === 'To Shipping' ? (
                                                            <div className="bg-yellow-400 text-black p-6 rounded-[28px] shadow-lg space-y-2">
                                                                <span className="uppercase tracking-widest text-[9px] font-black text-black/70 block">📦 Pending Staff Dispatch</span>
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <p className="text-[13px] font-extrabold uppercase tracking-tight">Status: Awaiting Staff to Pack and Ship</p>
                                                                        <p className="text-[11px] font-bold text-black/80 mt-1 italic">Requested na ang shipment, and ready to ship na kay staff</p>
                                                                    </div>
                                                                    <div className="text-2xl animate-pulse">🚚</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-green-500 text-white p-6 rounded-[28px] shadow-lg space-y-2">
                                                                <span className="uppercase tracking-widest text-[9px] font-black text-white/80 block">📦 Shipment Status</span>
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <p className="text-[13px] font-extrabold uppercase tracking-tight">Status: {selectedOrder.status}</p>
                                                                        {selectedOrder.tracking_number && (
                                                                            <p className="text-[11px] font-bold text-white/90 mt-1">Tracking Number (J&T Express): <span className="underline font-black text-[12px]">{selectedOrder.tracking_number}</span></p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-2xl">✅</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : selectedOrder.status === 'Awaiting Shipment Approval' || selectedOrder.shipment_requested_at ? (
                                                    <div className="space-y-6">
                                                        <div className="bg-white p-6 rounded-[28px] border border-gray-100 text-xs font-bold text-gray-600 shadow-sm leading-relaxed">
                                                            💬 <span className="uppercase tracking-widest text-[9px] font-black text-gray-400 block mb-2">Artist Shipping Note:</span>
                                                            <p className="italic font-semibold bg-gray-50/50 p-4 rounded-xl">"{selectedOrder.shipment_note || 'No notes provided by the artist.'}"</p>
                                                        </div>

                                                        <div className="bg-black rounded-[32px] p-8 text-white shadow-2xl space-y-4">
                                                            <h4 className="text-md font-black italic uppercase tracking-tight mb-1">Authorization Desk</h4>
                                                            {isReadOnly ? (
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">This shipment request is currently under review by an Administrator.</p>
                                                            ) : (
                                                                <>
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 leading-relaxed">Please review the design quality above before confirming the physical shipment. This will notify the staff to prepare the product.</p>

                                                                    <button
                                                                        onClick={() => handleApproveForShipping(selectedOrder.order_id)}
                                                                        className="w-full py-5 bg-yellow-400 text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 active:scale-95 flex items-center justify-center gap-2"
                                                                    >
                                                                        ✅ Confirm Request shipment
                                                                    </button>

                                                                    {!showRejectInput ? (
                                                                        <button
                                                                            onClick={() => setShowRejectInput(true)}
                                                                            className="w-full py-4 bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-95 border border-white/20"
                                                                        >
                                                                            ❌ Reject Shipment Request
                                                                        </button>
                                                                    ) : (
                                                                        <div className="space-y-3 pt-2">
                                                                            <textarea
                                                                                placeholder="Specify the reason for rejection..."
                                                                                value={rejectReason}
                                                                                onChange={(e) => setRejectReason(e.target.value)}
                                                                                className="w-full p-5 rounded-[24px] border border-white/20 bg-white/10 text-white placeholder:text-gray-500 text-[13px] font-bold outline-none focus:border-red-400 transition-all"
                                                                                rows={3}
                                                                            />
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={() => handleRejectShipment(selectedOrder.order_id)}
                                                                                    className="flex-1 py-4 bg-red-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-600 transition-all active:scale-95"
                                                                                >
                                                                                    Confirm Reject
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => { setShowRejectInput(false); setRejectReason(""); }}
                                                                                    className="px-5 py-4 bg-white/10 text-white text-[11px] font-black uppercase rounded-2xl hover:bg-white/20 transition-all"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-6 bg-gray-50 border border-gray-100 rounded-3xl">
                                                        ⏳ Shipment request has not been submitted by the artist yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Phase 1 */}
                                            <div className={`p-8 rounded-[40px] border-2 transition-all ${isFulfillmentHistory ? 'border-green-100 bg-green-50/10' : !selectedOrder.in_progress_at ? 'border-yellow-400 bg-yellow-50/30 shadow-2xl shadow-yellow-400/10' : 'border-gray-50 bg-white'}`}>
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Phase 01</span>
                                                    {(isFulfillmentHistory || selectedOrder.in_progress_at) && <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">{isFulfillmentHistory ? 'Completed' : 'Success'}</span>}
                                                </div>
                                                <h4 className="font-black text-xl mb-3 italic uppercase tracking-tight">Accept & Initialize</h4>
                                                <p className="text-[12px] font-medium text-gray-500 mb-8 leading-relaxed">By starting, the customer will see that you are currently working on their design.</p>

                                                {isFulfillmentHistory ? (
                                                    <div className="space-y-4">
                                                        <div className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-3 bg-white p-4 rounded-2xl border border-green-50 shadow-sm">
                                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                                            Started {selectedOrder.in_progress_at ? new Date(selectedOrder.in_progress_at).toLocaleString() : "N/A"}
                                                        </div>
                                                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-[10px] font-bold text-gray-600 space-y-1.5 shadow-inner">
                                                            <div>🚢 <span className="uppercase tracking-widest text-[9px] font-black text-gray-400">Expected Ship Date:</span> {selectedOrder.expected_shipped_at ? new Date(selectedOrder.expected_shipped_at).toLocaleString() : "Not set"}</div>
                                                            <div>🎁 <span className="uppercase tracking-widest text-[9px] font-black text-gray-400">Expected Delivery Date:</span> {selectedOrder.expected_delivery_at ? new Date(selectedOrder.expected_delivery_at).toLocaleString() : "Not set"}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {!selectedOrder.in_progress_at && (
                                                            !showTimelineForm ? (
                                                                <button
                                                                    onClick={() => setShowTimelineForm(true)}
                                                                    className="w-full py-5 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                                                                >
                                                                    Start Processing Task
                                                                </button>
                                                            ) : (
                                                                <div className="space-y-4 bg-gray-50 border border-gray-100 p-6 rounded-[28px] animate-in slide-in-from-top duration-300">
                                                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Set Expected Schedule Range</p>
                                                                    <div className="space-y-3">
                                                                        <div>
                                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Expected Shipped Date & Time</label>
                                                                            <input type="datetime-local" value={expectedShippedAt} onChange={(e) => setExpectedShippedAt(e.target.value)} className="w-full text-xs font-bold border border-gray-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400" />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Expected Delivery Date & Time</label>
                                                                            <input type="datetime-local" value={expectedDeliveryAt} onChange={(e) => setExpectedDeliveryAt(e.target.value)} className="w-full text-xs font-bold border border-gray-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-2 pt-2">
                                                                        <button onClick={() => handleMarkInProgress(selectedOrder.order_id)} className="flex-1 py-3.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all active:scale-95">Confirm & Start</button>
                                                                        <button onClick={() => setShowTimelineForm(false)} className="px-4 py-3.5 bg-white text-gray-400 border border-gray-200 text-[10px] font-black uppercase rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                        {selectedOrder.in_progress_at && (
                                                            <div className="mt-4 space-y-4">
                                                                <div className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-3 bg-white p-4 rounded-2xl border border-green-50 shadow-sm">
                                                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"></div>
                                                                    Started {new Date(selectedOrder.in_progress_at).toLocaleString()}
                                                                </div>
                                                                <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-[10px] font-bold text-gray-600 space-y-1.5 shadow-inner">
                                                                    <div>🚢 <span className="uppercase tracking-widest text-[9px] font-black text-gray-400">Expected Ship Date:</span> {selectedOrder.expected_shipped_at ? new Date(selectedOrder.expected_shipped_at).toLocaleString() : "Not set"}</div>
                                                                    <div>🎁 <span className="uppercase tracking-widest text-[9px] font-black text-gray-400">Expected Delivery Date:</span> {selectedOrder.expected_delivery_at ? new Date(selectedOrder.expected_delivery_at).toLocaleString() : "Not set"}</div>
                                                                </div>
                                                                {!showTimelineForm ? (
                                                                    <button onClick={() => { setExpectedShippedAt(selectedOrder.expected_shipped_at ? selectedOrder.expected_shipped_at.substring(0, 16) : getFutureDateTimeString(2)); setExpectedDeliveryAt(selectedOrder.expected_delivery_at ? selectedOrder.expected_delivery_at.substring(0, 16) : getFutureDateTimeString(5)); setShowTimelineForm(true); }} className="w-full py-3 bg-white hover:bg-gray-50 text-black border border-gray-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-sm">
                                                                        ✏️ Change Schedule
                                                                    </button>
                                                                ) : (
                                                                    <div className="space-y-4 bg-gray-50 border border-gray-100 p-6 rounded-[28px] animate-in slide-in-from-top duration-300">
                                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reschedule timeline</p>
                                                                        <div className="space-y-3">
                                                                            <div>
                                                                                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Expected Shipped Date & Time</label>
                                                                                <input type="datetime-local" value={expectedShippedAt} onChange={(e) => setExpectedShippedAt(e.target.value)} className="w-full text-xs font-bold border border-gray-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400" />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">Expected Delivery Date & Time</label>
                                                                                <input type="datetime-local" value={expectedDeliveryAt} onChange={(e) => setExpectedDeliveryAt(e.target.value)} className="w-full text-xs font-bold border border-gray-200 bg-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-yellow-400" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 pt-2">
                                                                            <button onClick={async () => { await handleMarkInProgress(selectedOrder.order_id); }} className="flex-1 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all">Save Changes</button>
                                                                            <button onClick={() => setShowTimelineForm(false)} className="px-4 py-3 bg-white text-gray-400 border border-gray-200 text-[10px] font-black uppercase rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Phase 2 */}
                                            <div className={`p-8 rounded-[40px] border-2 transition-all ${isFulfillmentHistory ? 'border-green-100 bg-green-50/10' : selectedOrder.in_progress_at && !selectedOrder.final_design_url ? 'border-yellow-400 bg-yellow-50/30 shadow-2xl shadow-yellow-400/10' : 'border-gray-50 bg-white'}`}>
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Phase 02</span>
                                                    {selectedOrder.final_design_url && <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">{isFulfillmentHistory ? 'Completed' : 'Live'}</span>}
                                                </div>
                                                <h4 className="font-black text-xl mb-3 italic uppercase tracking-tight">Design & Upload</h4>
                                                <p className="text-[12px] font-medium text-gray-500 mb-8 leading-relaxed">Once you finish the design, upload it here for the customer to review and approve.</p>

                                                {isFulfillmentHistory ? (
                                                    <div className="space-y-4">
                                                        {selectedOrder.final_design_url ? (
                                                            <div className="space-y-4">
                                                                <div className="w-full aspect-video rounded-[32px] bg-gray-50 border border-gray-100 flex items-center justify-center p-4 overflow-hidden shadow-inner">
                                                                    <img src={getImageUrl(selectedOrder.final_design_url)} className="w-full h-full object-contain" alt="Finalized design proof" />
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <a href={getImageUrl(selectedOrder.final_design_url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-6 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-lg">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                        View Final Resolution
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-4 bg-gray-50 border border-gray-100 rounded-3xl">No design proof uploaded</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {selectedOrder.in_progress_at && !selectedOrder.shipment_requested_at && (
                                                            selectedOrder.final_design_url ? (
                                                                <div className="w-full aspect-video rounded-[32px] bg-gray-50 border-4 border-dashed border-gray-100 flex items-center justify-center p-4 overflow-hidden shadow-inner relative group/image">
                                                                    <img src={getImageUrl(selectedOrder.final_design_url)} className="w-full h-full object-contain rounded-2xl" alt="Uploaded design proof" />
                                                                    <div className="absolute inset-0 bg-black/65 opacity-0 group-hover/image:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3.5 rounded-[24px] backdrop-blur-xs">
                                                                        <a href={getImageUrl(selectedOrder.final_design_url)} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-black hover:bg-gray-100 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95">👁️ View Full Resolution</a>
                                                                        {!isReadOnly && (
                                                                            <label className="px-6 py-3 bg-yellow-400 text-black hover:bg-yellow-500 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95">
                                                                                <input type="file" className="hidden" onChange={(e) => handleUpload(e, selectedOrder.order_id)} />
                                                                                📤 Upload New Version
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : isReadOnly ? (
                                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center py-14 bg-gray-50 border border-gray-100 rounded-3xl">No design proof uploaded yet</div>
                                                            ) : (
                                                                <label className="w-full flex flex-col items-center justify-center gap-4 py-14 border-4 border-dashed border-gray-100 rounded-[40px] cursor-pointer hover:border-yellow-400 hover:bg-white transition-all duration-500 group shadow-inner">
                                                                    <input type="file" className="hidden" onChange={(e) => handleUpload(e, selectedOrder.order_id)} />
                                                                    <div className="w-20 h-20 rounded-[32px] bg-gray-50 flex items-center justify-center group-hover:bg-yellow-100 transition-all duration-500 shadow-sm group-hover:scale-110">
                                                                        <img src={uploadIcn} className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" alt="" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-black block mb-1">{uploading ? 'Processing File...' : 'Upload Design File'}</span>
                                                                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Supports high-res images & PDFs</span>
                                                                    </div>
                                                                </label>
                                                            )
                                                        )}
                                                        {!selectedOrder.in_progress_at && (
                                                            <div className="flex flex-col items-center justify-center py-10 bg-gray-50 border border-gray-100 rounded-[32px] text-center shadow-inner">
                                                                <span className="text-xl mb-2">🔒</span>
                                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Initialize Phase 1 to unlock file uploader</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Phase 3 */}
                                            <div className={`p-8 rounded-[40px] border-2 transition-all ${isFulfillmentHistory ? 'border-green-400 bg-green-50/30 shadow-2xl shadow-green-400/10' : ['Awaiting Shipment Approval', 'To Shipping', 'To Receive', 'Completed'].includes(selectedOrder.status) ? 'border-gray-50 bg-white' : 'border-yellow-400 bg-yellow-50/30'}`}>
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">Phase 03</span>
                                                    {selectedOrder.status === 'Completed' ? (
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">Completed</span>
                                                    ) : ['To Shipping', 'To Receive'].includes(selectedOrder.status) ? (
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">Dispatched</span>
                                                    ) : selectedOrder.shipment_requested_at ? (
                                                        <span className="bg-orange-100 text-orange-700 text-[10px] font-black uppercase px-3 py-1 rounded-full">Pending Admin</span>
                                                    ) : null}
                                                </div>
                                                <h4 className="font-black text-xl mb-3 italic uppercase tracking-tight">Final Dispatch</h4>

                                                {isFulfillmentHistory ? (
                                                    <div className="space-y-4 animate-in fade-in duration-500">
                                                        <div className="bg-white p-6 rounded-[28px] border-2 border-green-100 text-xs font-bold text-gray-600 shadow-sm leading-relaxed">
                                                            🚢 <span className="uppercase tracking-widest text-[9px] font-black text-green-600 block mb-2">Shipment Status: Authoritative Greenlit</span>
                                                            <p className="font-extrabold text-green-800 text-[13px] italic">"The administrator has verified the design proof and fully authorized physical fulfillment & shipping."</p>
                                                            {selectedOrder.shipment_note && (
                                                                <p className="mt-3 text-[10px] text-gray-400 uppercase tracking-widest font-black pt-3 border-t border-gray-50">
                                                                    Original Shipping Handover Note: <span className="text-gray-700 font-bold lowercase normal-case italic">"{selectedOrder.shipment_note}"</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                        {['To Receive', 'Completed'].includes(selectedOrder.status) && (
                                                            <div className="bg-green-500 text-white p-6 rounded-[28px] shadow-lg space-y-1">
                                                                <span className="uppercase tracking-widest text-[9px] font-black text-white/80 block">📦 Courier Dispatch</span>
                                                                <p className="text-[12px] font-extrabold">Status: Out for Delivery</p>
                                                                <p className="text-[10px] text-white/90">Tracking Number: <span className="underline font-black">{selectedOrder.tracking_number}</span></p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-[12px] font-medium text-gray-500 mb-8 leading-relaxed">After client approval, request the admin to handle the physical shipping.</p>
                                                        {!selectedOrder.shipment_requested_at && selectedOrder.status !== 'Awaiting Shipment Approval' && selectedOrder.status !== 'To Shipping' && (
                                                            <div className="space-y-4">
                                                                <textarea placeholder="Add any specific shipping or handling notes..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-8 rounded-[32px] border-2 border-gray-50 text-[13px] font-bold bg-gray-50 outline-none focus:bg-white focus:border-yellow-400/50 focus:ring-4 focus:ring-yellow-400/5 transition-all placeholder:text-gray-300" rows={4} />
                                                                <button onClick={() => handleRequestShipment(selectedOrder.order_id)} disabled={!selectedOrder.final_design_url} className="w-full py-6 bg-yellow-400 text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-yellow-500 transition-all shadow-xl shadow-yellow-400/20 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none">
                                                                    Finalize & Request Shipment
                                                                </button>
                                                                {!selectedOrder.final_design_url && (
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center mt-2">🔒 Upload a design in Phase 2 to unlock shipment request</p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {selectedOrder.customer_approved_at && !selectedOrder.shipment_requested_at && (
                                                            <div className="mt-4 flex items-center gap-3 p-5 rounded-[24px] bg-green-50 border border-green-100 text-green-700 shadow-sm">
                                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Client Sign-off Received</span>
                                                            </div>
                                                        )}
                                                        {selectedOrder.shipment_note && selectedOrder.status === 'Design In Progress' && (
                                                            <div className="mt-4 p-6 rounded-[24px] bg-red-50 border border-red-200">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">⚠ Admin Rejected Shipment</p>
                                                                <p className="text-[12px] font-bold text-red-700 leading-relaxed">Reason: {selectedOrder.shipment_note}</p>
                                                                <p className="text-[10px] text-red-400 font-bold mt-2 uppercase tracking-wider">Please revise the design and resubmit.</p>
                                                            </div>
                                                        )}
                                                        {selectedOrder.shipment_requested_at && (
                                                            <div className="mt-4 flex items-center gap-3 p-5 rounded-[24px] bg-orange-50 border border-orange-100 text-orange-700 shadow-sm">
                                                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Admin Confirmation</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
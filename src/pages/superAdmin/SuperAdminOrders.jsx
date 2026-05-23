import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    fetchAllOrders,
    acceptOrder,
    cancelOrder,
    shipOrder,
    outForDelivery,
    completeOrder,
    approveReturn,
    rejectReturn,
    submitAdminReply,
} from "../../services/OrdersAPI.js";
import {
    fetchCSValidationQueue,
    csSendToStaff,
    csRejectOrder,
    csAcceptPartial,
    csDeclinePartial,
} from "../../services/customValidationAPI";
import { fetchAllArtists, assignArtistToOrder } from "../../services/artistOrderService";
import { IMAGE_BASE_URL, getImageUrl } from "../../services/api";
import OrderDetailsModal from "./OrderDetailsModal";
import UserOrdersModal from "./UserOrdersModal";

// ── CS Queue Constants ──────────────────────────────────────────────────────────
const CS_REJECTION_REASONS = [
    "Uploaded design resolution is too low",
    "Design file format is not supported",
    "Customer instructions are incomplete",
    "Requested product is not available",
    "Custom note (see below)",
];

// ── CS Reject Modal ───────────────────────────────────────────────────────────
const CSRejectModal = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState(CS_REJECTION_REASONS[0]);
    const [custom, setCustom] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!order) return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(order.order_id, reason === "Custom note (see below)" ? custom : reason);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-red-600 mb-1">Reject Request</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Order #{order.order_number}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Reason</label>
                        <select value={reason} onChange={e => setReason(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none">
                            {CS_REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    {reason === "Custom note (see below)" && (
                        <textarea value={custom} onChange={e => setCustom(e.target.value)}
                            placeholder="Describe the rejection reason..." rows={3} required
                            className="w-full p-3 border border-red-200 rounded-xl text-xs font-bold bg-red-50 outline-none resize-none"/>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">Back</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition disabled:opacity-40">
                            {submitting ? "Rejecting..." : "Reject Order"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── CS Stat Card ────────────────────────────────────────────────────────────
const CSStatCard = ({ label, value, color = "slate" }) => {
    const colors = {
        slate:   "from-slate-900 to-indigo-900 text-white",
        amber:   "bg-white text-gray-900 border border-gray-100",
        emerald: "bg-white text-gray-900 border border-gray-100",
        indigo:  "bg-white text-gray-900 border border-gray-100",
    };
    const valueColors = {
        slate:   "text-white",
        amber:   "text-amber-600",
        emerald: "text-emerald-600",
        indigo:  "text-indigo-600",
    };

    return (
        <div className={`rounded-3xl p-6 shadow-md relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${color === "slate" ? `bg-gradient-to-br ${colors.slate}` : colors[color]}`}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2">{label}</span>
            <div className={`text-5xl font-black italic tracking-tighter ${valueColors[color]}`}>{value}</div>
        </div>
    );
};

// ── CS Order Card ─────────────────────────────────────────────────────────────
const CSOrderCard = ({ order, artists, onSendToStaff, onReject, onAcceptPartial, onDeclinePartial, onAssignArtist }) => {
    const [selectedArtist, setSelectedArtist] = useState("");
    const [assigning, setAssigning]           = useState(false);
    const [sendingToStaff, setSendingToStaff] = useState(false);

    const csStatus    = order.cs_review_status || "pending_review";
    const staffStatus = order.staff_validation_status || "pending_validation";

    const getCSStatusMeta = (status, staffStatus) => {
        if (status === "pending_review")
            return { label: "📋 Pending CS Review", color: "bg-orange-50 text-orange-700 border-orange-200" };
        if (status === "approved_for_staff")
            return { label: "🔧 Sent to Staff", color: "bg-blue-50 text-blue-700 border-blue-200" };
        if (status === "pending_partial_response") {
            const verdicts = {
                can_accommodate:      { label: "✅ Can Accommodate",    color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                partially_accommodate:{ label: "⚠️ Partially Available", color: "bg-amber-50 text-amber-700 border-amber-200" },
                cannot_accommodate:   { label: "❌ Cannot Accommodate",  color: "bg-red-50 text-red-700 border-red-200" },
            };
            return verdicts[staffStatus] || { label: "⚠️ Awaiting Customer Decision", color: "bg-amber-50 text-amber-700 border-amber-200" };
        }
        if (status === "pending_artist_assignment")
            return { label: "🎨 Ready for Artist", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
        if (status === "assigned")
            return { label: "✅ Assigned", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
        if (status === "rejected_by_cs")
            return { label: "❌ Rejected", color: "bg-red-50 text-red-700 border-red-200" };
        return { label: status, color: "bg-gray-50 text-gray-500 border-gray-200" };
    };

    const { label, color } = getCSStatusMeta(csStatus, staffStatus);

    const firstItem  = order.order_details?.[0] || {};
    const designUrl  = order.final_design_url
        ? `${IMAGE_BASE_URL}${order.final_design_url.startsWith("/") ? order.final_design_url.slice(1) : order.final_design_url}`
        : null;

    const customerName = order.user
        ? `${order.user.first_name} ${order.user.last_name}`.trim()
        : "Customer";

    const assignedArtistName = order.artist
        ? `${order.artist.first_name || ""} ${order.artist.last_name || ""}`.trim()
        : null;

    const handleAssign = async () => {
        if (!selectedArtist) return;
        setAssigning(true);
        await onAssignArtist(order.order_id, selectedArtist);
        setAssigning(false);
    };

    const handleSendToStaff = async () => {
        setSendingToStaff(true);
        await onSendToStaff(order.order_id);
        setSendingToStaff(false);
    };

    return (
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300 space-y-4 text-left">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-sm">{order.order_number}</span>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${color}`}>{label}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">👤 {customerName}</p>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    order.payment_method?.toUpperCase() === "COD"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>{order.payment_method}</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                <p className="text-xs font-bold text-gray-700">📦 <span className="font-black text-gray-900">{firstItem.product_name || "Custom Item"}</span></p>
                <p className="text-xs font-bold text-gray-700">🔢 Qty: <span className="font-black text-gray-900">{firstItem.quantity || "—"} pcs</span></p>
                {firstItem.size && <p className="text-xs font-bold text-gray-700">📐 Size: <span className="font-black text-gray-900">{firstItem.size}</span></p>}
                {firstItem.comments && firstItem.comments !== "None" && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Note:</p>
                        <p className="text-xs text-slate-700 italic">"{firstItem.comments}"</p>
                    </div>
                )}
                
                {firstItem.custom_design_image && (
                    <div className="pt-3 mt-3 border-t border-slate-200 space-y-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            📸 Customer Reference Image:
                        </p>
                        <div className="relative group w-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition">
                            <img
                                src={getImageUrl(firstItem.custom_design_image)}
                                alt="Customer Reference"
                                className="w-full h-24 object-cover cursor-zoom-in group-hover:scale-105 transition-transform"
                                onClick={() => window.open(getImageUrl(firstItem.custom_design_image), "_blank")}
                            />
                        </div>
                    </div>
                )}
                {firstItem.custom_design_comments && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                            💬 Customer Request / Message:
                        </p>
                        <p className="text-xs text-slate-700 font-bold bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm leading-relaxed">
                            "{firstItem.custom_design_comments}"
                        </p>
                    </div>
                )}

                {designUrl && (
                    <a href={designUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 pt-2 mt-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">
                        🎨 View Final Design Proof →
                    </a>
                )}
            </div>

            {csStatus === "pending_partial_response" && staffStatus === "partially_accommodate" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-left">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">⚠️ Staff Partial Accommodation Result</p>
                    <p className="text-xs font-bold text-gray-700">
                        Staff can accommodate: <span className="font-black text-amber-700">{order.manual_approved_quantity} pcs</span>
                        <span className="text-gray-400"> (out of {firstItem.quantity} requested)</span>
                    </p>
                    {order.staff_validation_note && (
                        <p className="text-xs text-gray-600 italic">Staff note: "{order.staff_validation_note}"</p>
                    )}
                    <p className="text-[10px] font-bold text-gray-500">
                        Update customer and confirm their decision below.
                    </p>
                    <div className="flex gap-2 pt-1">
                        <button onClick={() => onAcceptPartial(order.order_id)}
                            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition animate-pulse">
                            ✅ Customer Proceeds
                        </button>
                        <button onClick={() => onDeclinePartial(order.order_id)}
                            className="flex-1 py-2.5 bg-red-400 hover:bg-red-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">
                            ❌ Customer Cancels
                        </button>
                    </div>
                </div>
            )}

            {csStatus === "assigned" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 text-left">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🎨</span>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Artist Assigned — Order in Progress</p>
                    </div>
                    {assignedArtistName && (
                        <p className="text-sm font-black text-emerald-900">
                            {assignedArtistName}
                            <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Layout Artist</span>
                        </p>
                    )}
                    <p className="text-[10px] font-bold text-emerald-600">
                        ✅ Status: <span className="font-black">To Process</span> — Artist notified via inbox.
                    </p>
                </div>
            )}

            {csStatus === "pending_artist_assignment" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3 text-left">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">🎨 Assign Layout Artist</p>
                    {order.staff_validation_note && (
                        <p className="text-xs text-gray-600 italic">Staff note: "{order.staff_validation_note}"</p>
                    )}
                    {order.manual_approved_quantity && (
                        <p className="text-xs font-bold text-gray-700">
                            Approved qty: <span className="font-black text-indigo-700">{order.manual_approved_quantity} pcs</span>
                        </p>
                    )}
                    <div className="flex gap-2">
                        <select value={selectedArtist} onChange={e => setSelectedArtist(e.target.value)}
                            className="flex-1 p-3 border border-indigo-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-300">
                            <option value="">Choose Artist...</option>
                            {artists.map(a => (
                                <option key={a.employee_id} value={a.employee_id}>
                                    {a.first_name} {a.last_name}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleAssign} disabled={!selectedArtist || assigning}
                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition disabled:opacity-40 shadow-sm animate-pulse">
                            {assigning ? "Assigning..." : "Assign"}
                        </button>
                    </div>
                </div>
            )}

            {csStatus === "pending_review" && (
                <div className="flex gap-2 flex-wrap pt-1">
                    <button onClick={handleSendToStaff} disabled={sendingToStaff}
                        className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition shadow-md shadow-yellow-400/20 disabled:opacity-40 animate-pulse">
                        {sendingToStaff ? "Sending..." : "🔧 Send to Staff for Check"}
                    </button>
                    <button onClick={() => onReject(order)}
                        className="px-4 py-3 border border-red-200 text-red-500 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition">
                        Reject
                    </button>
                </div>
            )}
        </div>
    );
};

const getCustomerName = (order) => {
    if (order.name && order.name !== "Customer") return order.name;
    if (order.user?.first_name || order.user?.last_name)
        return `${order.user.first_name || ""} ${order.user.last_name || ""}`.trim();
    return order.customer_name || "Customer";
};

const hasAnyReview = (order) => {
    if (order.reviews && Array.isArray(order.reviews) && order.reviews.length > 0) return true;
    return !!(order.has_review || order.rating);
};

const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return isNaN(d.getTime())
        ? isoString
        : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const SuperAdminOrders = ({ isCSQueueOnly = false }) => {
    const [orders, setOrders]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [statusFilter, setStatusFilter]   = useState(isCSQueueOnly ? "CS Queue" : "All");
    const [searchQuery, setSearchQuery]     = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedUser, setSelectedUser]   = useState(null);

    // CS validation Queue states
    const [csOrders, setCsOrders]           = useState([]);
    const [csArtists, setCsArtists]         = useState([]);
    const [csLoading, setCsLoading]         = useState(false);
    const [csRejectTarget, setCsRejectTarget] = useState(null);
    const [csToast, setCsToast]             = useState(null);

    const showCsToast = (msg, type = "success") => {
        setCsToast({ msg, type });
        setTimeout(() => setCsToast(null), 3500);
    };

    const loadCsData = useCallback(async () => {
        setCsLoading(true);
        try {
            const [ordersData, artistsData] = await Promise.all([
                fetchCSValidationQueue(),
                fetchAllArtists(),
            ]);
            setCsOrders(Array.isArray(ordersData) ? ordersData : []);
            setCsArtists(Array.isArray(artistsData) ? artistsData : (artistsData.employees || []));
        } catch (err) {
            console.error("Admin CS load error:", err);
        } finally {
            setCsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (statusFilter === "CS Queue") {
            loadCsData();
        }
    }, [statusFilter, loadCsData]);

    const handleCSQueueSendToStaff = async (orderId) => {
        try {
            await csSendToStaff(orderId);
            showCsToast("Order sent to Staff for feasibility check.");
            await loadCsData();
            refreshOrdersSilently();
        } catch {
            showCsToast("Failed to send to Staff.", "error");
        }
    };

    const handleCSQueueReject = async (orderId, reason) => {
        try {
            await csRejectOrder(orderId, reason);
            showCsToast("Order rejected and customer notified.");
            setCsRejectTarget(null);
            await loadCsData();
            refreshOrdersSilently();
        } catch {
            showCsToast("Failed to reject order.", "error");
        }
    };

    const handleCSQueueAcceptPartial = async (orderId) => {
        try {
            await csAcceptPartial(orderId);
            showCsToast("Partial accommodation confirmed. Ready for artist assignment.");
            await loadCsData();
            refreshOrdersSilently();
        } catch {
            showCsToast("Failed to confirm partial.", "error");
        }
    };

    const handleCSQueueDeclinePartial = async (orderId) => {
        try {
            await csDeclinePartial(orderId);
            showCsToast("Order cancelled — customer declined partial accommodation.");
            await loadCsData();
            refreshOrdersSilently();
        } catch {
            showCsToast("Failed to process decision.", "error");
        }
    };

    const handleCSQueueAssignArtist = async (orderId, artistId) => {
        try {
            await assignArtistToOrder(orderId, Number(artistId));
            showCsToast("🎨 Artist assigned successfully!");
            await loadCsData();
            refreshOrdersSilently();
        } catch {
            showCsToast("Failed to assign artist.", "error");
        }
    };

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchAllOrders();
            setOrders(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error("Error loading orders:", error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshOrdersSilently = useCallback(async () => {
        try {
            const result = await fetchAllOrders();
            setOrders(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error("Background refresh failed:", error);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);
    useEffect(() => {
        const interval = setInterval(refreshOrdersSilently, 10000);
        return () => clearInterval(interval);
    }, [refreshOrdersSilently]);

   const filteredOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : [])
        .filter((order) => {
            if (statusFilter === "All")             return true;
            if (statusFilter === "Archived")        return order.status === "Cancelled";
            if (statusFilter === "Reviews")         return hasAnyReview(order);
            if (statusFilter === "Pending Payment") return order.status === "Pending Payment";
            if (statusFilter === "Pending")         
                return order.status === "Pending" || order.status === "Pending Payment";
            if (statusFilter === "Return/Refund")   
                return order.status === "Return/Refund" || order.status === "Refunded";
            return order.status === statusFilter;
        })
        .filter((order) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const name    = getCustomerName(order).toLowerCase();
            const email   = (order.email || "").toLowerCase();
            const contact = (order.contact_number || "").toLowerCase();
            const orderNo = (order.order_number || String(order.order_id) || "").toLowerCase();
            return name.includes(q) || email.includes(q) || contact.includes(q) || orderNo.includes(q);
        })
          .sort((a, b) => {
            const dateA = a.order_date || a.created_at;
            const dateB = b.order_date || b.created_at;
            if (!dateA && !dateB) return b.order_id - a.order_id;
            if (!dateA) return -1; // ← null date goes to TOP
            if (!dateB) return 1;
            return new Date(dateB) - new Date(dateA);
        });
   }, [orders, statusFilter, searchQuery]);

    const handleAcceptOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await acceptOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleShipOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await shipOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleOutForDelivery = useCallback(async (
        orderId,
        orderDetailsId  = null,
        trackingNumber  = null,
        deliveryDays    = 5,
        deliveryMinutes = 0,
    ) => {
        await outForDelivery(orderId, orderDetailsId, trackingNumber, deliveryDays, deliveryMinutes);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleCompleteOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await completeOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleCancelOrder = useCallback(async (orderId, orderDetailsId = null, reason = "Cancelled by admin") => {
        await cancelOrder(orderId, orderDetailsId, reason);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleApproveReturn = useCallback(async (orderId) => {
        await approveReturn(orderId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleRejectReturn = useCallback(async (orderId) => {
        await rejectReturn(orderId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleAdminReply = useCallback(async (orderId, reviewId, reply) => {
        await submitAdminReply(reviewId, reply);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const openOrderModal = useCallback((order) => {
        setSelectedUser({
            name:    getCustomerName(order),
            email:   order.email || "N/A",
            contact: order.contact_number || "N/A",
            orders:  [order],
        });
    }, []);

    return (
        <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">
                {isCSQueueOnly ? "CS Validation Queue" : "Orders Management"}
            </h1>

            {selectedOrder && (
                <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            )}

            {selectedUser && (
                <UserOrdersModal
                    user={selectedUser}
                    statusFilter={statusFilter}
                    onClose={() => setSelectedUser(null)}
                    onRefresh={refreshOrdersSilently}
                    actions={{
                        handleAcceptOrder,
                        handleShipOrder,
                        handleOutForDelivery,
                        handleCompleteOrder,
                        handleCancelOrder,
                        handleApproveReturn,
                        handleRejectReturn,
                        handleAdminReply,
                    }}
                />
            )}

            {csToast && (
                <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl animate-in slide-in-from-right-5 duration-300 ${
                    csToast.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
                }`}>
                    <span className="text-base font-black">{csToast.type === "error" ? "✕" : "✓"}</span>
                    <p className="text-sm font-bold">{csToast.msg}</p>
                </div>
            )}

            {csRejectTarget && (
                <CSRejectModal
                    order={csRejectTarget}
                    onClose={() => setCsRejectTarget(null)}
                    onConfirm={handleCSQueueReject}
                />
            )}

            {/* Search */}
            {statusFilter !== "CS Queue" && (
                <div className="flex flex-wrap items-center justify-start gap-3 mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search customer, email, contact or order #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-80 transition-all"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>
            )}

            {/* Status filters */}
            {!isCSQueueOnly && (
                <div className="flex gap-4 font-semibold overflow-x-auto mb-6">
                    {["All", "Pending", "Pending Payment", "To Process", "To Ship", "To Receive", "Completed", "Return/Refund", "Reviews", "Archived"].map((status) => (
                        <button 
                            key={status} 
                            onClick={() => setStatusFilter(status)}
                            className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${
                                statusFilter === status
                                    ? "border-[#FFE100] text-gray-900 font-bold"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            )}

            {/* Content view switch */}
            {statusFilter === "CS Queue" ? (
                csLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3 flex-1">
                        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"/>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing CS queue...</p>
                    </div>
                ) : (
                    <div className="space-y-8 flex-1 overflow-y-auto">
                        {/* CS Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <CSStatCard label="Pending CS Review"     value={csOrders.filter(o => o.cs_review_status === "pending_review").length}    color="slate"   />
                            <CSStatCard label="Sent to Staff"          value={csOrders.filter(o => o.cs_review_status === "approved_for_staff").length}      color="amber"   />
                            <CSStatCard label="Awaiting Decision" value={csOrders.filter(o => o.cs_review_status === "pending_partial_response").length} color="emerald" />
                            <CSStatCard label="Ready for Artist"       value={csOrders.filter(o => o.cs_review_status === "pending_artist_assignment").length}   color="indigo"  />
                            <CSStatCard label="Assigned"               value={csOrders.filter(o => o.cs_review_status === "assigned").length}   color="emerald" />
                        </div>

                        {/* Order Queue */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black uppercase italic tracking-tighter text-gray-900">Active CS Queue</h2>
                                <button onClick={loadCsData} className="text-xs font-bold text-gray-400 hover:text-gray-700 transition">↻ Refresh Queue</button>
                            </div>

                            {csOrders.length === 0 ? (
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mb-4">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    </div>
                                    <h4 className="text-base font-bold text-gray-900 mb-1">Queue is Clear!</h4>
                                    <p className="text-xs text-gray-400">All custom orders have been processed.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-8">
                                    {csOrders.map(order => (
                                        <CSOrderCard
                                            key={order.order_id}
                                            order={order}
                                            artists={csArtists}
                                            onSendToStaff={handleCSQueueSendToStaff}
                                            onReject={setCsRejectTarget}
                                            onAcceptPartial={handleCSQueueAcceptPartial}
                                            onDeclinePartial={handleCSQueueDeclinePartial}
                                            onAssignArtist={handleCSQueueAssignArtist}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            ) : (
                /* Table (Status column removed) */
                <div className="flex flex-col w-full overflow-y-auto flex-1 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                        <p className="text-sm font-medium text-gray-600">
                            {loading
                                ? "Loading..."
                                : `${filteredOrders.length} transaction${filteredOrders.length !== 1 ? "s" : ""} found`}
                        </p>
                    </div>

                    <div className="p-4 overflow-x-auto">
                        <table className="w-full table-auto border-collapse min-w-[680px]">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr className="text-left border-b-2 border-gray-200">
                                    <th className="px-4 py-3 font-semibold text-sm">Order #</th>
                                    <th className="px-4 py-3 font-semibold text-sm">Date</th>
                                    <th className="px-4 py-3 font-semibold text-sm">Customer</th>
                                    <th className="px-4 py-3 font-semibold text-sm">Address</th>
                                    <th className="px-4 py-3 font-semibold text-sm text-center">Total</th>
                                    <th className="px-4 py-3 font-semibold text-sm text-center w-28">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin"/>
                                                <p className="text-sm text-gray-500">Loading orders...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-20 text-gray-500">
                                            <p className="font-medium text-lg">No orders found matching current filters.</p>
                                        </td>
                                    </tr>
                                ) : filteredOrders.map((order) => {
                                    const customerName = getCustomerName(order);
                                    const reviewCount  = order.reviews?.length || 0;

                                    return (
                                        <tr key={order.order_id} className="border-b hover:bg-gray-50 transition">
                                            {/* Order number */}
                                            <td className="px-4 py-5">
                                                <span className="font-bold text-gray-900 text-sm">
                                                    {order.order_number || `#${order.order_id}`}
                                                </span>
                                                {reviewCount > 0 && (
                                                    <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium">
                                                        💬 {reviewCount}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-5 text-sm text-gray-500 whitespace-nowrap">
                                                {formatDate(order.order_date)}
                                            </td>

                                            {/* Customer */}
                                            <td className="px-4 py-5">
                                                <p className="font-semibold text-gray-900 text-sm">{customerName}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{order.email || "N/A"}</p>
                                            </td>

                                            {/* Address */}
                                            <td className="px-4 py-5 text-gray-600 text-sm max-w-[180px] truncate">
                                                {order.address || "N/A"}
                                            </td>

                                            {/* Total */}
                                            <td className="px-4 py-5 text-center font-semibold text-gray-900 text-sm whitespace-nowrap">
                                                ₱{Number(order.total_price || 0).toLocaleString("en-PH")}
                                            </td>

                                            {/* Action button */}
                                            <td className="px-4 py-5 text-center">
                                                <button
                                                    onClick={() => openOrderModal(order)}
                                                    className="bg-black hover:bg-gray-800 text-white px-5 py-1.5 rounded-lg text-xs font-medium transition shadow-sm w-full"
                                                >
                                                    View Order
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminOrders;

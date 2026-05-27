import React, { useState, useEffect, useCallback, useMemo } from "react";
import { fetchAllArtists, assignArtistToOrder } from "../../services/artistOrderService";
import {
    fetchCSValidationQueue,
    csSendToStaff,
    csRejectOrder,
    csAcceptPartial,
    csDeclinePartial,
} from "../../services/customValidationAPI";
import { IMAGE_BASE_URL, getImageUrl } from "../../services/api";

// ── Constants ──────────────────────────────────────────────────────────────────
const CS_REJECTION_REASONS = [
    "Uploaded design resolution is too low",
    "Design file format is not supported",
    "Customer instructions are incomplete",
    "Requested product is not available",
    "Custom note (see below)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Toast ──────────────────────────────────────────────────────────────────────
const useToast = () => {
    const [toast, setToast] = useState(null);
    const show = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };
    return { toast, show };
};

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

// ── Order Card ─────────────────────────────────────────────────────────────────
const OrderCard = ({ order, artists, onSendToStaff, onReject, onAcceptPartial, onDeclinePartial, onAssignArtist }) => {
    const [selectedArtist, setSelectedArtist] = useState("");
    const [assigning, setAssigning]           = useState(false);
    const [sendingToStaff, setSendingToStaff] = useState(false);

    const csStatus    = order.cs_review_status || "pending_review";
    const staffStatus = order.staff_validation_status || "pending_validation";
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

    const dateRaw = order.order_date || order.created_at || order.date;
    const formattedDate = dateRaw 
        ? new Date(dateRaw).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : 'Unknown Date';

    return (
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300 space-y-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-sm">{order.order_number}</span>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${color}`}>{label}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">👤 {customerName} <span className="mx-1 text-gray-300">•</span> 🕒 {formattedDate}</p>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    order.payment_method?.toUpperCase() === "COD"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>{order.payment_method}</span>
            </div>

            {/* Item details */}
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
                
                {/* Customer Uploaded Design Details */}
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

            {/* Staff result display */}
            {csStatus === "pending_partial_response" && staffStatus === "partially_accommodate" && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
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
                            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">
                            ✅ Customer Proceeds
                        </button>
                        <button onClick={() => onDeclinePartial(order.order_id)}
                            className="flex-1 py-2.5 bg-red-400 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">
                            ❌ Customer Cancels
                        </button>
                    </div>
                </div>
            )}

            {/* Assigned to Artist */}
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

            {/* Staff validated: can accommodate — show artist assignment */}
            {csStatus === "pending_artist_assignment" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
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
                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition disabled:opacity-40">
                            {assigning ? "Assigning..." : "Assign"}
                        </button>
                    </div>
                </div>
            )}

            {/* Actions for pending_review */}
            {csStatus === "pending_review" && (
                <div className="flex gap-2 flex-wrap pt-1">
                    <button onClick={handleSendToStaff} disabled={sendingToStaff}
                        className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition shadow-md shadow-yellow-400/20 disabled:opacity-40">
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

// ── Dashboard Stats ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = "slate" }) => {
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

// ── Main Dashboard Component ───────────────────────────────────────────────────
export default function CustomerServiceDashboard() {
    const [orders, setOrders]   = useState([]);
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectTarget, setRejectTarget] = useState(null);
    const { toast, show: showToast } = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersData, artistsData] = await Promise.all([
                fetchCSValidationQueue(),
                fetchAllArtists(),
            ]);
            
            const rawOrders = Array.isArray(ordersData) ? ordersData : [];
            // Sort by latest date first
            rawOrders.sort((a, b) => {
                const dateA = new Date(a.order_date || a.created_at || a.date || 0);
                const dateB = new Date(b.order_date || b.created_at || b.date || 0);
                return dateB - dateA;
            });
            
            setOrders(rawOrders);
            setArtists(Array.isArray(artistsData) ? artistsData : []);
        } catch (err) {
            console.error("CS Dashboard load error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Derived stats
    const stats = useMemo(() => ({
        pendingReview:    orders.filter(o => o.cs_review_status === "pending_review").length,
        sentToStaff:      orders.filter(o => o.cs_review_status === "approved_for_staff").length,
        awaitingDecision: orders.filter(o => o.cs_review_status === "pending_partial_response").length,
        readyForArtist:   orders.filter(o => o.cs_review_status === "pending_artist_assignment").length,
    }), [orders]);

    // ── Action Handlers ────────────────────────────────────────────────────────
    const handleSendToStaff = async (orderId) => {
        try {
            await csSendToStaff(orderId);
            showToast("Order sent to Staff for feasibility check.");
            await loadData();
        } catch {
            showToast("Failed to send to Staff.", "error");
        }
    };

    const handleCSReject = async (orderId, reason) => {
        try {
            await csRejectOrder(orderId, reason);
            showToast("Order rejected and customer notified.");
            setRejectTarget(null);
            await loadData();
        } catch {
            showToast("Failed to reject order.", "error");
        }
    };

    const handleAcceptPartial = async (orderId) => {
        try {
            await csAcceptPartial(orderId);
            showToast("Partial accommodation confirmed. Ready for artist assignment.");
            await loadData();
        } catch {
            showToast("Failed to confirm partial.", "error");
        }
    };

    const handleDeclinePartial = async (orderId) => {
        try {
            await csDeclinePartial(orderId);
            showToast("Order cancelled — customer declined partial accommodation.");
            await loadData();
        } catch {
            showToast("Failed to process decision.", "error");
        }
    };

    const handleAssignArtist = async (orderId, artistId) => {
        try {
            await assignArtistToOrder(orderId, Number(artistId));
            showToast("🎨 Artist assigned successfully!");
            await loadData();
        } catch {
            showToast("Failed to assign artist.", "error");
        }
    };

    return (
        <div className="p-6 md:p-10 min-h-screen bg-slate-50/50">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl animate-in slide-in-from-right-5 duration-300 ${
                    toast.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"
                }`}>
                    <span className="text-base font-black">{toast.type === "error" ? "✕" : "✓"}</span>
                    <p className="text-sm font-bold">{toast.msg}</p>
                </div>
            )}

            {/* CS Reject Modal */}
            {rejectTarget && (
                <CSRejectModal
                    order={rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    onConfirm={handleCSReject}
                />
            )}

            {/* Header */}
            <header className="mb-10">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">
                    Customer Service Hub
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Review requests · coordinate with staff · assign artists
                </p>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing queue...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard label="Pending CS Review"     value={stats.pendingReview}    color="slate"   />
                        <StatCard label="Sent to Staff"          value={stats.sentToStaff}      color="amber"   />
                        <StatCard label="Awaiting Decision" value={stats.awaitingDecision} color="emerald" />
                        <StatCard label="Ready for Artist"       value={stats.readyForArtist}   color="indigo"  />
                        <StatCard label="Assigned"               value={orders.filter(o => o.cs_review_status === "assigned").length}   color="emerald" />
                    </div>

                    {/* Order Queue */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black uppercase italic tracking-tighter text-gray-900">Active Queue</h2>
                            <button onClick={loadData} className="text-xs font-bold text-gray-400 hover:text-gray-700 transition">↻ Refresh</button>
                        </div>

                        {orders.length === 0 ? (
                            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-16 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <h4 className="text-base font-bold text-gray-900 mb-1">Queue is Clear!</h4>
                                <p className="text-xs text-gray-400">All custom orders have been processed.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {orders.map(order => (
                                    <OrderCard
                                        key={order.order_id}
                                        order={order}
                                        artists={artists}
                                        onSendToStaff={handleSendToStaff}
                                        onReject={setRejectTarget}
                                        onAcceptPartial={handleAcceptPartial}
                                        onDeclinePartial={handleDeclinePartial}
                                        onAssignArtist={handleAssignArtist}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

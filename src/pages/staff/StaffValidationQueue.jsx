import React, { useState, useEffect, useCallback } from "react";
import { IMAGE_BASE_URL, getImageUrl } from "../../services/api";
import {
    fetchStaffPendingValidation,
    staffSubmitValidation,
} from "../../services/customValidationAPI";

const REJECTION_REASONS = [
    "Requested material is out of stock",
    "Uploaded design resolution is too low",
    "Requested printing dimensions are not supported",
    "Printing requirements cannot be accommodated",
    "Production capacity is currently full",
    "Custom note (see below)",
];

const StatusBadge = ({ status }) => {
    const styles = {
        pending_validation:  "bg-orange-50 text-orange-700 border-orange-200",
        can_accommodate:     "bg-emerald-50 text-emerald-700 border-emerald-200",
        partially_accommodate: "bg-amber-50 text-amber-700 border-amber-200",
        cannot_accommodate:  "bg-red-50 text-red-700 border-red-200",
    };
    const labels = {
        pending_validation:  "⏳ Pending Check",
        can_accommodate:     "✅ Can Accommodate",
        partially_accommodate: "⚠️ Partially",
        cannot_accommodate:  "❌ Cannot Accommodate",
    };
    return (
        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
            {labels[status] || status}
        </span>
    );
};

// ── Staff Validation Modal ─────────────────────────────────────────────────────
const ValidationModal = ({ order, onClose, onSubmit }) => {
    const [validationStatus, setValidationStatus] = useState("can_accommodate");
    const [staffNote, setStaffNote]               = useState("");
    const [approvedQty, setApprovedQty]           = useState("");
    const [rejectionReason, setRejectionReason]   = useState(REJECTION_REASONS[0]);
    const [customRejection, setCustomRejection]   = useState("");
    const [submitting, setSubmitting]             = useState(false);

    if (!order) return null;

    const requestedQty = order.order_details?.[0]?.quantity || order.quantity || "—";
    const designUrl = order.final_design_url
        ? `${IMAGE_BASE_URL}${order.final_design_url.startsWith("/") ? order.final_design_url.slice(1) : order.final_design_url}`
        : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const finalReason = rejectionReason === "Custom note (see below)" ? customRejection : rejectionReason;
        try {
            await onSubmit(order.order_id, {
                validation_status:  validationStatus,
                staff_note:         staffNote.trim() || null,
                approved_quantity:  validationStatus === "partially_accommodate" ? parseInt(approvedQty) : null,
                rejection_reason:   validationStatus === "cannot_accommodate" ? finalReason : null,
            });
            onClose();
        } catch (err) {
            alert("Error: Failed to submit validation.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-8">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-gray-900 mb-1">Manual Feasibility Check</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                        Order #{order.order_number} — {order.name || "Customer"}
                    </p>

                    {/* Order Summary */}
                    <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
                        <p className="text-xs font-bold text-gray-700">
                            📦 Product: <span className="font-black text-gray-900">{order.order_details?.[0]?.product_name || "Custom Order"}</span>
                        </p>
                        <p className="text-xs font-bold text-gray-700">
                            🔢 Requested Qty: <span className="font-black text-gray-900">{requestedQty} pcs</span>
                        </p>
                        {order.order_details?.[0]?.size && (
                            <p className="text-xs font-bold text-gray-700">
                                📐 Size: <span className="font-black text-gray-900">{order.order_details[0].size}</span>
                            </p>
                        )}
                        {order.order_details?.[0]?.comments && order.order_details[0].comments !== "None" && (
                            <div className="mt-2 pt-2 border-t border-slate-200">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Instructions:</p>
                                <p className="text-xs text-gray-700 italic">"{order.order_details[0].comments}"</p>
                            </div>
                        )}
                        
                        {/* Customer Uploaded Design Details */}
                        {order.order_details?.[0]?.custom_design_image && (
                            <div className="pt-2 mt-2 border-t border-slate-200 space-y-2">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                    📸 Customer Reference Image:
                                </p>
                                <div className="relative group w-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition">
                                    <img
                                        src={getImageUrl(order.order_details[0].custom_design_image)}
                                        alt="Customer Reference"
                                        className="w-full h-24 object-cover cursor-zoom-in group-hover:scale-105 transition-transform"
                                        onClick={() => window.open(getImageUrl(order.order_details[0].custom_design_image), "_blank")}
                                    />
                                </div>
                            </div>
                        )}
                        {order.order_details?.[0]?.custom_design_comments && (
                            <div className="pt-2 mt-2 border-t border-slate-200">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                                    💬 Customer Request / Message:
                                </p>
                                <p className="text-xs text-slate-700 font-bold bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm leading-relaxed">
                                    "{order.order_details[0].custom_design_comments}"
                                </p>
                            </div>
                        )}

                        {designUrl && (
                            <a href={designUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 hover:underline">
                                🎨 View Uploaded Design Proof →
                            </a>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Validation Choice */}
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Your Verdict</p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: "can_accommodate",      label: "✅ Can\nAccommodate",      color: "emerald" },
                                    { value: "partially_accommodate", label: "⚠️ Partially\nAccommodate", color: "amber" },
                                    { value: "cannot_accommodate",    label: "❌ Cannot\nAccommodate",    color: "red" },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setValidationStatus(opt.value)}
                                        className={`p-3 rounded-2xl border-2 text-[10px] font-black uppercase text-center whitespace-pre-line leading-tight transition ${
                                            validationStatus === opt.value
                                                ? opt.color === "emerald" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                  : opt.color === "amber" ? "border-amber-500 bg-amber-50 text-amber-700"
                                                  : "border-red-500 bg-red-50 text-red-700"
                                                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Partial: qty input */}
                        {validationStatus === "partially_accommodate" && (
                            <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                    Available Quantity (we can produce) *
                                </label>
                                <input
                                    type="number" min="1" max={requestedQty} required
                                    value={approvedQty}
                                    onChange={e => setApprovedQty(e.target.value)}
                                    placeholder={`Max ${requestedQty}`}
                                    className="w-full p-3 border border-amber-200 rounded-xl text-xs font-bold bg-amber-50 outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>
                        )}

                        {/* Cannot: rejection reason */}
                        {validationStatus === "cannot_accommodate" && (
                            <div className="animate-in slide-in-from-top-2 duration-200 space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                    Rejection Reason *
                                </label>
                                <select
                                    value={rejectionReason}
                                    onChange={e => setRejectionReason(e.target.value)}
                                    className="w-full p-3 border border-red-200 rounded-xl text-xs font-bold bg-red-50 outline-none focus:ring-2 focus:ring-red-300"
                                >
                                    {REJECTION_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                                {rejectionReason === "Custom note (see below)" && (
                                    <textarea
                                        value={customRejection}
                                        onChange={e => setCustomRejection(e.target.value)}
                                        placeholder="Describe why the order cannot be accommodated..."
                                        rows={3}
                                        required
                                        className="w-full p-3 border border-red-200 rounded-xl text-xs font-bold bg-red-50 outline-none focus:ring-2 focus:ring-red-300 resize-none"
                                    />
                                )}
                            </div>
                        )}

                        {/* Staff note */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                Staff Note / Explanation (optional)
                            </label>
                            <textarea
                                value={staffNote}
                                onChange={e => setStaffNote(e.target.value)}
                                placeholder="e.g. Only 1 roll of Matte Vinyl left. Next restock arrives Thursday."
                                rows={2}
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting}
                                className="flex-1 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition disabled:opacity-40">
                                {submitting ? "Submitting..." : "Submit Result"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function StaffValidationQueue() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchStaffPendingValidation();
            setOrders(data);
        } catch (err) {
            console.error("Failed to load pending validations:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const handleSubmit = async (orderId, payload) => {
        await staffSubmitValidation(orderId, payload);
        const verdicts = {
            can_accommodate:      "✅ Marked as Can Accommodate!",
            partially_accommodate:"⚠️ Partial accommodation recorded.",
            cannot_accommodate:   "❌ Order marked as Cannot Accommodate.",
        };
        showToast(verdicts[payload.validation_status] || "Validation submitted.");
        await loadOrders();
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

            {/* Validation Modal */}
            {selectedOrder && (
                <ValidationModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onSubmit={handleSubmit}
                />
            )}

            <header className="mb-10">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">
                    Feasibility Check Queue
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Manually verify if custom orders can be accommodated before artist assignment
                </p>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading queue...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <h4 className="text-base font-bold text-gray-900 mb-1">Queue is Clear!</h4>
                    <p className="text-xs text-gray-400">No pending manual feasibility checks at the moment.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const firstItem  = order.order_details?.[0] || {};
                        const designUrl  = order.final_design_url
                            ? `${IMAGE_BASE_URL}${order.final_design_url.startsWith("/") ? order.final_design_url.slice(1) : order.final_design_url}`
                            : null;

                        return (
                            <div key={order.order_id}
                                className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="font-black text-gray-900 text-sm">{order.order_number}</span>
                                            <StatusBadge status={order.staff_validation_status}/>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{order.payment_method}</span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold text-gray-700">
                                                👤 Customer: <span className="font-black text-gray-900">
                                                    {order.user ? `${order.user.first_name} ${order.user.last_name}` : "N/A"}
                                                </span>
                                            </p>
                                            <p className="text-xs font-bold text-gray-700">
                                                📦 Product: <span className="font-black text-gray-900">{firstItem.product_name || "Custom Item"}</span>
                                            </p>
                                            <p className="text-xs font-bold text-gray-700">
                                                🔢 Requested Qty: <span className="font-black text-gray-900">{firstItem.quantity || "—"} pcs</span>
                                            </p>
                                            {firstItem.size && (
                                                <p className="text-xs font-bold text-gray-700">
                                                    📐 Size: <span className="font-black text-gray-900">{firstItem.size}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Customer instructions */}
                                        {firstItem.comments && firstItem.comments !== "None" && (
                                            <div className="bg-slate-50 rounded-xl p-3 mt-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Instructions</p>
                                                <p className="text-xs text-slate-700 italic">"{firstItem.comments}"</p>
                                            </div>
                                        )}

                                        {/* Customer Uploaded Design Details */}
                                        {firstItem.custom_design_image && (
                                            <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
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
                                            <div className="pt-2 mt-2 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                                                    💬 Customer Request / Message:
                                                </p>
                                                <p className="text-xs text-slate-700 font-bold bg-slate-50/50 p-3 rounded-xl border border-slate-200/60 leading-relaxed">
                                                    "{firstItem.custom_design_comments}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Design proof link */}
                                        {designUrl && (
                                            <a href={designUrl} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 hover:underline mt-1">
                                                🎨 View Design Proof →
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex-shrink-0">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="px-6 py-3.5 bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl transition shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 active:scale-95 whitespace-nowrap"
                                        >
                                            🔍 Check Feasibility
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

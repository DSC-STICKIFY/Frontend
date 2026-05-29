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
import CustomizationAPI from "../../services/CustomizationAPI";
import { FileText, Sparkles, MessageSquare, DollarSign, CheckCircle, Clock, User, Image } from "lucide-react";

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


// ── Customization Request Sub-components (V3 Flow) ────────────────────────────

// Feasibility Modal (Materials & Capacity check by Staff)
const SubmitFeasibilityModal = ({ request, onClose, onConfirm }) => {
    const [status, setStatus] = useState("can_accommodate");
    const [qty, setQty] = useState(request.quantity || 1);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(request.id, {
            validation_status: status,
            approved_quantity: status === 'partially_accommodate' ? Number(qty) : null,
            validation_notes: notes,
        });
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-indigo-600 mb-1">Feasibility Review</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Request #{request.id} • Qty: {request.quantity}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Materials & Capacity Feasibility</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none">
                            <option value="can_accommodate">✅ Can Accommodate Full</option>
                            <option value="partially_accommodate">⚠️ Partially Can Accommodate (Reduce Qty)</option>
                            <option value="cannot_accommodate">❌ Cannot Accommodate (Reject)</option>
                        </select>
                    </div>

                    {status === 'partially_accommodate' && (
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Approved Quantity</label>
                            <input type="number" value={qty} onChange={e => setQty(e.target.value)} required min="1" max={request.quantity}
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none" />
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Notes / Feasibility Explanation</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain materials compatibility, quantity limitations, etc..." rows={3} required
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none resize-none" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">Back</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">
                            {submitting ? "Submitting..." : "Submit Feasibility"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Admin Design Review Modal (Subadmin / Superadmin)
const AdminDesignReviewModal = ({ request, onClose, onConfirm }) => {
    const [action, setAction] = useState("approve");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(request.id, action, notes);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-indigo-600 mb-1">Design Review Approval</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Request #{request.id} • Admin Check</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Action Decision</label>
                        <select value={action} onChange={e => setAction(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none">
                            <option value="approve">✅ Approve design for production</option>
                            <option value="reject">❌ Reject design (send back to Artist)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Feedback / Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Provide feedback or print details..." rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none resize-none" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">Back</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">
                            {submitting ? "Submitting..." : "Submit Review"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Staff Quality Control (QC) Modal
const SubmitQCModal = ({ request, onClose, onConfirm }) => {
    const [status, setStatus] = useState("passed");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(request.id, status, notes);
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-indigo-600 mb-1">Quality Control Check</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Request #{request.id} • Order #{request.order_id}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Print QC Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none">
                            <option value="passed">✅ QC Passed (Print meets criteria)</option>
                            <option value="failed">❌ QC Failed (Needs Reprint / Redesign)</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">QC Details / Reasons</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Color accuracy, print errors, details..." rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none resize-none" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">Back</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">
                            {submitting ? "Submitting..." : "Submit QC"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Customization Card for CS Dashboard (V3 Flow)
const CustomizationCardCS = ({
    request,
    artists,
    onSendToFeasibility,
    onSubmitFeasibilityClick,
    onAssignArtist,
    onAdminReviewClick,
    onSubmitQCClick
}) => {
    const [selectedArtist, setSelectedArtist] = useState("");
    const [sendingFeasibility, setSendingFeasibility] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const getStatusLabel = (status) => {
        const map = {
            'pending_request':          { label: '📋 Pending Request',         color: 'bg-orange-50 text-orange-700 border-orange-200' },
            'pending_feasibility':      { label: '🔍 Pending Feasibility Check', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            'rejected_by_staff':        { label: '❌ Rejected by Staff/CS',     color: 'bg-red-50 text-red-700 border-red-200' },
            'partial_pending_cx':       { label: '⏳ Waiting Customer (Partial)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
            'ready_for_artist':         { label: '✅ Ready for Artist Assign',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            'assigned_to_artist':       { label: '🎨 Assigned to Artist',      color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            'quotation_sent':           { label: '💰 Quotation Sent',          color: 'bg-blue-50 text-blue-700 border-blue-200' },
            'revision_period':          { label: '🔄 Mockup Revision Period',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
            'revision_requested':       { label: '⚠️ Revision Requested',     color: 'bg-pink-50 text-pink-700 border-pink-200' },
            'design_finalized':         { label: '🔒 Design Finalized',        color: 'bg-slate-50 text-slate-700 border-slate-200' },
            'pending_design_approval':  { label: '🚨 Awaiting Admin Design Appr', color: 'bg-orange-50 text-orange-700 border-orange-200' },
            'design_approved':          { label: '🎉 Design Approved',          color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            'converted_to_order':       { label: '📦 Converted to Order',      color: 'bg-green-50 text-green-700 border-green-200' },
            'cancelled':                { label: '❌ Cancelled',               color: 'bg-red-50 text-red-700 border-red-200' },
        };
        return map[status] || { label: status, color: 'bg-gray-50 text-gray-500 border-gray-200' };
    };

    const { label, color } = getStatusLabel(request.status);
    const dateRaw = request.created_at;
    const formattedDate = dateRaw
        ? new Date(dateRaw).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Unknown Date';

    const customerName = request.customer
        ? `${request.customer.first_name || ''} ${request.customer.last_name || ''}`.trim()
        : 'Unknown';

    const artistName = request.artist
        ? `${request.artist.first_name || ''} ${request.artist.last_name || ''}`.trim()
        : null;

    const handleSendFeasibility = async () => {
        setSendingFeasibility(true);
        await onSendToFeasibility(request.id);
        setSendingFeasibility(false);
    };

    const handleAssign = async () => {
        if (!selectedArtist) return;
        setAssigning(true);
        await onAssignArtist(request.id, selectedArtist);
        setAssigning(false);
    };

    return (
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300 space-y-4 text-left">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900 text-sm">CUST-#{request.id}</span>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${color}`}>{label}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">👤 {customerName} <span className="mx-1 text-gray-300">•</span> 🕒 {formattedDate}</p>
                </div>
                {request.quotation_total && (
                    <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                        ₱{Number(request.quotation_total).toFixed(2)}
                    </span>
                )}
            </div>

            {/* Request specifications */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-bold text-gray-700">📦 Product: <span className="font-black text-gray-900">{request.product_name || request.product?.product_name || 'Custom Product'}</span></p>
                <p className="text-xs font-bold text-gray-700">🔢 Qty: <span className="font-black text-gray-900">{request.quantity} pcs</span></p>
                {request.material_type && <p className="text-xs font-bold text-gray-700">✨ Material: <span className="font-black text-gray-900">{request.material_type}</span></p>}
                {request.size_requested && <p className="text-xs font-bold text-gray-700">📐 Size: <span className="font-black text-gray-900">{request.size_requested}</span></p>}

                {request.instructions && (
                    <div className="pt-2 mt-2 border-t border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Instructions:</p>
                        <p className="text-xs text-slate-700 italic leading-relaxed whitespace-pre-line">"{request.instructions}"</p>
                    </div>
                )}

                {request.reference_image && (
                    <div className="pt-3 mt-3 border-t border-slate-200 space-y-2">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">📸 Reference Image:</p>
                        <div className="relative group w-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition">
                            <img src={getImageUrl(request.reference_image)} alt="Reference" className="w-full h-24 object-cover cursor-zoom-in group-hover:scale-105 transition-transform"
                                onClick={() => window.open(getImageUrl(request.reference_image), '_blank')} />
                        </div>
                    </div>
                )}
            </div>

            {/* Feasibility Check Details */}
            {request.validation_status && request.validation_status !== 'pending' && (
                <div className={`rounded-2xl p-4 text-xs font-bold border ${request.validation_status === 'cannot_accommodate' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Feasibility Status:</p>
                    <p>{request.validation_status === 'can_accommodate' ? '✅ Can Accommodate Full' : request.validation_status === 'partially_accommodate' ? `⚠️ Partially Accommodate (Approved Qty: ${request.approved_quantity})` : '❌ Cannot Accommodate'}</p>
                    {request.validation_notes && <p className="text-gray-500 italic mt-1 font-medium">"{request.validation_notes}"</p>}
                </div>
            )}

            {/* Quotation Breakdown Display */}
            {request.quotation && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-gray-700">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Quotation Details:</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>Material: <span className="font-black text-gray-900">₱{Number(request.quotation.material_cost).toFixed(2)}</span></div>
                        <div>Printing: <span className="font-black text-gray-900">₱{Number(request.quotation.printing_cost).toFixed(2)}</span></div>
                        <div>Design Fee: <span className="font-black text-gray-900">₱{Number(request.quotation.design_fee).toFixed(2)}</span></div>
                        <div>Additional: <span className="font-black text-gray-900">₱{Number(request.quotation.additional_charges).toFixed(2)}</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-indigo-200 font-black text-indigo-800">Total: ₱{Number(request.quotation.total).toFixed(2)}</div>
                    {request.quotation.additional_notes && <p className="text-gray-500 italic mt-1 font-medium">"{request.quotation.additional_notes}"</p>}
                </div>
            )}

            {/* Artist Assignment Display */}
            {artistName && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🎨</span>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Assigned Artist</p>
                    </div>
                    <p className="text-sm font-black text-emerald-900">{artistName}</p>
                    {request.mockup_image && (
                        <div className="pt-2">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Mockup:</p>
                            <div className="relative group w-32 rounded-xl overflow-hidden border border-emerald-100">
                                <img src={getImageUrl(request.mockup_image)} alt="Mockup" className="w-full h-24 object-cover cursor-zoom-in"
                                    onClick={() => window.open(getImageUrl(request.mockup_image), '_blank')} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Revision Details */}
            {request.revision_deadline && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-bold text-amber-800">
                    ⏰ Revision deadline: {new Date(request.revision_deadline).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {request.revision_count > 0 && <span className="ml-2 text-amber-600">({request.revision_count} revision{request.revision_count > 1 ? 's' : ''} request{request.revision_count > 1 ? 's' : ''})</span>}
                </div>
            )}

            {/* Admin Design Review Notes */}
            {request.admin_design_notes && (
                <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800">
                    📢 Admin Feedback: "{request.admin_design_notes}"
                </div>
            )}

            {/* Quality Control Details */}
            {request.qc_status && request.qc_status !== 'pending' && (
                <div className={`rounded-2xl p-4 text-xs font-bold border ${request.qc_status === 'failed' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Quality Control (QC):</p>
                    <p>{request.qc_status === 'passed' ? '✅ QC Passed' : '❌ QC Failed (Reprint required)'}</p>
                    {request.qc_notes && <p className="text-gray-500 italic mt-1 font-medium">"{request.qc_notes}"</p>}
                </div>
            )}

            {/* ── CS/Staff/Admin Action Buttons ─────────────────────────── */}
            <div className="flex gap-2 flex-wrap pt-1">

                {/* Step 1: Send request to Staff Feasibility */}
                {request.status === 'pending_request' && (
                    <button onClick={handleSendFeasibility} disabled={sendingFeasibility}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition disabled:opacity-40">
                        {sendingFeasibility ? "Sending..." : "🔍 Send to Feasibility Check"}
                    </button>
                )}

                {/* Step 2: Staff Feasibility Submission */}
                {request.status === 'pending_feasibility' && (
                    <div className="flex-1 py-3 bg-gray-50 border border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl text-center cursor-not-allowed">
                        ⏳ Waiting for Staff Feasibility Check
                    </div>
                )}

                {/* Step 3: CS Assigns Artist */}
                {request.status === 'ready_for_artist' && (
                    <div className="w-full space-y-3">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">🎨 Assign Artist</p>
                        <div className="flex gap-2">
                            <select value={selectedArtist} onChange={e => setSelectedArtist(e.target.value)}
                                className="flex-1 p-3 border border-indigo-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-300">
                                <option value="">Choose Artist...</option>
                                {artists.map(a => (
                                    <option key={a.employee_id} value={a.employee_id}>{a.first_name} {a.last_name}</option>
                                ))}
                            </select>
                            <button onClick={handleAssign} disabled={!selectedArtist || assigning}
                                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition disabled:opacity-40">
                                {assigning ? "Assigning..." : "Assign"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Admin Design Check */}
                {request.status === 'pending_design_approval' && (
                    <button onClick={() => onAdminReviewClick(request)}
                        className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">
                        🚨 Review Design
                    </button>
                )}

                {/* Step 5: Staff prints order & QC check */}
                {request.status === 'converted_to_order' && request.qc_status !== 'passed' && (
                    <button onClick={() => onSubmitQCClick(request)}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition">
                        🔬 Submit Quality Control (QC) Result
                    </button>
                )}

            </div>
        </div>
    );
};



const CustomChatModal = ({ request, onClose }) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-2xl h-[650px] p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Design Chat</h3>
                        <p className="text-xs text-gray-400 font-bold">Request #{request.id} • {request.customer?.first_name} {request.customer?.last_name}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black">✕</button>
                </div>
                <div className="flex-1 overflow-hidden">
                    {/* Render Chatbox */}
                    <div className="w-full h-full bg-slate-50 rounded-2xl overflow-hidden">
                        <iframe src={`/customer/customization-requests/${request.id}/chat-frame`} className="w-full h-full border-none hidden" />
                        <div className="p-8 text-center text-gray-400 text-xs font-bold">
                            Please use the standard Staff Inbox page or contact the assigned artist to coordinate on order designs.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CustomValidationModal = ({ request, onClose, onConfirm }) => {
    const [status, setStatus] = useState("can_accommodate");
    const [qty, setQty] = useState(request.quantity || 1);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(request.id, {
            validation_status: status,
            approved_quantity: status === 'partially_accommodate' ? Number(qty) : null,
            validation_notes: notes,
        });
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-yellow-500 mb-1">Validate Request</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Request #{request.id}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Accommodation Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none">
                            <option value="can_accommodate">✅ Can Accommodate Full</option>
                            <option value="partially_accommodate">⚠️ Partially Accommodate (Reduce Qty)</option>
                            <option value="cannot_accommodate">❌ Cannot Accommodate (Reject)</option>
                        </select>
                    </div>
                    {status === 'partially_accommodate' && (
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Approved Quantity</label>
                            <input type="number" value={qty} onChange={e => setQty(e.target.value)} required min="1" max={request.quantity}
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none" />
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Validation Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Accommodation detail notes..." rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">Back</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-4 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-yellow-600 transition disabled:opacity-40">
                            {submitting ? "Submitting..." : "Submit Validation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SendQuotationModal = ({ request, onClose, onConfirm }) => {
    const [materialCost, setMaterialCost] = useState("");
    const [printingCost, setPrintingCost] = useState("");
    const [designFee, setDesignFee] = useState("");
    const [additionalCharges, setAdditionalCharges] = useState("0");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await onConfirm(request.id, {
            material_cost: Number(materialCost),
            printing_cost: Number(printingCost),
            design_fee: Number(designFee),
            additional_charges: Number(additionalCharges),
            additional_notes: notes,
        });
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-indigo-600 mb-1">Create Quotation</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Request #{request.id} - {request.product_name || 'Custom Product'}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Material Cost (₱)</label>
                            <input type="number" step="0.01" value={materialCost} onChange={e => setMaterialCost(e.target.value)} required min="0"
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Printing Cost (₱)</label>
                            <input type="number" step="0.01" value={printingCost} onChange={e => setPrintingCost(e.target.value)} required min="0"
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Design Fee (₱)</label>
                            <input type="number" step="0.01" value={designFee} onChange={e => setDesignFee(e.target.value)} required min="0"
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Additional Charges (₱)</label>
                            <input type="number" step="0.01" value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)} min="0"
                                className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Additional Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Breakdown description or terms..." rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 outline-none resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-4 border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition">Back</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">
                            {submitting ? "Sending..." : "Send Quotation"}
                        </button>
                    </div>
                </form>
            </div>
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


    // ── Customization state ────────────────────────────────────────────────────
    const [activeView, setActiveView] = useState("standard"); // "standard" | "customizations"
    const [customizations, setCustomizations] = useState([]);
    const [feasibilityTarget, setFeasibilityTarget] = useState(null);
    const [adminReviewTarget, setAdminReviewTarget] = useState(null);
    const [qcTarget, setQcTarget] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [ordersData, artistsData] = await Promise.all([
                fetchCSValidationQueue(),
                fetchAllArtists(),
            ]);
            
            const rawOrders = Array.isArray(ordersData) ? ordersData : [];
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

    const loadCustomizations = useCallback(async () => {
        try {
            const data = await CustomizationAPI.fetchAllCustomizations();
            const raw = Array.isArray(data) ? data : (data?.data || []);
            raw.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            setCustomizations(raw);
        } catch (err) {
            console.error("Failed to load customizations:", err);
        }
    }, []);

    useEffect(() => { loadData(); loadCustomizations(); }, [loadData, loadCustomizations]);

    // Derived stats
    const stats = useMemo(() => ({
        pendingReview:    orders.filter(o => o.cs_review_status === "pending_review").length,
        sentToStaff:      orders.filter(o => o.cs_review_status === "approved_for_staff").length,
        awaitingDecision: orders.filter(o => o.cs_review_status === "pending_partial_response").length,
        readyForArtist:   orders.filter(o => o.cs_review_status === "pending_artist_assignment").length,
    }), [orders]);

    const custStats = useMemo(() => ({
        pending:      customizations.filter(c => c.status === "pending_request").length,
        feasibility:  customizations.filter(c => c.status === "pending_feasibility").length,
        approved:     customizations.filter(c => c.status === "design_approved").length,
        designing:    customizations.filter(c => ["assigned_to_artist", "quotation_sent", "revision_period", "revision_requested", "design_finalized"].includes(c.status)).length,
        pendingReview:customizations.filter(c => c.status === "pending_design_approval").length,
    }), [customizations]);

    // ── Standard Action Handlers ───────────────────────────────────────────────
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

    // ── Customization Action Handlers (V3 Flow) ────────────────────────────────
    const handleSendToFeasibility = async (id) => {
        try {
            await CustomizationAPI.sendToFeasibility(id);
            showToast("Custom request sent to Staff for feasibility check.");
            await loadCustomizations();
        } catch {
            showToast("Failed to send to feasibility.", "error");
        }
    };

    const handleCustSubmitFeasibility = async (id, data) => {
        try {
            await CustomizationAPI.submitFeasibility(id, data);
            showToast(data.validation_status === "cannot_accommodate" ? "Request rejected." : "Feasibility check saved.");
            setFeasibilityTarget(null);
            await loadCustomizations();
        } catch {
            showToast("Failed to submit feasibility check.", "error");
        }
    };

    const handleCustAssignArtist = async (id, artistId) => {
        try {
            await CustomizationAPI.assignCustomArtist(id, Number(artistId));
            showToast("🎨 Artist successfully assigned to customized design request!");
            await loadCustomizations();
        } catch {
            showToast("Failed to assign artist.", "error");
        }
    };

    const handleAdminReviewDesign = async (id, action, notes) => {
        try {
            await CustomizationAPI.adminReviewDesign(id, action, notes);
            showToast(action === "approve" ? "Design approved for production checkout." : "Feedback sent back to Artist.");
            setAdminReviewTarget(null);
            await loadCustomizations();
        } catch {
            showToast("Failed to submit design review decision.", "error");
        }
    };

    const handleCustSubmitQC = async (id, qcStatus, notes) => {
        try {
            await CustomizationAPI.submitQC(id, qcStatus, notes);
            showToast(qcStatus === "passed" ? "Quality Control passed! Order set to production completion." : "QC failed. Reprint details logged.");
            setQcTarget(null);
            await loadCustomizations();
        } catch {
            showToast("Failed to submit QC result.", "error");
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


            {/* Modals */}
            {rejectTarget && (
                <CSRejectModal order={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={handleCSReject} />
            )}
            {feasibilityTarget && (
                <SubmitFeasibilityModal request={feasibilityTarget} onClose={() => setFeasibilityTarget(null)} onConfirm={handleCustSubmitFeasibility} />
            )}
            {adminReviewTarget && (
                <AdminDesignReviewModal request={adminReviewTarget} onClose={() => setAdminReviewTarget(null)} onConfirm={handleAdminReviewDesign} />
            )}
            {qcTarget && (
                <SubmitQCModal request={qcTarget} onClose={() => setQcTarget(null)} onConfirm={handleCustSubmitQC} />
            )}

            {/* Header */}
            <header className="mb-8">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">
                    Customer Service Hub
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Review requests · coordinate with staff · assign artists
                </p>
            </header>

            {/* View Toggle */}
            <div className="flex bg-slate-200/60 p-1 rounded-2xl max-w-md mb-8">
                <button
                    onClick={() => setActiveView("standard")}
                    className={`flex-1 py-3 px-5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2
                      ${activeView === "standard" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    <FileText className="w-4 h-4" /> Standard Queue
                    {orders.length > 0 && (
                        <span className={`text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${activeView === "standard" ? "bg-yellow-400 text-black" : "bg-gray-300 text-gray-600"}`}>{orders.length}</span>
                    )}
                </button>
                <button
                    onClick={() => setActiveView("customizations")}
                    className={`flex-1 py-3 px-5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2
                      ${activeView === "customizations" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    <Sparkles className="w-4 h-4" /> Custom Products
                    {customizations.length > 0 && (
                        <span className={`text-[9px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${activeView === "customizations" ? "bg-yellow-400 text-black" : "bg-gray-300 text-gray-600"}`}>{customizations.length}</span>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Syncing queue...</p>
                </div>
            ) : activeView === "standard" ? (
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
            ) : (
                /* ── Customization Requests View ─────────────────────────────── */
                <div className="space-y-8">
                    {/* Customization Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <StatCard label="Pending Requests"  value={custStats.pending}   color="slate"   />
                        <StatCard label="Pending Feasibility" value={custStats.feasibility} color="amber"   />
                        <StatCard label="In Design"         value={custStats.designing}  color="emerald" />
                        <StatCard label="Awaiting Review"   value={custStats.pendingReview} color="indigo"  />
                        <StatCard label="Approved/Paid"     value={custStats.approved}   color="emerald" />
                    </div>

                    {/* Customization Queue */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black uppercase italic tracking-tighter text-gray-900">Customization Requests</h2>
                            <button onClick={loadCustomizations} className="text-xs font-bold text-gray-400 hover:text-gray-700 transition">↻ Refresh</button>
                        </div>

                        {customizations.length === 0 ? (
                            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-16 text-center">
                                <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                <h4 className="text-base font-bold text-gray-900 mb-1">No Customization Requests</h4>
                                <p className="text-xs text-gray-400">No customers have submitted custom product requests yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {customizations.map(cust => (
                                    <CustomizationCardCS
                                        key={cust.id}
                                        request={cust}
                                        artists={artists}
                                        onSendToFeasibility={handleSendToFeasibility}
                                        onSubmitFeasibilityClick={setFeasibilityTarget}
                                        onAssignArtist={handleCustAssignArtist}
                                        onAdminReviewClick={setAdminReviewTarget}
                                        onSubmitQCClick={setQcTarget}
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


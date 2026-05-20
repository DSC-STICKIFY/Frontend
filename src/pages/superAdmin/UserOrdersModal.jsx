import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import OrderDetailsModal from "./OrderDetailsModal";
import { IMAGE_BASE_URL } from "../../services/api";
import { fetchAllArtists, assignArtistToOrder, approveShipmentRequest, rejectShipmentRequest } from "../../services/artistOrderService";

const statusColors = {
    Pending:                      "text-orange-700 bg-orange-50 border-orange-200",
    "To Process":                 "text-orange-700 bg-orange-50 border-orange-200",
    "To Ship":                    "text-blue-700 bg-blue-50 border-blue-200",
    "To Receive":                 "text-indigo-700 bg-indigo-50 border-indigo-200",
    Shipped:                      "text-indigo-700 bg-indigo-50 border-indigo-200",
    "Item Ready":                 "text-blue-700 bg-blue-50 border-blue-200",
    Completed:                    "text-green-700 bg-green-50 border-green-200",
    Cancelled:                    "text-red-700 bg-red-50 border-red-200",
    "Return/Refund":              "text-rose-700 bg-rose-50 border-rose-200",
    Refunded:                     "text-green-700 bg-green-50 border-green-200",
    "Design In Progress":         "text-amber-700 bg-amber-50 border-amber-200",
    "In Progress":                "text-amber-700 bg-amber-50 border-amber-200",
    "Finalizing":                 "text-teal-700 bg-teal-50 border-teal-200",
    "Awaiting Shipment Approval": "text-purple-700 bg-purple-50 border-purple-200",
    "To Shipping":          "text-indigo-700 bg-indigo-50 border-indigo-200",
};

const getStatusLabel = (status) => {
    if (!status) return "N/A";
    if (status === "To Receive" || status === "Shipped" || status === "To Shipping") {
        return "Out for Delivery";
    }
    return status;
};

const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return isNaN(d.getTime())
        ? isoString
        : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const getFormattedImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith("http")) return imagePath;
    const clean = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    return `${IMAGE_BASE_URL}${clean}`;
};

// ── Flatten one order into per‑item rows ─────────────────────────────────────
const flattenOrderToItems = (order) => {
    const rows = [];
    const details = order.order_details || order.items || [];
    if (details.length === 0) {
        rows.push({
            _rowKey:               `${order.order_id}-solo`,
            order_details_id:      null,
            order_id:              order.order_id,
            order_number:          order.order_number,
            order_date:            order.order_date,
            order_status:          order.status,
            total_price:           order.total_price,
            payment_method:        order.payment_method,
            product_name:          order.product_name || "Product",
            product_image:         order.product_image || null,
            size:                  null,
            quantity:              order.quantity || 1,
            item_price:            Number(order.item_price || order.price || 0),
            subtotal:              Number(order.total_price || 0),
            item_status:           order.status,
            reviews:               order.reviews || [],
            return_status:         order.return_status || null,
            delivery_deadline:     order.delivery_deadline || null,
            return_window_seconds: order.return_window_seconds ?? null,
            return_deadline:       order.return_deadline ?? null,
            is_customizable:       order.is_customizable !== undefined ? order.is_customizable : 1,
            _originalOrder:        order,
        });
    } else {
        details.forEach((item) => {
            const product   = item.product || {};
            const unitPrice = Number(item.item_price || item.price || product.product_price || 0);
            rows.push({
                _rowKey:               `${order.order_id}-${item.order_details_id || item.id}`,
                order_details_id:      item.order_details_id || item.id || null,
                order_id:              order.order_id,
                order_number:          order.order_number,
                order_date:            order.order_date,
                order_status:          order.status,
                total_price:           order.total_price,
                payment_method:        order.payment_method,
                product_name:          item.product_name || product.product_name || "Product",
                product_image:         item.product_image || product.product_image || null,
                size:                  item.size || null,
                quantity:              item.quantity || 1,
                item_price:            unitPrice,
                subtotal:              Number(item.subtotal || (unitPrice * (item.quantity || 1))),
                item_status:           (['Awaiting Shipment Approval', 'To Shipping', 'To Receive', 'Completed', 'Cancelled', 'Return/Refund'].includes(order.status)) ? order.status : (item.status || order.status),
                reviews:               order.reviews || [],
                return_status:         item.return_status || order.return_status || null,
                delivery_deadline:     order.delivery_deadline || null,
                return_window_seconds: item.return_window_seconds ?? order.return_window_seconds ?? null,
                return_deadline:       item.return_deadline ?? order.return_deadline ?? null,
                is_customizable:       item.is_customizable !== undefined ? item.is_customizable : (product.is_customizable !== undefined ? product.is_customizable : 1),
                _originalOrder:        order,
            });
        });
    }
    return rows;
};

// ── Admin Return Window Countdown ─────────────────────────────────────────────
// Shows the admin how much return window the customer has left.
// Base time = delivery_deadline (same logic as the customer side).
const AdminReturnWindowBadge = ({ row }) => {
    const [secsLeft, setSecsLeft] = React.useState(null);

    React.useEffect(() => {
        const getDeadline = () => {
            if (row.return_deadline) return new Date(row.return_deadline);
            const windowSecs = row.return_window_seconds ?? null;
            if (!windowSecs) return null;
            const base = row.delivery_deadline || null;
            if (!base) return null;
            return new Date(new Date(base).getTime() + windowSecs * 1000);
        };

        const tick = () => {
            const dl = getDeadline();
            if (!dl) { setSecsLeft(null); return; }
            setSecsLeft(Math.max(0, Math.floor((dl - Date.now()) / 1000)));
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [row.return_deadline, row.return_window_seconds, row.delivery_deadline]);

    if (secsLeft === null) return null;

    const d = Math.floor(secsLeft / 86400);
    const h = Math.floor((secsLeft % 86400) / 3600);
    const m = Math.floor((secsLeft % 3600) / 60);
    const s = secsLeft % 60;

    const expired = secsLeft === 0;
    const urgent  = secsLeft > 0 && secsLeft < 3600;
    const mid     = secsLeft > 0 && secsLeft < 21600;

    let label;
    if (expired)   label = "Return window closed";
    else if (d >= 1) label = `${d} ${d === 1 ? 'day' : 'days'} left`;
    else if (h >= 1) label = `${h} ${h === 1 ? 'hour' : 'hours'} left`;
    else if (m >= 1) label = `${m} ${m === 1 ? 'minute' : 'minutes'} left`;
    else             label = `${s} ${s === 1 ? 'second' : 'seconds'} left`;

    const colorClass = expired
        ? "bg-gray-100 text-gray-400 border-gray-200"
        : urgent
            ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
            : mid
                ? "bg-orange-50 text-orange-600 border-orange-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200";

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border whitespace-nowrap ${colorClass}`}>
            ⏱ {label}
        </span>
    );
};

// ── Product cell ─────────────────────────────────────────────────────────────
const ProductCell = ({ row }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl       = getFormattedImageUrl(row.product_image);
    const showPlaceholder = !imageUrl || imgError;

    return (
        <div className="flex items-center gap-2">
            {showPlaceholder ? (
                <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
            ) : (
                <img src={imageUrl} alt={row.product_name}
                    className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                    onError={() => setImgError(true)}/>
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{row.product_name}</p>
                {row.size     && <p className="text-[10px] text-gray-400">Size: {row.size}</p>}
                {row.quantity > 1 && <p className="text-[10px] text-gray-400">x{row.quantity}</p>}
                {row._originalOrder?.final_design_url && (
                    <a 
                        href={`${IMAGE_BASE_URL}${row._originalOrder.final_design_url.startsWith('/') ? row._originalOrder.final_design_url.slice(1) : row._originalOrder.final_design_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 hover:underline transition"
                        onClick={e => e.stopPropagation()}
                    >
                        🎨 View Design Proof
                    </a>
                )}
            </div>
        </div>
    );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((type, message, duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);
    const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    return { toasts, addToast, removeToast };
};

const ToastStack = ({ toasts, removeToast }) => {
    const styles = {
        success: { text: "text-green-700", bg: "bg-green-50 border-green-200",  icon: "✓" },
        error:   { text: "text-red-700",   bg: "bg-red-50 border-red-200",      icon: "✕" },
        info:    { text: "text-blue-700",  bg: "bg-blue-50 border-blue-200",    icon: "ℹ" },
    };
    if (toasts.length === 0) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => {
                const s = styles[toast.type] || styles.info;
                return (
                    <div key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-xl min-w-[300px] max-w-sm ${s.bg} border-[#DCDCDC] animate-in slide-in-from-right-5 duration-300`}
                    >
                        <span className={`text-base font-black flex-shrink-0 ${s.text}`}>{s.icon}</span>
                        <p className={`text-sm font-bold flex-1 ${s.text}`}>{toast.message}</p>
                        <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-900 text-xl leading-none flex-shrink-0 transition-colors">×</button>
                    </div>
                );
            })}
        </div>
    );
};

// ── Confirm dialog ───────────────────────────────────────────────────────────
const useConfirm = () => {
    const [dialog, setDialog] = useState(null);
    const resolverRef = useRef(null);
    const confirm = useCallback((options) =>
        new Promise(resolve => { resolverRef.current = resolve; setDialog(options); }), []);
    const handleConfirm = useCallback(() => { resolverRef.current?.(true);  setDialog(null); }, []);
    const handleCancel  = useCallback(() => { resolverRef.current?.(false); setDialog(null); }, []);
    return { dialog, confirm, handleConfirm, handleCancel };
};

const ConfirmDialog = ({ dialog, onConfirm, onCancel }) => {
    if (!dialog) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5">
                <p className="font-bold text-gray-900 text-sm mb-1">{dialog.title}</p>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{dialog.message}</p>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition">Cancel</button>
                    <button onClick={onConfirm} className={`flex-1 py-2 rounded-lg text-white text-xs font-semibold transition ${dialog.danger ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                        {dialog.confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Artist Assignment Modal ──────────────────────────────────────────────────
const ArtistAssignmentModal = ({ isOpen, onClose, onAssign, artists }) => {
    const [selectedArtist, setSelectedArtist] = useState("");
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
                <h3 className="font-black italic uppercase tracking-tighter text-xl mb-2">Assign Artist</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Select an artist for this order</p>
                
                <select 
                    value={selectedArtist} 
                    onChange={e => setSelectedArtist(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-yellow-400/20 mb-6"
                >
                    <option value="">Select Artist...</option>
                    {artists.map(artist => (
                        <option key={artist.employee_id ?? artist.artist_id ?? artist.user_id} value={artist.employee_id ?? artist.artist_id ?? artist.user_id}>
                            {artist.first_name} {artist.last_name}
                        </option>
                    ))}
                </select>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition">Cancel</button>
                    <button 
                        onClick={() => onAssign(selectedArtist)} 
                        disabled={!selectedArtist}
                        className="flex-1 py-4 rounded-xl bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 transition disabled:opacity-40"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Cancellation Modal ──────────────────────────────────────────────────────
const CancellationModal = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
                <h3 className="font-black italic uppercase tracking-tighter text-xl mb-2 text-red-600">Cancel Order</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Please provide a reason for cancellation</p>
                
                <textarea 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason (e.g. Out of stock, Customer requested)..."
                    className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-red-400/20 mb-6 resize-none h-32"
                />

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition">Back</button>
                    <button 
                        onClick={() => onConfirm(reason)} 
                        disabled={!reason.trim()}
                        className="flex-1 py-4 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition disabled:opacity-40"
                    >
                        Cancel Order
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Shipment Rejection Modal ──────────────────────────────────────────────────
const ShipmentRejectionModal = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}>
                <h3 className="font-black italic uppercase tracking-tighter text-xl mb-2 text-red-600">Reject Shipment</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Please provide a reason for rejecting this shipment request</p>
                
                <textarea 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    placeholder="Reason (e.g. Design dimensions incorrect, Missing required details)..."
                    className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-bold bg-gray-50 outline-none focus:ring-4 focus:ring-red-400/20 mb-6 resize-none h-32"
                />

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition">Back</button>
                    <button 
                        onClick={() => { onConfirm(reason); setReason(""); }} 
                        disabled={!reason.trim()}
                        className="flex-1 py-4 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition disabled:opacity-40"
                    >
                        Reject Shipment
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Star display ──────────────────────────────────────────────────────────────
const StarDisplay = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(s => (
            <svg key={s} className={`w-3.5 h-3.5 ${s <= rating ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
        ))}
        <span className="text-[10px] font-semibold text-gray-600 ml-1">{rating}/5</span>
    </div>
);

// ── Admin Reply Box ───────────────────────────────────────────────────────────
const AdminReplyBox = ({ orderId, reviewId, existingReply, onSubmitReply }) => {
    const [editing, setEditing]       = useState(false);
    const [replyText, setReplyText]   = useState(existingReply || "");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { if (!editing) setReplyText(existingReply || ""); }, [existingReply, editing]);

    const handleSubmit = async () => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try { await onSubmitReply(orderId, reviewId, replyText.trim()); setEditing(false); }
        catch { /* toasted upstream */ }
        finally { setSubmitting(false); }
    };

    if (existingReply && !editing) return (
        <div className="mt-2 rounded-xl bg-blue-50 border border-blue-100 p-3 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Admin Reply</span>
                <button onClick={() => setEditing(true)} className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">Edit</button>
            </div>
            <p className="text-xs text-gray-700">{existingReply}</p>
        </div>
    );

    return (
        <div className="mt-2 rounded-xl border border-blue-200 bg-white p-3 shadow-sm space-y-2">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{existingReply ? "Edit Reply" : "Reply to Customer"}</p>
            <textarea rows={2} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply..."
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 transition"/>
            <div className="flex gap-2">
                {existingReply && <button onClick={() => { setReplyText(existingReply); setEditing(false); }} className="flex-1 py-1.5 text-[10px] font-semibold border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">Cancel</button>}
                <button onClick={handleSubmit} disabled={!replyText.trim() || submitting}
                    className="flex-1 py-2.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-100 active:scale-95 disabled:opacity-40">
                    {submitting ? "Processing..." : "Submit Reply"}
                </button>
            </div>
        </div>
    );
};

// ── Review cell ───────────────────────────────────────────────────────────────
const ReviewsCell = ({ row, onReplyToReview }) => {
    const reviews = row.reviews || [];
    if (reviews.length === 0) return <span className="text-xs text-gray-300">No review yet</span>;

    return (
        <div className="space-y-3">
            {reviews.map((review, idx) => (
                <div key={review.id || idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
                    
                    {/* Multi-Dimensional Feedback Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        
                        {/* 1. Product Feedback */}
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">🏷️ Product Quality</span>
                                <StarDisplay rating={review.rating || 0}/>
                                {review.comment ? (
                                    <p className="text-xs text-slate-600 italic mt-1.5 leading-relaxed">"{review.comment}"</p>
                                ) : (
                                    <p className="text-[11px] text-slate-300 italic mt-1.5">No comment left</p>
                                )}
                            </div>
                        </div>

                        {/* 2. Artist Feedback */}
                        <div className="bg-amber-50/20 rounded-xl p-3 border border-amber-100/50 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block mb-1">🎨 Artist Collaboration</span>
                                {review.artist_rating ? (
                                    <>
                                        <StarDisplay rating={review.artist_rating}/>
                                        {review.artist_comment ? (
                                            <p className="text-xs text-amber-800 italic mt-1.5 leading-relaxed">"{review.artist_comment}"</p>
                                        ) : (
                                            <p className="text-[11px] text-amber-500/50 italic mt-1.5">Rated without comment</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[11px] text-slate-300 italic mt-1.5">No rating left</p>
                                )}
                            </div>
                        </div>

                        {/* 3. Rider Feedback (J&T Express) */}
                        <div className="bg-indigo-50/20 rounded-xl p-3 border border-indigo-100/50 flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block mb-1">🚚 Delivery (J&T Rider)</span>
                                {review.rider_rating ? (
                                    <>
                                        <StarDisplay rating={review.rider_rating}/>
                                        {review.rider_comment ? (
                                            <p className="text-xs text-indigo-800 italic mt-1.5 leading-relaxed">"{review.rider_comment}"</p>
                                        ) : (
                                            <p className="text-[11px] text-indigo-500/50 italic mt-1.5">Rated without comment</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-[11px] text-slate-300 italic mt-1.5">No rating left</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Admin Reply Section (stays attached to product review) */}
                    <div className="pt-2 border-t border-slate-100">
                        <AdminReplyBox
                            orderId={row.order_id}
                            reviewId={review.id}
                            existingReply={review.admin_reply}
                            onSubmitReply={onReplyToReview}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Return/Refund status cell ─────────────────────────────────────────────────
const ReturnRefundStatusCell = ({ row }) => {
    const returnStatus = row.return_status || "pending";
    const badges = {
        pending:  { label: "Pending Review", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-400" },
        approved: { label: "Approved",        bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  dot: "bg-green-500"  },
        rejected: { label: "Rejected",        bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-400"    },
    };
    const badge = badges[returnStatus] || badges.pending;

    return (
        <div className="space-y-1.5">
            <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-semibold border uppercase ${statusColors[row.item_status] || "text-gray-600 bg-gray-100"}`}>
                {getStatusLabel(row.item_status)}
            </span>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}/>
                {badge.label}
            </div>
            <p className="text-[10px] text-rose-500 font-medium italic">Manage in Return &amp; Refund tab</p>
        </div>
    );
};

// ── Out for Delivery button ───────────────────────────────────────────────────
const OutForDeliveryButton = ({ row, confirm, handleOutForDelivery, updateItemLocally, addToast }) => {
    const [showInput, setShowInput]       = useState(false);
    const [trackingNum, setTrackingNum]   = useState("");
    const [deliveryDays, setDeliveryDays] = useState(5);
    const [useMinutes, setUseMinutes]     = useState(false);
    const [deliveryMins, setDeliveryMins] = useState(2);
    const [submitting, setSubmitting]     = useState(false);
    const { order_id, order_details_id }  = row;

    const handleSubmit = async () => {
        if (!trackingNum.trim()) return;
        const label = useMinutes ? `${deliveryMins} minute(s)` : `${deliveryDays} day(s)`;
        const ok = await confirm({
            title: "Out for Delivery",
            message: `Mark "${row.product_name}" as out for delivery? Deadline: ${label}.`,
            confirmLabel: "Confirm",
            danger: false,
        });
        if (!ok) return;
        setSubmitting(true);
        try {
            await handleOutForDelivery(order_id, order_details_id, trackingNum.trim(),
                useMinutes ? 0 : deliveryDays, useMinutes ? deliveryMins : 0);
            updateItemLocally(order_id, order_details_id, "To Receive");
            addToast("success", `"${row.product_name}" is out for delivery.`);
            setShowInput(false); setTrackingNum("");
        } catch { addToast("error", "Failed to update."); }
        finally { setSubmitting(false); }
    };

    if (!showInput) {
        return (
            <button onClick={e => { e.stopPropagation(); setShowInput(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition">
                Out for Delivery
            </button>
        );
    }

    return (
        <div className="flex flex-col gap-1.5 min-w-[190px]" onClick={e => e.stopPropagation()}>
            <p className="text-[10px] font-semibold text-gray-600">J&T Tracking Number</p>
            <input type="text" value={trackingNum} onChange={e => setTrackingNum(e.target.value)}
                placeholder="e.g. 1234567890123"
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full"
                autoFocus/>
            <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] font-semibold text-gray-600">Deadline</p>
                <div className="flex items-center gap-1">
                    <button onClick={() => setUseMinutes(false)}
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition ${!useMinutes ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                        Days
                    </button>
                    <button onClick={() => setUseMinutes(true)}
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition ${useMinutes ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                        Mins 🧪
                    </button>
                </div>
            </div>
            {!useMinutes && (
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setDeliveryDays(d => Math.max(1, d - 1))}
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm font-bold transition">−</button>
                    <span className="flex-1 text-center text-xs font-semibold text-gray-800">{deliveryDays} day{deliveryDays !== 1 ? "s" : ""}</span>
                    <button onClick={() => setDeliveryDays(d => Math.min(30, d + 1))}
                        className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm font-bold transition">+</button>
                </div>
            )}
            {useMinutes && (
                <div className="flex items-center gap-1.5">
                    <button onClick={() => setDeliveryMins(d => Math.max(1, d - 1))}
                        className="w-7 h-7 rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 text-sm font-bold transition">−</button>
                    <span className="flex-1 text-center text-xs font-semibold text-orange-700">{deliveryMins} min{deliveryMins !== 1 ? "s" : ""}</span>
                    <button onClick={() => setDeliveryMins(d => Math.min(60, d + 1))}
                        className="w-7 h-7 rounded-lg border border-orange-200 text-orange-500 hover:bg-orange-50 text-sm font-bold transition">+</button>
                </div>
            )}
            <div className="flex gap-1 mt-1">
                <button onClick={() => { setShowInput(false); setTrackingNum(""); setDeliveryDays(5); setUseMinutes(false); }}
                    className="flex-1 py-1.5 text-[10px] font-semibold border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition">
                    Cancel
                </button>
                <button onClick={handleSubmit} disabled={!trackingNum.trim() || submitting}
                    className="flex-1 py-1.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-40">
                    {submitting ? "Saving..." : "Confirm"}
                </button>
            </div>
        </div>
    );
};

// ── Deadline badge (changed: button → label when deadline passed) ─────────────
const DeadlineBadge = ({ row, confirm, handleCompleteOrder, updateItemLocally, addToast }) => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const iv = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    const deadline       = row.delivery_deadline ? new Date(row.delivery_deadline) : null;
    const deadlinePassed = deadline ? now > deadline : false;
    const deadlineLabel  = deadline
        ? deadline.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : null;

    if (!deadlinePassed) {
        return (
            <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg whitespace-nowrap">
                    🚚 Awaiting Delivery
                </span>
                {deadlineLabel && (
                    <span className="text-[9px] font-medium px-2 py-1 rounded-lg text-center border bg-gray-50 text-gray-400 border-gray-200">
                        📅 Due by {deadlineLabel}
                    </span>
                )}
            </div>
        );
    }

    // --- REPLACED BUTTON WITH LABEL ---
    return (
        <div className="flex flex-col gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded-lg whitespace-nowrap">
                ⏳ Not yet marked as received
            </span>
            {deadlineLabel && (
                <span className="text-[9px] font-medium px-2 py-1 rounded-lg text-center border bg-red-50 text-red-500 border-red-200">
                    ⚠️ Delivery deadline passed
                </span>
            )}
            {/* Return window countdown for admin — starts when delivery deadline passes */}
            <AdminReturnWindowBadge row={row} />
        </div>
    );
};

// ── Single item row (inside the accordion) ───────────────────────────────────
const ItemRow = ({ row, statusFilter, renderActionButtons, onReplyToReview, onViewDetails }) => {
    const showRating   = ["Reviews", "Completed", "All"].includes(statusFilter);
    const showReturn   = statusFilter === "Return/Refund";
    const showAction   = !["Reviews", "Return/Refund"].includes(statusFilter);

    return (
        <tr className="hover:bg-gray-50/60 transition cursor-pointer border-b border-gray-100 last:border-0"
            onClick={() => onViewDetails(row._originalOrder)}>
            {/* Item */}
            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <ProductCell row={row}/>
            </td>

            {/* Price */}
            <td className="px-4 py-3 font-semibold text-gray-800 text-sm whitespace-nowrap">
                ₱{Number(row.subtotal || 0).toLocaleString("en-PH")}
            </td>

            {/* Status */}
            <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border uppercase ${statusColors[row.item_status] || "text-gray-600 bg-gray-100"}`}>
                    {getStatusLabel(row.item_status)}
                </span>
            </td>

            {/* Review (conditional) */}
            {showRating && (
                <td className="px-4 py-3 min-w-[220px] max-w-[280px]" onClick={e => e.stopPropagation()}>
                    <ReviewsCell row={row} onReplyToReview={onReplyToReview}/>
                </td>
            )}

            {/* Return status (conditional) */}
            {showReturn && (
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <ReturnRefundStatusCell row={row}/>
                </td>
            )}

            {/* Action (conditional) */}
            {showAction && (
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    {renderActionButtons(row)}
                </td>
            )}
        </tr>
    );
};

// ── OrderAccordion (status badge removed from header) ───────────────────────
const OrderAccordion = ({
    order,
    defaultOpen = false,
    statusFilter,
    renderActionButtons,
    onReplyToReview,
    onViewDetails,
    ordersState,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    const liveOrder = useMemo(
        () => ordersState.find(o => o.order_id === order.order_id) || order,
        [ordersState, order],
    );

    const itemRows    = useMemo(() => flattenOrderToItems(liveOrder), [liveOrder]);
    const itemCount   = itemRows.length;
    const reviewCount = (liveOrder.reviews || []).length;

    const showRating = ["Reviews", "Completed", "All"].includes(statusFilter);
    const showReturn = statusFilter === "Return/Refund";
    const showAction = !["Reviews", "Return/Refund"].includes(statusFilter);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
            {/* Accordion header – status badge removed */}
            <button
                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition text-left"
                onClick={() => setOpen(v => !v)}>
                <div className="flex items-center gap-3 min-w-0">
                    <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>

                    <div className="min-w-0">
                        <span className="font-bold text-gray-900 text-sm">
                            {liveOrder.order_number || `#${liveOrder.order_id}`}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{formatDate(liveOrder.order_date)}</span>
                    </div>

                    {/* Status badge: REMOVED – now only visible inside per‑item table */}

                    {reviewCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">
                            💬 {reviewCount} review{reviewCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <span className="text-xs text-gray-500">
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                    </span>
                    <span className="font-bold text-gray-800 text-sm">
                        ₱{Number(liveOrder.total_price || 0).toLocaleString("en-PH")}
                    </span>
                    <span className="text-[10px] text-gray-400 capitalize">
                        {liveOrder.payment_method || ""}
                    </span>
                </div>
            </button>

            {/* Accordion body – unchanged */}
            {open && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-500">Item</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-500">Price</th>
                                <th className="px-4 py-2 text-xs font-semibold text-gray-500">Status</th>
                                {showRating && <th className="px-4 py-2 text-xs font-semibold text-gray-500 min-w-[220px]">Review</th>}
                                {showReturn && <th className="px-4 py-2 text-xs font-semibold text-gray-500 min-w-[200px]">Return Status</th>}
                                {showAction && <th className="px-4 py-2 text-xs font-semibold text-gray-500 text-center">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {itemRows.map(row => (
                                <ItemRow
                                    key={row._rowKey}
                                    row={row}
                                    statusFilter={statusFilter}
                                    renderActionButtons={renderActionButtons}
                                    onReplyToReview={onReplyToReview}
                                    onViewDetails={onViewDetails}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const UserOrdersModal = ({ user, statusFilter = "All", onClose, onRefresh, actions }) => {
    const [ordersState, setOrdersState]     = useState(() => user?.orders || []);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [acceptingAll, setAcceptingAll]   = useState(false);
    
    // Artist assignment state
    const [artists, setArtists] = useState([]);
    const [assigningOrder, setAssigningOrder] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Cancellation state
    const [cancellingOrder, setCancellingOrder] = useState(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    // Shipment rejection state
    const [rejectingOrder, setRejectingOrder] = useState(null);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    useEffect(() => {
        const loadArtists = async () => {
            try {
                // In a real app, you'd have a specific endpoint for artists. 
                // Using fetchAllArtists which calls /all_employees for now.
                const data = await fetchAllArtists();
                // Filter if needed, or assume backend returns correct list
                setArtists(Array.isArray(data) ? data : data.employees || []);
            } catch (err) {
                console.error("Failed to load artists", err);
            }
        };
        loadArtists();
    }, []);

    useEffect(() => { setOrdersState(user?.orders || []); }, [user?.orders]);

    const { toasts, addToast, removeToast } = useToast();
    const { dialog, confirm, handleConfirm, handleCancel: onConfirmCancel } = useConfirm();

    if (!user) return null;

    const {
        handleAcceptOrder,
        handleShipOrder,
        handleOutForDelivery,
        handleCompleteOrder,
        handleCancelOrder,
        handleAdminReply,
    } = actions;

    // ── Optimistic updates ────────────────────────────────────────────────────
    const updateItemLocally = useCallback((orderId, orderDetailsId, newStatus) => {
        setOrdersState(prev => prev.map(order => {
            if (order.order_id !== orderId) return order;
            const details = order.order_details || order.items || [];
            if (details.length === 0) return { ...order, status: newStatus };
            const updated = details.map(item => {
                const id = item.order_details_id || item.id;
                return id === orderDetailsId ? { ...item, status: newStatus } : item;
            });
            const uniqueStatuses = [...new Set(updated.map(i => i.status))];
            const parentStatus   = uniqueStatuses.length === 1 ? uniqueStatuses[0] : order.status;
            return { ...order, status: parentStatus, order_details: updated, items: updated };
        }));
    }, []);

    const updateOrderReply = useCallback((orderId, reviewId, reply) => {
        setOrdersState(prev => prev.map(o => {
            if (o.order_id !== orderId) return o;
            const updatedReviews = (o.reviews || []).map(r => r.id === reviewId ? { ...r, admin_reply: reply } : r);
            return { ...o, reviews: updatedReviews };
        }));
    }, []);

    // ── Accept All ────────────────────────────────────────────────────────────
    const pendingItemRows = useMemo(() => {
        return ordersState.flatMap(order => flattenOrderToItems(order)).filter(r => r.item_status === "Pending");
    }, [ordersState]);

    const handleAcceptAll = useCallback(async () => {
        if (pendingItemRows.length === 0) { addToast("info", "No pending items to accept."); return; }
        const ok = await confirm({
            title: "Accept all pending",
            message: `Accept ${pendingItemRows.length} pending item${pendingItemRows.length !== 1 ? "s" : ""} for ${user.name}?`,
            confirmLabel: "Accept all",
            danger: false,
        });
        if (!ok) return;
        setAcceptingAll(true);
        let count = 0;
        for (const row of pendingItemRows) {
            try {
                await handleAcceptOrder(row.order_id, row.order_details_id);
                updateItemLocally(row.order_id, row.order_details_id, "To Process");
                count++;
            } catch { addToast("error", `Failed to accept "${row.product_name}".`); }
        }
        setAcceptingAll(false);
        if (count > 0) addToast("success", `${count} item${count !== 1 ? "s" : ""} accepted.`);
    }, [pendingItemRows, addToast, confirm, user.name, handleAcceptOrder, updateItemLocally]);

    const onReplyToReview = useCallback(async (orderId, reviewId, replyText) => {
        try {
            await handleAdminReply(orderId, reviewId, replyText);
            updateOrderReply(orderId, reviewId, replyText);
            addToast("success", "Reply sent!");
        } catch {
            addToast("error", "Failed to send reply.");
            throw new Error("Reply failed");
        }
    }, [handleAdminReply, updateOrderReply, addToast]);

    const handleAssignArtist = async (artistId) => {
        if (!assigningOrder || !artistId) return;
        try {
            await assignArtistToOrder(assigningOrder.order_id, artistId);
            
            // Optimistic update
            setOrdersState(prev => prev.map(o => 
                o.order_id === assigningOrder.order_id 
                    ? { ...o, artist_id: artistId } 
                    : o
            ));

            addToast("success", "Artist assigned successfully.");
            setIsAssignModalOpen(false);
            onRefresh(); // Still refresh to sync with backend
        } catch (err) {
            addToast("error", "Failed to assign artist.");
        }
    };

    const handleConfirmCancelOrder = async (reason) => {
        if (!cancellingOrder) return;
        try {
            await handleCancelOrder(cancellingOrder.order_id, cancellingOrder.order_details_id, reason);
            updateItemLocally(cancellingOrder.order_id, cancellingOrder.order_details_id, "Cancelled");
            addToast("info", "Order cancelled successfully.");
            setIsCancelModalOpen(false);
            onRefresh();
        } catch (err) {
            addToast("error", "Failed to cancel order.");
        }
    };

    const handleConfirmRejectShipment = async (reason) => {
        if (!rejectingOrder) return;
        try {
            await rejectShipmentRequest(rejectingOrder.order_id, reason);
            updateItemLocally(rejectingOrder.order_id, rejectingOrder.order_details_id, "Design In Progress");
            addToast("info", "Shipment request rejected. Artist has been notified.");
            setIsRejectModalOpen(false);
            onRefresh();
        } catch (err) {
            addToast("error", "Failed to reject shipment request.");
        }
    };

    // ── Action Buttons (Mark Delivered button replaced with label) ────────────
    const renderActionButtons = useCallback((row) => {
        const { order_id, order_details_id, item_status } = row;

        if (item_status === "Return/Refund" || item_status === "Refunded") {
            return (
                <span className="text-[10px] text-rose-500 font-semibold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    See Return &amp; Refund tab
                </span>
            );
        }

        switch (item_status) {
            case "Pending":
                return (
                    <div className="flex gap-1.5 justify-center flex-wrap">
                        <button onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({ title: "Accept item", message: `Accept "${row.product_name}"?`, confirmLabel: "Accept", danger: false });
                            if (!ok) return;
                            try { await handleAcceptOrder(order_id, order_details_id); updateItemLocally(order_id, order_details_id, "To Process"); addToast("success", `"${row.product_name}" accepted.`); }
                            catch { addToast("error", "Failed to accept item."); }
                        }} className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition">
                            Accept
                        </button>
                        <button onClick={async (e) => {
                            e.stopPropagation();
                            setCancellingOrder(row);
                            setIsCancelModalOpen(true);
                        }} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition">
                            Cancel
                        </button>
                    </div>
                );

            case "To Process": {
                const isCustomizable = row.is_customizable !== 0 && 
                                       row.is_customizable !== false && 
                                       row.is_customizable !== "0" && 
                                       row.is_customizable !== null && 
                                       row.is_customizable !== undefined;
                return (
                    <div className="flex gap-1.5 justify-center items-center flex-wrap">
                        {isCustomizable ? (
                            row._originalOrder.artist_id ? (
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                        Assigned ✓
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setAssigningOrder(row._originalOrder); setIsAssignModalOpen(true); }}
                                        className="text-[9px] font-bold text-gray-400 hover:text-black underline uppercase"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); setAssigningOrder(row._originalOrder); setIsAssignModalOpen(true); }}
                                    className="bg-yellow-400 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition shadow-sm">
                                    Assign Artist
                                </button>
                            )
                        ) : (
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200 select-none">
                                Ready Made
                            </span>
                        )}
                        
                        <button onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({ title: "Ship item", message: `Mark "${row.product_name}" as To Ship?`, confirmLabel: "Ship", danger: false });
                            if (!ok) return;
                            try { await handleShipOrder(order_id, order_details_id); updateItemLocally(order_id, order_details_id, "To Ship"); addToast("success", `"${row.product_name}" → To Ship.`); }
                            catch { addToast("error", "Failed to ship."); }
                        }} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition">
                            Ship
                        </button>
                    </div>
                );
            }

            case "To Shipping":
            case "To Ship":
                return (
                    <OutForDeliveryButton
                        row={row}
                        confirm={confirm}
                        handleOutForDelivery={handleOutForDelivery}
                        updateItemLocally={updateItemLocally}
                        addToast={addToast}
                    />
                );

            case "To Receive":
            case "Shipped":
                return (
                    <DeadlineBadge
                        row={row}
                        confirm={confirm}
                        handleCompleteOrder={handleCompleteOrder}
                        updateItemLocally={updateItemLocally}
                        addToast={addToast}
                    />
                );

            case "Awaiting Shipment Approval":
                return (
                    <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100 text-center">
                            Shipment Requested
                        </span>
                        {row._originalOrder.shipment_note && (
                            <p className="text-[9px] text-gray-400 italic max-w-[150px] truncate" title={row._originalOrder.shipment_note}>
                                Note: {row._originalOrder.shipment_note}
                            </p>
                        )}
                        <div className="flex gap-1.5">
                            <button onClick={async (e) => {
                                e.stopPropagation();
                                const ok = await confirm({ title: "Approve Shipment", message: `Approve shipment for "${row.product_name}"? This will move it to "To Ship".`, confirmLabel: "Approve", danger: false });
                                if (!ok) return;
                                try { 
                                    await approveShipmentRequest(row.order_id); 
                                    updateItemLocally(row.order_id, row.order_details_id, "To Ship"); 
                                    addToast("success", "Shipment request approved."); 
                                    onRefresh();
                                }
                                catch { addToast("error", "Failed to approve shipment."); }
                            }} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition shadow-md whitespace-nowrap">
                                Confirm Shipment
                            </button>
                            <button onClick={(e) => {
                                e.stopPropagation();
                                setRejectingOrder(row);
                                setIsRejectModalOpen(true);
                            }} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition shadow-md whitespace-nowrap">
                                Reject
                            </button>
                        </div>
                    </div>
                );

            case "Item Ready":
                // --- REPLACED BUTTON WITH LABEL ---
                return (
                    <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 rounded-lg whitespace-nowrap">
                            ⏳ Not yet marked as received
                        </span>
                        <span className="text-[9px] font-medium px-2 py-1 rounded-lg text-center border bg-yellow-50 text-yellow-600 border-yellow-200">
                            📦 Awaiting customer confirmation
                        </span>
                    </div>
                );

            case "Cancelled":
                return <span className="inline-block px-3 py-1 text-[10px] font-semibold bg-red-100 text-red-600 rounded-lg">Cancelled</span>;

            case "Completed":
                return (
                    <div className="flex flex-col gap-1.5 items-center">
                        <span className="inline-block px-3 py-1 text-[10px] font-semibold bg-green-100 text-green-700 rounded-lg">Completed ✓</span>
                        {/* Return window countdown — shows how long customer can still request a return */}
                        <AdminReturnWindowBadge row={row} />
                    </div>
                );

            default:
                return <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">—</span>;
        }
    }, [confirm, handleAcceptOrder, handleCancelOrder, handleShipOrder, handleOutForDelivery, handleCompleteOrder, addToast, updateItemLocally]);

    // Total item count across all orders
    const totalItemCount = useMemo(
        () => ordersState.reduce((sum, o) => {
            const details = o.order_details || o.items || [];
            return sum + (details.length > 0 ? details.length : 1);
        }, 0),
        [ordersState],
    );

    return (
        <>
            <ToastStack toasts={toasts} removeToast={removeToast}/>

            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-300"
                onClick={e => e.target === e.currentTarget && onClose()}>
                <ArtistAssignmentModal 
                    isOpen={isAssignModalOpen} 
                    onClose={() => setIsAssignModalOpen(false)} 
                    onAssign={handleAssignArtist}
                    artists={artists}
                />
                <ConfirmDialog dialog={dialog} onConfirm={handleConfirm} onCancel={onConfirmCancel}/>

                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="p-6 flex justify-between items-center border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Orders for {user.name}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {user.email} • {user.contact} •{" "}
                                {ordersState.length} order{ordersState.length !== 1 ? "s" : ""},{" "}
                                {totalItemCount} item{totalItemCount !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">
                        {(statusFilter === "All" || statusFilter === "Pending") && pendingItemRows.length > 0 && (
                            <div className="flex justify-end mb-4">
                                <button onClick={handleAcceptAll} disabled={acceptingAll}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg transition disabled:opacity-50">
                                    {acceptingAll ? "Accepting..." : `Accept all pending (${pendingItemRows.length})`}
                                </button>
                            </div>
                        )}

                        {ordersState.length === 0 ? (
                            <p className="text-center py-12 text-gray-400 text-sm">No orders found.</p>
                        ) : (
                            ordersState.map((order, idx) => (
                                <OrderAccordion
                                    key={order.order_id}
                                    order={order}
                                    defaultOpen={idx === 0}   // open first order by default
                                    statusFilter={statusFilter}
                                    renderActionButtons={renderActionButtons}
                                    onReplyToReview={onReplyToReview}
                                    onViewDetails={(o) => setSelectedOrder(o)}
                                    ordersState={ordersState}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                        <button onClick={onClose}
                            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition">
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {selectedOrder && (
                <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)}/>
            )}

            <ArtistAssignmentModal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)} 
                onAssign={handleAssignArtist}
                artists={artists}
            />
            <CancellationModal 
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                onConfirm={handleConfirmCancelOrder}
            />
            <ShipmentRejectionModal 
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                onConfirm={handleConfirmRejectShipment}
            />
            <ConfirmDialog dialog={dialog} onConfirm={handleConfirm} onCancel={onConfirmCancel}/>
            <ToastStack toasts={toasts} removeToast={removeToast}/>
        </>
    );
};

export default UserOrdersModal;
import React, { useState, useEffect, useCallback } from 'react';
import {
    fetchUserOrders,
    cancelOrder,
    submitReview,
    submitReturnRefund,
    completeOrder,
    fetchAllReturns,
    approveDesign,
    requestChange,
} from '../../services/OrdersAPI';
import { IMAGE_BASE_URL } from '../../services/api';
import { csAcceptPartial, csDeclinePartial } from '../../services/customValidationAPI';
import { useAuth } from '../../context/CustomerAuthContext';
import { useUI } from '../../context/UIContext';
import { useNavigate } from 'react-router-dom';
import ReturnRefundDetailModal from './ReturnRefundDetailModal';
import ReturnRefundModal from './ReturnRefundModal';
import TrackingModal from '../../components/tracking/TrackingModal';
import DesignChatbox from '../../components/DesignChatbox';
import CustomerInquiries from './CustomerInquiries';
import CustomerDesignInbox from './CustomerDesignInbox';

// ─────────────────────────────────────────────────────────────────────────────
//  Design Approval Modal
// ─────────────────────────────────────────────────────────────────────────────
const DesignApprovalModal = ({ order, onClose, onApprove, onRevision }) => {
    const [submitting, setSubmitting] = useState(false);

    const handleApprove = async () => {
        setSubmitting(true);
        try {
            await onApprove(order.order_id);
            onClose();
        } catch (err) {
            alert('Failed to approve design');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevision = async () => {
        setSubmitting(true);
        try {
            await onRevision(order.order_id);
            onClose();
        } catch (err) {
            alert('Failed to request revision');
        } finally {
            setSubmitting(false);
        }
    };

    const finalDesignUrl = order.final_design_url ? getImageUrl(order.final_design_url) : null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
            <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">Final Design Approval</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Order #{order.order_number}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="bg-gray-50 rounded-[32px] p-4 border border-gray-100 relative group overflow-hidden">
                        {finalDesignUrl ? (
                            <img src={finalDesignUrl} className="w-full h-auto rounded-2xl shadow-lg transition-transform group-hover:scale-[1.02] duration-500" alt="Final Design" />
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-300 italic">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p>No design preview available</p>
                            </div>
                        )}
                        <div className="absolute top-6 right-6 flex gap-2">
                            <a
                                href={finalDesignUrl}
                                download
                                target="_blank"
                                className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur shadow-xl border border-white flex items-center justify-center hover:bg-[#FDE31E] transition-all active:scale-90"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black italic uppercase tracking-tighter text-gray-900">Artist Notes</h3>
                        <p className="text-sm text-gray-500 bg-gray-50 p-6 rounded-3xl border border-gray-100 italic leading-relaxed">
                            "{order.artist_note || "Here is the final design for your sticker. Please review the colors and text carefully. If you'd like any changes, click 'Request Revision'."}"
                        </p>
                    </div>
                </div>

                <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                    <button
                        onClick={handleRevision}
                        disabled={submitting}
                        className="flex-1 py-5 rounded-2xl border-2 border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-white hover:border-red-400 hover:text-red-500 transition-all active:scale-95 disabled:opacity-40"
                    >
                        {submitting ? '...' : 'Request Revision'}
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={submitting || !finalDesignUrl}
                        className="flex-[2] py-5 bg-[#FDE31E] text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-100 active:scale-95 disabled:opacity-40"
                    >
                        {submitting ? 'Approving...' : 'Approve & Finalize'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// ─────────────────────────────────────────────────────────────────────────────
//  localStorage helpers — persist completed_at across page refreshes
// ─────────────────────────────────────────────────────────────────────────────
const RETURN_WINDOW_KEY = 'returnWindowTimestamps';

const saveReturnTimestamp = (orderItemId, orderId, now) => {
    try {
        const stored = JSON.parse(localStorage.getItem(RETURN_WINDOW_KEY) || '{}');
        const key = orderItemId ? `item_${orderItemId}` : `order_${orderId}`;
        stored[key] = now;
        localStorage.setItem(RETURN_WINDOW_KEY, JSON.stringify(stored));
    } catch { }
};

const getReturnTimestamp = (orderItemId, orderId) => {
    try {
        const stored = JSON.parse(localStorage.getItem(RETURN_WINDOW_KEY) || '{}');
        const key = orderItemId ? `item_${orderItemId}` : `order_${orderId}`;
        return stored[key] || null;
    } catch { return null; }
};

const cleanExpiredReturnTimestamps = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(RETURN_WINDOW_KEY) || '{}');
        const now = Date.now();
        Object.keys(stored).forEach(key => {
            if (now - new Date(stored[key]).getTime() > 25 * 60 * 60 * 1000) {
                delete stored[key];
            }
        });
        localStorage.setItem(RETURN_WINDOW_KEY, JSON.stringify(stored));
    } catch { }
};


// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
const normalizeStatus = (status) => {
    if (!status) return 'Pending';
    const s = String(status).trim().toLowerCase();
    if (s === 'completed') return 'Completed';
    if (s === 'to process' || s === 'pending') return 'To Process';
    if (s === 'in progress' || s === 'in_progress') return 'In Progress';
    if (s === 'to ship') return 'To Ship';
    if (s === 'to receive') return 'To Receive';
    if (s.includes('return') || s.includes('refund')) return 'Return/Refund';
    if (s === 'cancelled') return 'Cancelled';
    return String(status).trim();
};

const getStatusColor = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
        case 'To Process': return 'bg-orange-100 text-orange-600';
        case 'In Progress': return 'bg-blue-100 text-blue-600';
        case 'To Ship': return 'bg-purple-100 text-purple-600';
        case 'To Receive': return 'bg-indigo-100 text-indigo-600';
        case 'Completed': return 'bg-green-100 text-green-600';
        case 'Return/Refund': return 'bg-amber-100 text-amber-600';
        case 'Cancelled': return 'bg-red-100 text-red-600';
        default: return 'bg-gray-100 text-gray-600';
    }
};

const getStatusDot = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
        case 'To Process': return 'bg-orange-400';
        case 'In Progress': return 'bg-blue-400';
        case 'To Ship': return 'bg-purple-400';
        case 'To Receive': return 'bg-indigo-400';
        case 'Completed': return 'bg-green-400';
        case 'Return/Refund': return 'bg-amber-400';
        case 'Cancelled': return 'bg-red-400';
        default: return 'bg-gray-400';
    }
};

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const clean = path.startsWith('/') ? path.slice(1) : path;
    return `${IMAGE_BASE_URL}${clean}`;
};

const buildAddress = (order) => {
    const plain =
        (typeof order.shipping_address === 'string' && order.shipping_address) ||
        (typeof order.address === 'string' && order.address) ||
        (typeof order.delivery_address === 'string' && order.delivery_address) ||
        (typeof order.full_address === 'string' && order.full_address) ||
        null;
    if (plain && plain.trim() && plain.trim().toLowerCase() !== 'n/a') return plain.trim();

    const obj =
        (typeof order.shipping_address === 'object' && order.shipping_address) ||
        (typeof order.address === 'object' && order.address) ||
        (typeof order.delivery_address === 'object' && order.delivery_address) ||
        (typeof order.address_details === 'object' && order.address_details) ||
        null;

    const src = obj || order;

    const parts = [
        src.house_number || src.unit_number || src.house_no,
        src.street || src.street_name || src.street_address,
        src.barangay || src.brgy || src.subdivision,
        src.city || src.municipality || src.city_municipality,
        src.province || src.state,
        src.zip || src.zip_code || src.postal_code,
        src.country,
    ]
        .map(p => (p ? String(p).trim() : ''))
        .filter(Boolean);

    if (parts.length > 0) return parts.join(', ');
    if (obj && obj.full_address) return String(obj.full_address).trim();
    return 'N/A';
};

const tabs = ['All', 'To Process', 'To Ship', 'To Receive', 'Completed', 'Return/Refund', 'Cancelled'];

// ─────────────────────────────────────────────────────────────────────────────
//  Small reusable components
// ─────────────────────────────────────────────────────────────────────────────
const ImgPlaceholder = ({ className = '' }) => (
    <div className={`flex items-center justify-center bg-gray-50 border border-[#DCDCDC] ${className}`}>
        <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    </div>
);

const OrderImage = ({ src, alt, className = '' }) => {
    const [errored, setErrored] = useState(false);
    const url = getImageUrl(src);
    if (!url || errored) return <ImgPlaceholder className={className} />;
    return <img src={url} alt={alt} className={`${className} object-cover`} onError={() => setErrored(true)} />;
};

const StarRating = ({ value, onChange }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <button key={star} type="button" onClick={() => onChange(star)} className="transition-transform hover:scale-110">
                <svg className={`w-7 h-7 ${star <= value ? 'text-yellow-400' : 'text-gray-200'}`}
                    fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            </button>
        ))}
    </div>
);

const Toast = ({ message, onDone }) => {
    useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-white border border-[#DCDCDC] shadow-2xl rounded-2xl px-6 py-4 animate-in slide-in-from-right-5 duration-300">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                <span className="text-green-500 font-black">✓</span>
            </div>
            <p className="text-sm font-bold text-gray-900">{message}</p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Order Details Modal
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{children}</p>
);

const DetailRow = ({ icon, label, value, valueClass = '' }) => (
    <div className="flex items-start gap-3 py-2.5">
        <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
            <p className={`text-sm font-semibold text-gray-800 leading-snug ${valueClass}`}>{value || '—'}</p>
        </div>
    </div>
);

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const items = [
        {
            product_name: order.product_name,
            product_image: order.product_image,
            quantity: order.quantity || 1,
            item_price: order.item_price || order.total_price,
            size: order.size,
            product_type: order.product_type,
            specifications: order.specifications,
            pieces: order.pieces,
            shipping_fee: order.shipping_fee,
            status: order.status,
        },
        ...(order.items || [])
    ];

    const subtotal = items.reduce((s, i) => s + Number(i.item_price || 0) * (i.quantity || 1), 0);
    const shippingFee = Number(order.shipping_fee || 0);
    const total = Number(order.total_price || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalPop 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 tracking-tight">Order Details</h2>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.order_number || `ORD-${String(order.order_id).padStart(5, '0')}`}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(order.status)}`} />
                            {normalizeStatus(order.status)}
                        </span>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 pt-5 pb-3">
                        <SectionLabel>Items Ordered</SectionLabel>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 bg-gray-50 rounded-2xl p-3">
                                    <OrderImage
                                        src={item.product_image}
                                        alt={item.product_name}
                                        className="w-16 h-16 rounded-xl flex-shrink-0 border border-gray-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 leading-snug">{item.product_name}</p>
                                        {item.size && (
                                            <span className="inline-block mt-1 mr-1 text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                                Size: {item.size}
                                            </span>
                                        )}
                                        {item.design_name && (
                                            <span className="inline-block mt-1 mr-1 text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                                Design: {item.design_name}
                                            </span>
                                        )}
                                        {item.quality_name && (
                                            <span className="inline-block mt-1 mr-1 text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                                Material: {item.quality_name}
                                            </span>
                                        )}
                                        {item.product_type && (
                                            <p className="text-xs text-gray-400 mt-1">{item.product_type}{item.specifications ? ` • ${item.specifications}` : ''}{item.pieces ? ` • ${item.pieces} pcs` : ''}</p>
                                        )}
                                        {item.status && (
                                            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 text-[10px] rounded-full font-medium ${getStatusColor(item.status)}`}>
                                                {normalizeStatus(item.status)}
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-gray-400">Qty: {item.quantity || 1}</span>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">
                                                    ₱{Number(item.item_price || 0).toLocaleString('en-PH')}
                                                </p>
                                                {item.quantity > 1 && (
                                                    <p className="text-[10px] text-gray-400">
                                                        ₱{Number(item.item_price || 0).toLocaleString('en-PH')} × {item.quantity}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Design & Artist Info Section */}
                    {(order.final_design_url || order.artist) && (
                        <div className="px-6 pb-5">
                            <SectionLabel>Customization Details</SectionLabel>
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                                {order.final_design_url && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Final Approved Design</p>
                                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white">
                                            <img
                                                src={getImageUrl(order.final_design_url)}
                                                alt="Final Custom Design"
                                                className="w-full h-auto max-h-60 object-contain mx-auto"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <a
                                                    href={getImageUrl(order.final_design_url)}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-lg bg-white/90 backdrop-blur shadow border border-white flex items-center justify-center hover:bg-[#FDE31E] transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {order.artist && (
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                                        <div className="w-10 h-10 rounded-lg bg-yellow-50 border border-yellow-100 flex items-center justify-center text-lg">
                                            🎨
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Assigned Artist</p>
                                            <p className="text-sm font-bold text-gray-900 truncate">
                                                {`${order.artist.first_name || ''} ${order.artist.last_name || ''}`.trim()}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{order.artist.email}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {order.has_review && (
                        <div className="px-6 pb-4">
                            <SectionLabel>Your Review</SectionLabel>
                            <div className="bg-amber-50 rounded-2xl p-4 space-y-2 border border-amber-100">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <svg key={s} className={`w-4 h-4 ${s <= (order.rating || 0) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    ))}
                                    <span className="text-xs text-gray-500 ml-1 font-medium">{order.rating}/5</span>
                                </div>
                                {order.comment && <p className="text-sm text-gray-700">{order.comment}</p>}
                                {order.admin_reply && (
                                    <div className="mt-3 pt-3 border-t border-amber-200">
                                        <p className="text-xs font-bold text-gray-500 mb-1">🏪 Store Reply</p>
                                        <p className="text-sm text-gray-600 bg-white rounded-xl px-3 py-2 border border-amber-100">{order.admin_reply}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="px-6 pb-4">
                        <SectionLabel>Delivery Information</SectionLabel>
                        <div className="bg-gray-50 rounded-2xl px-4 divide-y divide-gray-100">
                            <DetailRow
                                icon={<svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" /></svg>}
                                label="Courier"
                                value={order.courier || 'J&T Express'}
                            />
                            <DetailRow
                                icon={<svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                                label="Contact"
                                value={order.contact_number || '—'}
                            />
                            {order.tracking_number && (
                                <DetailRow
                                    icon={<svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                    label="Tracking No."
                                    value={order.tracking_number}
                                    valueClass="font-mono text-indigo-600"
                                />
                            )}
                            <DetailRow
                                icon={<svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                label="Delivery Address"
                                value={order.address || '—'}
                            />
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        <SectionLabel>Payment Summary</SectionLabel>
                        <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                            <div className="px-4 divide-y divide-gray-100">
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Payment Method
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800">{order.payment_method || 'COD'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-sm text-gray-500">Order Date</span>
                                    <span className="text-sm font-semibold text-gray-800">{order.date || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-sm text-gray-500">Merchandise Subtotal</span>
                                    <span className="text-sm font-semibold text-gray-800">
                                        ₱{subtotal.toLocaleString('en-PH')}
                                    </span>
                                </div>
                                {shippingFee > 0 && (
                                    <div className="flex justify-between items-center py-3">
                                        <span className="text-sm text-gray-500">Shipping Fee</span>
                                        <span className="text-sm font-semibold text-gray-800">
                                            ₱{shippingFee.toLocaleString('en-PH')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-gray-900 px-4 py-4 flex items-center justify-between rounded-b-2xl">
                                <span className="text-sm font-bold text-white">Total Payment</span>
                                <span className="text-xl font-black text-[#FDE31E] tracking-tight">
                                    ₱{total.toLocaleString('en-PH')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Cancellation Info Section */}
                    {normalizeStatus(order.status) === 'Cancelled' && order.cancel_reason && (
                        <div className="px-6 pb-6">
                            <SectionLabel>Cancellation Information</SectionLabel>
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex gap-4 items-start">
                                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5">Reason for Cancellation</p>
                                    <p className="text-sm font-semibold text-red-700 leading-relaxed">{order.cancel_reason}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Rate Modal
// ─────────────────────────────────────────────────────────────────────────────
const RateModal = ({ order, onClose, onSubmit, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');

    const [artistRating, setArtistRating] = useState(0);
    const [artistReview, setArtistReview] = useState('');

    const [riderRating, setRiderRating] = useState(0);
    const [riderReview, setRiderReview] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit({
                orderId: order.order_id,
                productId: order.product_id,
                orderItemId: order.order_item_id || null,
                rating,
                review: review.trim() || null,
                artistRating: order.artist_id ? artistRating : null,
                artistReview: order.artist_id ? artistReview.trim() || null : null,
                riderRating: riderRating || null,
                riderReview: riderReview.trim() || null,
                order,
            });
            onClose();
            onSuccess?.('Review submitted!');
        }
        catch (err) { setError('Failed to submit review. Please try again.'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-[40px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between rounded-t-[40px] z-10">
                    <div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">Order Experience</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">We value your honest feedback</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                    {/* SECTION 1: Product Review */}
                    <div className="border border-gray-100 rounded-[32px] p-6 space-y-4 bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <OrderImage src={order.product_image} alt={order.product_name} className="w-16 h-16 rounded-[20px] flex-shrink-0 border border-gray-100 shadow-sm" />
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rate the Product</p>
                                <p className="font-black text-sm text-gray-900 uppercase tracking-tight line-clamp-1">{order.product_name}</p>
                            </div>
                        </div>
                        <div className="flex justify-center py-2 bg-white rounded-2xl border border-gray-50 p-2 shadow-inner">
                            <StarRating value={rating} onChange={setRating} />
                        </div>
                        <textarea rows={3} placeholder="How is the sticker quality, adhesive strength, and colors? Share your experience with this product..." className="w-full text-sm border-0 bg-white rounded-[24px] px-4 py-3 resize-none focus:outline-none focus:ring-4 focus:ring-[#FDE31E]/10 border border-gray-150 font-medium" value={review} onChange={e => setReview(e.target.value)} />
                    </div>

                    {/* SECTION 2: Artist Review (Only if artist is assigned) */}
                    {order.artist_id && (
                        <div className="border border-gray-100 rounded-[32px] p-6 space-y-4 bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-500">🎨</div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rate the Designer</p>
                                    <p className="font-black text-sm text-gray-900 uppercase tracking-tight">Your Assigned Artist</p>
                                </div>
                            </div>
                            <div className="flex justify-center py-2 bg-white rounded-2xl border border-gray-50 p-2 shadow-inner">
                                <StarRating value={artistRating} onChange={setArtistRating} />
                            </div>
                            <textarea rows={3} placeholder="How was the artist's communication, revision handling, and creative execution?" className="w-full text-sm border-0 bg-white rounded-[24px] px-4 py-3 resize-none focus:outline-none focus:ring-4 focus:ring-[#FDE31E]/10 border border-gray-150 font-medium" value={artistReview} onChange={e => setArtistReview(e.target.value)} />
                        </div>
                    )}

                    {/* SECTION 3: Rider Review */}
                    <div className="border border-gray-100 rounded-[32px] p-6 space-y-4 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-orange-500">🚚</div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rate Courier Delivery</p>
                                <p className="font-black text-sm text-gray-900 uppercase tracking-tight">J&T Express Courier</p>
                            </div>
                        </div>
                        <div className="flex justify-center py-2 bg-white rounded-2xl border border-gray-50 p-2 shadow-inner">
                            <StarRating value={riderRating} onChange={setRiderRating} />
                        </div>
                        <textarea rows={3} placeholder="Was the package handled safely? Was the delivery fast and friendly?" className="w-full text-sm border-0 bg-white rounded-[24px] px-4 py-3 resize-none focus:outline-none focus:ring-4 focus:ring-[#FDE31E]/10 border border-gray-150 font-medium" value={riderReview} onChange={e => setRiderReview(e.target.value)} />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}

                    <button type="button" onClick={handleSubmit} disabled={rating === 0 || submitting}
                        className="w-full py-5 bg-[#FDE31E] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-yellow-100 active:scale-95 disabled:opacity-40 disabled:scale-100">
                        {submitting ? 'Submitting Experience...' : '✓ Submit Full Review'}
                    </button>
                    <div className="h-2" />
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Confirm Dialog
// ─────────────────────────────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
        <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-8 space-y-6 border border-[#DCDCDC] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                    {danger ? (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    ) : (
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                </div>
                <p className="text-base font-black text-gray-900 uppercase tracking-tight leading-tight">{message}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-4 border border-[#DCDCDC] text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition active:scale-95">Back</button>
                <button onClick={onConfirm} className={`flex-1 py-4 font-black text-xs uppercase tracking-widest rounded-2xl transition shadow-sm active:scale-95 ${danger ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-100' : 'bg-[#FDE31E] hover:bg-yellow-400 text-black '}`}>{confirmLabel}</button>
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: calculate return window expiry
//  Uses backend-supplied return_deadline (preferred) or computes from
//  return_window_seconds + completed_at / status_changed_at.
// ─────────────────────────────────────────────────────────────────────────────
const getReturnDeadline = (order) => {
    // If the backend already gave us a pre-computed deadline, use it
    if (order.return_deadline) return new Date(order.return_deadline);

    // If we have a window size but no deadline, compute it from the base time
    const windowSecs = order.return_window_seconds ?? null;
    if (!windowSecs) return null; // no policy → no window

    const status = normalizeStatus(order.status);
    let baseTime = order.delivery_deadline;
    if (!baseTime) {
        if (status === 'Completed') baseTime = order.completed_at;
        else if (status === 'To Receive') baseTime = order.status_changed_at || order.updated_at;
    }
    if (!baseTime) return null;

    return new Date(new Date(baseTime).getTime() + windowSecs * 1000);
};

// ─────────────────────────────────────────────────────────────────────────────
//  Static label — shows the policy window size (e.g. "7 days", "2 hours").
//  No countdown. Customers only see how long the window is, not how much is left.
// ─────────────────────────────────────────────────────────────────────────────
const ReturnWindowInfo = ({ order }) => {
    const secs = order.return_window_seconds ?? null;
    if (!secs) return null;

    const days = Math.floor(secs / 86400);
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor(secs / 60);

    let label;
    if (days >= 1) label = `${days} ${days === 1 ? 'day' : 'days'}`;
    else if (hours >= 1) label = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    else if (mins >= 1) label = `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    else label = `${secs} ${secs === 1 ? 'second' : 'seconds'}`;

    return (
        <p className="text-[10px] text-gray-400 text-center mt-0.5">
            ⏰ {label} return window
        </p>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: determine if return window is still open (used by OrderCard)
// ─────────────────────────────────────────────────────────────────────────────
const isReturnWindowOpen = (order) => {
    const deadline = getReturnDeadline(order);
    if (!deadline) return false;
    return Date.now() < deadline;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Order Card
// ─────────────────────────────────────────────────────────────────────────────
const OrderCard = ({
    order, isMobile = false, isVerified,
    onCancelItem, onReceiveOrder, onRateOrder, onReturnRefund,
    onSuccess, onViewReturnDetail, onBuyAgain, onChatWithArtist,
}) => {
    const [cancelling, setCancelling] = useState(false);
    const [receiving, setReceiving] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showRate, setShowRate] = useState(false);
    const [showReturn, setShowReturn] = useState(false);
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [showConfirmReceive, setShowConfirmReceive] = useState(false);
    const [showTracking, setShowTracking] = useState(false);
    const [showDesignApproval, setShowDesignApproval] = useState(false);

    const checkVerifiedAction = (callback) => {
        if (!isVerified) {
            onSuccess?.('Please verify your email to perform this action.');
            return;
        }
        callback();
    };

    const alreadyReviewed = order.has_review;
    const canCancel = ['To Process', 'Pending'].includes(normalizeStatus(order.status));
    const canReceive = normalizeStatus(order.status) === 'To Receive';
    const isCompleted = normalizeStatus(order.status) === 'Completed';
    const isReturnRefund = normalizeStatus(order.status) === 'Return/Refund';
    const needsApproval = ['Finalizing', 'For Revision'].includes(order.status);

    // Reactive return window — auto-switches button to "Buy Again" when deadline passes
    const [returnWindowOpen, setReturnWindowOpen] = useState(() => isReturnWindowOpen(order));
    useEffect(() => {
        const iv = setInterval(() => setReturnWindowOpen(isReturnWindowOpen(order)), 1000);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.return_deadline, order.return_window_seconds, order.delivery_deadline]);

    const deliveryExpired = canReceive
        ? !order.delivery_deadline || new Date() > new Date(order.delivery_deadline)
        : false;

    const doCancel = async () => {
        setShowConfirmCancel(false);
        setCancelling(true);
        try {
            await onCancelItem(order.order_id, order.order_item_id);
            onSuccess?.('Item cancelled successfully');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to cancel item.');
        } finally {
            setCancelling(false);
        }
    };

    const doReceive = async () => {
        setReceiving(true);
        try {
            await onReceiveOrder(order.order_id, order.order_item_id);
            onSuccess?.('Order confirmed as received!');
        } catch {
            alert('Failed to confirm order.');
        } finally {
            setReceiving(false);
        }
    };

    const handleBuyAgain = () => onBuyAgain(order);

    return (
        <>
            {showConfirmCancel && (
                <ConfirmDialog
                    message={`Cancel "${order.product_name}"? Only this item will be cancelled.`}
                    onConfirm={doCancel}
                    onCancel={() => setShowConfirmCancel(false)}
                    confirmLabel="Yes, Cancel"
                    danger
                />
            )}
            {showConfirmReceive && (
                <ConfirmDialog
                    message={`Confirm that you have received "${order.product_name}"? This will mark it as completed.`}
                    onConfirm={() => { setShowConfirmReceive(false); doReceive(); }}
                    onCancel={() => setShowConfirmReceive(false)}
                    confirmLabel="Yes, Received"
                />
            )}
            {showRate && (
                <RateModal order={order} onClose={() => setShowRate(false)} onSubmit={onRateOrder} onSuccess={onSuccess} />
            )}
            {showReturn && (
                <ReturnRefundModal order={order} onClose={() => setShowReturn(false)} onSubmit={onReturnRefund} />
            )}
            {showTracking && (
                <TrackingModal order={order} onClose={() => setShowTracking(false)} />
            )}
            {showDesignApproval && (
                <DesignApprovalModal
                    order={order}
                    onClose={() => setShowDesignApproval(false)}
                    onApprove={async (id) => {
                        await approveDesign(id);
                        onSuccess?.('Design approved! We will now prepare your shipment.');
                    }}
                    onRevision={async (id) => {
                        await requestChange(id);
                        onSuccess?.('Revision requested. Our artist will update the design soon.');
                    }}
                />
            )}

            <div className={isMobile
                ? "bg-white border-b border-gray-100 active:bg-gray-50 transition-colors"
                : "bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"}>

                <div className={`flex gap-4 p-4 cursor-pointer ${isMobile ? 'items-center' : 'items-start'}`} onClick={() => setShowDetails(true)}>
                    <div className="relative flex-shrink-0">
                        <OrderImage
                            src={order.product_image}
                            alt={order.product_name}
                            className={`rounded-2xl border border-gray-100 shadow-sm ${isMobile ? 'w-24 h-24' : 'w-28 h-28'}`}
                        />
                        {order.quantity > 1 && (
                            <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                                {order.quantity}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <h3 className={`font-black text-gray-900 leading-tight truncate ${isMobile ? 'text-[15px] italic uppercase tracking-tighter' : 'text-lg'}`}>
                                {order.product_name}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-lg border ${getStatusColor(order.status)}`}>
                                {normalizeStatus(order.status)}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{order.date}</span>
                        </div>

                        {order.size && (
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                Size: <span className="text-gray-900">{order.size}</span>
                            </p>
                        )}
                        {order.design_name && (
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                Design: <span className="text-gray-900">{order.design_name}</span>
                            </p>
                        )}
                        {order.quality_name && (
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                Quality: <span className="text-gray-900">{order.quality_name}</span>
                            </p>
                        )}

                        <div className="mt-auto pt-1">
                            <p className={`font-black text-gray-900 ${isMobile ? 'text-[18px]' : 'text-xl'}`}>
                                ₱{Number(order.total_price).toLocaleString('en-PH')}
                            </p>
                        </div>
                    </div>

                    {isMobile && (
                        <div className="flex-shrink-0 self-center text-gray-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 px-5 pb-4 pt-3 space-y-2">
                    {/* Partial Accommodation Decision Banner */}
                    {order.cs_review_status === 'pending_partial_response' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-5 space-y-4 shadow-sm" onClick={e => e.stopPropagation()}>
                            <div className="flex items-start gap-3">
                                <span className="text-2xl mt-0.5">⚠️</span>
                                <div>
                                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                                        Partial Feasibility Accommodation Proposal
                                    </h4>
                                    <p className="text-xs text-amber-800 font-semibold mt-1">
                                        Staff has checked your custom order feasibility. We can accommodate this request if we adjust the quantity:
                                    </p>
                                    <div className="mt-3 bg-white/70 rounded-xl p-3 border border-amber-100/50 space-y-1.5 text-xs text-gray-800">
                                        <p>
                                            Original Requested Quantity: <strong className="text-gray-900">{order.quantity}</strong>
                                        </p>
                                        <p>
                                            Proposed Feasible Quantity: <strong className="text-emerald-700 text-sm font-black">{order.manual_approved_quantity}</strong>
                                        </p>
                                        {order.staff_validation_note && (
                                            <p className="italic text-gray-500 mt-1 border-t border-gray-150 pt-1.5">
                                                Note from Staff: "{order.staff_validation_note}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to decline the proposed quantity adjustment? This will cancel your order.")) {
                                            try {
                                                await csDeclinePartial(order.order_id);
                                                onSuccess?.("Order declined and cancelled.");
                                                setTimeout(() => window.location.reload(), 1000);
                                            } catch (err) {
                                                alert("Failed to decline adjustment.");
                                            }
                                        }
                                    }}
                                    className="flex-1 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-black text-[10px] uppercase tracking-widest rounded-xl transition active:scale-95 text-center font-bold"
                                >
                                    Decline & Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to proceed with the adjusted quantity of ${order.manual_approved_quantity}?`)) {
                                            try {
                                                await csAcceptPartial(order.order_id);
                                                onSuccess?.("Adjustment accepted! Awaiting artist assignment.");
                                                setTimeout(() => window.location.reload(), 1000);
                                            } catch (err) {
                                                alert("Failed to accept adjustment.");
                                            }
                                        }
                                    }}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition active:scale-95 text-center font-bold shadow-lg shadow-emerald-600/20"
                                >
                                    Accept & Proceed
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Manual Validation Workflow Tracker */}
                    {order.cs_review_status && order.cs_review_status !== 'not_applicable' && (
                        <div className="bg-slate-50 border border-gray-150 rounded-[20px] p-4 text-[11px]" onClick={e => e.stopPropagation()}>
                            <p className="font-black text-gray-700 uppercase tracking-widest text-[9px] mb-3 flex items-center gap-1.5">
                                🛠️ Feasibility Validation Status
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                                <div className={`flex flex-col items-center p-2 rounded-xl border ${
                                    order.cs_review_status === 'pending_admin_approval' 
                                        ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                        : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                }`}>
                                    <span>👤 Admin Approval</span>
                                    <span className="font-black mt-1 uppercase text-[8px] tracking-wider">
                                        {order.cs_review_status === 'pending_admin_approval' ? 'In Progress' : 'Passed ✓'}
                                    </span>
                                </div>
                                <div className={`flex flex-col items-center p-2 rounded-xl border ${
                                    order.cs_review_status === 'pending_admin_approval'
                                        ? 'bg-gray-50 border-gray-100 text-gray-400'
                                        : order.cs_review_status === 'pending_review'
                                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                }`}>
                                    <span>📞 CS Review</span>
                                    <span className="font-black mt-1 uppercase text-[8px] tracking-wider">
                                        {order.cs_review_status === 'pending_admin_approval' 
                                            ? 'Waiting'
                                            : order.cs_review_status === 'pending_review' 
                                                ? 'In Progress' 
                                                : 'Passed ✓'}
                                    </span>
                                </div>
                                <div className={`flex flex-col items-center p-2 rounded-xl border ${
                                    ['pending_admin_approval', 'pending_review'].includes(order.cs_review_status)
                                        ? 'bg-gray-50 border-gray-100 text-gray-400'
                                        : order.cs_review_status === 'pending_partial_response'
                                            ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                                            : order.staff_validation_status === 'pending_validation'
                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                }`}>
                                    <span>⚙️ Staff Feasibility</span>
                                    <span className="font-black mt-1 uppercase text-[8px] tracking-wider">
                                        {['pending_admin_approval', 'pending_review'].includes(order.cs_review_status)
                                            ? 'Waiting'
                                            : order.cs_review_status === 'pending_partial_response'
                                                ? 'Requires Action ⚠️'
                                                : order.staff_validation_status === 'pending_validation'
                                                    ? 'In Progress'
                                                    : 'Passed ✓'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Expected timeline for In Progress orders */}
                    {normalizeStatus(order.status) === 'In Progress' && (order.expected_shipped_at || order.expected_delivery_at) && (
                        <div className="bg-blue-50/75 border border-blue-100 rounded-[20px] p-4 space-y-2 text-xs">
                            <p className="font-black text-blue-800 uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                                <span className="animate-pulse w-2 h-2 rounded-full bg-blue-500"></span>
                                🎨 Design In Progress Timeline
                            </p>
                            <div className="space-y-1 text-blue-700 font-bold">
                                {order.expected_shipped_at && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-blue-500 uppercase font-black">Expected Shipping</span>
                                        <span className="text-gray-900 font-black">{new Date(order.expected_shipped_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                                {order.expected_delivery_at && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-blue-500 uppercase font-black">Expected Delivery</span>
                                        <span className="text-gray-900 font-black">{new Date(order.expected_delivery_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {canCancel && (
                        <button type="button" onClick={e => { e.stopPropagation(); setShowConfirmCancel(true); }} disabled={cancelling}
                            className="px-6 py-2.5 bg-white hover:bg-red-50 text-red-500 border border-red-200 hover:border-red-300 font-medium rounded-xl transition disabled:opacity-50 text-sm w-full">
                            {cancelling ? 'Cancelling...' : 'Cancel Item'}
                        </button>
                    )}

                    {needsApproval && (
                        <button type="button" onClick={e => { e.stopPropagation(); setShowDesignApproval(true); }}
                            className="w-full py-4 bg-[#FDE31E] text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-yellow-400 transition-all shadow-lg active:scale-95 animate-pulse">
                            Review & Approve Design
                        </button>
                    )}

                    {/* Chat with Artist Button - only show if artist is assigned */}
                    {order.artist_id && (canCancel || needsApproval || normalizeStatus(order.status) === 'To Ship' || normalizeStatus(order.status) === 'In Progress') && (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); onChatWithArtist?.(order); }}
                            className="w-full py-3.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 group"
                        >
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Chat with Artist
                        </button>
                    )}

                    {canReceive && (
                        <div className="flex gap-2 flex-wrap">
                            {!deliveryExpired ? (
                                <>
                                    <button
                                        onClick={e => { e.stopPropagation(); checkVerifiedAction(() => setShowTracking(true)); }}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Track Order
                                    </button>
                                    {order.delivery_deadline && (
                                        <div className="w-full text-center text-[11px] text-gray-400 mt-1">
                                            Expected delivery by {new Date(order.delivery_deadline).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={e => { e.stopPropagation(); setShowConfirmReceive(true); }}
                                            disabled={receiving}
                                            className="flex-1 py-2.5 bg-[#FDE31E] hover:bg-yellow-400 text-black font-semibold rounded-xl transition disabled:opacity-50 text-sm"
                                        >
                                            {receiving ? 'Confirming...' : '✓ Order Received'}
                                        </button>

                                        {returnWindowOpen ? (
                                            <button
                                                onClick={e => { e.stopPropagation(); checkVerifiedAction(() => setShowReturn(true)); }}
                                                className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-semibold rounded-xl transition text-sm"
                                            >
                                                Return/Refund
                                            </button>
                                        ) : (
                                            <button
                                                onClick={e => { e.stopPropagation(); handleBuyAgain(); }}
                                                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition text-sm"
                                            >
                                                Buy Again
                                            </button>
                                        )}
                                    </div>
                                    {returnWindowOpen && <ReturnWindowInfo order={order} />}
                                </>
                            )}
                        </div>
                    )}

                    {isCompleted && (
                        <div className="flex flex-col gap-1">
                            <div className="flex gap-2">
                                {returnWindowOpen ? (
                                    <button
                                        onClick={e => { e.stopPropagation(); checkVerifiedAction(() => setShowReturn(true)); }}
                                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-semibold rounded-xl transition text-sm"
                                    >
                                        Return/Refund
                                    </button>
                                ) : (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleBuyAgain(); }}
                                        className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl transition text-sm"
                                    >
                                        Buy Again
                                    </button>
                                )}
                                <button
                                    onClick={e => { e.stopPropagation(); checkVerifiedAction(() => setShowRate(true)); }}
                                    disabled={alreadyReviewed}
                                    className="flex-1 py-2.5 bg-[#FDE31E] hover:bg-yellow-400 text-black font-semibold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                                >
                                    {alreadyReviewed ? 'Reviewed ✓' : 'Rate'}
                                </button>
                            </div>
                            {returnWindowOpen && <ReturnWindowInfo order={order} />}
                        </div>
                    )}

                    {isReturnRefund && (() => {
                        const rs = order.return_status;
                        const cfg = rs === 'completed'
                            ? { bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100', text: 'text-green-700', icon: 'text-green-500', label: 'Return/Refund Completed — View Detail', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
                            : rs === 'refunded'
                                ? { bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:bg-orange-100', text: 'text-orange-700', icon: 'text-orange-500', label: 'Refund Sent — View Detail', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
                                : rs === 'approved'
                                    ? { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100', text: 'text-blue-700', icon: 'text-blue-500', label: 'Return Approved — View Detail', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
                                    : rs === 'rejected'
                                        ? { bg: 'bg-red-50', border: 'border-red-200', hover: 'hover:bg-red-100', text: 'text-red-700', icon: 'text-red-500', label: 'Return Request Rejected — View Detail', d: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' }
                                        : { bg: 'bg-amber-50', border: 'border-amber-200', hover: 'hover:bg-amber-100', text: 'text-amber-700', icon: 'text-amber-500', label: 'Return/Refund In Progress — View Detail', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' };
                        return (
                            <button onClick={e => { e.stopPropagation(); onViewReturnDetail(order); }}
                                className={`w-full flex items-center justify-center gap-2 border rounded-xl px-4 py-3 transition ${cfg.bg} ${cfg.border} ${cfg.hover}`}>
                                <svg className={`w-4 h-4 flex-shrink-0 ${cfg.icon}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={cfg.d} />
                                </svg>
                                <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
                                <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        );
                    })()}

                    {/* Cancellation Reason Banner */}
                    {normalizeStatus(order.status) === 'Cancelled' && order.cancel_reason && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Cancellation Reason</p>
                                <p className="text-sm font-semibold text-red-700 leading-snug">{order.cancel_reason}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showDetails && (
                <OrderDetailsModal order={order} onClose={() => setShowDetails(false)} />
            )}
        </>
    );
};

const ReviewReminderBanner = ({ count, onClick }) => {
    if (count <= 0) return null;
    return (
        <div className="bg-[#FDE31E] rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-sm gap-4 mb-4" style={{ animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            <div className="flex items-center gap-3 md:gap-4">
                <div className="flex gap-0.5 text-black shrink-0">
                    {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                    ))}
                </div>
                <div>
                    <h4 className="text-[11px] md:text-sm font-black text-black leading-snug uppercase tracking-tight">
                        You have {count} completed {count === 1 ? 'service' : 'services'} waiting for your review!
                    </h4>
                    <p className="text-[10px] md:text-xs text-black/70 font-semibold leading-tight mt-0.5">
                        Your feedback helps us serve you better.
                    </p>
                </div>
            </div>
            <button 
                onClick={onClick}
                className="bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shrink-0 shadow-sm"
            >
                View
            </button>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main CustomerOrders
// ─────────────────────────────────────────────────────────────────────────────
const CustomerOrders = ({ isModal = false, onClose }) => {
    const { currentUser, isVerified } = useAuth();
    const { setCheckoutData } = useUI();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('All');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toast, setToast] = useState(null);
    const [selectedReturnOrder, setSelectedReturnOrder] = useState(null);
    const [selectedChatOrder, setSelectedChatOrder] = useState(null);

    const showToast = useCallback((msg) => setToast(msg), []);

    const reviewNeededCount = orders.filter(o => normalizeStatus(o.status) === 'Completed' && !o.has_review).length;

    const formatOrders = useCallback((data) => {
        const rawOrders = data.orders || data || [];
        const flat = [];
        rawOrders.forEach((order) => {
            const details = order.order_details || order.items || [];
            const mainStatus = normalizeStatus(order.status);

            if (details.length === 0) {
                const unitPrice = Number(order.price || order.item_price || 0);
                const sortDate = order.updated_at || order.created_at || order.order_date || new Date().toISOString();
                flat.push({
                    order_id: order.order_id,
                    order_number: order.order_number || `ORD-${String(order.order_id).padStart(5, '0')}`,
                    order_item_id: order.order_details_id || null,
                    status: mainStatus,
                    date: order.order_date ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
                    product_name: order.product_name || 'Product',
                    product_image: order.product_image || null,
                    quantity: order.quantity || 1,
                    item_price: unitPrice,
                    total_price: Number(order.total_price || (unitPrice * (order.quantity || 1))),
                    product_id: order.product_id,
                    has_review: order.has_review || false,
                    rating: order.rating || 0,
                    admin_reply: order.admin_reply || null,
                    size: order.size || null,
                    design_name: order.design_name || null,
                    quality_name: order.quality_name || null,
                    product_type: order.product_type || null,
                    specifications: order.specifications || null,
                    pieces: order.pieces || null,
                    shipping_fee: Number(order.shipping_fee || 0),
                    courier: order.courier || 'J&T',
                    contact_number: order.contact_number || order.user?.contact_number || 'N/A',
                    address: buildAddress(order),
                    payment_method: order.payment_method || 'COD',
                    items: [],
                    return_status: order.return_status || order.returnRefund?.status || order.return_refund?.status || null,
                    tracking_number: order.tracking_number || null,
                    delivery_deadline: order.delivery_deadline || null,
                    completed_at: order.completed_at || order.date_completed || null,
                    updated_at: order.updated_at || null,
                    status_changed_at: order.status_changed_at || order.updated_at || null,
                    return_window_seconds: order.return_window_seconds ?? null,
                    return_deadline: order.return_deadline ?? null,
                    artist_id: order.artist_id,
                    artist: order.artist || null,
                    final_design_url: order.final_design_url || null,
                    shipment_note: order.shipment_note || null,
                    expected_shipped_at: order.expected_shipped_at || null,
                    expected_delivery_at: order.expected_delivery_at || null,
                    cancel_reason: order.cancel_reason || null,
                    cs_review_status: order.cs_review_status || null,
                    staff_validation_status: order.staff_validation_status || null,
                    manual_approved_quantity: order.manual_approved_quantity || null,
                    staff_validation_note: order.staff_validation_note || null,
                    rejection_reason: order.rejection_reason || null,
                    sortDate,
                });
            } else {
                // ── Pre-compute discount ratio across all items in this order ──
                const orderTotal = Number(order.total_price || 0);
                const rawSubtotal = details.reduce((sum, i) => {
                    const p = Number(i.item_price || i.price || i.product?.product_price || 0);
                    return sum + p * (i.quantity || 1);
                }, 0);
                const discountRatio = rawSubtotal > 0 ? orderTotal / rawSubtotal : 1;

                details.forEach((item) => {
                    const product = item.product || {};
                    const itemStatus = normalizeStatus(item.status || order.status);
                    const unitPrice = Number(item.item_price || item.price || product.product_price || 0);
                    const itemProductId = item.product_id || product.product_id;
                    const itemDetailsId = item.order_details_id || item.id;

                    const orderReviews = Array.isArray(order.reviews) ? order.reviews : [];
                    const itemReview = orderReviews.find(r =>
                        (itemDetailsId && (r.order_details_id == itemDetailsId || r.order_item_id == itemDetailsId)) ||
                        (itemProductId && r.product_id == itemProductId)
                    ) || null;

                    const itemHasReview = Boolean(item.has_review) || Boolean(itemReview);
                    const itemRating = item.rating || itemReview?.rating || 0;
                    const itemComment = item.comment || itemReview?.comment || null;
                    const itemReply = item.admin_reply || itemReview?.admin_reply || null;
                    const sortDate = item.updated_at || order.updated_at || order.created_at || order.order_date || new Date().toISOString();

                    // ── Correct total_price: single-item uses exact order total,
                    //    multi-item splits proportionally so discount is reflected ──
                    const itemRawTotal = unitPrice * (item.quantity || 1);
                    const itemFinalTotal = details.length === 1
                        ? orderTotal
                        : Math.round(itemRawTotal * discountRatio * 100) / 100;

                    flat.push({
                        order_id: order.order_id,
                        order_number: order.order_number || `ORD-${String(order.order_id).padStart(5, '0')}`,
                        order_item_id: itemDetailsId || null,
                        status: itemStatus,
                        date: order.order_date ? new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
                        product_name: product.product_name || item.product_name || 'Product',
                        product_image: product.product_image || item.product_image || null,
                        size: item.size || null,
                        design_name: item.design_name || null,
                        quality_name: item.quality_name || null,
                        quantity: item.quantity || 1,
                        item_price: unitPrice,
                        total_price: itemFinalTotal,
                        product_id: itemProductId,
                        has_review: itemHasReview,
                        rating: itemRating,
                        comment: itemComment,
                        admin_reply: itemReply,
                        product_type: item.product_type || product.product_type || null,
                        specifications: item.specifications || null,
                        pieces: item.pieces || null,
                        shipping_fee: Number(order.shipping_fee || 0),
                        courier: order.courier || 'J&T',
                        contact_number: order.contact_number || order.user?.contact_number || 'N/A',
                        address: buildAddress(order),
                        payment_method: order.payment_method || 'COD',
                        items: details.filter(i => (i.order_details_id || i.id) !== (item.order_details_id || item.id)),
                        return_status: item.return_status || item.returnRefund?.status || item.return_refund?.status || null,
                        tracking_number: order.tracking_number || null,
                        delivery_deadline: order.delivery_deadline || null,
                        completed_at: order.completed_at || order.date_completed || null,
                        updated_at: item.updated_at || order.updated_at || null,
                        status_changed_at: item.status_changed_at || order.status_changed_at || order.updated_at || null,
                        return_window_seconds: item.return_window_seconds ?? order.return_window_seconds ?? null,
                        return_deadline: item.return_deadline ?? order.return_deadline ?? null,
                        artist_id: order.artist_id,
                        artist: order.artist || null,
                        final_design_url: order.final_design_url || null,
                        shipment_note: order.shipment_note || null,
                        expected_shipped_at: order.expected_shipped_at || null,
                        expected_delivery_at: order.expected_delivery_at || null,
                        cancel_reason: order.cancel_reason || null,
                        cs_review_status: order.cs_review_status || null,
                        staff_validation_status: order.staff_validation_status || null,
                        manual_approved_quantity: order.manual_approved_quantity || null,
                        staff_validation_note: order.staff_validation_note || null,
                        rejection_reason: order.rejection_reason || null,
                        sortDate,
                    });
                });
            }
        });

        // ✅ Inject persisted completed_at from localStorage if backend returns null
        cleanExpiredReturnTimestamps();
        flat.forEach(card => {
            if (!card.completed_at && normalizeStatus(card.status) === 'Completed') {
                const saved = getReturnTimestamp(card.order_item_id, card.order_id);
                if (saved) {
                    card.completed_at = saved;
                    card.status_changed_at = saved;
                }
            }
        });

        return flat;
    }, []);

    // ── shared sync logic ────────────────────────────────────────────────────
    const applyReturnsAndPreserve = (formatted, returns, prev) => {
        formatted.forEach(card => {
            // Preserve timestamps from current React state if backend returns null
            const existing = prev.find(p =>
                (card.order_item_id && String(p.order_item_id) === String(card.order_item_id)) ||
                (!card.order_item_id && String(p.order_id) === String(card.order_id))
            );
            if (existing) {
                if (!card.completed_at && existing.completed_at) card.completed_at = existing.completed_at;
                if (!card.status_changed_at && existing.status_changed_at) card.status_changed_at = existing.status_changed_at;
                if (!card.updated_at && existing.updated_at) card.updated_at = existing.updated_at;
            }
            // Merge return statuses
            if (returns?.length > 0) {
                const match = returns.find(r =>
                    (card.order_item_id && String(r.order_details_id) === String(card.order_item_id)) ||
                    (!card.order_item_id && String(r.order_id) === String(card.order_id))
                );
                if (match) card.return_status = match.status || null;
            }
        });
        return formatted;
    };

    const loadOrders = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true); else setLoading(true);
        try {
            const [data, returns] = await Promise.all([
                fetchUserOrders(),
                fetchAllReturns().catch(() => []),
            ]);
            const formatted = formatOrders(data);
            setOrders(prev => applyReturnsAndPreserve(formatted, returns, prev));
        } catch (err) {
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [formatOrders]);

    const syncBackground = useCallback(async () => {
        try {
            const [data, returns] = await Promise.all([
                fetchUserOrders(),
                fetchAllReturns().catch(() => []),
            ]);
            const formatted = formatOrders(data);
            setOrders(prev => applyReturnsAndPreserve(formatted, returns, prev));
        } catch { }
    }, [formatOrders]);

    useEffect(() => { loadOrders(); }, [loadOrders]);
    useEffect(() => {
        const iv = setInterval(syncBackground, 10000);
        return () => clearInterval(iv);
    }, [syncBackground]);

    const handleCancelItem = useCallback(async (orderId, orderItemId) => {
        if (!orderItemId) return alert('Cannot cancel: Item ID missing.');
        setOrders(prev => prev.filter(o => o.order_item_id !== orderItemId));
        try {
            await cancelOrder(orderId, orderItemId);
            showToast('Item cancelled successfully');
        } catch (err) {
            await loadOrders();
            alert(err.response?.data?.message || 'Failed to cancel item.');
        }
    }, [loadOrders, showToast]);

    const handleReceiveOrder = useCallback(async (orderId, orderItemId = null) => {
        const now = new Date().toISOString();

        // ✅ Save to localStorage so it survives page refresh
        saveReturnTimestamp(orderItemId, orderId, now);

        setOrders(prev => prev.map(card => {
            const isMatch =
                (orderItemId && String(card.order_item_id) === String(orderItemId)) ||
                (!orderItemId && String(card.order_id) === String(orderId) && !card.order_item_id);
            if (!isMatch) return card;
            return {
                ...card,
                status: 'Completed',
                completed_at: now,
                status_changed_at: now,
                updated_at: now,
                sortDate: now,
                // Preserve policy window so countdown shows immediately
                return_window_seconds: card.return_window_seconds,
                return_deadline: card.return_deadline,
            };
        }));

        try {
            await completeOrder(orderId, orderItemId);
            showToast('Order confirmed as received!');

            const [data, returns] = await Promise.all([
                fetchUserOrders(),
                fetchAllReturns().catch(() => []),
            ]);
            const formatted = formatOrders(data);

            // ✅ Inject now into the just-completed order if backend returns null
            formatted.forEach(card => {
                const isJustCompleted =
                    (orderItemId && String(card.order_item_id) === String(orderItemId)) ||
                    (!orderItemId && String(card.order_id) === String(orderId));
                if (isJustCompleted && !card.completed_at) {
                    card.completed_at = now;
                    card.status_changed_at = now;
                    card.updated_at = now;
                }
                if (returns?.length > 0) {
                    const match = returns.find(r =>
                        (card.order_item_id && String(r.order_details_id) === String(card.order_item_id)) ||
                        (!card.order_item_id && String(r.order_id) === String(card.order_id))
                    );
                    if (match) card.return_status = match.status || null;
                }
            });
            setOrders(formatted);

        } catch (err) {
            await loadOrders();
            alert('Failed to confirm order.');
        }
    }, [loadOrders, formatOrders, showToast]);

    const handleRateOrder = useCallback(async ({ orderId, productId, orderItemId, rating, review, artistRating, artistReview, riderRating, riderReview, order }) => {
        if (!rating) throw new Error('No rating provided.');
        const payload = {
            order_id: orderId,
            product_id: productId || order?.product_id,
            rating,
            comment: review || null,
            artist_rating: artistRating || null,
            artist_comment: artistReview || null,
            rider_rating: riderRating || null,
            rider_comment: riderReview || null,
        };
        const detailsId = orderItemId || order?.order_item_id || null;
        if (detailsId) payload.order_details_id = Number(detailsId);

        setOrders(prev => prev.map(card => {
            const match =
                (detailsId && String(card.order_item_id) === String(detailsId)) ||
                (!detailsId && String(card.order_id) === String(orderId) && String(card.product_id) === String(payload.product_id));
            if (!match) return card;
            return { ...card, has_review: true, rating, comment: review || card.comment, sortDate: new Date().toISOString() };
        }));

        await submitReview(payload);
        showToast('Review submitted successfully!');
        setTimeout(() => loadOrders(), 800);
    }, [currentUser, loadOrders, showToast]);

    const handleReturnRefund = useCallback(async (formData) => {
        const orderItemId = formData.get('order_details_id');
        const orderId = formData.get('order_id');

        if (orderItemId) {
            setOrders(prev => prev.map(card =>
                String(card.order_item_id) === String(orderItemId)
                    ? { ...card, status: 'Return/Refund', sortDate: new Date().toISOString() }
                    : card
            ));
        } else if (orderId) {
            setOrders(prev => prev.map(card =>
                String(card.order_id) === String(orderId) && !card.order_item_id
                    ? { ...card, status: 'Return/Refund', sortDate: new Date().toISOString() }
                    : card
            ));
        }

        await submitReturnRefund(formData);
        showToast('Return/Refund request submitted!');
        await loadOrders();
        setActiveTab('Return/Refund');
    }, [loadOrders, showToast]);

    const handleViewReturnDetail = useCallback((order) => {
        setSelectedReturnOrder(order);
    }, []);

    // ✅ Buy Again — sets UIContext checkoutData so CustomerCheckout pre-fills correctly
    const handleBuyAgain = useCallback((order) => {
        setCheckoutData({
            product: {
                id: order.product_id,
                product_id: order.product_id,
                title: order.product_name,
                product_image: order.product_image,
                image: order.product_image,
                price: order.item_price,
            },
            quantity: order.quantity || 1,
            size: order.size || null,
            buy_again: true,
        });
        navigate('/customer-checkout');
    }, [setCheckoutData, navigate]);

    const filteredOrders = orders
        .filter(order => {
            const status = normalizeStatus(order.status);
            if (activeTab === 'All') return status !== 'Cancelled';
            if (activeTab === 'To Process') return ['Pending', 'To Process'].includes(status);
            if (activeTab === 'Cancelled') return status === 'Cancelled';
            return status === activeTab;
        })
        .sort((a, b) => {
            if (activeTab === 'Return/Refund') {
                const rank = { pending: 0, approved: 1, rejected: 2, null: 3 };
                const ra = rank[a.return_status] ?? 3;
                const rb = rank[b.return_status] ?? 3;
                if (ra !== rb) return ra - rb;
            }
            return new Date(b.sortDate) - new Date(a.sortDate);
        });

    const sharedCardProps = {
        onCancelItem: handleCancelItem,
        onReceiveOrder: handleReceiveOrder,
        onRateOrder: handleRateOrder,
        onReturnRefund: handleReturnRefund,
        onSuccess: showToast,
        onViewReturnDetail: handleViewReturnDetail,
        onBuyAgain: handleBuyAgain,
        onChatWithArtist: (order) => {
            navigate('/customer-artist-inbox', { state: { selectedOrder: order } });
        },
        isVerified: isVerified,
    };

    const Spinner = ({ mobile }) => <div className="flex items-center justify-center py-20"><div className={`${mobile ? 'w-10 h-10' : 'w-12 h-12'} border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin`} /></div>;
    const EmptyState = ({ mobile }) => (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className={`${mobile ? 'w-14 h-14' : 'w-16 h-16'} mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 3H8l-2 4h12l-2-4z" />
            </svg>
            <p className={`${mobile ? 'text-sm' : ''} font-medium`}>No orders found</p>
        </div>
    );

    return (
        <>
            {toast && <Toast message={toast} onDone={() => setToast(null)} />}

            {isModal ? (
                /* MODAL CONTAINER OVERLAY */
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
                    <div
                        className="bg-white rounded-[32px] shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200"
                        style={{ height: "90vh", maxHeight: "90vh" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header of Modal */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-gray-900">My Orders</h2>
                                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">View and manage all your orders</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col min-h-0 bg-gray-50 overflow-hidden">
                            {/* Navigation Tabs and Refresh */}
                            <div className="flex-shrink-0 p-6 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                                    {tabs.map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab)}
                                            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition text-sm ${activeTab === tab ? 'bg-[#FDE31E] text-black shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => loadOrders(true)} disabled={refreshing}
                                    className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 rounded-xl text-sm font-medium transition disabled:opacity-70">
                                    <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.58 11H1M12 3v2m0 16v2m9-9H15" /></svg>
                                    {refreshing ? 'Refreshing...' : 'Refresh'}
                                </button>
                            </div>

                            {/* Scrollable list of orders */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                <ReviewReminderBanner count={reviewNeededCount} onClick={() => setActiveTab('Completed')} />
                                {loading ? (
                                    <Spinner />
                                ) : filteredOrders.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    filteredOrders.map((order, i) => (
                                        <OrderCard key={`${order.order_id}-${order.order_item_id || i}`} order={order} {...sharedCardProps} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* DESKTOP */}
                    <div className="hidden lg:flex rounded-3xl my-5 mr-5 ml-1 h-[calc(100vh-40px)] bg-white shadow-lg overflow-hidden">
                        <div className="flex flex-col w-full h-full">
                            <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-2xl font-bold">My Orders</h2>
                                    <button onClick={() => loadOrders(true)} disabled={refreshing}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-gray-400 rounded-2xl text-sm font-medium transition disabled:opacity-70">
                                        <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.58 11H1M12 3v2m0 16v2m9-9H15" /></svg>
                                        {refreshing ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                                    {tabs.map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab)}
                                            className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition ${activeTab === tab ? 'bg-[#FDE31E] text-black shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-4">
                                <ReviewReminderBanner count={reviewNeededCount} onClick={() => setActiveTab('Completed')} />
                                {loading ? (
                                    <Spinner />
                                ) : filteredOrders.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    filteredOrders.map((order, i) => (
                                        <OrderCard key={`${order.order_id}-${order.order_item_id || i}`} order={order} {...sharedCardProps} />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MOBILE */}
                    <div className="lg:hidden pt-[70px] min-h-screen bg-gray-50">
                        <div className="bg-white shadow-sm border-b border-gray-300 sticky top-[70px] z-10">
                            <div className="p-5 flex items-center justify-between">
                                <h2 className="text-2xl font-bold">My Orders</h2>
                                <button onClick={() => loadOrders(true)} disabled={refreshing}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 rounded-xl text-sm transition disabled:opacity-70">
                                    <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.58 11H1M12 3v2m0 16v2m9-9H15" /></svg>
                                    Refresh
                                </button>
                            </div>
                            <div className="flex gap-3 px-5 pb-4 overflow-x-auto scrollbar-hide">
                                {tabs.map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-full whitespace-nowrap transition text-sm ${activeTab === tab ? 'bg-[#FDE31E] text-black font-medium' : 'bg-gray-100 text-gray-700'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-y-auto px-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                            <div className="px-2 pt-2">
                                <ReviewReminderBanner count={reviewNeededCount} onClick={() => setActiveTab('Completed')} />
                            </div>
                            {loading ? (
                                <Spinner mobile />
                            ) : filteredOrders.length === 0 ? (
                                <EmptyState mobile />
                            ) : (
                                filteredOrders.map((order, i) => (
                                    <OrderCard key={`${order.order_id}-${order.order_item_id || i}`} order={order} isMobile {...sharedCardProps} />
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {selectedReturnOrder && (
                <ReturnRefundDetailModal
                    order={selectedReturnOrder}
                    onClose={() => setSelectedReturnOrder(null)}
                    onReturnStatusChange={(orderItemId, orderId, returnStatus) => {
                        setOrders(prev => prev.map(card => {
                            if (orderItemId && String(card.order_item_id) === String(orderItemId)) {
                                return { ...card, return_status: returnStatus, sortDate: new Date().toISOString() };
                            }
                            if (!orderItemId && String(card.order_id) === String(orderId)) {
                                return { ...card, return_status: returnStatus, sortDate: new Date().toISOString() };
                            }
                            return card;
                        }));
                    }}
                />
            )}

            {selectedChatOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setSelectedChatOrder(null)}>
                    <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-gray-900">Chat with Artist</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Order #{selectedChatOrder.order_number} — {selectedChatOrder.product_name}</p>
                            </div>
                            <button onClick={() => setSelectedChatOrder(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <DesignChatbox
                                productId={selectedChatOrder.product_id}
                                orderId={selectedChatOrder.order_id}
                                orderStatus={selectedChatOrder.status}
                                onImageUpload={() => { }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
                @keyframes modalPop { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </>
    );
};

export default CustomerOrders;
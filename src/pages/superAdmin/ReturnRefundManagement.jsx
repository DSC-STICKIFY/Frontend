import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    fetchAllReturns,
    updateReturnStatus,
    sendReturnMessage,
    fetchReturnMessages,
} from "../../services/OrdersAPI";
import { IMAGE_BASE_URL } from "../../services/api";
import { useAdminAuth } from '../../context/AdminAuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getUrl = (p) => {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    return `${IMAGE_BASE_URL}${p.startsWith("/") ? p.slice(1) : p}`;
};

const fmtDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
};

const STATUS = {
    pending:   { label: "Pending",  bg: "bg-yellow-50",  text: "text-yellow-700",  border: "border-yellow-200",  dot: "bg-yellow-400"  },
    approved:  { label: "Approved", bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-400"    },
    refunded:  { label: "Refunded", bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-400"  },
    completed: { label: "Completed",bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",   dot: "bg-green-400"   },
    rejected:  { label: "Rejected", bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-400"     },
};

const StatusBadge = ({ status }) => {
    const s = STATUS[status] || STATUS.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    );
};

const Img = ({ src, alt, className = "" }) => {
    const [err, setErr] = useState(false);
    const url = getUrl(src);
    if (!url || err) {
        return (
            <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"/>
                </svg>
            </div>
        );
    }
    return <img src={url} alt={alt} className={`${className} object-cover`} onError={() => setErr(true)} />;
};

// ── Media Preview ─────────────────────────────────────────────────────────────
const MediaGrid = ({ media }) => {
    const [lightbox, setLightbox] = useState(null);
    if (!media?.length) return <p className="text-xs text-gray-400 italic">No evidence uploaded.</p>;

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {media.map((m, i) => {
                    const url = getUrl(m.file_path);
                    if (m.file_type === "image") {
                        return (
                            <button key={i} onClick={() => setLightbox(url)}
                                className="w-16 h-16 rounded-xl overflow-hidden border border-[#DCDCDC] hover:border-yellow-400 transition flex-shrink-0">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                        );
                    }
                    return (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                            className="w-16 h-16 rounded-xl bg-gray-900 border border-[#DCDCDC] hover:border-yellow-400 transition flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </a>
                    );
                })}
            </div>

            {lightbox && (
                <div className="fixed inset-0 z-[999] p-4 flex items-center justify-center bg-black/60"
                    onClick={() => setLightbox(null)}>
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center font-bold text-lg"
                            onClick={() => setLightbox(null)}>
                            ✕
                        </button>
                        <img src={lightbox} alt="evidence" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl border-4 border-white" />
                    </div>
                </div>
            )}
        </>
    );
};

// ── Chat Thread ───────────────────────────────────────────────────────────────
const ChatThread = ({ returnId, currentUserId }) => {
    const [messages, setMessages] = useState([]);
    const [text, setText]         = useState("");
    const [sending, setSending]   = useState(false);
    const [loading, setLoading]   = useState(true);
    const bottomRef               = useRef(null);

    const load = useCallback(async () => {
        try {
            const data = await fetchReturnMessages(returnId);
            setMessages(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to load messages", e);
        } finally {
            setLoading(false);
        }
    }, [returnId]);

    useEffect(() => {
        load();
        const iv = setInterval(load, 8000);
        return () => clearInterval(iv);
    }, [load]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const send = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try {
            const msg = await sendReturnMessage(returnId, text.trim());
            setMessages(prev => [...prev, msg]);
            setText("");
        } catch (e) {
            console.error("Failed to send message", e);
        } finally {
            setSending(false);
        }
    };

    const onKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3" style={{ maxHeight: 320 }}>
                {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm">No messages yet. Start the conversation.</p>
                    </div>
                ) : messages.map((msg, i) => {
                    // Admin side: isMe = true when sender_type is 'admin' (current viewer)
                    const isMe = msg.sender_type === "admin";
                    const name = msg.sender
                        ? `${msg.sender.first_name || ""} ${msg.sender.last_name || ""}`.trim()
                        : (isMe ? "Admin" : "Customer");

                    return (
                        <div key={msg.id || i} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${isMe ? "bg-gray-800" : "bg-orange-400"}`}>
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                                <p className={`text-[10px] text-gray-400 ${isMe ? "text-right" : ""}`}>
                                    {name} · {fmtDate(msg.created_at)}
                                </p>
                                <div className={`px-3 py-2 rounded-2xl text-sm ${
                                    isMe
                                        ? "bg-gray-800 text-white rounded-tr-sm"
                                        : "bg-gray-50 text-gray-800 border border-[#DCDCDC] rounded-tl-sm"
                                }`}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 items-end border-t border-[#DCDCDC] pt-3">
                <textarea
                    rows={2}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Type a message..."
                    className="flex-1 text-sm border border-[#DCDCDC] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-gray-50"
                />
                <button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    className="w-10 h-10 bg-[#FDE31E] hover:bg-yellow-400 text-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition shadow-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// ── Request Row ───────────────────────────────────────────────────────────────
const RequestRow = ({ item, selected, onClick }) => {
    const product     = item.order_detail?.product || {};
    const productName = item.product_name || product.product_name || "Product";
    const productImg  = item.order_detail?.product_image || product.product_image || null;
    const customer    = item.user || {};
    const custName    = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer";

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-3.5 border-b border-[#DCDCDC] hover:bg-gray-50 transition flex items-start gap-3 ${selected ? "bg-gray-50 border-l-4 border-l-[#FDE31E]" : ""}`}>
            <Img src={productImg} alt={productName} className="w-10 h-10 rounded-lg flex-shrink-0 border border-[#DCDCDC] mt-0.5" />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{productName}</p>
                    <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-gray-500 truncate">{custName}</p>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.reason}</p>
                <p className="text-[9px] text-gray-300 mt-1 uppercase font-bold">{fmtDate(item.created_at)}</p>
            </div>
        </button>
    );
};

// ── Admin Refund Summary Block ────────────────────────────────────────────────
// Derives the applied % from stored refund_amount vs item subtotal.
// No extra API fetch needed — backend already computed and saved the correct
// refund_amount at submission time using the setting that was active then.
const AdminRefundSummary = ({ item }) => {
    const refundAmount = Number(item?.refund_amount || 0);

    const paymentMethod = item?.order?.payment_method || "";
    const isCOD = !paymentMethod ||
        ['cod', 'cash on delivery', 'cash'].includes(paymentMethod.toLowerCase());

    // Derive applied % from stored amounts
    const detail     = item?.order_detail || {};
    const unitPrice  = Number(detail.item_price ?? detail.price ?? 0);
    const qty        = Number(detail.quantity ?? 1);
    const itemTotal  = unitPrice * qty;
    const appliedPct = itemTotal > 0 ? Math.round((refundAmount / itemTotal) * 100) : null;

    return (
        <div className="bg-gray-50 rounded-xl border border-[#DCDCDC] overflow-hidden">
            <div className="px-4 pt-4 pb-3 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Refund Summary</p>

                {/* Applied refund % */}
                {appliedPct !== null && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Policy applied</span>
                        <span className="font-semibold text-gray-700">{appliedPct}% refund</span>
                    </div>
                )}

                {/* Item total (original price) */}
                {itemTotal > 0 && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Item total</span>
                        <span className="text-gray-400 line-through">
                            ₱{itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Refund destination */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Refund via</span>
                    <span className="font-semibold text-gray-800">
                        {isCOD ? 'GCash (COD order)' : paymentMethod || 'COD'}
                    </span>
                </div>

                {/* GCash number — prominent for admin to act on */}
                {isCOD && item?.gcash_number && (
                    <div className="mt-1 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                            Send refund to this GCash number
                        </p>
                        <p className="text-lg font-black tracking-widest text-blue-900">
                            {item.gcash_number}
                        </p>
                    </div>
                )}

                {/* COD but no GCash number provided */}
                {isCOD && !item?.gcash_number && (
                    <div className="mt-1 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5">
                        <p className="text-xs font-semibold text-yellow-700">⚠ No GCash number provided</p>
                        <p className="text-[10px] text-yellow-600 mt-0.5">Coordinate with customer via chat.</p>
                    </div>
                )}
            </div>

            {/* Total refund — dark footer bar */}
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">Total Refund</span>
                <span className="text-xl font-black text-[#FDE31E]">
                    ₱{refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ item, onClose, onStatusChange }) => {
    const { currentUser } = useAdminAuth();
    const [acting, setActing] = useState(false);
    const [tab, setTab]       = useState("details");
    const [proof, setProof]   = useState(null);
    const fileRef             = useRef(null);

    if (!item) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p className="text-sm font-medium">Select a request to view details</p>
            </div>
        );
    }

    const product     = item.order_detail?.product || {};
    const productName = item.product_name || product.product_name || "Product";
    const productImg  = item.order_detail?.product_image || product.product_image || null;
    const customer    = item.user || {};
    const custName    = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Customer";

    const handleAction = async (status, proofFile = null) => {
        setActing(true);
        try {
            const res = await updateReturnStatus(item.id, status, proofFile);
            onStatusChange(item.id, res.data?.status || status, res.data);
            if (proofFile) setProof(null);
        } catch (e) {
            console.error("Status update failed", e);
        } finally {
            setActing(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">Return Request</p>
                    <h3 className="text-lg font-bold text-gray-900 mt-0.5">#{item.id}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    {onClose && (
                        <button onClick={onClose} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl">
                {["details", "chat"].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition capitalize ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                        {t === "chat" ? "💬 Chat" : "📋 Details"}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
                {tab === "details" ? (
                    <div className="space-y-5">
                        {/* Product Card */}
                        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4 border border-[#DCDCDC]">
                            <Img src={productImg} alt={productName} className="w-16 h-16 rounded-xl border border-[#DCDCDC]" />
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{productName}</p>
                                {item.order_detail?.size && <p className="text-xs text-gray-500">Size: {item.order_detail.size}</p>}
                                <p className="text-xs text-gray-500">Qty: {item.order_detail?.quantity || 1}</p>
                            </div>
                        </div>

                        {/* Refund Summary — derives % from stored data, no fetch */}
                        <AdminRefundSummary item={item} />

                        {/* Customer */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Customer</p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold flex-shrink-0">
                                    {custName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold">{custName}</p>
                                    {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
                                    {customer.contact_number && <p className="text-xs text-gray-500">{customer.contact_number}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Order Info */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Order Information</p>
                            <div className="flex justify-between"><span className="text-gray-500">Order ID</span> <span className="font-mono">{item.order?.order_number || `#${item.order_id}`}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Payment</span> <span>{item.order?.payment_method || "COD"}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Submitted</span> <span>{fmtDate(item.created_at)}</span></div>
                        </div>

                        {/* Reason */}
                        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                            <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">Reason</p>
                            <p className="text-gray-900 font-medium">{item.reason}</p>
                        </div>

                        {/* Description */}
                        {item.description && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Description</p>
                                <p className="text-sm text-gray-700">{item.description}</p>
                            </div>
                        )}

                        {/* Evidence */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">
                                Evidence ({item.media?.length || 0})
                            </p>
                            <MediaGrid media={item.media || []} />
                        </div>

                        {/* Admin Actions */}
                        {item.status === "pending" && (
                            <div className="pt-2">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAction("approved")}
                                        disabled={acting}
                                        className="flex-1 py-3.5 bg-[#FDE31E] hover:bg-yellow-400 text-gray-900 font-bold rounded-2xl transition disabled:opacity-50 shadow-sm border border-yellow-500">
                                        ✓ Approve Return
                                    </button>
                                    <button
                                        onClick={() => handleAction("rejected")}
                                        disabled={acting}
                                        className="flex-1 py-3.5 bg-white hover:bg-red-50 text-red-600 font-bold rounded-2xl transition disabled:opacity-50 border border-red-100">
                                        ✕ Reject
                                    </button>
                                </div>
                            </div>
                        )}

                        {item.status === "approved" && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">1</div>
                                        <p className="text-sm font-bold text-blue-900">Return Approved. Refund in process.</p>
                                    </div>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        The return claim has been accepted. Please send the refund amount to the customer's provided payment source.
                                    </p>
                                </div>

                                {/* Manual Refund Step */}
                                <div className="bg-white border border-[#DCDCDC] rounded-2xl p-4 shadow-sm">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Manual Refund Verification</p>
                                    
                                    {!proof ? (
                                        <button 
                                            onClick={() => fileRef.current?.click()}
                                            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center hover:bg-gray-50 transition gap-2">
                                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <span className="text-xs text-gray-500 font-medium">Click to upload refund screenshot</span>
                                            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={e => setProof(e.target.files[0])} />
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#DCDCDC]">
                                                <img src={URL.createObjectURL(proof)} alt="proof" className="w-full h-full object-cover" />
                                                <button onClick={() => setProof(null)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px]">✕</button>
                                            </div>
                                            <button 
                                                onClick={() => handleAction("refunded", proof)}
                                                disabled={acting}
                                                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2">
                                                {acting ? "Updating..." : "✓ Mark as Refunded"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {item.status === "refunded" && (
                            <div className="space-y-4">
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">2</div>
                                        <p className="text-sm font-bold text-orange-900">Refund Sent. Awaiting confirmation.</p>
                                    </div>
                                    <p className="text-xs text-orange-700 leading-relaxed">
                                        {item.paymongo_refund_id 
                                            ? `Refund was automatically processed via PayMongo (ID: ${item.paymongo_refund_id}).`
                                            : "You have sent the refund manually. We are waiting for the customer to confirm receipt of funds."}
                                    </p>
                                </div>

                                {item.refund_proof && (
                                    <div className="bg-white border border-[#DCDCDC] rounded-2xl p-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Refund Receipt</p>
                                        <Img src={item.refund_proof} alt="Refund Receipt" className="w-full h-48 rounded-xl border border-[#DCDCDC]" />
                                    </div>
                                )}
                            </div>
                        )}

                        {item.status === "completed" && (
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-green-700 text-sm">
                                <div className="flex items-center gap-3 mb-1">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <p className="font-bold">Refund Successfully Completed</p>
                                </div>
                                <p className="ml-8 text-xs leading-relaxed opacity-80">
                                    The customer has confirmed receipt of the refund. This transaction is now closed.
                                </p>
                            </div>
                        )}

                        {item.status === "rejected" && (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 font-medium">
                                ✕ Return request has been rejected.
                            </div>
                        )}
                    </div>
                ) : (
                    <ChatThread returnId={item.id} currentUserId={currentUser?.user_id || currentUser?.id} />
                )}
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ReturnRefundManagement = () => {
    const [returns, setReturns]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [selected, setSelected]     = useState(null);
    const [filter, setFilter]         = useState("all");
    const [search, setSearch]         = useState("");
    const [showDetail, setShowDetail] = useState(false);

    const fetchReturns = useCallback(async () => {
        try {
            const data = await fetchAllReturns();
            setReturns(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to load returns:", e);
        }
    }, []);

    const initialLoad = useCallback(async () => {
        setLoading(true);
        await fetchReturns();
        setLoading(false);
    }, [fetchReturns]);

    useEffect(() => {
        initialLoad();
        const interval = setInterval(fetchReturns, 15000);
        return () => clearInterval(interval);
    }, [initialLoad, fetchReturns]);

    const handleStatusChange = useCallback((returnId, newStatus, fullData = null) => {
        setReturns(prev => prev.map(r => r.id === returnId ? (fullData || { ...r, status: newStatus }) : r));
        setSelected(prev => prev?.id === returnId ? (fullData || { ...prev, status: newStatus }) : prev);
    }, []);

    const counts = {
        all:       returns.length,
        pending:   returns.filter(r => r.status === "pending").length,
        approved:  returns.filter(r => r.status === "approved").length,
        refunded:  returns.filter(r => r.status === "refunded").length,
        completed: returns.filter(r => r.status === "completed").length,
        rejected:  returns.filter(r => r.status === "rejected").length,
    };

    const filtered = returns.filter(r => {
        const matchStatus = filter === "all" || r.status === filter;
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (r.product_name || "").toLowerCase().includes(q) ||
            (r.reason || "").toLowerCase().includes(q) ||
            (`${r.user?.first_name || ""} ${r.user?.last_name || ""}`).toLowerCase().includes(q) ||
            String(r.order_id).includes(q);
        return matchStatus && matchSearch;
    });

    const handleSelect = (item) => {
        setSelected(item);
        setShowDetail(true);
    };

    const TABS = [
        { key: "all",       label: "All"       },
        { key: "pending",   label: "Pending"   },
        { key: "approved",  label: "Approved"  },
        { key: "refunded",  label: "Refunded"  },
        { key: "completed", label: "Completed" },
        { key: "rejected",  label: "Rejected"  },
    ];

    return (
        <div className="my-5 mr-5 ml-1 bg-white rounded-3xl shadow-md overflow-hidden flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Return & Refund</h1>
                        <p className="text-sm text-gray-500">Manage customer return/refund requests</p>
                    </div>
                    <button onClick={initialLoad} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    </button>
                </div>

                <div className="flex gap-1 mt-5 bg-gray-100 p-1 rounded-xl w-fit">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setFilter(t.key)}
                            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${filter === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                            {t.label}
                            {counts[t.key] > 0 && (
                                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-gray-700">
                                    {counts[t.key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left List */}
                <div className={`flex flex-col border-r border-gray-100 ${showDetail ? "hidden lg:flex" : "flex"} lg:w-[380px] w-full flex-shrink-0`}>
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search product, customer, reason..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin"/>
                                <p className="mt-4 text-sm text-gray-400">Loading requests...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <p>No requests found</p>
                            </div>
                        ) : (
                            filtered.map(item => (
                                <RequestRow
                                    key={item.id}
                                    item={item}
                                    selected={selected?.id === item.id}
                                    onClick={() => handleSelect(item)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Right Detail Panel */}
                <div className={`flex-1 overflow-y-auto p-6 ${showDetail ? "flex" : "hidden lg:flex"} flex-col`}>
                    {showDetail && (
                        <button
                            onClick={() => setShowDetail(false)}
                            className="lg:hidden mb-4 text-orange-500 font-semibold flex items-center gap-1">
                            ← Back to list
                        </button>
                    )}
                    <DetailPanel
                        item={selected}
                        onClose={() => setShowDetail(false)}
                        onStatusChange={handleStatusChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReturnRefundManagement;
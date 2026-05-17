import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAllReturns, fetchReturnMessages, sendReturnMessage } from '../../services/OrdersAPI';
import { IMAGE_BASE_URL } from '../../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getUrl = (p) => {
    if (!p) return null;
    if (p.startsWith('http')) return p;
    return `${IMAGE_BASE_URL}${p.startsWith('/') ? p.slice(1) : p}`;
};

const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending:   { label: 'Pending Review', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-400' },
        approved:  { label: 'Approved',       bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-400'   },
        refunded:  { label: 'Refunded',       bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-400' },
        completed: { label: 'Completed',      bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
        rejected:  { label: 'Rejected',       bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-400'   },
    };
    const s = map[status] || map.pending;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${s.dot}`} />
            {s.label}
        </span>
    );
};

// ── Product Image ─────────────────────────────────────────────────────────────
const ProductImg = ({ src, alt, className = '' }) => {
    const [err, setErr] = useState(false);
    const url = getUrl(src);
    if (!url || err) return (
        <div className={`bg-gray-100 flex items-center justify-center rounded-xl ${className}`}>
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
            </svg>
        </div>
    );
    return <img src={url} alt={alt} className={`${className} object-cover`} onError={() => setErr(true)} />;
};

// ── Media Grid with Lightbox ──────────────────────────────────────────────────
const MediaGrid = ({ media }) => {
    const [lightbox, setLightbox] = useState(null);
    if (!media?.length) return (
        <div className="flex items-center gap-2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <p className="text-xs italic">No evidence uploaded.</p>
        </div>
    );
    return (
        <>
            <div className="flex flex-wrap gap-2">
                {media.map((m, i) => {
                    const url = getUrl(m.file_path);
                    if (m.file_type === 'image') return (
                        <button key={i} onClick={() => setLightbox(url)}
                            className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-orange-400 transition flex-shrink-0 focus:outline-none">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                    );
                    return (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                            className="w-16 h-16 rounded-xl bg-gray-900 border-2 border-gray-200 hover:border-orange-400 transition flex flex-col items-center justify-center flex-shrink-0 gap-1">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            <span className="text-[8px] text-gray-400">Video</span>
                        </a>
                    );
                })}
            </div>
            {lightbox && (
                <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}>
                    <img src={lightbox} alt="evidence" className="max-w-full max-h-full rounded-2xl object-contain" />
                    <button onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </>
    );
};

// ── Chat Thread ───────────────────────────────────────────────────────────────
const ChatThread = ({ returnId }) => {
    const [messages, setMessages] = useState([]);
    const [text, setText]         = useState('');
    const [sending, setSending]   = useState(false);
    const [loading, setLoading]   = useState(true);
    const bottomRef               = useRef(null);

    const loadMessages = useCallback(async (isPolling = false) => {
        try {
            const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
            const data = await fetchReturnMessages(returnId, isPolling ? lastId : null);
            const arr = Array.isArray(data) ? data : [];
            
            if (arr.length === 0 && isPolling) return;

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const newOnly = arr.filter(m => !existingIds.has(m.id));
                if (newOnly.length === 0) return prev;
                return [...prev.filter(m => !String(m.id).startsWith('temp-')), ...newOnly];
            });
        } catch { /* silent */ }
        finally { if (!isPolling) setLoading(false); }
    }, [returnId, messages]);

    useEffect(() => {
        loadMessages(); // Initial full load
    }, []); // Only once on mount

    useEffect(() => {
        const iv = setInterval(() => loadMessages(true), 3000);
        return () => clearInterval(iv);
    }, [loadMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        const msg = text.trim();
        const optimistic = {
            id: `temp-${Date.now()}`,
            message: msg,
            sender_type: 'user', // customer is always 'user'
            sender: null,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setText('');
        setSending(true);
        try {
            const real = await sendReturnMessage(returnId, msg);
            setMessages(prev => prev.map(m => m.id === optimistic.id ? (real || optimistic) : m));
        } catch {
            setMessages(prev => prev.filter(m => m.id !== optimistic.id));
            setText(msg);
        } finally {
            setSending(false);
        }
    };

    const onKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col" style={{ minHeight: 320 }}>
            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4" style={{ maxHeight: 320 }}>
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-500">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">Send a message to the support team</p>
                    </div>
                ) : messages.map((msg, i) => {
                    // Customer side: isMe = true when sender_type is 'user' (current viewer)
                    const isMe         = msg.sender_type === 'user';
                    const isOptimistic = String(msg.id).startsWith('temp-');
                    const name = msg.sender
                        ? `${msg.sender.first_name || ''} ${msg.sender.last_name || ''}`.trim()
                        : (isMe ? 'You' : 'Support Team');

                    return (
                        <div key={msg.id || i} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-1 ${isMe ? 'bg-orange-500' : 'bg-gray-800'}`}>
                                {isMe ? name.charAt(0).toUpperCase() : '🛡'}
                            </div>
                            <div className={`flex flex-col gap-1 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <p className="text-[10px] text-gray-400 px-1">
                                    {name} · {fmtDate(msg.created_at)} {fmtTime(msg.created_at)}
                                </p>
                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                    isMe
                                        ? `bg-orange-500 text-white rounded-tr-sm ${isOptimistic ? 'opacity-60' : ''}`
                                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                }`}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-100 pt-3 mt-2">
                <div className="flex gap-2 items-end">
                    <textarea
                        rows={2}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Type a message… (Enter to send)"
                        className="flex-1 text-sm border border-gray-200 rounded-2xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 transition bg-gray-50"
                    />
                    <button onClick={handleSend} disabled={!text.trim() || sending}
                        className="w-10 h-10 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition shadow-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    );
};

// ── Refund Summary Block ──────────────────────────────────────────────────────
// Reads only from the stored returnData — no extra fetch needed.
// The backend already computed and saved the correct refund_amount at submission time.
const RefundSummary = ({ returnData, order }) => {
    const refundAmount = Number(returnData?.refund_amount || 0);

    const paymentMethod = returnData?.order?.payment_method || order?.payment_method || '';
    const isCOD = !paymentMethod ||
        ['cod', 'cash on delivery', 'cash'].includes(paymentMethod.toLowerCase());

    // Derive the % that was applied: refund_amount / (unit_price * qty)
    const unitPrice  = Number(returnData?.order_detail?.item_price ?? returnData?.order_detail?.price ?? 0);
    const qty        = Number(returnData?.order_detail?.quantity ?? 1);
    const itemTotal  = unitPrice * qty;
    const appliedPct = itemTotal > 0 ? Math.round((refundAmount / itemTotal) * 100) : null;

    return (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3 space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Refund Summary</p>

                {/* Refund destination */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Refund to</span>
                    <span className="font-semibold text-gray-800">
                        {isCOD
                            ? 'GCash Wallet'
                            : paymentMethod.toLowerCase() === 'gcash'
                                ? 'Original GCash'
                                : paymentMethod || 'COD → GCash'}
                    </span>
                </div>

                {/* GCash number — shown only when COD and customer provided one */}
                {isCOD && returnData?.gcash_number && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">GCash number</span>
                        <span className="font-mono font-semibold text-blue-700 tracking-wider">
                            {returnData.gcash_number}
                        </span>
                    </div>
                )}

                {/* Applied % — derived from stored amounts, no API call */}
                {appliedPct !== null && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Refund rate</span>
                        <span className="font-semibold text-gray-800">{appliedPct}% of item price</span>
                    </div>
                )}
            </div>

            {/* Total refund amount — highlighted footer */}
            <div className="bg-gray-900 px-4 py-3 flex items-center justify-between rounded-b-2xl">
                <span className="text-sm font-bold text-white">Refund Amount</span>
                <span className="text-xl font-black text-[#FDE31E]">
                    ₱{refundAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
};

// ── Main Modal ────────────────────────────────────────────────────────────────
const ReturnRefundDetailModal = ({ order, onClose }) => {
    const [returnData, setReturnData] = useState(null);
    const [loading, setLoading]       = useState(true);
    const [acting, setActing]         = useState(false);
    const [error, setError]           = useState(null);
    const [activeTab, setActiveTab]   = useState('details');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const all  = await fetchAllReturns();
            const list = Array.isArray(all) ? all : (all?.data || []);

            let found = null;
            if (order.order_item_id) {
                found = list.find(r =>
                    (r.order_details_id == order.order_item_id) &&
                    (r.order_id == order.order_id)
                );
            }
            if (!found) {
                found = list.find(r => r.order_id == order.order_id);
            }
            if (!found) {
                setError('No return request found for this item.');
                return;
            }
            setReturnData(found);
        } catch (e) {
            setError('Failed to load return request details.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [order.order_id, order.order_item_id]);

    useEffect(() => { load(); }, [load]);

    const handleConfirmReceipt = async () => {
        if (!returnData?.id || acting) return;
        setActing(true);
        try {
            const { updateReturnStatus } = await import('../../services/OrdersAPI');
            await updateReturnStatus(returnData.id, 'completed');
            await load();
        } catch (e) {
            console.error(e);
            alert("Failed to confirm receipt. Please try again.");
        } finally {
            setActing(false);
        }
    };

    const productName = returnData?.product_name
        || returnData?.order_detail?.product?.product_name
        || order?.product_name
        || 'Product';
    const productImg  = returnData?.order_detail?.product_image
        || returnData?.order_detail?.product?.product_image
        || order?.product_image
        || null;
    const productSize = returnData?.order_detail?.size || order?.size || null;
    const productQty  = returnData?.order_detail?.quantity || order?.quantity || 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-0.5">
                            Return / Refund Request
                        </p>
                        <h2 className="text-xl font-bold text-gray-900">
                            {loading ? 'Loading…' : returnData ? `Request #${returnData.id}` : 'Not Found'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {returnData && !loading && <StatusBadge status={returnData.status} />}
                        <button onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-400 rounded-full animate-spin" />
                            <p className="text-sm text-gray-500">Loading request details…</p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className="text-center space-y-3 px-6">
                            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto">
                                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-700">{error}</p>
                            <p className="text-xs text-gray-400">
                                If you just submitted the request, please wait a moment and try again.
                            </p>
                            <button onClick={load}
                                className="text-sm text-orange-500 hover:text-orange-600 font-semibold underline">
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Content */}
                {!loading && !error && returnData && (
                    <>
                        {/* Tabs */}
                        <div className="px-6 pt-4 pb-0 flex-shrink-0">
                            <div className="flex bg-gray-100 p-1 rounded-2xl">
                                {[
                                    { key: 'details', label: '📋 Details' },
                                    { key: 'chat',    label: '💬 Chat with Support' },
                                ].map(t => (
                                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition ${
                                            activeTab === t.key
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {activeTab === 'details' ? (
                                <div className="space-y-4">
                                    {/* Product card */}
                                    <div className="flex items-center gap-3 bg-orange-50 rounded-2xl p-3.5 border border-orange-100">
                                        <ProductImg src={productImg} alt={productName} className="w-14 h-14 rounded-xl flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-900 truncate">{productName}</p>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                {productSize && (
                                                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                                        Size: {productSize}
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500">Qty: {productQty}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Reason</p>
                                        <p className="text-sm font-semibold text-gray-900">{returnData.reason}</p>
                                    </div>

                                    {/* Description */}
                                    {returnData.description && (
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Description</p>
                                            <p className="text-sm text-gray-700 leading-relaxed">{returnData.description}</p>
                                        </div>
                                    )}

                                    {/* Refund Summary — reads stored data only, no extra fetch */}
                                    <RefundSummary returnData={returnData} order={order} />

                                    {/* Evidence */}
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            Uploaded Evidence ({returnData.media?.length || 0} file{returnData.media?.length !== 1 ? 's' : ''})
                                        </p>
                                        <MediaGrid media={returnData.media || []} />
                                    </div>

                                    {/* Order info */}
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Information</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Order ID</span>
                                            <span className="font-mono font-semibold text-gray-900">
                                                {returnData.order?.order_number || `#${returnData.order_id}`}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Submitted</span>
                                            <span className="font-medium text-gray-900">{fmtDate(returnData.created_at)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Payment</span>
                                            <span className="font-medium text-gray-900">
                                                {returnData.order?.payment_method || order?.payment_method || 'COD'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status banners */}
                                    {returnData.status === 'pending' && (
                                        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3.5">
                                            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-800">Under Review</p>
                                                <p className="text-xs text-yellow-600 mt-0.5">
                                                    Our team is reviewing your request. You can chat with support while you wait.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {returnData.status === 'approved' && (
                                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3.5">
                                            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 01-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-semibold text-blue-800">Refund in Process</p>
                                                <p className="text-xs text-blue-600 mt-0.5">
                                                    Your return is approved. Our team is now preparing your refund to your original payment source or GCash.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {returnData.status === 'refunded' && (
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5">
                                                <svg className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-semibold text-orange-800">Refund Sent!</p>
                                                    <p className="text-xs text-orange-600 mt-0.5 leading-relaxed">
                                                        {returnData.paymongo_refund_id 
                                                            ? `Refund has been automatically sent via PayMongo (Ref: ${returnData.paymongo_refund_id}).`
                                                            : "The merchant has sent your refund manually. Please check your account and confirm receipt below."}
                                                    </p>
                                                </div>
                                            </div>

                                            {returnData.refund_proof && (
                                                <div className="bg-white border border-[#DCDCDC] rounded-2xl p-4">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Merchant Refund Receipt</p>
                                                    <ProductImg src={returnData.refund_proof} alt="Refund Receipt" className="w-full h-48 rounded-xl border border-[#DCDCDC]" />
                                                </div>
                                            )}

                                            {!returnData.paymongo_refund_id && (
                                                <button 
                                                    onClick={handleConfirmReceipt}
                                                    disabled={acting}
                                                    className="w-full py-4 bg-[#FDE31E] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition shadow-md disabled:opacity-50">
                                                    {acting ? 'Confirming...' : '✓ Confirm Refund Received'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {returnData.status === 'completed' && (
                                        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5">
                                            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-semibold text-green-800">Refund Completed</p>
                                                <p className="text-xs text-green-600 mt-0.5">
                                                    You have confirmed the receipt of your refund. This request is now successfully closed.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {returnData.status === 'rejected' && (
                                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
                                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-semibold text-red-800">Request Rejected</p>
                                                <p className="text-xs text-red-600 mt-0.5">
                                                    Your return request was not approved. Chat with support if you have questions.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={() => setActiveTab('chat')}
                                        className="w-full py-3 border-2 border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold rounded-2xl transition text-sm flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                        Chat with Support Team
                                    </button>

                                    <div className="h-2" />
                                </div>
                            ) : (
                                <ChatThread returnId={returnData.id} />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ReturnRefundDetailModal;
import React, { useState, useEffect } from 'react';
import PromoApi from '../../services/PromoApi';
import { IMAGE_BASE_URL } from '../../services/api';

const targetLabels = {
    all_verified: 'All Verified Customers',
    recent_buyers: 'Recent Buyers (Last 30 Days)',
    custom_order_customers: 'Custom Order Customers',
    inactive_customers: 'Inactive Customers (90+ Days)',
};

const getApplicableDetails = (promo) => {
    if (!promo) return { type: 'Global', items: 'Applies to all products' };
    if (promo.products && promo.products.length > 0) {
        return { type: 'Product', items: promo.products.map(p => p.product_name || p.name).join(', ') };
    }
    if (promo.categories && promo.categories.length > 0) {
        return { type: 'Category', items: promo.categories.map(c => c.category_name).join(', ') };
    }
    if (promo.types && promo.types.length > 0) {
        return { type: 'Type', items: promo.types.map(t => t.type_name).join(', ') };
    }
    return { type: 'Global', items: 'Applies to all products' };
};

const formatDate = (dateStr) => {
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateStr; }
};

const roundValue = (val) => {
    try {
        const num = parseFloat(val);
        return isNaN(num) ? val : Math.round(num);
    } catch (e) { return val; }
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const configs = {
        pending_review: { label: 'Pending Review', dot: 'bg-amber-400', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        ready_to_send:  { label: 'Ready to Send',  dot: 'bg-indigo-500', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
        sent:           { label: 'Active',          dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        expired:        { label: 'Expired',         dot: 'bg-rose-400',   cls: 'bg-rose-50 text-rose-700 border-rose-200' },
        cancelled:      { label: 'Inactive',        dot: 'bg-gray-400',   cls: 'bg-gray-50 text-gray-500 border-gray-200' },
    };
    const c = configs[status] || { label: status, dot: 'bg-gray-400', cls: 'bg-gray-50 text-gray-500 border-gray-200' };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${c.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
            {c.label}
        </span>
    );
};

// ── Icon components (no emojis) ───────────────────────────────────────────────
const IconRefresh = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);
const IconEye = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
const IconCheck = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);
const IconSend = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);
const IconChart = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);
const IconTrash = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const IconClose = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);
const IconMail = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);
const IconTag = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a2 2 0 012-2z" />
    </svg>
);
const IconEmpty = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
);

const TABS = [
    { id: 'pending_review', label: 'Pending Review' },
    { id: 'ready_to_send',  label: 'Ready to Send'  },
    { id: 'sent',           label: 'Sent'            },
    { id: 'expired',        label: 'Expired'         },
    { id: 'cancelled',      label: 'Cancelled'       },
];

// ── Main Component ────────────────────────────────────────────────────────────
const CustomerServiceOffers = () => {
    const [queue, setQueue]                   = useState({});
    const [loading, setLoading]               = useState(true);
    const [activeTab, setActiveTab]           = useState('pending_review');
    const [toast, setToast]                   = useState(null);
    const [previewPromo, setPreviewPromo]     = useState(null);
    const [confirmPromo, setConfirmPromo]     = useState(null);
    const [analyticsPromo, setAnalyticsPromo] = useState(null);
    const [analyticsData, setAnalyticsData]   = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [sending, setSending]               = useState(false);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const data = await PromoApi.getQueue();
            setQueue(data || {});
        } catch {
            showToast('Failed to load promotion queue', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQueue(); }, []);

    const handleReview = async (id) => {
        try {
            await PromoApi.review(id);
            showToast('Promotion marked as ready to send');
            fetchQueue();
        } catch (err) {
            showToast(err.response?.data?.msg || 'Failed to review promotion', 'error');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this promotion?')) return;
        try {
            await PromoApi.cancel(id);
            showToast('Promotion cancelled');
            fetchQueue();
        } catch {
            showToast('Failed to cancel promotion', 'error');
        }
    };

    const handleSend = async (id) => {
        try {
            setSending(true);
            await PromoApi.send(id);
            showToast('Promotion emails queued for sending');
            setConfirmPromo(null);
            fetchQueue();
        } catch {
            showToast('Failed to queue promotion emails', 'error');
        } finally {
            setSending(false);
        }
    };

    const viewAnalytics = async (promo) => {
        setAnalyticsPromo(promo);
        setLoadingAnalytics(true);
        try {
            const stats = await PromoApi.getAnalytics(promo.promotion_id);
            setAnalyticsData(stats.analytics);
        } catch {
            showToast('Failed to load analytics', 'error');
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const activeList = queue[activeTab] || [];

    return (
        <div className="p-6 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col relative">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-bold transition-all ${
                    toast.type === 'error'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Offers & Promotions</h1>
                    <p className="text-gray-400 text-sm mt-1">Review, preview, and dispatch scheduled customer promotions.</p>
                </div>
                <button
                    onClick={fetchQueue}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl border border-gray-200 transition-all shadow-sm"
                >
                    <IconRefresh />
                    Refresh Queue
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 mb-6 border-b border-gray-100 pb-4">
                {TABS.map((tab) => {
                    const count = queue[tab.id]?.length || 0;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                                isActive
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'bg-white hover:bg-gray-50 text-gray-500 border border-gray-200'
                            }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-black ${
                                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm font-medium">Loading promotions...</p>
                </div>
            ) : activeList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 border border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300 mb-4">
                        <IconEmpty />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700">No promotions found</h3>
                    <p className="text-gray-400 text-xs mt-1">Nothing under this status currently.</p>
                </div>
            ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm flex-1">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100 bg-white">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="py-3.5 px-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-8">#</th>
                                    <th className="py-3.5 px-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                    <th className="py-3.5 px-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                    <th className="py-3.5 px-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount</th>
                                    <th className="py-3.5 px-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Valid Until</th>
                                    <th className="py-3.5 px-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Scope</th>
                                    <th className="py-3.5 px-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Used</th>
                                    <th className="py-3.5 px-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="py-3.5 px-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 align-middle">
                                {activeList.map((promo, index) => {
                                    const scope = getApplicableDetails(promo);
                                    return (
                                        <tr key={promo.promotion_id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Row number */}
                                            <td className="py-4 px-5 text-center">
                                                <span className="text-sm font-black text-gray-500">{index + 1}</span>
                                            </td>

                                            {/* Name */}
                                            <td className="py-4 px-5 max-w-[200px]">
                                                <div className="font-bold text-gray-900 text-sm truncate">{promo.title || promo.name}</div>
                                                <div className="text-gray-400 text-xs mt-0.5 truncate">{promo.description || 'No description.'}</div>
                                            </td>

                                            {/* Type */}
                                            <td className="py-4 px-5 text-center">
                                                <span className="inline-block px-2.5 py-1 text-[10px] font-black tracking-wider uppercase bg-gray-100 text-gray-600 rounded-lg border border-gray-200/80">
                                                    {promo.discount_type || 'percentage'}
                                                </span>
                                            </td>

                                            {/* Discount */}
                                            <td className="py-4 px-5 text-center">
                                                <span className="font-black text-gray-900 text-base tabular-nums">
                                                    {promo.discount_type === 'percentage'
                                                        ? `${roundValue(promo.discount_value)}%`
                                                        : promo.discount_type === 'fixed'
                                                        ? `₱${promo.discount_value}`
                                                        : 'FREE'}
                                                </span>
                                            </td>

                                            {/* Valid Until */}
                                            <td className="py-4 px-5 text-gray-500 text-xs font-medium whitespace-nowrap">
                                                {promo.expiration_date ? formatDate(promo.expiration_date) : '—'}
                                            </td>

                                            {/* Scope */}
                                            <td className="py-4 px-5 text-center">
                                                <span
                                                    className="inline-block px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 max-w-[140px] truncate"
                                                    title={scope.items}
                                                >
                                                    {scope.type}: {scope.items}
                                                </span>
                                            </td>

                                            {/* Usage */}
                                            <td className="py-4 px-5 text-center">
                                                <span className="font-black text-gray-800 text-sm tabular-nums">{promo.usage_count || 0}</span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-4 px-5 text-center whitespace-nowrap">
                                                <StatusBadge status={promo.status} />
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setPreviewPromo(promo)}
                                                        title="Preview Email"
                                                        className="w-8 h-8 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                                    >
                                                        <IconEye />
                                                    </button>

                                                    {activeTab === 'pending_review' && (
                                                        <button
                                                            onClick={() => handleReview(promo.promotion_id)}
                                                            title="Mark Ready to Send"
                                                            className="w-8 h-8 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                                        >
                                                            <IconCheck />
                                                        </button>
                                                    )}

                                                    {activeTab === 'ready_to_send' && (
                                                        <button
                                                            onClick={() => setConfirmPromo(promo)}
                                                            title="Dispatch Emails"
                                                            className="w-8 h-8 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                                        >
                                                            <IconSend />
                                                        </button>
                                                    )}

                                                    {activeTab === 'sent' && (
                                                        <button
                                                            onClick={() => viewAnalytics(promo)}
                                                            title="View Analytics"
                                                            className="w-8 h-8 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                                        >
                                                            <IconChart />
                                                        </button>
                                                    )}

                                                    {['pending_review', 'ready_to_send'].includes(activeTab) && (
                                                        <button
                                                            onClick={() => handleCancel(promo.promotion_id)}
                                                            title="Cancel Promotion"
                                                            className="w-8 h-8 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg flex items-center justify-center transition-all shadow-sm"
                                                        >
                                                            <IconTrash />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Email Preview Modal ──────────────────────────────────────────── */}
            {previewPromo && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Email Preview</p>
                                <h3 className="text-base font-bold text-gray-900">{previewPromo.title || previewPromo.name}</h3>
                            </div>
                            <button
                                onClick={() => setPreviewPromo(null)}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
                            >
                                <IconClose />
                            </button>
                        </div>

                        {/* Email Preview Body */}
                        <div className="p-6 bg-gray-100 flex-1 overflow-y-auto max-h-[60vh] flex justify-center">
                            <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
                                {/* Banner */}
                                {previewPromo.banner_image ? (
                                    <img
                                        src={`${IMAGE_BASE_URL}/storage/${previewPromo.banner_image}`}
                                        alt={previewPromo.title}
                                        className="w-full h-40 object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-32 bg-gray-50 border-b border-gray-100 flex items-center justify-center text-gray-300">
                                        <IconTag />
                                    </div>
                                )}

                                {/* Email Content */}
                                <div className="p-8 text-center">
                                    <p className="text-[9px] text-gray-400 font-black tracking-[0.2em] uppercase">Exclusive Offer</p>
                                    <h4 className="text-xl font-black text-gray-900 mt-1 tracking-tight">{previewPromo.title || previewPromo.name}</h4>
                                    {previewPromo.description && (
                                        <p className="text-gray-500 text-sm mt-3 leading-relaxed">{previewPromo.description}</p>
                                    )}

                                    <div className="inline-block mt-6 px-6 py-3 bg-[#FFE100] text-black font-black text-xl rounded-xl shadow-sm">
                                        {previewPromo.discount_type === 'percentage'
                                            ? `${roundValue(previewPromo.discount_value)}% OFF`
                                            : previewPromo.discount_type === 'fixed'
                                            ? `₱${previewPromo.discount_value} OFF`
                                            : 'FREE SHIPPING'}
                                    </div>

                                    {(() => {
                                        const scope = getApplicableDetails(previewPromo);
                                        return (
                                            <div className="mt-4 text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 max-w-xs mx-auto">
                                                {scope.type}: <span className="text-gray-700 font-bold">{scope.items}</span>
                                            </div>
                                        );
                                    })()}

                                    {previewPromo.promo_code && (
                                        <div className="mt-6 border-2 border-dashed border-gray-200 bg-gray-50 p-4 rounded-xl max-w-xs mx-auto">
                                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Promo Code</p>
                                            <span className="font-mono text-lg font-black text-gray-800">{previewPromo.promo_code}</span>
                                        </div>
                                    )}

                                    <div className="mt-8 px-6 py-3.5 bg-gray-900 text-white font-bold text-sm rounded-xl max-w-xs mx-auto">
                                        Shop the Deal
                                    </div>

                                    {previewPromo.expiration_date && (
                                        <p className="text-[11px] text-rose-500 font-semibold mt-5">
                                            Offer expires {formatDate(previewPromo.expiration_date)}
                                        </p>
                                    )}
                                </div>

                                {/* Email Footer */}
                                <div className="bg-gray-900 p-5 text-center">
                                    <p className="text-white text-xs font-bold mb-1">DSC STICKER</p>
                                    <p className="text-gray-500 text-[10px] leading-relaxed">You received this because you're a verified customer who opted in to promotional emails.</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                            <button
                                onClick={() => setPreviewPromo(null)}
                                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all"
                            >
                                Close
                            </button>
                            {activeTab === 'ready_to_send' && (
                                <button
                                    onClick={() => { setPreviewPromo(null); setConfirmPromo(previewPromo); }}
                                    className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-xl transition-all"
                                >
                                    Proceed to Send
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirm Send Modal ───────────────────────────────────────────── */}
            {confirmPromo && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 mb-5">
                            <IconMail />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Confirm Batch Dispatch</h3>
                        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                            You are about to launch a batch email promotion for{' '}
                            <strong className="text-gray-900">"{confirmPromo.title || confirmPromo.name}"</strong>{' '}
                            targeting <strong className="text-gray-900">{targetLabels[confirmPromo.target_type] || confirmPromo.target_type}</strong>.
                        </p>

                        <div className="my-5 p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800 space-y-1.5 leading-relaxed">
                            <p className="font-bold mb-1">Before you proceed:</p>
                            <p>Only email-verified customers will receive this promotion.</p>
                            <p>Only customers who opted-in to promotional emails will be targeted.</p>
                            <p>This action is processed asynchronously and cannot be undone.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                disabled={sending}
                                onClick={() => setConfirmPromo(null)}
                                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={sending}
                                onClick={() => handleSend(confirmPromo.promotion_id)}
                                className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Dispatching...
                                    </>
                                ) : (
                                    <>
                                        <IconSend />
                                        Send Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Analytics Modal ──────────────────────────────────────────────── */}
            {analyticsPromo && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Promotion Analytics</p>
                                <h3 className="text-lg font-bold text-gray-900">{analyticsPromo.title || analyticsPromo.name}</h3>
                            </div>
                            <button
                                onClick={() => { setAnalyticsPromo(null); setAnalyticsData(null); }}
                                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
                            >
                                <IconClose />
                            </button>
                        </div>

                        {loadingAnalytics ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="w-8 h-8 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                                <p className="text-gray-400 text-xs font-medium">Fetching stats...</p>
                            </div>
                        ) : analyticsData ? (
                            <div className="space-y-4">
                                {/* Success Rate */}
                                <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <span className="text-4xl font-black text-gray-900 tabular-nums">{analyticsData.success_rate_percent}%</span>
                                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Delivery Success Rate</span>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                                        <span className="text-2xl font-black text-blue-900 tabular-nums block">{analyticsData.total_sent}</span>
                                        <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest block mt-1">Total Sent</span>
                                    </div>
                                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                                        <span className="text-2xl font-black text-emerald-900 tabular-nums block">{analyticsData.successful_sends}</span>
                                        <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest block mt-1">Delivered</span>
                                    </div>
                                    <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100 text-center">
                                        <span className="text-2xl font-black text-rose-900 tabular-nums block">{analyticsData.failed_sends}</span>
                                        <span className="text-[9px] text-rose-500 font-black uppercase tracking-widest block mt-1">Failed</span>
                                    </div>
                                </div>

                                <p className="text-[10px] text-gray-400 font-medium px-1">Stats reflect real-time Laravel batch queue outputs.</p>
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 text-sm py-10">No analytics data available.</p>
                        )}

                        <button
                            onClick={() => { setAnalyticsPromo(null); setAnalyticsData(null); }}
                            className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerServiceOffers;

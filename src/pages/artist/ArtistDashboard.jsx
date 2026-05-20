import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchArtistOrders } from "../../services/artistOrderService";
import { useAdminAuth } from "../../context/AdminAuthContext";

const StatTile = ({ label, value, description, statusColor }) => (
    <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200/70 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-amber-400 transition-all duration-300">
        <div className="flex items-center justify-between gap-2 mb-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
            <span className={`h-3 w-3 rounded-full ${statusColor}`}></span>
        </div>
        <div className="space-y-1.5">
            <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">{value}</h3>
            <p className="text-xs text-slate-400 font-semibold">{description}</p>
        </div>
    </div>
);

export default function ArtistDashboard() {
    const { currentUser } = useAdminAuth();
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        pendingApproval: 0,
        completed: 0
    });
    const [activeTasks, setActiveTasks] = useState([]);
    const [artistReviewsList, setArtistReviewsList] = useState([]);
    const [avgRating, setAvgRating] = useState("5.0");
    const [satisfactionPercent, setSatisfactionPercent] = useState(100);
    const [totalArtistReviews, setTotalArtistReviews] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetchArtistOrders();
                const ordersData = res.data?.orders || res.data || (Array.isArray(res) ? res : []);
                const orders = Array.isArray(ordersData) ? ordersData : [];
                
                setStats({
                    total: orders.length,
                    inProgress: orders.filter(o => o.status === 'In Progress' || o.status === 'Design In Progress' || o.status === 'Accepted').length,
                    pendingApproval: orders.filter(o => o.status === 'Awaiting Shipment Approval' || o.status === 'Finalizing').length,
                    completed: orders.filter(o => o.status === 'To Shipping' || o.status === 'Completed' || o.status === 'To Receive' || o.status === 'Shipped').length
                });

                const active = orders.filter(o => {
                    const isTerminal = ['completed', 'cancelled', 'refunded', 'return/refund'].includes((o.status || '').toLowerCase());
                    return !isTerminal;
                });
                setActiveTasks(active.slice(0, 4));

                // Extract reviews
                const reviews = [];
                orders.forEach(o => {
                    const orderReviews = Array.isArray(o.reviews) ? o.reviews : (o.review ? [o.review] : []);
                    orderReviews.forEach(r => {
                        if (r.artist_rating && r.artist_rating > 0) {
                            reviews.push({
                                order_id: o.order_id,
                                order_number: o.order_number || `ORD-${String(o.order_id).padStart(5, '0')}`,
                                customer_name: `${o.user?.first_name || 'Guest'} ${o.user?.last_name || ''}`.trim(),
                                rating: r.artist_rating,
                                comment: r.artist_comment || "No comment left.",
                                created_at: r.created_at || o.completed_at || new Date().toISOString()
                            });
                        }
                    });
                });

                setArtistReviewsList(reviews);
                setTotalArtistReviews(reviews.length);

                if (reviews.length > 0) {
                    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
                    setAvgRating((sum / reviews.length).toFixed(1));
                    
                    const satisfied = reviews.filter(r => r.rating >= 4).length;
                    setSatisfactionPercent(Math.round((satisfied / reviews.length) * 100));
                } else {
                    setAvgRating("5.0");
                    setSatisfactionPercent(100);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    // Brand Yellow Theme Badge Styling
    const getStatusStyle = (status) => {
        const styles = {
            'Accepted': 'text-amber-700 bg-amber-50 border-amber-250',
            'To Process': 'text-amber-700 bg-amber-50 border-amber-250',
            'In Progress': 'text-slate-800 bg-slate-100 border-slate-200',
            'Design In Progress': 'text-slate-800 bg-slate-100 border-slate-200',
            'Finalizing': 'text-yellow-800 bg-yellow-50 border-yellow-300',
            'For Revision': 'text-red-750 bg-red-50 border-red-200',
            'Awaiting Shipment Approval': 'text-orange-700 bg-orange-50 border-orange-250',
            'To Shipping': 'text-emerald-800 bg-emerald-50 border-emerald-300',
            'To Receive': 'text-emerald-850 bg-emerald-50 border-emerald-250',
            'Shipped': 'text-emerald-850 bg-emerald-50 border-emerald-250',
            'Completed': 'text-emerald-850 bg-emerald-50 border-emerald-250',
        };
        return styles[status] || 'text-slate-650 bg-slate-50 border-slate-250';
    };

    // Helper to determine active queue button text
    const getActionButtonText = (status) => {
        const s = (status || "").toLowerCase();
        if (['to receive', 'to shipping', 'shipped', 'completed'].includes(s)) {
            return "👁️ View Final Design";
        }
        if (['awaiting shipment approval', 'finalizing'].includes(s)) {
            return "⏳ Awaiting Approval";
        }
        if (s === 'for revision') {
            return "🎨 Revise Design";
        }
        if (s === 'in progress' || s === 'design in progress') {
            return "🎨 Continue Design";
        }
        return "🎨 Start Design";
    };

    return (
        <div className="h-full flex flex-col p-6 lg:p-10 bg-[#F8FAFC] overflow-y-auto custom-scrollbar">
            
            {/* Centered Large-Scale Container for Zoomed-In Aesthetics */}
            <div className="max-w-6xl mx-auto w-full space-y-8 lg:space-y-10">
                
                {/* Minimalist Brand Header - Zoomed In */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse"></span>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none">DSC Sticker Artist Hub</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">
                            Welcome back, {currentUser?.first_name || 'Creative'}
                        </h1>
                        <p className="text-sm text-slate-400 font-bold leading-relaxed">
                            Track active workflow stages, customize layouts, and view feedback ratings.
                        </p>
                    </div>

                    <div className="bg-slate-900 text-white rounded-xl py-3 px-5 border border-slate-800 flex flex-col items-start sm:items-end shrink-0 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-yellow-400 leading-none mb-1">Studio Date</p>
                        <p className="font-black text-sm mt-1 leading-none">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </header>

                {/* Metrics Row - Zoomed In */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                    <StatTile label="Total Projects" value={stats.total} description="All-time design orders" statusColor="bg-slate-400" />
                    <StatTile label="In Progress" value={stats.inProgress} description="Drafting & modifications" statusColor="bg-yellow-400" />
                    <StatTile label="Pending Approval" value={stats.pendingApproval} description="Awaiting admin review" statusColor="bg-slate-900" />
                    <StatTile label="Completed" value={stats.completed} description="Finished & shipped sticker packs" statusColor="bg-emerald-400" />
                </div>

                {/* Work Queue & Guidelines Section - Zoomed In */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0">
                    
                    {/* Active Work Queue */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.015)] flex flex-col space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">⚡ Active Design Queue</h2>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">Immediate sticker designs requiring creation</p>
                            </div>
                            <Link 
                                to="/artist/inbox" 
                                className="text-xs font-black text-slate-900 bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-xl transition border border-yellow-450 uppercase tracking-wider shadow-sm"
                            >
                                Open Workflow Inbox →
                            </Link>
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-sm font-semibold text-slate-400">Loading queue...</div>
                        ) : activeTasks.length === 0 ? (
                            <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
                                <span className="text-3xl">✨</span>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">All designs completed</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {activeTasks.map((task) => {
                                    const details = task.orderDetails || task.items || [];
                                    const itemText = details[0]?.product_name || "Custom Sticker Design";
                                    const clientName = `${task.user?.first_name || 'Guest'} ${task.user?.last_name || ''}`.trim();
                                    
                                    const statusLower = (task.status || "").toLowerCase();
                                    const isFinishedPhase = ['to receive', 'to shipping', 'shipped', 'completed', 'awaiting shipment approval', 'finalizing'].includes(statusLower);
                                    
                                    return (
                                        <div key={task.order_id} className="bg-white border-l-[6px] border-l-yellow-450 border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-400 hover:shadow-sm transition-all duration-200">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                                                        {task.order_number}
                                                    </span>
                                                    <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase border ${getStatusStyle(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="font-extrabold text-sm lg:text-base text-slate-900 truncate" title={itemText}>{itemText}</h4>
                                                    <p className="text-xs text-slate-400 font-semibold mt-1">Client: {clientName}</p>
                                                </div>

                                                {task.expected_delivery_at && (
                                                    <p className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-100 p-2 rounded-lg flex items-center gap-2">
                                                        ⏰ Target: {new Date(task.expected_delivery_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </p>
                                                )}
                                            </div>

                                            <Link 
                                                to="/artist/inbox"
                                                className={`w-full mt-5 text-center py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-colors duration-200 shadow-sm ${
                                                    isFinishedPhase 
                                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" 
                                                        : "bg-slate-900 hover:bg-yellow-400 hover:text-slate-950 text-white"
                                                }`}
                                            >
                                                {getActionButtonText(task.status)}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Minimalist Guidelines Widget - Zoomed In */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 lg:p-8 border border-slate-800 shadow-sm flex flex-col justify-between">
                        <div className="space-y-5">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                                <span className="text-base">📝</span>
                                <h2 className="text-xs lg:text-sm font-black uppercase tracking-wider text-yellow-400">Workspace Guidelines</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">1. Spec verification</p>
                                    <p className="text-xs lg:text-sm text-slate-300 leading-relaxed font-semibold">Verify dimensions, layout cutlines, and colors before creating drafts.</p>
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">2. Proof submission</p>
                                    <p className="text-xs lg:text-sm text-slate-300 leading-relaxed font-semibold">Ensure backgrounds display sticker borders clearly inside the customer proof frame.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-800">
                            <span className="text-[10px] font-black text-slate-400 uppercase">DSC Sticker Studio v3</span>
                            <span className="text-sm">🎨</span>
                        </div>
                    </div>

                </div>

                {/* Performance Summary & Client reviews - Zoomed In */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 shrink-0">
                    
                    {/* Performance Overview Card */}
                    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.015)] flex flex-col justify-between">
                        <div className="space-y-5">
                            <div className="pb-4 border-b border-slate-100">
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">📈 Designer Metrics</h2>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">Realtime rating indexes</p>
                            </div>
                            
                            <div className="space-y-5">
                                {/* Satisfaction Rating */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Satisfaction</span>
                                        <span className="text-sm font-black text-slate-900">{satisfactionPercent}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${satisfactionPercent}%` }}></div>
                                    </div>
                                </div>

                                {/* Average Rating */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Avg Rating</span>
                                        <span className="text-sm font-black text-slate-900">⭐ {avgRating}</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(Number(avgRating) / 5) * 100}%` }}></div>
                                    </div>
                                </div>

                                {/* Total Feedbacks count */}
                                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                    <span className="text-xs font-bold text-slate-400 uppercase">All Reviews</span>
                                    <span className="text-xs font-black text-slate-800 bg-white border border-slate-255 px-3.5 py-1 rounded-md">{totalArtistReviews} logged</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Client Reviews Carousel / List */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 lg:p-8 border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.015)] flex flex-col space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">💬 Client Comments</h2>
                                <p className="text-xs text-slate-400 font-semibold mt-0.5">Direct input left by sticker buyers</p>
                            </div>
                            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-150 px-3.5 py-1 rounded-xl shrink-0">
                                <span className="text-amber-800 text-xs font-black">★ {avgRating}</span>
                            </div>
                        </div>

                        {artistReviewsList.length === 0 ? (
                            <div className="py-12 text-center border border-dashed border-slate-150 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center space-y-1">
                                <span className="text-xl">✨</span>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No reviews logged yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                                {artistReviewsList.map((rev, idx) => (
                                    <div key={idx} className="p-5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between hover:border-yellow-400 hover:shadow-sm transition-all duration-200">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">{rev.customer_name}</p>
                                                    <p className="text-[10px] font-semibold text-slate-455 mt-0.5">Order {rev.order_number}</p>
                                                </div>
                                                <span className="text-yellow-600 font-black text-xs">★ {rev.rating}</span>
                                            </div>
                                            <p className="text-xs lg:text-sm font-semibold text-slate-500 leading-relaxed italic">
                                                "{rev.comment}"
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Artist Review</span>
                                            <span className="text-[9px] font-semibold text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>

        </div>
    );
}

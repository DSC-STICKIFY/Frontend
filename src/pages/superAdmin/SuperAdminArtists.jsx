import React, { useState, useEffect } from 'react';
import ArtistWorkflowMonitor from '../../components/ArtistWorkflowMonitor';
import { fetchAllOrders } from '../../services/OrdersAPI';

// ── Star Rating Display ──────────────────────────────────────────────────────
const StarDisplay = ({ rating, colorClass = "text-yellow-400" }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
            <svg key={s} className={`w-3 h-3 ${s <= rating ? colorClass : "text-gray-200"}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
        ))}
        <span className="text-[10px] font-semibold text-gray-500 ml-1">{rating}/5</span>
    </div>
);

const SuperAdminArtists = () => {
    const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' or 'performance'
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all'); // 'all', '5', '4', '3', '2', '1'

    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                const res = await fetchAllOrders();
                const allOrders = res.data?.orders || res.data || (Array.isArray(res) ? res : []);
                setOrders(allOrders);
            } catch (err) {
                console.error("Failed to load task history for artists", err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, []);

    // Helper to get initials for avatar
    const getInitials = (firstName, lastName) => {
        return `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
    };

    // Helper to get product image URL
    const getProductImage = (img) => {
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `${import.meta.env.VITE_API_URL}/storage/${img}`;
    };

    // Process orders into list of artist collaboration tasks
    const tasks = [];
    orders.forEach(order => {
        if (!order.artist) return; // Only process tasks assigned to an artist

        const items = order.orderDetails || order.items || [];
        const reviews = order.reviews || [];

        // We flatten by items, associating each item with the assigned artist and its matching review
        items.forEach(item => {
            const artistReview = reviews.find(r => Number(r.product_id) === Number(item.product_id)) || reviews[0] || null;

            tasks.push({
                order_id: order.order_id,
                order_number: order.order_number,
                order_date: order.order_date || order.created_at,
                status: order.status,
                artist: order.artist,
                customer: order.user || { first_name: "Customer", last_name: "" },
                product: {
                    name: item.product_name || "Custom Sticker",
                    image: item.product_image || null,
                    size: item.size || "1.5 x 1.5",
                    quantity: item.quantity || 1,
                    price: item.item_price || item.price || 0
                },
                review: artistReview
            });
        });
    });

    // ── Group by Artist for Leaderboard / Metrics ─────────────────────────────
    const artistStats = {};
    tasks.forEach(task => {
        const artistId = task.artist.employee_id || task.artist.artist_id || task.artist.id;
        const artistKey = String(artistId);

        if (!artistStats[artistKey]) {
            artistStats[artistKey] = {
                artist: task.artist,
                totalProducts: 0,
                ratings: [],
            };
        }

        // Add quantity of products made
        artistStats[artistKey].totalProducts += Number(task.product.quantity || 1);

        if (task.review?.artist_rating) {
            artistStats[artistKey].ratings.push(Number(task.review.artist_rating));
        }
    });

    const artistLeaderboard = Object.values(artistStats).map(stat => {
        const avg = stat.ratings.length > 0
            ? (stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length).toFixed(1)
            : "N/A";
        return {
            ...stat,
            averageRating: avg
        };
    });

    // Sort leaderboard by most products made
    artistLeaderboard.sort((a, b) => b.totalProducts - a.totalProducts);

    // ── Calculations for global analytics ─────────────────────────────────────
    const ratedTasks = tasks.filter(t => t.review && t.review.artist_rating);
    const avgArtistRating = ratedTasks.length > 0
        ? (ratedTasks.reduce((sum, t) => sum + Number(t.review.artist_rating), 0) / ratedTasks.length).toFixed(1)
        : "N/A";

    const uniqueArtistsCount = artistLeaderboard.length;
    const totalProductsMade = artistLeaderboard.reduce((sum, a) => sum + a.totalProducts, 0);

    // Filter tasks based on search & rating filter
    const filteredTasks = tasks.filter(t => {
        const artistName = `${t.artist.first_name || ''} ${t.artist.last_name || ''}`.toLowerCase();
        const customerName = `${t.customer.first_name || ''} ${t.customer.last_name || ''}`.toLowerCase();
        const productName = t.product.name.toLowerCase();
        const matchesSearch = artistName.includes(searchTerm.toLowerCase()) || 
                              customerName.includes(searchTerm.toLowerCase()) ||
                              productName.includes(searchTerm.toLowerCase());

        const ratingVal = t.review?.artist_rating ? String(t.review.artist_rating) : 'none';
        const matchesRating = ratingFilter === 'all' || 
                              (ratingFilter === 'none' && !t.review?.artist_rating) ||
                              ratingVal === ratingFilter;

        return matchesSearch && matchesRating;
    });

    return (
        <div className="h-full flex flex-col p-6 lg:p-10 bg-[#F1F3F7]">
            {/* Header section */}
            <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-gray-900 mb-1">Artist Management & Workflow</h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Monitor designs, artist assignments, and customer feedback</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-200/60 p-1.5 rounded-2xl border border-gray-300/40 w-fit shrink-0">
                    <button
                        onClick={() => setActiveTab('workflow')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${activeTab === 'workflow' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        📋 Active Workflow
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 ${activeTab === 'performance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        ⭐ Artist Performance & Reviews
                    </button>
                </div>
            </header>

            {/* TAB 1: ACTIVE COLLABORATION WORKFLOW */}
            {activeTab === 'workflow' && (
                <div className="flex-1 min-h-0">
                    <ArtistWorkflowMonitor isReadOnly={true} />
                </div>
            )}

            {/* TAB 2: PERFORMANCE & RATINGS */}
            {activeTab === 'performance' && (
                <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    
                    {/* Summary statistics grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                        {/* Avg Rating Card */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-2 bg-yellow-400"></div>
                            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center text-xl font-bold">⭐</div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Average Artist Rating</p>
                                <p className="text-2xl font-black text-gray-900 leading-none">{avgArtistRating} <span className="text-xs font-bold text-gray-400"></span></p>
                            </div>
                        </div>

                        {/* Total Products Made Card */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-2 bg-emerald-500"></div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl font-bold">🏷️</div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Products Made</p>
                                <p className="text-2xl font-black text-gray-900 leading-none">{totalProductsMade} <span className="text-xs font-bold text-gray-400"></span></p>
                            </div>
                        </div>

                        {/* Unique Artists Card */}
                        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-2 bg-purple-500"></div>
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-xl font-bold">👥</div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Assigned Artists</p>
                                <p className="text-2xl font-black text-gray-900 leading-none">{uniqueArtistsCount} <span className="text-xs font-bold text-gray-400"></span></p>
                            </div>
                        </div>
                    </div>

                    {/* ── ARTIST PRODUCTION LEADERBOARD (Who made what and how many) ── */}
                    <div className="bg-white rounded-[32px] p-6 border border-gray-200 shadow-sm shrink-0 space-y-4">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-gray-800">👥 Artist Contribution & Production Summary</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Total products designed and average rating per designer</p>
                        </div>

                        {loading ? (
                            <div className="py-6 text-center text-xs font-semibold text-gray-400">Calculating stats...</div>
                        ) : artistLeaderboard.length === 0 ? (
                            <div className="py-6 text-center text-xs font-semibold text-gray-400">No artist production records found yet</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {artistLeaderboard.map((leader, i) => {
                                    const name = `${leader.artist.first_name || 'Designer'} ${leader.artist.last_name || ''}`;
                                    return (
                                        <div key={i} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-200/60 flex items-center gap-3.5 hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xs text-white shadow-sm flex-shrink-0">
                                                {getInitials(leader.artist.first_name, leader.artist.last_name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-xs text-gray-900 truncate leading-tight mb-0.5">{name}</p>
                                                <p className="text-[10px] text-gray-400 truncate mb-2">{leader.artist.email}</p>
                                                
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                                        🏷️ {leader.totalProducts} Made
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded-full shrink-0">
                                                        ⭐ {leader.averageRating} Rating
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Filters panel */}
                    <div className="bg-white rounded-3xl p-4 border border-gray-200 shadow-sm shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by artist, client, or product name..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-100"
                            />
                            <span className="absolute left-3.5 top-3.5 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">Filter by Rating:</span>
                            <select
                                value={ratingFilter}
                                onChange={e => setRatingFilter(e.target.value)}
                                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
                            >
                                <option value="all">⭐ Show All Reviews</option>
                                <option value="5">⭐ 5 Stars Only</option>
                                <option value="4">⭐ 4 Stars Only</option>
                                <option value="3">⭐ 3 Stars Only</option>
                                <option value="2">⭐ 2 Stars Only</option>
                                <option value="1">⭐ 1 Star Only</option>
                                <option value="none">⚠️ No Review Yet</option>
                            </select>
                        </div>
                    </div>

                    {/* Table / Grid Container */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col shrink-0 mb-6">
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Retrieving Artist Performance Records...</p>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl mb-3">🔍</div>
                                <h3 className="font-black text-gray-700 text-sm uppercase">No Records Found</h3>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Try adjusting your filters or search terms</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/70 border-b border-gray-200">
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Artist</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Client & Order</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Made</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">🎨 Artist Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredTasks.map((task, idx) => {
                                            const artistName = `${task.artist.first_name || 'Designer'} ${task.artist.last_name || ''}`;
                                            const customerName = `${task.customer.first_name || 'Client'} ${task.customer.last_name || ''}`;

                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                                                    {/* Artist Info */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center font-bold text-xs text-black shadow-sm flex-shrink-0">
                                                                {getInitials(task.artist.first_name, task.artist.last_name)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-gray-900 leading-none">{artistName}</p>
                                                                <p className="text-[10px] text-gray-400 font-medium leading-none mt-1">{task.artist.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Client & Order details */}
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-semibold text-xs text-gray-800 leading-none">{customerName}</p>
                                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                                                    {task.order_number}
                                                                </span>
                                                                <span className="text-[9px] text-gray-400 font-bold">
                                                                    {new Date(task.order_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Product Details */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-center shadow-sm">
                                                                {task.product.image ? (
                                                                    <img src={getProductImage(task.product.image)} alt={task.product.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-gray-400">🎨</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-xs text-gray-900 leading-none">{task.product.name}</p>
                                                                <p className="text-[9px] text-gray-400 font-semibold leading-none mt-1">Size: {task.product.size} | Qty: {task.product.quantity}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Artist Rating */}
                                                    <td className="px-6 py-4">
                                                        {task.review && task.review.artist_rating ? (
                                                            <div className="space-y-1">
                                                                <StarDisplay rating={task.review.artist_rating} colorClass="text-amber-500" />
                                                                {task.review.artist_comment ? (
                                                                    <p className="text-[10px] text-gray-500 italic bg-amber-50/20 border border-amber-100/50 p-1.5 rounded-lg max-w-[200px] truncate" title={task.review.artist_comment}>
                                                                        "{task.review.artist_comment}"
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[9px] text-gray-300 italic">No comment left</p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-300 italic font-medium">No rating yet</span>
                                                        )}
                                                    </td>

                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminArtists;

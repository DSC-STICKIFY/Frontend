import { useEffect, useState, useCallback } from 'react';
import { fetchTracking, completeOrder } from '../../services/OrdersAPI';

// ─────────────────────────────────────────────────────────────────────────────
//  Countdown hook
// ─────────────────────────────────────────────────────────────────────────────
const useCountdown = (deadline) => {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!deadline) return;
        const calc = () => {
            const diff = new Date(deadline) - new Date();
            if (diff <= 0) return setTimeLeft({ expired: true });
            setTimeLeft({
                expired: false,
                days:    Math.floor(diff / 86400000),
                hours:   Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [deadline]);

    return timeLeft;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Delivery Timeline (countdown bar)
// ─────────────────────────────────────────────────────────────────────────────
const DeliveryTimeline = ({ deadline, dispatchedAt, returnWindowHours = 24, onMarkReceived }) => {
    const countdown = useCountdown(deadline);
    if (!deadline) return null;

    const start    = new Date(dispatchedAt || deadline);
    const end      = new Date(deadline);
    const now      = new Date();
    const total    = end - start;
    const elapsed  = now - start;
    const progress = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;

    if (countdown?.expired) {
    return (
        <div className="mx-5 mb-3 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <div>
                    <p className="text-xs font-semibold text-green-700">Delivered</p>
                    <p className="text-[10px] text-green-600 mt-0.5">Your order has been delivered</p>
                </div>
            </div>
        </div>
    );
}

// To this:
if (countdown?.expired) {
    const autoCompleteAt = new Date(new Date(deadline).getTime() + returnWindowHours * 3600 * 1000);
    const msLeft    = autoCompleteAt - new Date();
    const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
    const minsLeft  = Math.max(0, Math.floor((msLeft % 3600000) / 60000));

    return (
        <div className="mx-5 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-amber-700">📦 Has your order arrived?</p>
            <button
                onClick={onMarkReceived}
                className="w-full py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl transition active:scale-95"
            >
                ✅ Mark as Received
            </button>
            {msLeft > 0 ? (
                <p className="text-[10px] text-center text-amber-600">
                    Auto-completing in {hoursLeft}h {minsLeft}m if not confirmed
                </p>
            ) : (
                <p className="text-[10px] text-center text-gray-400">
                    Order will be completed shortly...
                </p>
            )}
        </div>
    );
}

    return (
        <div className="mx-5 mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
                <p className="text-[11px] font-semibold text-indigo-700">🚚 Estimated delivery by</p>
                <p className="text-[11px] font-semibold text-indigo-900">
                    {new Date(deadline).toLocaleDateString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                </p>
            </div>

            <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }}/>
            </div>

            {countdown && !countdown.expired && (
                <div className="flex gap-3 justify-center pt-1">
                    {countdown.days > 0 && (
                        <div className="flex flex-col items-center">
                            <span className="text-base font-bold text-indigo-800 leading-none">{String(countdown.days).padStart(2,'0')}</span>
                            <span className="text-[9px] text-indigo-400 uppercase tracking-wide">days</span>
                        </div>
                    )}
                    {(countdown.days > 0 || countdown.hours > 0) && (
                        <div className="flex flex-col items-center">
                            <span className="text-base font-bold text-indigo-800 leading-none">{String(countdown.hours).padStart(2,'0')}</span>
                            <span className="text-[9px] text-indigo-400 uppercase tracking-wide">hrs</span>
                        </div>
                    )}
                    <div className="flex flex-col items-center">
                        <span className="text-base font-bold text-indigo-800 leading-none">{String(countdown.minutes).padStart(2,'0')}</span>
                        <span className="text-[9px] text-indigo-400 uppercase tracking-wide">mins</span>
                    </div>
                    {countdown.days === 0 && countdown.hours === 0 && countdown.minutes < 5 && (
                        <div className="flex flex-col items-center">
                            <span className="text-base font-bold text-orange-500 leading-none">{String(countdown.seconds ?? 0).padStart(2,'0')}</span>
                            <span className="text-[9px] text-orange-400 uppercase tracking-wide">secs</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Google Maps embed for delivery address
// ─────────────────────────────────────────────────────────────────────────────
const AddressMap = ({ address }) => {
    const [mapError, setMapError] = useState(false);

    if (!address || address === 'N/A' || mapError) return null;

    // Encode address for Google Maps embed
    const encoded = encodeURIComponent(address);
    // Using Google Maps embed (no API key needed for basic embed)
    const mapSrc = `https://maps.google.com/maps?q=${encoded}&output=embed&z=15`;

    return (
        <div className="mx-5 mb-3">
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                {/* Map label bar */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Delivery Address</p>
                </div>
                {/* Address text */}
                <div className="px-3 py-2 bg-white border-b border-gray-100">
                    <p className="text-xs text-gray-700 font-medium leading-snug">{address}</p>
                </div>
                {/* Map iframe */}
                <div className="relative w-full" style={{ height: '160px' }}>
                    <iframe
                        title="Delivery Location"
                        src={mapSrc}
                        width="100%"
                        height="100%"
                        style={{ border: 0, display: 'block' }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        onError={() => setMapError(true)}
                    />
                    {/* Open in Google Maps link */}
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 flex items-center gap-1 bg-white shadow-md rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 transition border border-gray-200"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                        </svg>
                        Open Maps
                    </a>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Status icon helper
// ─────────────────────────────────────────────────────────────────────────────
const statusIcon = (status) => ({
    picked_up:        '📦',
    in_transit:       '🚚',
    out_for_delivery: '🛵',
    delivered:        '✅',
    failed:           '❌',
}[status] ?? '📍');

// ─────────────────────────────────────────────────────────────────────────────
//  TrackingModal
// ─────────────────────────────────────────────────────────────────────────────
export default function TrackingModal({ order, onClose }) {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    // Toggle between map view and tracking timeline
    const [activeView, setActiveView] = useState('tracking'); // 'tracking' | 'map'

    const loadTracking = useCallback(async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const res = await fetchTracking(order.order_id);
            setData(res);
            setError(null);
        } catch (err) {
            const status = err?.response?.status;
            setError(status === 404
                ? 'Tracking number not yet assigned. Please check back later.'
                : 'Failed to load tracking info.'
            );
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [order.order_id]);

    useEffect(() => {
        loadTracking(true);
        const interval = setInterval(() => loadTracking(false), 5000);
        return () => clearInterval(interval);
    }, [loadTracking]);

    const handleMarkReceived = async () => {
        try {
            await completeOrder(order.order_id);
            alert("Order completed! Thank you for purchasing.");
            if (onClose) onClose();
            window.location.reload();
        } catch (err) {
            console.error("Failed to complete order:", err);
            alert("Failed to complete order: " + (err.response?.data?.message || err.message));
        }
    };

    const events       = data?.data?.events ?? data?.events ?? [];
    const deadline     = data?.delivery_deadline ?? null;
    const dispatchedAt = data?.dispatched_at ?? null;

    // Use address from order (passed down from CustomerOrders formatOrders)
    const deliveryAddress = order.address && order.address !== 'N/A' ? order.address : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'trackingSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">📦 Live Tracking</h3>
                        {order.tracking_number && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                No: <span className="font-mono font-semibold text-gray-700">{order.tracking_number}</span>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* ── View toggle (Tracking / Map) ── */}
                {deliveryAddress && (
                    <div className="flex gap-1 mx-5 mt-3 mb-1 p-1 bg-gray-100 rounded-xl flex-shrink-0">
                        <button
                            onClick={() => setActiveView('tracking')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5
                                ${activeView === 'tracking' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            Tracking
                        </button>
                        <button
                            onClick={() => setActiveView('map')}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5
                                ${activeView === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            Map View
                        </button>
                    </div>
                )}

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto flex flex-col">

                    {/* TRACKING VIEW */}
                    {activeView === 'tracking' && (
                        <>
                            {/* Delivery countdown */}
                            {deadline && (
                                <div className="mt-3 flex-shrink-0">
                                    <DeliveryTimeline deadline={deadline} dispatchedAt={dispatchedAt} onMarkReceived={handleMarkReceived}/>
                                </div>
                            )}

                            {/* Timeline events */}
                            <div className="flex-1 px-5 py-4">
                                {loading && (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"/>
                                    </div>
                                )}
                                {error && <p className="text-center text-red-500 text-sm py-10">{error}</p>}
                                {!loading && !error && events.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-10">No tracking updates yet.</p>
                                )}
                                {events.length > 0 && (
                                    <ul className="space-y-0">
                                        {events.map((event, i) => (
                                            <li key={i} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 ${i === 0 ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                                        {statusIcon(event.status)}
                                                    </div>
                                                    {i < events.length - 1 && (
                                                        <div className="w-px flex-1 bg-gray-200 my-1"/>
                                                    )}
                                                </div>
                                                <div className="pb-4 flex-1">
                                                    <p className={`text-sm ${i === 0 ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                                        {event.message}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{event.datetime}</p>
                                                    {event.location && (
                                                        <p className="text-xs text-gray-400">📍 {event.location}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}

                    {/* MAP VIEW */}
                    {activeView === 'map' && (
                        <div className="mt-3 flex-1">
                            <AddressMap address={deliveryAddress}/>

                            {/* Also show delivery info below map */}
                            {order.contact_number && order.contact_number !== 'N/A' && (
                                <div className="mx-5 mb-3 bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100">
                                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Contact</p>
                                        <p className="text-sm font-semibold text-gray-800">{order.contact_number}</p>
                                    </div>
                                </div>
                            )}

                            {/* Delivery timeline on map view too */}
                            {deadline && (
                                <DeliveryTimeline deadline={deadline} dispatchedAt={dispatchedAt} onMarkReceived={handleMarkReceived}/>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-3.5 border-t border-gray-100 flex-shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Courier:</span>
                        <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                            {order.courier || 'J&T Express'}
                        </span>
                    </div>
                    {order.tracking_number && (
                        <a
                            href={`https://www.jtexpress.ph/trajectoryQuery?waybillNo=${order.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition flex items-center gap-1"
                        >
                            Track on J&T
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                            </svg>
                        </a>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes trackingSlideUp {
                    from { opacity:0; transform: translateY(20px) scale(0.98); }
                    to   { opacity:1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

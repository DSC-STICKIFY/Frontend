import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchAllOrders } from "../../services/OrdersAPI";
import { fetchStaffPendingValidation } from "../../services/customValidationAPI";
import CustomizationAPI from "../../services/CustomizationAPI";

export default function StaffDashboard() {
    const [orders, setOrders] = useState([]);
    const [pendingValidations, setPendingValidations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const [ordersResult, validations, customizationsData] = await Promise.all([
                    fetchAllOrders(),
                    fetchStaffPendingValidation(),
                    CustomizationAPI.fetchAllCustomizations().catch(() => []),
                ]);
                setOrders(Array.isArray(ordersResult) ? ordersResult : []);
                
                const pendingCusts = (Array.isArray(customizationsData) ? customizationsData : [])
                    .filter(c => c.status === 'pending_feasibility');

                setPendingValidations([
                    ...(Array.isArray(validations) ? validations : []),
                    ...pendingCusts
                ]);
            } catch (err) {
                console.error("Failed to load staff dashboard data:", err);
            } finally {
                if (!silent) setLoading(false);
            }
        };
        
        loadDashboardData();
        const interval = setInterval(() => {
            loadDashboardData(true);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Helper to flatten orders into items
    const allPendingShippingItems = useMemo(() => {
        const items = [];
        orders.forEach(order => {
            const details = order.order_details || order.items || [];
            details.forEach(detail => {
                // items in "To Ship" or "To Shipping" status
                if (detail.status === "To Ship" || detail.status === "To Shipping" || detail.status === "Approved for Shipping" || order.status === "To Ship" || order.status === "To Shipping" || order.status === "Approved for Shipping") {
                    // avoid duplicates by checking if we already have it
                    if (!items.some(i => i.order_details_id === detail.order_details_id)) {
                        items.push({
                            ...detail,
                            order_id: order.order_id,
                            order_number: order.order_number,
                            customer_name: order.name,
                            address: order.address,
                            payment_method: order.payment_method,
                            order_date: order.order_date
                        });
                    }
                }
            });
        });
        return items;
    }, [orders]);

    // Production / Preparation queue
    const productionItems = useMemo(() => {
        const items = [];
        orders.forEach(order => {
            const details = order.order_details || order.items || [];
            details.forEach(detail => {
                const isReadyMadePrep = (detail.status === "To Process" || order.status === "To Process") && order.cs_review_status === "not_applicable";
                const isCustomPrep    = (detail.status === "In Production" || order.status === "In Production");
                if ((isReadyMadePrep || isCustomPrep) && !items.some(i => i.order_details_id === detail.order_details_id)) {
                    items.push({ ...detail, order_id: order.order_id });
                }
            });
        });
        return items;
    }, [orders]);

    // Stat derivations
    const totalPending = allPendingShippingItems.length;
    const productionCount = productionItems.length;
    
    const codCount = useMemo(() => {
        return allPendingShippingItems.filter(item => 
            String(item.payment_method).toUpperCase() === "COD"
        ).length;
    }, [allPendingShippingItems]);

    const nonCodCount = totalPending - codCount;

    return (
        <div className="p-6 md:p-10 min-h-screen bg-slate-50/50">
            {/* Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-gray-900 mb-2">
                        Staff Dispatch Console
                    </h1>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                        Fulfill packages and dispatch couriers
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/staff/orders"
                        className="px-6 py-3.5 bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-black uppercase tracking-wider rounded-2xl transition duration-300 shadow-lg shadow-yellow-400/20 active:scale-95 text-center flex items-center justify-center"
                    >
                        📦 Process Shipments
                    </Link>
                    <Link
                        to="/staff/orders"
                        className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition duration-300 shadow-lg shadow-emerald-400/20 active:scale-95 text-center flex items-center justify-center"
                    >
                        🔧 Production Queue
                    </Link>
                    <Link
                        to="/staff/validation-queue"
                        className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition duration-300 shadow-lg active:scale-95 text-center flex items-center justify-center"
                    >
                        🔍 Feasibility Queue
                    </Link>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading dashboard telemetry...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Pending Feasibility Check Alert */}
                    {pendingValidations.length > 0 && (
                        <Link
                            to="/staff/validation-queue"
                            className="flex items-center justify-between gap-4 bg-amber-400 hover:bg-amber-500 rounded-3xl px-8 py-5 shadow-xl shadow-amber-400/30 transition group animate-in slide-in-from-top-2 duration-300"
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-3xl animate-bounce">🔍</span>
                                <div>
                                    <p className="text-black font-black text-base uppercase tracking-tight">
                                        {pendingValidations.length} Order{pendingValidations.length > 1 ? "s" : ""} Awaiting Feasibility Check
                                    </p>
                                    <p className="text-amber-900/70 text-[10px] font-bold uppercase tracking-widest">
                                        Customer Service is waiting for your manual validation
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-black opacity-70 group-hover:opacity-100 transition">Review Now →</span>
                        </Link>
                    )}

                    {/* Production Queue Alert */}
                    {productionCount > 0 && (
                        <Link
                            to="/staff/orders"
                            className="flex items-center justify-between gap-4 bg-emerald-500 hover:bg-emerald-600 rounded-3xl px-8 py-5 shadow-xl shadow-emerald-400/30 transition group animate-in slide-in-from-top-2 duration-300"
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-3xl animate-bounce">🔧</span>
                                <div>
                                    <p className="text-white font-black text-base uppercase tracking-tight">
                                        {productionCount} Item{productionCount > 1 ? "s" : ""} In Production / Preparation
                                    </p>
                                    <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest">
                                        Custom or ready-made items awaiting your fabrication or packing
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-white opacity-70 group-hover:opacity-100 transition">Work Now →</span>
                        </Link>
                    )}

                    {/* Status grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Stat Card 1 */}
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12.5-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z"/>
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block mb-2">Total Queue</span>
                            <div className="text-5xl font-black italic tracking-tighter mb-2">{totalPending}</div>
                            <p className="text-xs text-indigo-200 font-semibold">Packages pending dispatch/courier pickup</p>
                        </div>

                        {/* Stat Card 2 */}
                        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute right-0 bottom-0 opacity-5 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 block mb-2">Cash on Delivery</span>
                            <div className="text-5xl font-black italic tracking-tighter text-gray-900 mb-2">{codCount}</div>
                            <p className="text-xs text-gray-400 font-semibold">Requires cash collection on delivery</p>
                        </div>

                        {/* Stat Card 3 */}
                        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute right-0 bottom-0 opacity-5 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-2">Prepaid / GCash</span>
                            <div className="text-5xl font-black italic tracking-tighter text-gray-900 mb-2">{nonCodCount}</div>
                            <p className="text-xs text-gray-400 font-semibold">Paid in full online. Dispatch immediately</p>
                        </div>

                        {/* Stat Card 4 — Production Queue */}
                        <div className="bg-white rounded-3xl p-6 shadow-md border border-emerald-200 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                            <div className="absolute right-0 bottom-0 opacity-5 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/>
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-2">In Production</span>
                            <div className="text-5xl font-black italic tracking-tighter text-gray-900 mb-2">{productionCount}</div>
                            <p className="text-xs text-gray-400 font-semibold">Items being fabricated or packed by staff</p>
                        </div>
                    </div>

                    {/* Pending Items Checklist Table */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-gray-900">Immediate Packaging Queue</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Items ready for wrapping & waybill label generation</p>
                            </div>
                            <Link to="/staff/orders" className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition">
                                View Full List →
                            </Link>
                        </div>

                        {allPendingShippingItems.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                    </svg>
                                </div>
                                <h4 className="text-base font-bold text-gray-900 mb-1">Queue Completely Clear!</h4>
                                <p className="text-xs text-gray-400">All ready packages are dispatched. Sit back or enjoy a break.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                            <th className="py-4 px-6">Order ID</th>
                                            <th className="py-4 px-6">Customer / Location</th>
                                            <th className="py-4 px-6">Product</th>
                                            <th className="py-4 px-6 text-center">Qty</th>
                                            <th className="py-4 px-6 text-center">Method</th>
                                            <th className="py-4 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allPendingShippingItems.slice(0, 5).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/40 transition">
                                                <td className="py-4 px-6 font-black text-gray-900 text-xs">{item.order_number}</td>
                                                <td className="py-4 px-6">
                                                    <p className="text-xs font-bold text-gray-900">{item.customer_name}</p>
                                                    <p className="text-[10px] text-gray-400 max-w-xs truncate" title={item.address}>{item.address}</p>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <p className="text-xs font-semibold text-gray-900">{item.product_name}</p>
                                                    {item.size && <p className="text-[10px] text-gray-400">Size: {item.size}</p>}
                                                </td>
                                                <td className="py-4 px-6 text-center text-xs font-bold text-gray-900">{item.quantity}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        String(item.payment_method).toUpperCase() === "COD" 
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    }`}>
                                                        {item.payment_method}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Link
                                                        to="/staff/orders"
                                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition shadow-md hover:shadow-lg active:scale-95"
                                                    >
                                                        📦 Fulfill
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

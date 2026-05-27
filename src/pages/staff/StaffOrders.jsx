import React, { useState, useEffect, useMemo, useRef } from "react";
import { fetchAllOrders, fetchDispatchedOrders, outForDelivery, staffConfirmShipment, requestShipment, completeProduction } from "../../services/OrdersAPI";

const DISPATCHED_STATUSES = new Set([
    "to receive",
    "out for delivery",
    "out_for_delivery",
    "shipped",
    "on the way",
    "delivered",
    "completed",
]);

export default function StaffOrders() {
    const [orders, setOrders] = useState([]);
    const [dispatchedOrders, setDispatchedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItemForDispatch, setSelectedItemForDispatch] = useState(null);
    const [selectedItemForPrint, setSelectedItemForPrint] = useState(null);
    const [confirmingShipment, setConfirmingShipment] = useState(null);
    const [selectedItemForDetails, setSelectedItemForDetails] = useState(null);
    const [activeTab, setActiveTab] = useState("preparation"); // "preparation", "dispatch", "history"
    const [submittingPrep, setSubmittingPrep] = useState(null);

    // Form states
    const [trackingNumber, setTrackingNumber] = useState("");
    const [courier, setCourier] = useState("J&T Express");
    const [deliveryDays, setDeliveryDays] = useState(5);
    const [useMinutes, setUseMinutes] = useState(false);
    const [deliveryMinutes, setDeliveryMinutes] = useState(2);
    const [dispatching, setDispatching] = useState(false);

    const printRef = useRef(null);

    // ─── Data loading ─────────────────────────────────────────────────────────

    const loadOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [activeResult, dispatchedResult] = await Promise.all([
                fetchAllOrders(),
                fetchDispatchedOrders(),
            ]);
            setOrders(Array.isArray(activeResult) ? activeResult : []);
            setDispatchedOrders(Array.isArray(dispatchedResult) ? dispatchedResult : []);
        } catch (err) {
            console.error("Failed to load orders for staff:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        const interval = setInterval(() => loadOrders(true), 10000);
        return () => clearInterval(interval);
    }, []);

    // ─── Prep queue (Production & Ready-Made Preparation) ─────────────────────
    const prepItems = useMemo(() => {
        const items = [];
        const seenIds = new Set();

        orders.forEach(order => {
            const details = order.order_details || order.items || [];
            details.forEach(detail => {
                const detailStatus = (detail.status || "").toLowerCase();
                const orderStatus  = (order.status  || "").toLowerCase();

                if (DISPATCHED_STATUSES.has(detailStatus) || DISPATCHED_STATUSES.has(orderStatus)) return;

                // Ready-made in "To Process" OR Customized in "In Production"
                const isReadyMadePrep = (detail.status === "To Process" || order.status === "To Process") && order.cs_review_status === "not_applicable";
                const isCustomPrep    = (detail.status === "In Production" || order.status === "In Production");
                const isAwaitingApproval = (detail.status === "Awaiting Shipment Approval" || order.status === "Awaiting Shipment Approval");

                if ((isReadyMadePrep || isCustomPrep || isAwaitingApproval) && !seenIds.has(detail.order_details_id)) {
                    seenIds.add(detail.order_details_id);
                    items.push({
                        ...detail,
                        order_id:       order.order_id,
                        order_number:   order.order_number,
                        customer_name:  order.name,
                        address:        order.address,
                        contact_number: order.contact_number,
                        payment_method: order.payment_method,
                        order_date:     order.order_date,
                        raw_order:      order,
                        dispatched:     null,
                        is_custom_prep: !isReadyMadePrep,
                        is_awaiting_approval: isAwaitingApproval,
                    });
                }
            });
        });
        return items;
    }, [orders]);

    // ─── Active queue ─────────────────────────────────────────────────────────

    const activeItems = useMemo(() => {
        const items = [];
        const seenIds = new Set();

        orders.forEach(order => {
            const details = order.order_details || order.items || [];
            details.forEach(detail => {
                const detailStatus = (detail.status || "").toLowerCase();
                const orderStatus  = (order.status  || "").toLowerCase();

                if (DISPATCHED_STATUSES.has(detailStatus) || DISPATCHED_STATUSES.has(orderStatus)) return;

                const isActiveQueue =
                    detail.status === "To Ship"               ||
                    detail.status === "To Shipping"           ||
                    detail.status === "Approved for Shipping" ||
                    order.status  === "To Ship"               ||
                    order.status  === "To Shipping"           ||
                    order.status  === "Approved for Shipping";

                if (isActiveQueue && !seenIds.has(detail.order_details_id)) {
                    seenIds.add(detail.order_details_id);
                    items.push({
                        ...detail,
                        order_id:       order.order_id,
                        order_number:   order.order_number,
                        customer_name:  order.name,
                        address:        order.address,
                        contact_number: order.contact_number,
                        payment_method: order.payment_method,
                        order_date:     order.order_date,
                        raw_order:      order,
                        dispatched:     null,
                    });
                }
            });
        });
        return items;
    }, [orders]);

    // ─── Dispatched history ───────────────────────────────────────────────────

    const dispatchedItems = useMemo(() => {
        const items = [];
        const seenIds = new Set();

        dispatchedOrders.forEach(order => {
            const details = order.order_details || order.items || [];
            details.forEach(detail => {
                if (seenIds.has(detail.order_details_id)) return;
                seenIds.add(detail.order_details_id);
                items.push({
                    ...detail,
                    order_id:       order.order_id,
                    order_number:   order.order_number,
                    customer_name:  order.name,
                    address:        order.address,
                    contact_number: order.contact_number,
                    payment_method: order.payment_method,
                    order_date:     order.order_date,
                    raw_order:      order,
                    dispatched: {
                        trackingNumber: detail.tracking_number || order.tracking_number || "—",
                        courier:        detail.courier         || order.courier         || "J&T Express",
                        dispatchedAt:   order.dispatched_at    || "—",
                        fromDB:         true,
                    },
                });
            });
        });
        return items;
    }, [dispatchedOrders]);

    // ─── Combined + filtered ──────────────────────────────────────────────────

    const currentItems = useMemo(() => {
        if (activeTab === "preparation") return prepItems;
        if (activeTab === "dispatch") return activeItems;
        return dispatchedItems;
    }, [activeTab, prepItems, activeItems, dispatchedItems]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return currentItems;
        const search = searchQuery.toLowerCase();
        return currentItems.filter(item =>
            (item.order_number  || "").toLowerCase().includes(search) ||
            (item.customer_name || "").toLowerCase().includes(search) ||
            (item.product_name  || "").toLowerCase().includes(search)
        );
    }, [currentItems, searchQuery]);

    // ─── Production & Shipment Request handlers ──────────────────────────────
    const handleCompleteProduction = async (orderId) => {
        if (!window.confirm("Are you sure you want to mark production as completed for this order?")) return;
        setSubmittingPrep(orderId);
        try {
            await completeProduction(orderId);
            alert("Production successfully marked as completed! Order is now sent to sub-admin for shipment approval.");
            await loadOrders();
        } catch (err) {
            console.error("Failed to complete production:", err);
            alert("Error: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmittingPrep(null);
        }
    };

    const handleRequestShipment = async (orderId) => {
        const note = window.prompt("Enter any shipment preparation notes (optional):");
        if (note === null) return;
        setSubmittingPrep(orderId);
        try {
            await requestShipment(orderId, note.trim() || "Ready-made order packed.");
            alert("Shipment request submitted successfully! Awaiting sub-admin approval.");
            await loadOrders();
        } catch (err) {
            console.error("Failed to request shipment:", err);
            alert("Error: " + (err.response?.data?.message || err.message));
        } finally {
            setSubmittingPrep(null);
        }
    };

    // ─── Dispatch handler ─────────────────────────────────────────────────────

    const handleDispatch = async (e) => {
        e.preventDefault();
        if (!selectedItemForDispatch || !trackingNumber.trim()) return;

        setDispatching(true);
        try {
            await outForDelivery(
                selectedItemForDispatch.order_id,
                selectedItemForDispatch.order_details_id,
                trackingNumber.trim(),
                useMinutes ? 0 : deliveryDays,
                useMinutes ? deliveryMinutes : 0
            );
            setSelectedItemForDispatch(null);
            setTrackingNumber("");
            await loadOrders(true);
        } catch (err) {
            console.error("Failed to register dispatch waybill:", err);
            alert("Error: Failed to register dispatch waybill tracking number.");
        } finally {
            setDispatching(false);
        }
    };

    // ─── Print ────────────────────────────────────────────────────────────────

    const handlePrint = () => {
        const printContent = printRef.current?.innerHTML;
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Waybill - ${selectedItemForPrint?.order_number}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; max-width: 400px; margin: 0 auto; }
                        .waybill-card { border: 3px dashed #000; padding: 20px; border-radius: 12px; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                        .logo { font-size: 20px; font-weight: bold; text-transform: uppercase; }
                        .barcode { text-align: center; font-size: 32px; letter-spacing: 4px; margin: 15px 0; padding: 10px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
                        .details { font-size: 13px; line-height: 1.6; }
                        .label { font-weight: bold; text-transform: uppercase; }
                        .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 2px solid #000; padding-top: 10px; }
                    </style>
                </head>
                <body onload="window.print();window.close();">
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const prepCount       = prepItems.length;
    const activeCount      = activeItems.length;
    const historyCount     = dispatchedItems.length;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="p-6 md:p-10 min-h-screen bg-gray-50">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">Order Fulfillment &amp; Dispatch Console</h1>
                    <p className="text-xs text-gray-400">Fabricate custom layouts, request shipment approvals, pack waybills, and register tracking numbers</p>
                </div>
                <button
                    onClick={() => loadOrders(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg shadow-sm transition"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 gap-6">
                <button
                    onClick={() => setActiveTab("preparation")}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition border-b-2 ${
                        activeTab === "preparation"
                            ? "border-amber-500 text-gray-900"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                    🔧 Prep &amp; Production ({prepCount})
                </button>
                <button
                    onClick={() => setActiveTab("dispatch")}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition border-b-2 ${
                        activeTab === "dispatch"
                            ? "border-amber-500 text-gray-900"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                    📦 Dispatch Queue ({activeCount})
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition border-b-2 ${
                        activeTab === "history"
                            ? "border-amber-500 text-gray-900"
                            : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                >
                    📜 Dispatched History ({historyCount})
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 h-9 flex-1 max-w-md shadow-sm">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by order ID, customer name, or product..."
                        className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-gray-400">Loading shipments queue...</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {filteredItems.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-400 mb-4">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h4 className="text-sm font-semibold text-gray-800 mb-1">
                                {activeTab === "preparation" ? "No items in preparation" : activeTab === "dispatch" ? "No orders ready for dispatch" : "No dispatched orders yet"}
                            </h4>
                            <p className="text-xs text-gray-400">
                                {activeTab === "preparation"
                                    ? "Custom production items and ready-made orders will appear here when assigned."
                                    : activeTab === "dispatch"
                                    ? "Items will appear here once approved by the sub-admin for shipping."
                                    : "Dispatched orders with tracking numbers will show up here."}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 w-10">#</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 whitespace-nowrap">Order ID</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Customer &amp; location</th>
                                        {activeTab === "preparation" && (
                                            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Type</th>
                                        )}
                                        <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Method</th>
                                        <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredItems.map((item, index) => {
                                        const isDispatched = !!item.dispatched;
                                        const isApproved =
                                            item.status === "Approved for Shipping" ||
                                            item.raw_order?.status === "Approved for Shipping";

                                        return (
                                            <tr
                                                key={`${item.order_id}-${item.order_details_id ?? index}`}
                                                onClick={() => setSelectedItemForDetails(item)}
                                                className={`cursor-pointer transition-colors ${
                                                    isDispatched
                                                        ? "opacity-70 hover:opacity-100 hover:bg-gray-50"
                                                        : "hover:bg-gray-50"
                                                }`}
                                            >
                                                {/* Row number */}
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-sm font-black text-gray-500">{index + 1}</span>
                                                </td>

                                                {/* Order ID */}
                                                <td className="py-3 px-4 font-medium text-gray-900 text-xs whitespace-nowrap">
                                                    {item.order_number}
                                                </td>

                                                {/* Customer */}
                                                <td className="py-3 px-4">
                                                    <p className="text-xs font-medium text-gray-900 leading-tight">{item.customer_name}</p>
                                                    <p className="text-[11px] text-gray-400 leading-tight mt-0.5 truncate max-w-[200px]" title={item.address}>
                                                        {item.address}
                                                    </p>
                                                </td>

                                                {/* Type (only on Preparation tab) */}
                                                {activeTab === "preparation" && (
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                                                            item.is_custom_prep
                                                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                : "bg-sky-50 text-sky-700 border-sky-200"
                                                        }`}>
                                                            {item.is_custom_prep ? "🎨 Custom" : "📦 Ready-Made"}
                                                        </span>
                                                    </td>
                                                )}

                                                {/* Method */}
                                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                                    <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                                                        String(item.payment_method).toUpperCase() === "COD"
                                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                                            : "bg-green-50 text-green-700 border-green-200"
                                                    }`}>
                                                        {item.payment_method}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4 text-center">
                                                    {activeTab === "preparation" ? (
                                                        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                                                            item.is_awaiting_approval
                                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                : item.is_custom_prep
                                                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                                                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                        }`}>
                                                            {item.is_awaiting_approval ? "⏳ Pending Admin" : item.is_custom_prep ? "🔧 In Production" : "📋 To Process"}
                                                        </span>
                                                    ) : isDispatched ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                                                Dispatched
                                                            </span>
                                                            <span className="text-[11px] text-gray-500 font-medium mt-0.5">
                                                                {item.dispatched.trackingNumber} · {item.dispatched.courier}
                                                            </span>
                                                        </div>
                                                    ) : isApproved ? (
                                                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                                            Approved
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                                            To ship
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action */}
                                                <td
                                                    className="py-3 px-4 text-right whitespace-nowrap"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {activeTab === "preparation" ? (
                                                        /* ── Preparation tab actions ── */
                                                        item.is_awaiting_approval ? (
                                                            <button
                                                                disabled
                                                                className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed whitespace-nowrap"
                                                            >
                                                                ⏳ Waiting for Confirmation
                                                            </button>
                                                        ) : item.is_custom_prep ? (
                                                            <button
                                                                disabled={submittingPrep === item.order_id}
                                                                onClick={() => handleCompleteProduction(item.order_id)}
                                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                                                            >
                                                                {submittingPrep === item.order_id ? "Processing..." : "✅ Complete Production"}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled={submittingPrep === item.order_id}
                                                                onClick={() => handleRequestShipment(item.order_id)}
                                                                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                                                            >
                                                                {submittingPrep === item.order_id ? "Processing..." : "📦 Request Shipment"}
                                                            </button>
                                                        )
                                                    ) : isDispatched ? (
                                                        /* ── History tab: reprint waybill ── */
                                                        <button
                                                            onClick={() => setSelectedItemForPrint(item)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-medium rounded-lg transition"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                            Waybill
                                                        </button>
                                                    ) : isApproved ? (
                                                        /* ── Dispatch tab: confirm shipment ── */
                                                        <button
                                                            disabled={confirmingShipment === item.order_id}
                                                            onClick={async () => {
                                                                setConfirmingShipment(item.order_id);
                                                                try {
                                                                    await staffConfirmShipment(item.order_id);
                                                                    alert(`Order #${item.order_number} is now marked as 'To Ship'. You can now dispatch it.`);
                                                                    await loadOrders();
                                                                } catch (err) {
                                                                    alert("Failed to confirm shipment: " + (err.response?.data?.message || err.message));
                                                                } finally {
                                                                    setConfirmingShipment(null);
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                                                        >
                                                            {confirmingShipment === item.order_id ? "Processing..." : "Prepare & ship"}
                                                        </button>
                                                    ) : (
                                                        /* ── Dispatch tab: waybill + dispatch ── */
                                                        <div className="inline-flex items-center gap-2">
                                                            <button
                                                                onClick={() => setSelectedItemForPrint(item)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-medium rounded-lg transition"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                                </svg>
                                                                Waybill
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedItemForDispatch(item);
                                                                    setTrackingNumber("");
                                                                }}
                                                                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-amber-900 text-xs font-medium rounded-lg transition"
                                                            >
                                                                Dispatch
                                                            </button>
                                                        </div>
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
            )}

            {/* ── Waybill Print Modal ─────────────────────────────────────────── */}
            {selectedItemForPrint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">Waybill slip preview</h3>
                        <p className="text-[11px] text-gray-400 mb-5">Thermal print template</p>
                        <div className="bg-gray-50 rounded-xl p-4 mb-5 max-h-[300px] overflow-y-auto border border-gray-100">
                            <div ref={printRef} className="bg-white p-4 border border-dashed border-gray-300 rounded-lg">
                                <div className="text-center border-b-2 border-black pb-2 mb-3">
                                    <span className="font-bold block text-base tracking-wider uppercase">DSC Sticker</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Courier dispatch slip</span>
                                </div>
                                <div className="text-center font-mono text-lg border-y border-black py-2 my-2 tracking-[0.25em]">
                                    {selectedItemForPrint.order_number}
                                </div>
                                <div className="space-y-1.5 text-xs font-mono text-left leading-relaxed text-black mt-3">
                                    <p><span className="font-bold uppercase">Recipient:</span> {selectedItemForPrint.customer_name}</p>
                                    <p><span className="font-bold uppercase">Phone:</span> {selectedItemForPrint.contact_number || "N/A"}</p>
                                    <p><span className="font-bold uppercase">Address:</span> {selectedItemForPrint.address}</p>
                                    <p><span className="font-bold uppercase">Courier:</span> {selectedItemForPrint.dispatched?.courier || "J&T Express"}</p>
                                    <p><span className="font-bold uppercase">Tracking:</span> {selectedItemForPrint.dispatched?.trackingNumber || "—"}</p>
                                    <p><span className="font-bold uppercase">Payment:</span> {selectedItemForPrint.payment_method}</p>
                                    <p><span className="font-bold uppercase">Product:</span> {selectedItemForPrint.product_name} {selectedItemForPrint.size ? `(${selectedItemForPrint.size})` : ""}</p>
                                    <p><span className="font-bold uppercase">Qty:</span> x{selectedItemForPrint.quantity}</p>
                                    {(selectedItemForPrint.product?.shelf_location || selectedItemForPrint.shelf_location) && (
                                        <p><span className="font-bold uppercase">Shelf:</span> {selectedItemForPrint.product?.shelf_location || selectedItemForPrint.shelf_location}</p>
                                    )}
                                </div>
                                <div className="text-center mt-4 border-t-2 border-black pt-2 text-[9px] font-mono text-black">
                                    Thank you for your order!
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setSelectedItemForPrint(null)}
                                className="flex-1 py-3 border border-gray-200 text-gray-500 text-xs font-medium rounded-xl hover:bg-gray-50 transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex-1 py-3 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition"
                            >
                                Print slip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Dispatch Modal ──────────────────────────────────────────────── */}
            {selectedItemForDispatch && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setSelectedItemForDispatch(null)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="font-semibold text-gray-900 text-base mb-1">Register dispatch waybill</h3>
                        <p className="text-[11px] text-gray-400 mb-5">
                            Courier &amp; tracking info for {selectedItemForDispatch.order_number}
                        </p>
                        <form onSubmit={handleDispatch} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Courier partner</label>
                                <select
                                    value={courier}
                                    onChange={e => setCourier(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300"
                                >
                                    <option value="J&T Express">J&T Express</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Tracking / waybill number *</label>
                                <input
                                    type="text"
                                    required
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    placeholder="e.g. JT1234567890"
                                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-medium text-gray-500">Delivery deadline type</label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setUseMinutes(false)}
                                        className={`text-[10px] px-3 py-1 rounded-full font-medium transition ${!useMinutes ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}
                                    >
                                        Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUseMinutes(true)}
                                        className={`text-[10px] px-3 py-1 rounded-full font-medium transition ${useMinutes ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500"}`}
                                    >
                                        Mins 🧪
                                    </button>
                                </div>
                            </div>
                            {useMinutes ? (
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Minutes until delivery *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={deliveryMinutes}
                                        onChange={e => setDeliveryMinutes(Number(e.target.value))}
                                        className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-300"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Days until delivery *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={deliveryDays}
                                        onChange={e => setDeliveryDays(Number(e.target.value))}
                                        className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300"
                                    />
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedItemForDispatch(null)}
                                    className="flex-1 py-3 border border-gray-200 text-gray-500 text-xs font-medium rounded-xl hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={dispatching || !trackingNumber.trim()}
                                    className="flex-1 py-3 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition disabled:opacity-40"
                                >
                                    {dispatching ? "Processing..." : "Confirm dispatch"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Order Details Modal ─────────────────────────────────────────── */}
            {selectedItemForDetails && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                    onClick={() => setSelectedItemForDetails(null)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-base">Order information</h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">{selectedItemForDetails.order_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedItemForDetails(null)}
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition"
                            >
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Customer details</p>
                                <p className="text-sm font-semibold text-gray-900">{selectedItemForDetails.customer_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">📞 {selectedItemForDetails.contact_number || "N/A"}</p>
                                <p className="text-xs text-gray-400 mt-1">{selectedItemForDetails.address}</p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Product info</p>
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{selectedItemForDetails.product_name}</p>
                                {selectedItemForDetails.size && (
                                    <p className="text-xs text-gray-500 mt-1">Size: {selectedItemForDetails.size}</p>
                                )}
                                <p className="text-xs text-gray-700 mt-2">
                                    Quantity: <span className="font-semibold text-indigo-600">{selectedItemForDetails.quantity} pcs</span>
                                </p>
                                {(selectedItemForDetails.product?.shelf_location || selectedItemForDetails.shelf_location) && (
                                    <p className="text-xs text-amber-700 font-bold mt-2 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 inline-block">
                                        📍 Shelf: {selectedItemForDetails.product?.shelf_location || selectedItemForDetails.shelf_location}
                                    </p>
                                )}
                                {selectedItemForDetails.comments && selectedItemForDetails.comments !== "None" && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Customer note</p>
                                        <p className="text-xs text-gray-600 italic">"{selectedItemForDetails.comments}"</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                <p className="text-xs font-medium text-gray-500">Payment method</p>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                                    String(selectedItemForDetails.payment_method).toUpperCase() === "COD"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-green-100 text-green-800"
                                }`}>
                                    {selectedItemForDetails.payment_method}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedItemForDetails(null)}
                            className="w-full mt-5 py-3 bg-gray-900 text-white text-xs font-medium rounded-xl hover:bg-gray-800 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
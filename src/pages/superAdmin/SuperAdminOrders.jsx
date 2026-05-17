import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    fetchAllOrders,
    acceptOrder,
    cancelOrder,
    shipOrder,
    outForDelivery,
    completeOrder,
    approveReturn,
    rejectReturn,
    submitAdminReply,
} from "../../services/OrdersAPI.js";
import OrderDetailsModal from "./OrderDetailsModal";
import UserOrdersModal from "./UserOrdersModal";

const getCustomerName = (order) => {
    if (order.name && order.name !== "Customer") return order.name;
    if (order.user?.first_name || order.user?.last_name)
        return `${order.user.first_name || ""} ${order.user.last_name || ""}`.trim();
    return order.customer_name || "Customer";
};

const hasAnyReview = (order) => {
    if (order.reviews && Array.isArray(order.reviews) && order.reviews.length > 0) return true;
    return !!(order.has_review || order.rating);
};

const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return isNaN(d.getTime())
        ? isoString
        : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const SuperAdminOrders = () => {
    const [orders, setOrders]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [statusFilter, setStatusFilter]   = useState("All");
    const [searchQuery, setSearchQuery]     = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedUser, setSelectedUser]   = useState(null);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchAllOrders();
            const order79 = result.find(o => o.order_id === 79);
            console.log("Order 79:", order79);
            console.log("order_date:", order79?.order_date);
            console.log("Raw created_at from backend — check network tab");
            setOrders(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error("Error loading orders:", error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshOrdersSilently = useCallback(async () => {
        try {
            const result = await fetchAllOrders();
            setOrders(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error("Background refresh failed:", error);
        }
    }, []);

    useEffect(() => { loadOrders(); }, [loadOrders]);
    useEffect(() => {
        const interval = setInterval(refreshOrdersSilently, 10000);
        return () => clearInterval(interval);
    }, [refreshOrdersSilently]);

   const filteredOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : [])
        .filter((order) => {
            if (statusFilter === "All")             return true;
            if (statusFilter === "Archived")        return order.status === "Cancelled";
            if (statusFilter === "Reviews")         return hasAnyReview(order);
            if (statusFilter === "Pending Payment") return order.status === "Pending Payment";
            if (statusFilter === "Pending")         
                return order.status === "Pending" || order.status === "Pending Payment";
            if (statusFilter === "Return/Refund")   
                return order.status === "Return/Refund" || order.status === "Refunded";
            return order.status === statusFilter;
        })
        .filter((order) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const name    = getCustomerName(order).toLowerCase();
            const email   = (order.email || "").toLowerCase();
            const contact = (order.contact_number || "").toLowerCase();
            const orderNo = (order.order_number || String(order.order_id) || "").toLowerCase();
            return name.includes(q) || email.includes(q) || contact.includes(q) || orderNo.includes(q);
        })
          .sort((a, b) => {
            const dateA = a.order_date || a.created_at;
            const dateB = b.order_date || b.created_at;
            if (!dateA && !dateB) return b.order_id - a.order_id;
            if (!dateA) return -1; // ← null date goes to TOP
            if (!dateB) return 1;
            return new Date(dateB) - new Date(dateA);
        });
   }, [orders, statusFilter, searchQuery]);

    const handleAcceptOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await acceptOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleShipOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await shipOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleOutForDelivery = useCallback(async (
        orderId,
        orderDetailsId  = null,
        trackingNumber  = null,
        deliveryDays    = 5,
        deliveryMinutes = 0,
    ) => {
        await outForDelivery(orderId, orderDetailsId, trackingNumber, deliveryDays, deliveryMinutes);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleCompleteOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await completeOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleCancelOrder = useCallback(async (orderId, orderDetailsId = null) => {
        await cancelOrder(orderId, orderDetailsId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleApproveReturn = useCallback(async (orderId) => {
        await approveReturn(orderId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleRejectReturn = useCallback(async (orderId) => {
        await rejectReturn(orderId);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const handleAdminReply = useCallback(async (orderId, reviewId, reply) => {
        await submitAdminReply(reviewId, reply);
        refreshOrdersSilently();
    }, [refreshOrdersSilently]);

    const openOrderModal = useCallback((order) => {
        setSelectedUser({
            name:    getCustomerName(order),
            email:   order.email || "N/A",
            contact: order.contact_number || "N/A",
            orders:  [order],
        });
    }, []);

    return (
        <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Orders Management</h1>

            {selectedOrder && (
                <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            )}

            {selectedUser && (
                <UserOrdersModal
                    user={selectedUser}
                    statusFilter={statusFilter}
                    onClose={() => setSelectedUser(null)}
                    onRefresh={refreshOrdersSilently}
                    actions={{
                        handleAcceptOrder,
                        handleShipOrder,
                        handleOutForDelivery,
                        handleCompleteOrder,
                        handleCancelOrder,
                        handleApproveReturn,
                        handleRejectReturn,
                        handleAdminReply,
                    }}
                />
            )}

            {/* Search */}
            <div className="flex flex-wrap items-center justify-start gap-3 mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search customer, email, contact or order #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-80 transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                </div>
            </div>

            {/* Status filters */}
            <div className="flex gap-4 font-semibold overflow-x-auto mb-6">
                {["All", "Pending", "Pending Payment", "To Process", "To Ship", "To Receive", "Completed", "Return/Refund", "Reviews", "Archived"].map((status) => (
                    <button 
                        key={status} 
                        onClick={() => setStatusFilter(status)}
                        className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${
                            statusFilter === status
                                ? "border-[#FFE100] text-gray-900 font-bold"
                                : "border-transparent text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Table (Status column removed) */}
            <div className="flex flex-col w-full overflow-y-auto flex-1 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-600">
                        {loading
                            ? "Loading..."
                            : `${filteredOrders.length} transaction${filteredOrders.length !== 1 ? "s" : ""} found`}
                    </p>
                </div>

                <div className="p-4 overflow-x-auto">
                    <table className="w-full table-auto border-collapse min-w-[680px]">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="text-left border-b-2 border-gray-200">
                                <th className="px-4 py-3 font-semibold text-sm">Order #</th>
                                <th className="px-4 py-3 font-semibold text-sm">Date</th>
                                <th className="px-4 py-3 font-semibold text-sm">Customer</th>
                                <th className="px-4 py-3 font-semibold text-sm">Address</th>
                                <th className="px-4 py-3 font-semibold text-sm text-center">Total</th>
                                <th className="px-4 py-3 font-semibold text-sm text-center w-28">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin"/>
                                            <p className="text-sm text-gray-500">Loading orders...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-20 text-gray-500">
                                        <p className="font-medium text-lg">No orders found matching current filters.</p>
                                    </td>
                                </tr>
                            ) : filteredOrders.map((order) => {
                                const customerName = getCustomerName(order);
                                const reviewCount  = order.reviews?.length || 0;

                                return (
                                    <tr key={order.order_id} className="border-b hover:bg-gray-50 transition">
                                        {/* Order number */}
                                        <td className="px-4 py-5">
                                            <span className="font-bold text-gray-900 text-sm">
                                                {order.order_number || `#${order.order_id}`}
                                            </span>
                                            {reviewCount > 0 && (
                                                <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium">
                                                    💬 {reviewCount}
                                                </span>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td className="px-4 py-5 text-sm text-gray-500 whitespace-nowrap">
                                            {formatDate(order.order_date)}
                                        </td>

                                        {/* Customer */}
                                        <td className="px-4 py-5">
                                            <p className="font-semibold text-gray-900 text-sm">{customerName}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{order.email || "N/A"}</p>
                                        </td>

                                        {/* Address */}
                                        <td className="px-4 py-5 text-gray-600 text-sm max-w-[180px] truncate">
                                            {order.address || "N/A"}
                                        </td>

                                        {/* Total */}
                                        <td className="px-4 py-5 text-center font-semibold text-gray-900 text-sm whitespace-nowrap">
                                            ₱{Number(order.total_price || 0).toLocaleString("en-PH")}
                                        </td>

                                        {/* Action button */}
                                        <td className="px-4 py-5 text-center">
                                            <button
                                                onClick={() => openOrderModal(order)}
                                                className="bg-black hover:bg-gray-800 text-white px-5 py-1.5 rounded-lg text-xs font-medium transition shadow-sm w-full"
                                            >
                                                View Order
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminOrders;

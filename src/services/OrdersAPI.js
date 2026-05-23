import api from "./api";

// ─────────────────────────────────────────────────────────────────────────────
//  transformOrder
//  Converts a raw Laravel order object into a normalised shape.
//  Key rule: NEVER override item.status with the parent order.status.
// ─────────────────────────────────────────────────────────────────────────────
const transformOrder = (order) => {
  if (!order) return null;

  const rawItems =
    order.order_details ||
    order.items ||
    order.order_items ||
    order.products ||
    [];
  const items = Array.isArray(rawItems) ? rawItems : [];

  const processedItems = items.map((item) => {
    const product = item.product || {};
    const unitPrice = Number(
      item.price || item.item_price || product.product_price || 0,
    );
    const quantity = item.quantity || 1;

    // CRITICAL: always prefer item.status — never override with parent order.status.
    const itemStatus = item.status || order.status || "Pending";

    return {
      order_details_id: item.order_details_id || item.id,
      product_id: item.product_id || product.product_id,
      product_name:
        item.product_name || product.product_name || product.name || "Product",
      product_image:
        item.order_image || item.product_image || product.product_image || null,
      product_category: product.product_category || item.category || "N/A",
      product_type: product.product_type || item.type || "N/A",
      quantity,
      size: item.size || null,
      item_price: unitPrice,
      subtotal: Number(item.subtotal || unitPrice * quantity),
      status: itemStatus,
      return_status: item.return_status || null,
      auto_completed_at: order.auto_completed_at || null,
      completed_at: order.completed_at || null,
      updated_at: order.updated_at || null,
      status_changed_at: order.status_changed_at || order.updated_at || null,
      // Return policy window from backend (null = no policy / not returnable)
      return_window_seconds: item.return_window_seconds ?? order.return_window_seconds ?? null,
      return_deadline: item.return_deadline ?? order.return_deadline ?? null,
      is_customizable: item.is_customizable !== undefined ? item.is_customizable : (product.is_customizable !== undefined ? product.is_customizable : null),
    };
  });

  const reviews = Array.isArray(order.reviews) ? order.reviews : [];
  const firstReview = reviews[0] || null;
  const finalStatus = order.status || "Pending";

  return {
    order_id: order.order_id,
    artist_id: order.artist_id,
    artist: order.artist,
    order_number:
      order.order_number || `ORD-${String(order.order_id).padStart(5, "0")}`,
    status: finalStatus,
    cancel_reason: order.cancel_reason || null,
    total_price: Number(order.total_price) || 0,
    shipping_fee: Number(order.shipping_fee) || 0,
    tracking_number: order.tracking_number || null,
    delivery_deadline: order.delivery_deadline || null,
    dispatched_at: order.dispatched_at || null,
    order_date: order.order_date || order.created_at,
    payment_method: order.payment_method || "COD",
    courier: order.courier || "J&T",


    // ── ADDRESS FIX ──────────────────────────────────────────────────────
    // The DB column is `address` on orders_table (NOT `delivery_address`).
    // The old code tried `order.delivery_address` first which is always
    // undefined, so it always fell through to "N/A".
    // Fix: read `order.address` directly, fallback to user profile address.
    address:
      (order.address && order.address !== "N/A" ? order.address : null) ||
      (order.user?.address && order.user.address !== "N/A"
        ? order.user.address
        : null) ||
      "N/A",

    // ── CONTACT NUMBER ───────────────────────────────────────────────────
    // OrdersModel.booted() copies contact_number from user on creation,
    // so order.contact_number is the primary source.
    contact_number:
      order.contact_number ||
      order.user?.contact_number ||
      order.user?.contact_no ||
      order.user?.phone ||
      order.phone_number ||
      "N/A",

    user_id: order.user_id || order.user?.id,
    email: order.email || order.user?.email || "N/A",
    name: order.user
      ? `${order.user.first_name || ""} ${order.user.last_name || ""}`.trim()
      : order.name || order.customer_name || "Customer",

    order_details: processedItems,
    items: processedItems,
    user: order.user,
    return_reason: order.return_reason || null,
    return_details: order.return_details || null,
    returnRefund: order.returnRefund || order.return_refund || null,
    return_status:
      order.return_status ||
      (Array.isArray(order.returnRefund) ? order.returnRefund[0]?.status : order.returnRefund?.status) ||
      processedItems.find(i => i.return_status)?.return_status ||
      null,
    reviews,
    has_review: reviews.length > 0,
    rating: firstReview?.rating ?? null,
    comment: firstReview?.comment ?? null,
    admin_reply: firstReview?.admin_reply ?? null,
    final_design_url: order.final_design_url || null,
    shipment_requested_at: order.shipment_requested_at || null,
    shipment_note: order.shipment_note || null,
  };
};

const extractOrdersArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData?.orders && Array.isArray(responseData.orders))
    return responseData.orders;
  if (responseData?.data && Array.isArray(responseData.data))
    return responseData.data;
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
//  Orders
// ─────────────────────────────────────────────────────────────────────────────

export const fetchAllOrders = async () => {
  try {
    const response = await api.get("/orders");
    return extractOrdersArray(response.data).map(transformOrder);
  } catch (error) {
    console.error(
      "Failed to fetch all orders:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const fetchUserOrders = async () => {
  try {
    const response = await api.get("/user_orders");
    const ordersArray = extractOrdersArray(response.data);
    return {
      message: response.data?.message || "Success",
      orders: ordersArray.map(transformOrder),
    };
  } catch (error) {
    console.error(
      "Failed to fetch user orders:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const fetchRecentOrders = async () => {
  try {
    const response = await api.get("/recent_orders");
    return extractOrdersArray(response.data).map(transformOrder);
  } catch (error) {
    console.error(
      "Failed to fetch recent orders:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Order Actions
// ─────────────────────────────────────────────────────────────────────────────

export const placeOrder = async (orderData) => {
  try {
    const response = await api.post("/place_order", orderData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    console.error(
      "Failed to place order:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const cancelOrder = async (orderId, orderDetailsId = null, reason = "Customer request") => {
  try {
    const payload = {
      reason,
      ...(orderDetailsId ? { order_details_id: orderDetailsId } : {})
    };
    const response = await api.post(`/cancel_order/${orderId}`, payload);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to cancel order #${orderId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const acceptOrder = async (orderId, orderDetailsId = null) => {
  try {
    const payload = orderDetailsId ? { order_details_id: orderDetailsId } : {};
    const response = await api.post(`/accept_order/${orderId}`, payload);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to accept order #${orderId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const shipOrder = async (orderId, orderDetailsId = null) => {
  try {
    const payload = orderDetailsId ? { order_details_id: orderDetailsId } : {};
    const response = await api.post(`/ship_order/${orderId}`, payload);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to ship order #${orderId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const outForDelivery = async (
  orderId,
  orderDetailsId = null,
  trackingNumber = null,
  deliveryDays = 5,
  deliveryMinutes = 0,
) => {
  const payload = {};
  if (orderDetailsId) payload.order_details_id = orderDetailsId;
  if (trackingNumber) payload.tracking_number = trackingNumber;
  if (deliveryDays) payload.delivery_days = deliveryDays;
  if (deliveryMinutes) payload.delivery_minutes = deliveryMinutes;

  const response = await api.post(`/out_for_delivery/${orderId}`, payload);
  return response.data;
};

/**
 * Staff confirms the order is prepared and ready to ship.
 * Moves status from "Approved for Shipping" → "To Ship".
 */
export const staffConfirmShipment = async (orderId) => {
  try {
    const response = await api.post(`/orders/${orderId}/staff-confirm-shipment`);
    return response.data;
  } catch (error) {
    console.error(`Failed to confirm shipment for order #${orderId}:`, error.response?.data || error.message);
    throw error;
  }
};

export const completeOrder = async (orderId, orderDetailsId = null) => {
  try {
    const payload = orderDetailsId ? { order_details_id: orderDetailsId } : {};
    const response = await api.post(`/complete_order/${orderId}`, payload);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to complete order #${orderId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Return / Refund
// ─────────────────────────────────────────────────────────────────────────────

export const submitReturnRefund = async (formData) => {
  try {
    const response = await api.post("/returns", formData, { timeout: 60000 });
    return response.data;
  } catch (error) {
    console.error("Return/Refund Error:", error);
    throw error;
  }
};

export const fetchAllReturns = async () => {
  try {
    const response = await api.get("/returns");
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error(
      "Failed to fetch returns:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const fetchReturnById = async (returnId) => {
  try {
    const response = await api.get(`/returns/${returnId}`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error(
      `Failed to fetch return #${returnId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const updateReturnStatus = async (returnId, status, proofFile = null) => {
  try {
    if (proofFile) {
      const data = new FormData();
      data.append("status", status);
      data.append("refund_proof", proofFile);
      data.append("_method", "PATCH");

      const response = await api.post(`/returns/${returnId}/status`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return response.data;
    } else {
      const response = await api.patch(`/returns/${returnId}/status`, { status });
      return response.data;
    }
  } catch (error) {
    console.error(
      `Failed to update return #${returnId} status:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const approveReturn = async (returnId) =>
  updateReturnStatus(returnId, "approved");
export const rejectReturn = async (returnId) =>
  updateReturnStatus(returnId, "rejected");

export const authorizeSubAdmin = async (returnId) => {
  try {
    const response = await api.patch(`/returns/${returnId}/authorize`);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to authorize sub-admin for return #${returnId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const sendReturnMessage = async (returnId, message) => {
  try {
    const response = await api.post(`/returns/${returnId}/messages`, {
      message,
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error(
      `Failed to send message on return #${returnId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const fetchReturnMessages = async (returnId, lastId = null) => {
  try {
    const url = lastId
      ? `/returns/${returnId}/messages?last_id=${lastId}`
      : `/returns/${returnId}/messages`;
    const response = await api.get(url);
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error(
      `Failed to fetch messages for return #${returnId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Reviews
// ─────────────────────────────────────────────────────────────────────────────

export const submitReview = async (data) => {
  try {
    const response = await api.post("/reviews", data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to submit review:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const submitAdminReply = async (reviewId, reply) => {
  try {
    const response = await api.patch(`/reviews/${reviewId}/reply`, { reply });
    return response.data;
  } catch (error) {
    console.error(
      `Failed to submit reply for review #${reviewId}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const toggleReviewStatus = async (reviewId) => {
  try {
    const response = await api.patch(`/reviews/${reviewId}/toggle-status`);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to toggle review #${reviewId} status:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const fetchTracking = async (orderId) => {
  const response = await api.get(`/orders/${orderId}/track`);
  return response.data;
};

export const fetchPromos = async () => {
  try {
    const response = await api.get("/promotions");
    const data = response.data;
    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("Failed to fetch promotions:", err);
    return [];
  }
};

export const approveDesign = async (orderId) => {
  const response = await api.post(`/orders/${orderId}/approve-design`);
  return response.data;
};

export const requestChange = async (orderId) => {
  const response = await api.post(`/orders/${orderId}/request-change`);
  return response.data;
};

export const rejectShipmentRequest = async (orderId, reason) => {
  const response = await api.post(`/orders/${orderId}/reject-shipment-request`, { reason });
  return response.data;
};

export const fetchDispatchedOrders = async () => {
  try {
    const response = await api.get("/staff/dispatched-orders");
    return extractOrdersArray(response.data).map(transformOrder);
  } catch (error) {
    console.error(
      "Failed to fetch dispatched orders:",
      error.response?.data || error.message,
    );
    throw error;
  }
};
 

// ─────────────────────────────────────────────────────────────────────────────
//  Default Export
// ─────────────────────────────────────────────────────────────────────────────

export default {
  fetchAllOrders,
  fetchUserOrders,
  fetchRecentOrders,
  placeOrder,
  cancelOrder,
  acceptOrder,
  shipOrder,
  outForDelivery,
  completeOrder,
  submitReturnRefund,
  fetchAllReturns,
  fetchReturnById,
  updateReturnStatus,
  approveReturn,
  rejectReturn,
  authorizeSubAdmin,
  sendReturnMessage,
  fetchReturnMessages,
  submitReview,
  submitAdminReply,
  toggleReviewStatus,
  fetchTracking,
  approveDesign,
  requestChange,
  rejectShipmentRequest,
  fetchDispatchedOrders,
};


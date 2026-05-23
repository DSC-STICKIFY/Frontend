import api, { getAuthHeaders } from "./api";

// ── Customer Service: fetch CS queue ─────────────────────────────────────────
export const fetchCSValidationQueue = () =>
    api.get("/cs/validation-queue", { headers: getAuthHeaders() })
       .then(res => Array.isArray(res.data?.orders) ? res.data.orders : []);

// ── CS: Send a custom order to Staff for manual check ─────────────────────────
export const csSendToStaff = (orderId) =>
    api.post(`/orders/${orderId}/cs-send-to-staff`, {}, { headers: getAuthHeaders() });

// ── CS: Reject at CS review stage ─────────────────────────────────────────────
export const csRejectOrder = (orderId, reason) =>
    api.post(`/orders/${orderId}/cs-reject`, { reason }, { headers: getAuthHeaders() });

// ── CS: Accept partial accommodation (customer confirmed proceed) ─────────────
export const csAcceptPartial = (orderId) =>
    api.post(`/orders/${orderId}/accept-partial`, {}, { headers: getAuthHeaders() });

// ── CS: Decline partial accommodation (customer declined → cancel) ─────────────
export const csDeclinePartial = (orderId) =>
    api.post(`/orders/${orderId}/decline-partial`, {}, { headers: getAuthHeaders() });

// ── Staff: Fetch all orders pending manual validation ─────────────────────────
export const fetchStaffPendingValidation = () =>
    api.get("/staff/pending-validation", { headers: getAuthHeaders() })
       .then(res => Array.isArray(res.data?.orders) ? res.data.orders : []);

// ── Staff: Submit manual validation result ────────────────────────────────────
export const staffSubmitValidation = (orderId, payload) =>
    // payload: { validation_status, staff_note?, approved_quantity?, rejection_reason? }
    api.post(`/orders/${orderId}/staff-validate`, payload, { headers: getAuthHeaders() });

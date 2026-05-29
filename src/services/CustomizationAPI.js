import axios from "axios";

const API = "http://127.0.0.1:8000/api";

const getToken = () => sessionStorage.getItem("token");

const http = axios.create({ baseURL: API });
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

const getAdminToken = () => {
  const roles = ["admin", "subadmin", "sub_admin", "artist", "staff", "customer_service"];
  const activeRole = roles.find(r => sessionStorage.getItem(`token_${r}`));
  return activeRole ? sessionStorage.getItem(`token_${activeRole}`) : null;
};

const adminHttp = axios.create({ baseURL: API });
adminHttp.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// ─── CUSTOMER ─────────────────────────────────────────────────────────────────

export const submitCustomizationRequest = async (formData) => {
  const response = await http.post("/customization-requests", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const fetchMyCustomizations = async () => {
  const response = await http.get("/customer/customization-requests");
  return response.data.data || response.data;
};

export const fetchCustomizationDetail = async (id) => {
  const response = await http.get(`/customer/customization-requests/${id}`);
  return response.data.data || response.data;
};

export const approveCustomQuotation = async (id, needsRevision, revisionDays = 2) => {
  const response = await http.post(`/customer/customization-requests/${id}/approve-quotation`, {
    needs_revision_period: needsRevision,
    revision_days: revisionDays
  });
  return response.data;
};

export const declineCustomQuotation = async (id) => {
  const response = await http.post(`/customer/customization-requests/${id}/decline-quotation`);
  return response.data;
};

export const customerRespondPartial = async (id, action) => {
  const response = await http.post(`/customer/customization-requests/${id}/respond-partial`, { action });
  return response.data;
};

export const customerRequestRevision = async (id, revisionNotes) => {
  const response = await http.post(`/customer/customization-requests/${id}/request-revision`, { revision_notes: revisionNotes });
  return response.data;
};

export const convertToOrder = async (id, paymentMethod) => {
  const response = await http.post(`/customer/customization-requests/${id}/convert-to-order`, { payment_method: paymentMethod });
  return response.data;
};

// ─── ADMIN / CS / STAFF / ARTIST ─────────────────────────────────────────────

export const fetchAllCustomizations = async () => {
  const response = await adminHttp.get("/admin/customization-requests");
  return response.data.data || response.data;
};

export const updateCustomizationStatus = async (id, status) => {
  const response = await adminHttp.patch(`/admin/customization-requests/${id}/status`, { status });
  return response.data;
};

// CS/Staff: Send request to feasibility review
export const sendToFeasibility = async (id) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/send-to-feasibility`);
  return response.data;
};

// Staff: Submit feasibility check
export const submitFeasibility = async (id, data) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/submit-feasibility`, data);
  return response.data;
};

// CS: Assign artist
export const assignCustomArtist = async (id, artistId) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/assign-artist`, { artist_id: artistId });
  return response.data;
};

// Artist: Submit quotation
export const artistSubmitQuotation = async (id, data) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/artist-submit-quotation`, data);
  return response.data;
};

// Artist: Upload mockup
export const uploadCustomMockup = async (id, formData) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/upload-mockup`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// Artist: Mark in progress (Timeline Initialization)
export const markInProgress = async (id, timelineData) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/mark-in-progress`, timelineData);
  return response.data;
};

// Artist: Finalize design & schedule production
export const finalizeDesign = async (id, productionDate) => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/finalize-design`, { production_date: productionDate });
  return response.data;
};

// Admin: Review final design (approve/reject)
export const adminReviewDesign = async (id, action, notes = '') => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/admin-review-design`, { action, admin_design_notes: notes });
  return response.data;
};

// Staff: Submit Quality Control (QC) check
export const submitQC = async (id, qcStatus, notes = '') => {
  const response = await adminHttp.post(`/admin/customization-requests/${id}/submit-qc`, { qc_status: qcStatus, qc_notes: notes });
  return response.data;
};

export default {
  // Customer
  submitCustomizationRequest,
  fetchMyCustomizations,
  fetchCustomizationDetail,
  approveCustomQuotation,
  declineCustomQuotation,
  customerRespondPartial,
  customerRequestRevision,
  convertToOrder,
  // Admin / CS / Artist / Staff
  fetchAllCustomizations,
  updateCustomizationStatus,
  sendToFeasibility,
  submitFeasibility,
  assignCustomArtist,
  artistSubmitQuotation,
  uploadCustomMockup,
  markInProgress,
  finalizeDesign,
  adminReviewDesign,   // ← ADD THIS LINE
  submitQC,
};
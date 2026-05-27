import axios from "axios";

const API = "http://127.0.0.1:8000/api";

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

/**
 * Public: Submit a car service inquiry
 */
export const submitInquiry = async (formData) => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/inquiries`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token && { "Authorization": `Bearer ${token}` })
    },
  });
  return response.data;
};

/**
 * Admin: Fetch all inquiries
 */
export const fetchInquiries = async () => {
  const response = await adminHttp.get("/admin/inquiries");
  return response.data.data;
};

/**
 * Admin: Update inquiry status
 */
export const updateInquiryStatus = async (id, data) => {
  const response = await adminHttp.patch(`/admin/inquiries/${id}/status`, data);
  return response.data;
};

/**
 * Customer: Fetch my inquiries
 */
export const getCustomerInquiries = async () => {
  const token = sessionStorage.getItem("token");
  const response = await axios.get(`${API}/customer/inquiries`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const acceptQuotation = async (id) => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/customer/inquiries/${id}/accept`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const declineQuotation = async (id) => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/customer/inquiries/${id}/decline`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const payInquiryGcash = async (id) => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/customer/inquiries/${id}/pay-gcash`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const payInquiryOnsite = async (id) => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/customer/inquiries/${id}/pay-onsite`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const markInquiryPaid = async (id, reference = null) => {
  const response = await adminHttp.patch(`/admin/inquiries/${id}/mark-paid`, { reference });
  return response.data;
};

/**
 * Customer: Get notifications
 */
export const getNotifications = async () => {
  const token = sessionStorage.getItem("token");
  const response = await axios.get(`${API}/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

/**
 * Customer: Mark notifications as read
 */
export const markNotificationsRead = async () => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/notifications/mark-read`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const submitInquiryReview = async (id, data) => {
  const token = sessionStorage.getItem("token");
  const response = await axios.post(`${API}/customer/inquiries/${id}/review`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const fetchInquiryMessages = async (inquiryId) => {
  const adminToken = getAdminToken();
  const customerToken = sessionStorage.getItem("token");
  const token = adminToken || customerToken;

  const response = await axios.get(`${API}/inquiries/${inquiryId}/messages`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export const sendInquiryMessage = async (inquiryId, message) => {
  const adminToken = getAdminToken();
  const customerToken = sessionStorage.getItem("token");
  const token = adminToken || customerToken;

  const response = await axios.post(`${API}/inquiries/${inquiryId}/messages`, { message }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

export default {
  submitInquiry,
  fetchInquiries,
  updateInquiryStatus,
  getCustomerInquiries,
  acceptQuotation,
  declineQuotation,
  payInquiryGcash,
  payInquiryOnsite,
  markInquiryPaid,
  getNotifications,
  markNotificationsRead,
  submitInquiryReview,
  fetchInquiryMessages,
  sendInquiryMessage
};

import axios from "axios";

const API = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "http://127.0.0.1:8000/api";

// --------------------------------------------------------------
// TOKEN GETTERS — role-specific, no cross-contamination
// --------------------------------------------------------------
const getAdminToken          = () => sessionStorage.getItem("token_admin")            || null;
const getSubAdminToken       = () => sessionStorage.getItem("token_subadmin")         || null;
const getCustomerToken       = () => sessionStorage.getItem("token_user")             || null;
const getArtistToken         = () => sessionStorage.getItem("token_artist")           || null;
const getCustomerServiceToken= () => sessionStorage.getItem("token_customer_service") || null;
const getStaffToken          = () => sessionStorage.getItem("token_staff")            || null;

// Generic fallback for the http instance
const getToken = () =>
  getAdminToken() || getSubAdminToken() || getArtistToken() ||
  getCustomerServiceToken() || getStaffToken() || getCustomerToken() || null;

// --------------------------------------------------------------
// Axios instances — one per role
// --------------------------------------------------------------
const http = axios.create({ baseURL: API });

// Customer-specific instance — ONLY uses token_user
const customerHttp = axios.create({ baseURL: API });
customerHttp.interceptors.request.use((config) => {
  const token = getCustomerToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Admin/staff instance — reads the ACTIVE staff role directly from sessionStorage.
// Using an OR chain breaks when multiple role tokens exist simultaneously
// (e.g. leftover token_admin while logged in as customer_service).
const STAFF_ROLES = ["admin", "subadmin", "artist", "customer_service", "staff"];
const adminHttp = axios.create({ baseURL: API });
adminHttp.interceptors.request.use((config) => {
  const activeRole = STAFF_ROLES.find(r => sessionStorage.getItem(`token_${r}`));
  const token = activeRole ? sessionStorage.getItem(`token_${activeRole}`) : null;
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Generic interceptor (fallback)
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Shared response error handler
const responseErrorHandler = (err) => {
  if (err.response?.status === 401) {
    console.error("🔑 401 Unauthorized — token missing or expired.");
  }
  return Promise.reject(err);
};

http.interceptors.response.use((res) => res, responseErrorHandler);
customerHttp.interceptors.response.use((res) => res, responseErrorHandler);
adminHttp.interceptors.response.use((res) => res, responseErrorHandler);

// --------------------------------------------------------------
// CUSTOMER SIDE — always uses customerHttp
// --------------------------------------------------------------
export const sendCustomerMessage = async (body, imageFile = null, productId = null) => {
  const token = getCustomerToken();
  if (!token) throw new Error("No authentication token found. Please login again.");

  if (imageFile) {
    const formData = new FormData();
    if (body) formData.append("body", body);
    if (productId) formData.append("product_id", productId);
    formData.append("image", imageFile);
    const response = await customerHttp.post("/messages", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await customerHttp.post("/messages", { body, product_id: productId });
  return response.data;
};

export const fetchCustomerMessages = async (productId = null, lastId = null) => {
  let url = "/messages";
  const params = new URLSearchParams();
  if (productId) params.append("product_id", productId);
  if (lastId) params.append("last_id", lastId);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await customerHttp.get(url);
  return response.data.messages || response.data;
};

export const fetchCustomerUnreadCount = async () => {
  const response = await customerHttp.get("/messages/unread-count");
  return response.data.unread_count ?? 0;
};

export const fetchFaqs = async () => {
  const response = await http.get("/faqs");
  return response.data;
};

export const fetchMessages = fetchCustomerMessages;

// --------------------------------------------------------------
// ADMIN / STAFF SIDE — always uses adminHttp
// --------------------------------------------------------------
export const sendBotMessage = async (message) => {
  const response = await customerHttp.post("/customer/messages", {
    message,
    is_bot: true,
  });
  return response.data;
};

export const fetchConversations = async () => {
  const response = await adminHttp.get("/admin/conversations");
  return response.data.conversations || [];
};

export const fetchAdminUserMessages = async (userId, productId = null, lastId = null) => {
  let url = `/admin/messages/${userId}`;
  const params = new URLSearchParams();
  if (productId) params.append("product_id", productId);
  if (lastId) params.append("last_id", lastId);
  if (params.toString()) url += `?${params.toString()}`;
  const response = await adminHttp.get(url);
  const messages = response.data.messages || response.data;
  return Array.isArray(messages) ? messages : [];
};

export const sendAdminMessage = async (body, receiverId, file = null, productId = null) => {
  if (file) {
    const formData = new FormData();
    if (body) formData.append("body", body);
    formData.append("receiver_id", receiverId);
    if (productId) formData.append("product_id", productId);
    if (file.type.startsWith("video/")) {
      formData.append("video", file);
    } else {
      formData.append("image", file);
    }
    const response = await adminHttp.post("/admin/messages", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await adminHttp.post("/admin/messages", {
    body,
    receiver_id: receiverId,
    product_id: productId,
  });
  return response.data;
};

export const toggleBot = async (userId) => {
  const response = await adminHttp.post(`/toggle-bot/${userId}`);
  return response.data;
};

export const sendMessage = sendAdminMessage;

export default {
  sendCustomerMessage,
  fetchCustomerMessages,
  fetchMessages,
  fetchCustomerUnreadCount,
  fetchConversations,
  fetchAdminUserMessages,
  sendAdminMessage,
  sendMessage,
}; 
import axios from "axios";

export const IMAGE_BASE_URL = "http://127.0.0.1:8000/storage/";
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";

export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return PLACEHOLDER_IMAGE;

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:") ||
    imageUrl.startsWith("/src/") ||
    imageUrl.startsWith("/@fs/") ||
    imageUrl.includes("localhost:") ||
    imageUrl.startsWith("static/") ||
    imageUrl.includes("/assets/")
  ) {
    return imageUrl;
  }

  let cleanPath = imageUrl.startsWith("/") ? imageUrl.slice(1) : imageUrl;
  if (cleanPath.startsWith("storage/")) {
    cleanPath = cleanPath.replace("storage/", "");
  }

  return `${IMAGE_BASE_URL}${encodeURI(cleanPath)}`;
};

export const toArray = (payload) => {
  const p = payload?.data ?? payload;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.products)) return p.products;
  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.data?.products)) return p.data.products;

  if (p && typeof p === "object") {
    const nestedArrays = Object.values(p).filter(Array.isArray);
    if (nestedArrays.length > 0) return nestedArrays.flat();
  }
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the token string for a given role, or null if missing/invalid.
 */
export const getTokenForRole = (role) => {
  const token = sessionStorage.getItem(`token_${role}`);
  if (!token || token === "null" || token === "undefined" || token.trim() === "") {
    return null;
  }
  return token;
};

/**
 * Returns an Authorization header object for a given role.
 */
export const getAuthHeaders = (role) => {
    // If no role provided, try to find an active session
    if (!role) {
        role = ["admin", "subadmin", "artist", "user"].find((r) => getTokenForRole(r));
    }
    const token = getTokenForRole(role);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Clears ALL stored tokens and user data for every role.
 * Call this on logout or before storing a new session.
 */
export const clearAllSessions = () => {
  ["admin", "subadmin", "artist", "user"].forEach((role) => {
    sessionStorage.removeItem(`token_${role}`);
    sessionStorage.removeItem(`user_${role}`);
    sessionStorage.removeItem(`active_role_${role}`);
  });
  sessionStorage.removeItem("token");
};

/**
 * Clears stored tokens and user data for a specific role only.
 */
export const clearRoleSession = (role) => {
  sessionStorage.removeItem(`token_${role}`);
  sessionStorage.removeItem(`user_${role}`);
  sessionStorage.removeItem(`active_role_${role}`);
  // Also clear generic token if it belonged to this role
  const generic = sessionStorage.getItem("token");
  if (generic && generic === sessionStorage.getItem(`token_${role}`)) {
    sessionStorage.removeItem("token");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Public Routes — these never need an Authorization header.
//  Adding a route here also prevents 401 redirects for that route.
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_ROUTES = [
  "/promotions/active",
  "/promotions/product/",
  "/account_login",
  "/register",
  "/products",
  "/products/printing",
  "/services/printing",
];

const isPublicRoute = (url = "") =>
  PUBLIC_ROUTES.some((route) => url.includes(route));

// ─────────────────────────────────────────────────────────────────────────────
//  Axios instance
// ─────────────────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: {
    Accept: "application/json",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  REQUEST INTERCEPTOR
//  Priority: user → subadmin → admin
//  If Authorization is already set (e.g. by getAuthHeaders()), skip.
//  If the route is public, skip token injection entirely.
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Priority 1: Explicitly set headers (e.g. from getAuthHeaders())
    if (config.headers.Authorization) return config;

    // Priority 2: Automatic session injection
    const role = ["admin", "subadmin", "artist", "user"].find((r) => getTokenForRole(r));
    const token = role ? getTokenForRole(role) : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─────────────────────────────────────────────────────────────────────────────
//  RESPONSE INTERCEPTOR
//  On 401: identify which role's token was sent, clear only that role.
//  Public routes are ignored — no redirect triggered.
// ─────────────────────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !isPublicRoute(originalRequest.url) // ✅ never redirect on public route 401s
    ) {
      const authHeader = originalRequest.headers?.Authorization || "";
      const sentToken = authHeader.replace("Bearer ", "").trim();

      if (sentToken) {
        // Find which role this token belongs to
        const expiredRole = ["admin", "subadmin", "artist", "user"].find(
          (r) => getTokenForRole(r) === sentToken
        );

        if (expiredRole) {
          console.warn(`Session expired for role: ${expiredRole}`);

          // ✅ Clear only the role that actually expired
          clearRoleSession(expiredRole);

          if (expiredRole === "admin" || expiredRole === "subadmin") {
            window.location.href = "/login";
          } else {
            window.location.href = "/";
          }
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
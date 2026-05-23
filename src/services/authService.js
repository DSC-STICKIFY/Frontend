import api, { getTokenForRole, clearAllSessions, clearRoleSession } from "./api";

// ─────────────────────────────────────────────────────────────────────────────
//  getStoredUser
//  Returns the stored user object for a specific role, or the active user
//  if no role is given.
//  ✅ FIX: default fallback now checks user-first so a logged-in admin
//     never bleeds into a customer context.
// ─────────────────────────────────────────────────────────────────────────────
const getStoredUser = (role = null) => {
  try {
    if (role) {
      return JSON.parse(sessionStorage.getItem(`user_${role}`)) || null;
    }
    // user-first fallback: prevents admin token from being picked up in
    // customer-facing pages when both sessions exist simultaneously.
    return (
      JSON.parse(sessionStorage.getItem("user_user")) ||
      JSON.parse(sessionStorage.getItem("user_artist")) ||
      JSON.parse(sessionStorage.getItem("user_staff")) ||
      JSON.parse(sessionStorage.getItem("user_customer_service")) ||
      JSON.parse(sessionStorage.getItem("user_subadmin")) ||
      JSON.parse(sessionStorage.getItem("user_admin")) ||
      null
    );
  } catch {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  getAuthHeaders
//  Returns { Authorization: "Bearer <token>" } for a given role,
//  or falls back to whoever is currently logged in.
// ─────────────────────────────────────────────────────────────────────────────
export const getAuthHeaders = (role = null) => {
  let token = null;

  if (role) {
    token = getTokenForRole(role);
  } else {
    const user = getStoredUser();
    if (user?.role) {
      token = getTokenForRole(user.role);
    }
  }

  // Keep the generic "token" key in sync for services that rely on it
  if (token && !sessionStorage.getItem("token")) {
    sessionStorage.setItem("token", token);
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─────────────────────────────────────────────────────────────────────────────
//  loginUser
//  ✅ FIX: clears any existing session for the same role BEFORE storing the
//     new token, so a new account never inherits a previous session's data.
// ─────────────────────────────────────────────────────────────────────────────
export const loginUser = async (credentials) => {
  const res = await api.post("/account_login", credentials);
  const { token, user } = res.data;
  const role = (user?.role || "user").toLowerCase();

  if (!role) throw new Error("Login response missing user role.");

  // ✅ Clear any stale session for this role before storing the new one
  clearRoleSession(role);

  // Store role-specific session
  sessionStorage.setItem(`token_${role}`, token);
  sessionStorage.setItem(`user_${role}`, JSON.stringify(user));
  sessionStorage.setItem(`active_role_${role}`, role);

  // Keep generic "token" key in sync (used by some legacy services)
  sessionStorage.setItem("token", token);

  // ✅ Also update the axios default header immediately so in-flight
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
//  loginWithGoogle
//  Handles social login tokens and session storage.
// ─────────────────────────────────────────────────────────────────────────────
export const loginWithGoogle = async (credential) => {
  const res = await api.post("/auth/google", { credential });
  const { token, user } = res.data;
  const role = (user?.role || "user").toLowerCase();

  clearRoleSession(role);

  sessionStorage.setItem(`token_${role}`, token);
  sessionStorage.setItem(`user_${role}`, JSON.stringify(user));
  sessionStorage.setItem(`active_role_${role}`, role);
  sessionStorage.setItem("token", token);

  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
//  registerUser  (new accounts)
//  ✅ Same stale-token fix as loginUser.
// ─────────────────────────────────────────────────────────────────────────────
export const registerUser = async (credentials) => {
  const res = await api.post("/account_register", credentials);
  const { token, user } = res.data;
  const role = (user?.role || "user").toLowerCase();

  if (!role) throw new Error("Register response missing user role.");

  // ✅ Wipe any leftover session for this role
  clearRoleSession(role);

  sessionStorage.setItem(`token_${role}`, token);
  sessionStorage.setItem(`user_${role}`, JSON.stringify(user));
  sessionStorage.setItem(`active_role_${role}`, role);
  sessionStorage.setItem("token", token);

  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  return res;
};

// ─────────────────────────────────────────────────────────────────────────────
//  logoutUser
//  ✅ FIX: clears only the specified role's session, not all roles.
//     Also removes the axios default header if no other session remains.
// ─────────────────────────────────────────────────────────────────────────────
export const logoutUser = (role) => {
  return api
    .post("/account_logout", {}, { headers: getAuthHeaders(role) })
    .finally(() => {
      if (role) {
        clearRoleSession(role);
      }

      sessionStorage.removeItem("stickify_checkout_data");
      sessionStorage.removeItem("stickify_checkout_intent");

      // Remove axios default header only if no other session is active
      const anyRemaining = ["admin", "subadmin", "artist", "staff", "customer_service", "user"].find((r) =>
        getTokenForRole(r)
      );
      if (!anyRemaining) {
        delete api.defaults.headers.common["Authorization"];
      }
    });
};

// ─────────────────────────────────────────────────────────────────────────────
//  fetchCurrentUser
// ─────────────────────────────────────────────────────────────────────────────
export const fetchCurrentUser = (role = null) => {
  return api.get("/get_user_info", {
    headers: getAuthHeaders(role),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
//  Other auth helpers
// ─────────────────────────────────────────────────────────────────────────────
export const resendVerificationEmail = () =>
  api.post(
    "/email/verification-notification",
    {},
    { headers: getAuthHeaders() }
  );

export const fetchVerificationStatus = () =>
  api.get("/email/verification-status", {
    headers: getAuthHeaders(),
  });

export const verifyEmail = (id, hash, expires, signature) =>
  api.get(`/email/verify/${id}/${hash}`, {
    params: { expires, signature },
  });

export const updateProfile = (data) => {
  const headers = getAuthHeaders();
  if (data instanceof FormData) {
    // Laravel often requires POST with _method = PUT for multipart form data
    data.append("_method", "PUT");
    return api.post("/update_profile", data, { headers });
  }
  return api.put("/update_profile", data, { headers });
};

export const updatePassword = (data) =>
  api.post("/change_password", data, {
    headers: getAuthHeaders(),
  });

export const deleteAccount = () =>
  api.delete("/delete_account", {
    headers: getAuthHeaders(),
  });
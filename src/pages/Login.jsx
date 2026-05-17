import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, loginWithGoogle } from "../services/authService";
import { useUI } from "../context/UIContext";
import { submitInquiry } from "../services/InquiryAPI";
import { GoogleLogin } from "@react-oauth/google";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const Login = () => {
  const navigate = useNavigate();
  const { setCheckoutData } = useUI();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [warning, setWarning] = useState("");
  const [warningType, setWarningType] = useState("error");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ No useEffect redirect — Login should never auto-redirect on mount.
  // Each dashboard layout handles its own auth guard.

  const showWarning = (msg, type = "error", timeout = 3000) => {
    setWarning(msg);
    setWarningType(type);
    if (timeout) setTimeout(() => setWarning(""), timeout);
  };

  const handleAuthResponse = (data) => {
    if (!data?.token) {
      showWarning(data?.message || "Invalid credentials.");
      return;
    }

    const user = {
      ...(data.user || data),
      role: (data.user?.role || data.role || "user").toLowerCase(),
    };

    // ✅ loginUser() in authService already saves token_role and user_role
    // No need to set old "token" / "user" keys here

    window.dispatchEvent(new CustomEvent("auth:status-changed", { detail: user }));
    showWarning("Login successful!", "info", 600);

    setTimeout(() => {
      if (user.role === "admin") {
        navigate("/super-admin-dashboard", { replace: true });
        return;
      }

      if (user.role === "subadmin") {
        navigate("/sub-admin-dashboard", { replace: true });
        return;
      }

      if (user.role === "artist") {
        navigate("/artist/dashboard", { replace: true });
        return;
      }

      // ✅ Customer — check for pending checkout
      const hasCheckoutIntent =
        sessionStorage.getItem("stickify_checkout_intent") === "true";
      const rawCheckout = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);

      if (hasCheckoutIntent && rawCheckout) {
        try {
          const checkout = JSON.parse(rawCheckout);
          const isRecent =
            !checkout.timestamp ||
            Date.now() - checkout.timestamp < 5 * 60 * 1000;

          if (isRecent) {
            setCheckoutData(checkout);
            sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
            sessionStorage.removeItem("stickify_checkout_intent");
            navigate("/customer-checkout", { replace: true });
            return;
          }
        } catch (err) {
          console.error("Bad checkout data:", err);
        }
        sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
        sessionStorage.removeItem("stickify_checkout_intent");
      }

      // ✅ Inquiry Intent
      if (sessionStorage.getItem("stickify_inquiry_intent") === "true") {
        const pendingInquiry = sessionStorage.getItem("stickify_pending_inquiry");

        if (pendingInquiry) {
          (async () => {
            try {
              showWarning("Finalizing your inquiry... Please wait.", "info", 0);
              const data = JSON.parse(pendingInquiry);
              const imageData = sessionStorage.getItem("stickify_pending_inquiry_image");

              const formData = new FormData();

              // 1. Fill base data from pending storage
              Object.keys(data).forEach(key => {
                if (data[key]) formData.append(key, data[key]);
              });

              // 2. Inject current user info (Required by backend)
              formData.set("customer_name", `${user.first_name || ""} ${user.last_name || ""}`.trim());
              formData.set("email", user.email);
              formData.set("contact_number", user.contact_number || "");
              formData.set("address", user.address || "");

              if (imageData) {
                // Convert Base64 back to file
                const res = await fetch(imageData);
                const blob = await res.blob();
                formData.append("image", blob, "inquiry_photo.png");
              }

              await submitInquiry(formData);
              showWarning("Inquiry submitted successfully!", "info", 1000);
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              console.error("Failed to auto-submit inquiry:", err);
              showWarning("Inquiry submission failed, but you can retry from the dashboard.", "error", 3000);
            } finally {
              sessionStorage.removeItem("stickify_pending_inquiry");
              sessionStorage.removeItem("stickify_pending_inquiry_image");
              sessionStorage.removeItem("stickify_inquiry_intent");
              navigate("/customer-inquiries", { replace: true });
            }
          })();
          return;
        }

        sessionStorage.removeItem("stickify_inquiry_intent");
        navigate("/customer-inquiries", { replace: true });
        return;
      }

      navigate("/customer-dashboard", { replace: true });
    }, 300);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await loginUser({ email, password });
      const data = res?.data ?? res;
      handleAuthResponse(data);
    } catch (err) {
      console.error("Login Error:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Connection failed.";
      showWarning(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-0">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-8 text-center text-3xl mt-5  font-bold text-gray-900">
          Welcome to Stickify
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-base focus:border-black focus:ring-2 focus:ring-black outline-none transition"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-gray-300 px-4 py-3.5 text-base focus:border-black focus:ring-2 focus:ring-black outline-none transition"
            required
          />
          {warning && (
            <p
              className={`text-center text-sm font-medium ${warningType === "info" ? "text-blue-600" : "text-red-600"
                }`}
            >
              {warning}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-xl py-3.5 font-semibold text-white transition shadow
              ${isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-900 active:scale-95"
              }`}
          >
            {isLoading ? "Please wait..." : "Continue"}
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500 font-medium uppercase tracking-wider">or</span>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setIsLoading(true);
                try {
                  const res = await loginWithGoogle(credentialResponse.credential);
                  handleAuthResponse(res.data);
                } catch (err) {
                  console.error("Google Login Error:", err);
                  showWarning("Google Sign-In failed.");
                } finally {
                  setIsLoading(false);
                }
              }}
              onError={() => showWarning("Google Login Failed")}
              theme="outline"
              shape="pill"
              width="320px"
            />
          </div>

          {/* Separator */}

        </form>
      </div>
    </div>
  );
};

export default Login;
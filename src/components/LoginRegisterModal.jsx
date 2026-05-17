// src/components/LoginRegisterModal.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

// LoginRegisterModal does NOT need to receive or persist checkoutData itself.
// The caller (CartPage, ModalMoreStickers, etc.) must save to sessionStorage
// BEFORE showing this modal. Login.jsx will read sessionStorage after login.

const LoginRegisterModal = ({ onClose, fromCheckout = false, isInquiry = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = () => {
    onClose();
    if (fromCheckout) {
      sessionStorage.setItem("stickify_checkout_intent", "true");
    }
    if (isInquiry) {
      sessionStorage.setItem("stickify_inquiry_intent", "true");
    }
    navigate("/login", { state: { from: location.pathname } });
  };

  const handleRegister = () => {
    onClose();
    if (fromCheckout) {
      sessionStorage.setItem("stickify_checkout_intent", "true");
    }
    if (isInquiry) {
      sessionStorage.setItem("stickify_inquiry_intent", "true");
    }
    navigate("/register", { state: { from: location.pathname } });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 relative flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalPop 0.22s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        <style>{`
          @keyframes modalPop {
            from { opacity: 0; transform: scale(0.92) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-2xl font-bold text-gray-300 hover:text-gray-700 transition-colors leading-none"
          aria-label="Close"
        >
          ×
        </button>

        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-5 shadow-inner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
          {isInquiry ? "To submit your inquiry," : "To continue with your order,"}
          <br />
          please login or register.
        </h2>

        <p className="text-sm text-gray-400 mb-1 leading-relaxed">
          {isInquiry 
            ? "This will allow us to track your service request and provide updates." 
            : "This will allow us to save your delivery address for faster checkout next time."}
        </p>
        <p className="text-xs text-gray-400 mb-7">
          Don't have an account yet?{" "}
          <button
            onClick={handleRegister}
            className="text-yellow-500 font-semibold hover:underline"
          >
            Register here
          </button>
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={handleLogin}
            className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black active:scale-95 transition-all"
          >
            Login
          </button>
          <button
            onClick={handleRegister}
            className="flex-1 py-3 rounded-xl bg-[#FFE100] text-gray-900 font-bold hover:bg-yellow-400 active:scale-95 transition-all"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRegisterModal;
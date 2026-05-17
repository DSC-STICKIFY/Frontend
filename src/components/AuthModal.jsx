// src/components/auth/AuthModal.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext"; // adjust path
import { useCurrentUser } from "../../context/AuthContext"; // adjust path

// Placeholder – replace with your real login/register logic
const LoginForm = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate API call → in reality: call your auth service
    console.log("Login attempt:", { email, password });
    // On success:
    setTimeout(() => onSuccess(), 800); // fake delay
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700"
      >
        Log In
      </button>
    </form>
  );
};

const RegisterForm = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Register attempt:", { name, email, password });
    setTimeout(() => onSuccess(), 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700"
      >
        Create Account
      </button>
    </form>
  );
};

const AuthModal = () => {
  const {
    showAuthModal,
    setShowAuthModal,
    authModalMode,
    setAuthModalMode,
    pendingCheckoutData,
    setPendingCheckoutData,
    setCheckoutData,
  } = useUI();

  const { currentUser } = useCurrentUser();
  const navigate = useNavigate();

  const [mode, setMode] = useState(authModalMode || "login");

  useEffect(() => {
    if (authModalMode) setMode(authModalMode);
  }, [authModalMode]);

  // Auto-continue to checkout after successful login
  useEffect(() => {
    if (!showAuthModal) return;
    if (currentUser && pendingCheckoutData) {
      setCheckoutData(pendingCheckoutData);
      setPendingCheckoutData(null);
      setShowAuthModal(false);
      navigate("/customer-checkout", { replace: true });
    }
  }, [
    currentUser,
    pendingCheckoutData,
    showAuthModal,
    setCheckoutData,
    setPendingCheckoutData,
    navigate,
  ]);

  if (!showAuthModal) return null;

  const handleSuccess = () => {
    // Real app: your auth context will update currentUser → useEffect above will catch it
    // For demo: we can force close or show success message
    alert("Authentication successful! (demo)");
    setShowAuthModal(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={() => {
        setShowAuthModal(false);
        setPendingCheckoutData(null); // clear pending if cancelled
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setShowAuthModal(false);
            setPendingCheckoutData(null);
          }}
          className="absolute top-4 right-5 text-3xl text-gray-500 hover:text-gray-800"
        >
          ×
        </button>

        <h2 className="text-2xl font-bold text-center mb-2">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-center text-gray-500 mb-8">
          {mode === "login"
            ? "Log in to continue your order"
            : "Sign up to place your order faster"}
        </p>

        {mode === "login" ? (
          <LoginForm onSuccess={handleSuccess} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} />
        )}

        <div className="mt-6 text-center text-sm">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-blue-600 font-medium hover:underline"
              >
                Register now
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-blue-600 font-medium hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;

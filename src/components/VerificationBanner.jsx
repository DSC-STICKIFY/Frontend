import React, { useState } from 'react';
import { useAuth } from '../context/CustomerAuthContext';
import { resendVerificationEmail } from '../services/authService';
import toast from 'react-hot-toast';

const VerificationBanner = () => {
    const { currentUser, isVerified, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isAuthenticated || isVerified) return null;

    const handleResend = async () => {
        setLoading(true);
        try {
            const res = await resendVerificationEmail();
            toast.success(res.data?.message || "Verification email sent!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send email. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-yellow-400 text-black px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Please verify your email address (<strong>{currentUser?.email}</strong>) to access all features like checkout and orders.</span>
            </div>
            <button 
                onClick={handleResend}
                disabled={loading}
                className="bg-black text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
            >
                {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? "Sending..." : "Resend Email"}
            </button>
        </div>
    );
};

export default VerificationBanner;

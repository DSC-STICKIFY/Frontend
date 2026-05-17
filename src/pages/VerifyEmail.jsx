import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEmail } from "../services/authService";

const VerifyEmail = () => {
    const location = useLocation();
    const navigate  = useNavigate();
    const [status, setStatus]   = useState("verifying"); // verifying | success | error
    const [message, setMessage] = useState("Verifying your email...");

    useEffect(() => {
        const params    = new URLSearchParams(location.search);
        const id        = params.get("id");
        const hash      = params.get("hash");
        const expires   = params.get("expires");
        const signature = params.get("signature");

        if (!id || !hash) {
            setStatus("error");
            setMessage("Invalid verification link.");
            return;
        }

        verifyEmail(id, hash, expires, signature)
            .then((res) => {
                setStatus("success");
                setMessage(res.data?.message || "Email verified successfully!");
                // Trigger auto-update in other tabs
                localStorage.setItem("email_verified_success", Date.now().toString());
            })
            .catch((err) => {
                setStatus("error");
                setMessage(err.response?.data?.message || "Verification failed or link expired.");
            });
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl text-center">

                {status === "verifying" && (
                    <>
                        <div className="flex justify-center mb-5">
                            <svg className="w-10 h-10 animate-spin text-black" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying your email</h1>
                        <p className="text-sm text-gray-500">Please wait...</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="flex justify-center mb-5">
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Email Verified!</h1>
                        <p className="text-sm text-gray-500 mb-6">{message}</p>
                        <button
                            onClick={() => navigate("/customer/settings")}
                            className="w-full rounded-xl bg-black py-3 font-semibold text-white hover:bg-gray-900 transition shadow-lg active:scale-95"
                        >
                            Go to Account Settings
                        </button>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="flex justify-center mb-5">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h1>
                        <p className="text-sm text-gray-500 mb-5">{message}</p>
                        <button
                            onClick={() => navigate("/login")}
                            className="w-full rounded-xl bg-black py-3 font-semibold text-white hover:bg-gray-900 transition"
                        >
                            Back to Login
                        </button>
                    </>
                )}

            </div>
        </div>
    );
};

export default VerifyEmail;
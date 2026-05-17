import React from "react";
import { useNavigate } from "react-router-dom";

export const PaymentFailed = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-red-100 p-3">
                        <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                <p className="text-gray-600 mb-6">
                   Your Payment didn't push through. Please try again or check your E-Wallet account for any issues.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => navigate("/customer-checkout")}
                        className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => navigate("/customer-cart")}
                        className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
                    >
                        Back to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};
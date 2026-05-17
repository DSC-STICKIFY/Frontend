import React from "react";
import { useNavigate } from "react-router-dom";

export const PaymentSuccess = () => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center">
                <div className="mb-4 flex justify-center">
                    <div className="rounded-full bg-green-100 p-3">
                        <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
                <p className="text-gray-600 mb-6">
                    Thank you for your purchase! Your payment via E-Wallet has been confirmed.
                    You can track your order in your dashboard.
                </p>
                <button
                    onClick={() => navigate("/customer-orders")}
                    className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
                >
                    View My Orders
                </button>
            </div>
        </div>
    );
};
import React from 'react';

const LogoutConfirmationModal = ({ onConfirm, onCancel }) => {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon + Text */}
                <div className="flex flex-col items-center text-center gap-3">
                    {/* Logout icon circle */}
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </div>

                    <div>
                        <h3 className="text-base font-bold text-gray-900">Log out?</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            Are you sure you want to log out of your account?
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition active:scale-95"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmationModal;
import React from "react";

const CartToast = ({ onViewCart, onClose }) => (
  <div
    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl"
    style={{
      animation: "toastIn 0.25s cubic-bezier(.34,1.56,.64,1) both",
    }}
  >
    <style>
      {`
        @keyframes toastIn {
          from {
            opacity:0;
            transform:translateX(-50%) translateY(16px) scale(0.95);
          }
          to {
            opacity:1;
            transform:translateX(-50%) translateY(0) scale(1);
          }
        }
      `}
    </style>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-yellow-400 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>

    <span className="text-sm font-medium">Added to cart!</span>

    <button
      onClick={onViewCart}
      className="ml-1 text-sm font-bold text-yellow-400 hover:text-yellow-300 transition-colors"
    >
      View Cart
    </button>

    <button
      onClick={onClose}
      className="ml-2 text-gray-500 hover:text-white transition-colors text-lg leading-none"
    >
      ×
    </button>
  </div>
);

export default CartToast;

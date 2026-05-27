import { useEffect } from "react";

const CartToast = ({ onViewCart, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      <style>{`
        @keyframes toastPopUp {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
      <div
        className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-700 whitespace-nowrap mb-2"
        style={{ animation: "toastPopUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
      >
        {/* little arrow pointing down */}
        <span className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 border-r border-b border-gray-700 rotate-45" />
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
        <span className="text-sm font-bold">Added to cart!</span>
        <div className="flex gap-2 ml-1">
          <button
            onClick={onViewCart}
            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition-colors text-xs"
          >
            View Cart
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 text-gray-400 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
};

export default CartToast;
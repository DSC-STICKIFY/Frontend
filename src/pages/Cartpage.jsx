import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from '../context/CustomerAuthContext';
import { useUI } from "../context/UIContext";
import LoginRegisterModal from "../components/LoginRegisterModal";
import { getImageUrl } from "../services/api";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

// ─── Empty State (unchanged) ──────────────────────────────────────────────────
const EmptyCart = () => {
  // ... same as original ...
};

const CartItem = ({ item, onUpdateQuantity, onRemove, isSelected, onToggle }) => {
  const quantity = Number(item.quantity) || 1;
  const currentPrice = Number(item.price) || 0;
  const originalPrice = item.originalPrice ? Number(item.originalPrice) : null;
  const hasDiscount = originalPrice !== null && originalPrice > currentPrice;

  const lineTotal = currentPrice * quantity;
  const originalLineTotal = hasDiscount ? originalPrice * quantity : null;

  return (
    <div className={`flex gap-5 py-6 border-b border-gray-100 last:border-none items-center ${isSelected ? '' : 'opacity-75'}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FFE100] transition flex-shrink-0"
      />
      {/* Image section – unchanged */}
      <div className="w-24 h-24 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
        {item.designImage || item.image ? (
          <img
            src={item.designImage ? getImageUrl(item.designImage) : getImageUrl(item.image)}
            alt={item.title}
            className="w-full h-full object-contain p-1"
            onError={(e) => { e.target.src = '/placeholder.png'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-tight">{item.title || "Product"}</h3>
            {/* Tags – unchanged */}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.size && <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">{item.size}</span>}
              {item.pieces > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{item.pieces} pcs/sheet</span>}
              {item.type && <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{item.type}</span>}
            </div>
            {/* Show promo badge if discount applied */}
            {hasDiscount && item.promoApplied && (
              <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                🏷️ {item.promoApplied}
              </span>
            )}
          </div>
          <button
            onClick={() => onRemove(item.cartId)}
            className="text-gray-300 hover:text-red-400 transition-colors p-1.5 flex-shrink-0 rounded-lg hover:bg-red-50"
            aria-label="Remove item"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-between items-center mt-4">
          {/* Quantity controls – unchanged */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => onUpdateQuantity(item.cartId, quantity - 1)}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold text-lg"
            >−</button>
            <span className="w-10 text-center text-sm font-bold text-gray-800">{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.cartId, quantity + 1)}
              className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors font-bold text-lg"
            >+</button>
          </div>

          {/* Price display – show original crossed out if discounted */}
          <div className="text-right">
            {hasDiscount ? (
              <>
                <p className="font-bold text-gray-900 text-lg">
                  ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-400 line-through">
                  ₱{originalLineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                {quantity > 1 && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    ₱{currentPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })} each
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-bold text-gray-900 text-lg">
                  ₱{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
                {quantity > 1 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    ₱{currentPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })} each
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Cart Page – updated to preserve discount info in checkout payload ───────
const CartPage = () => {
  const { cartItems, removeItem, updateQuantity, clearCart } = useCart();
  const { currentUser } = useAuth();
  const { setCheckoutData } = useUI();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [uncheckedCartIds, setUncheckedCartIds] = useState([]);
  const navigate = useNavigate();

  const selectedItems = cartItems.filter(item => !uncheckedCartIds.includes(item.cartId));
  const subtotal = selectedItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const totalItems = selectedItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

  const shippingFee      = selectedItems.length > 0 ? 100 : 0;
  const hasFreeShipping  = selectedItems.some(item => item.discountType === "free_shipping");
  const shippingDiscount = hasFreeShipping ? 100 : 0;
  const total            = (Number(subtotal) || 0) + shippingFee - shippingDiscount;

  const isAllSelected = cartItems.length > 0 && selectedItems.length === cartItems.length;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setUncheckedCartIds(cartItems.map(item => item.cartId));
    } else {
      setUncheckedCartIds([]);
    }
  };

  const handleToggleItem = (cartId) => {
    if (uncheckedCartIds.includes(cartId)) {
      setUncheckedCartIds(prev => prev.filter(id => id !== cartId));
    } else {
      setUncheckedCartIds(prev => [...prev, cartId]);
    }
  };

  // Build checkout payload that includes discounted price + original price and promo info
  const buildCartCheckoutData = () => ({
    cartItems: selectedItems.map((item) => ({
      productId:    item.productId,
      title:        item.title || "Product",
      price:        Number(item.price) || 0,          // discounted price
      originalPrice: item.originalPrice ? Number(item.originalPrice) : null,
      promoApplied: item.promoApplied || null,
      image:        item.image || null,
      quantity:     Number(item.quantity) || 1,
      size:         item.size || null,
      pieces:       Number(item.pieces) || 0,
      type:         item.type || "",
      category:     item.category || "",
      designImage:  item.designImage || null,
    })),
  });

  const handleCheckout = () => {
    if (selectedItems.length === 0) return;
    if (!currentUser) {
      try {
        sessionStorage.setItem(
          CHECKOUT_STORAGE_KEY,
          JSON.stringify(buildCartCheckoutData())
        );
      } catch (e) {
        console.error("Failed to persist cart checkout data", e);
      }
      setShowAuthModal(true);
      return;
    }
    setCheckoutData(buildCartCheckoutData());
    navigate("/customer-checkout", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-[95px]">
      {/* Page Header – unchanged */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 md:px-[65px] py-6 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleToggleAll}
            className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FFE100] transition"
          />
          <h1 className="text-2xl font-bold text-gray-900">My Cart</h1>
          {cartItems.length > 0 && (
            <span className="text-base text-gray-400 font-medium">
              ({selectedItems.length} of {cartItems.length} selected)
            </span>
          )}
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              className="ml-auto text-sm text-red-400 hover:text-red-600 font-semibold transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {cartItems.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="max-w-6xl mx-auto md:px-0 px-2 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm px-5 py-2">
              {cartItems.map((item) => (
                <CartItem
                  key={item.cartId}
                  item={item}
                  isSelected={!uncheckedCartIds.includes(item.cartId)}
                  onToggle={() => handleToggleItem(item.cartId)}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
            {cartItems.length > 0 && (
              <button onClick={clearCart} className="mt-5 text-red-500 font-semibold hover:underline">
                Clear all items
              </button>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-8 sticky top-[115px]">
              <h2 className="font-bold text-xl mb-6">Order Summary</h2>

              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})</span>
                  <span className="font-semibold text-gray-900">
                    ₱{(Number(subtotal) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-gray-500">₱{shippingFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                  <span className="font-semibold">Discount</span>
                  <span className="font-semibold">-₱{shippingDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-6 pt-6 flex justify-between items-center">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-gray-900 font-inter tracking-[0.05em]">
                  ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={selectedItems.length === 0}
                className={`mt-10 w-full py-4 font-bold rounded-xl active:scale-95 transition-all text-lg shadow-md ${
                  selectedItems.length > 0
                    ? "bg-[#FFE100] text-black hover:bg-yellow-400"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Checkout Now ({selectedItems.length})
              </button>

              <p className="text-center text-xs text-gray-400 mt-6">Secure checkout powered by DSC</p>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

export default CartPage;
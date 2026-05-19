import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { getImageUrl } from '../../services/api';

/* ── Icons ──────────────────────────────────────────── */
const TrashIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
);

const ShoppingBagIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
    </svg>
);

/* ── Confirm Delete Modal ─────────────────────────────────────── */
const ConfirmModal = ({ item, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                    <TrashIcon size={18} />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Remove item?</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6">
                <span className="font-semibold text-gray-700">
                    "{item?.title || 'This item'}"
                </span> will be removed from your cart.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition"
                >
                    Remove
                </button>
            </div>
        </div>
    </div>
);

/* ── Safe Price Formatter ─────────────────────────────────────── */
const formatPrice = (price) => {
    const num = Number(price) || 0;
    return num.toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

/* ── Quantity Control ─────────────────────────────────────── */
const QtyControl = ({ item, updateQuantity }) => (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-1 py-1 w-fit">
        <button
            onClick={() => updateQuantity(item.cartId, Math.max(1, (Number(item.quantity) || 1) - 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm transition font-bold text-base"
        >−</button>
        <span className="w-7 text-center font-semibold text-sm text-gray-800">
            {Number(item.quantity) || 1}
        </span>
        <button
            onClick={() => updateQuantity(item.cartId, (Number(item.quantity) || 1) + 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white hover:shadow-sm transition font-bold text-base"
        >+</button>
    </div>
);

const CustomerCart = () => {
    const { cartItems, removeItem, updateQuantity, clearCart } = useCart();
    const { setCheckoutData } = useUI();
    const navigate = useNavigate();
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [uncheckedCartIds, setUncheckedCartIds] = useState([]);

    const selectedItems = cartItems.filter(item => !uncheckedCartIds.includes(item.cartId));
    const safeSubtotal = selectedItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const SHIPPING_FEE = selectedItems.length > 0 ? 100 : 0;
    const total = safeSubtotal + SHIPPING_FEE;

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

    const handleConfirmDelete = () => {
        if (deleteTarget?.cartId) {
            removeItem(deleteTarget.cartId);
            setUncheckedCartIds(prev => prev.filter(id => id !== deleteTarget.cartId));
            setDeleteTarget(null);
        }
    };

    // Build a consistent checkout payload from the selected items
    const buildCheckoutPayload = () => ({
        cartItems: selectedItems.map((item) => ({
            productId:   item.productId,
            title:       item.title       || "Signage Product",
            price:       Number(item.price) || 0,
            image:       item.image         || null,
            quantity:    Number(item.quantity) || 1,
            size:        item.size          || null,
            pieces:      Number(item.pieces) || 0,
            type:        item.type          || "Signage",
            category:    item.category      || "Signage",
            designImage: item.designImage   || null,
        })),
        // Keep legacy single-product fields for backwards compat with checkout page
        product: {
            id:            selectedItems[0]?.productId,
            title:         selectedItems[0]?.title         || "Signage Product",
            price:         Number(selectedItems[0]?.price)  || 0,
            product_image: selectedItems[0]?.image          || null,
        },
        quantity:            Number(selectedItems[0]?.quantity)  || 1,
        size:                selectedItems[0]?.size               || null,
        pieces:              Number(selectedItems[0]?.pieces)     || 0,
        type:                selectedItems[0]?.type               || "Signage",
        category:            selectedItems[0]?.category           || "Signage",
        designImage:         selectedItems[0]?.designImage        || null,
        initialPaymentMethod: "COD",
    });

    const handleCheckout = () => {
        if (selectedItems.length === 0) return;
        setCheckoutData(buildCheckoutPayload());
        navigate("/customer-checkout", { replace: true });
    };

    /* ── Empty Cart State ─────────────────────────────────────── */
    if (cartItems.length === 0) {
        return (
            <>
                {/* Desktop Empty */}
                <div className="hidden lg:flex rounded-3xl my-5 mr-5 ml-1 h-[calc(100vh-40px)] items-center justify-center bg-white shadow-sm border border-gray-100">
                    <div className="text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-400">
                            <ShoppingBagIcon />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-700 mb-1">Your cart is empty</p>
                            <p className="text-gray-400 text-sm">Add some products to get started.</p>
                        </div>
                        <button
                            onClick={() => navigate('/customer-dashboard')}
                            className="mt-2 px-8 py-3 bg-[#FDE31E] hover:bg-yellow-400 text-black font-bold rounded-xl transition shadow-sm"
                        >
                            Browse Products
                        </button>
                    </div>
                </div>

                {/* Mobile Empty */}
                <div className="lg:hidden pt-20 px-4 pb-8 min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-400">
                            <ShoppingBagIcon />
                        </div>
                        <p className="text-xl font-bold text-gray-600">Your cart is empty</p>
                        <button
                            onClick={() => navigate('/customer-dashboard')}
                            className="px-6 py-3 bg-[#FDE31E] hover:bg-yellow-400 text-black font-bold rounded-xl transition"
                        >
                            Browse Products
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            {/* ====================== DESKTOP VIEW ====================== */}
            <div className="hidden lg:flex rounded-3xl my-5 mr-5 ml-1 h-[calc(100vh-40px)] gap-3">

                {/* Left - Cart Items */}
                <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={handleToggleAll}
                                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FDE31E] transition"
                                />
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-800">Shopping Cart</h1>
                                    <p className="text-sm text-gray-400 mt-0.5">
                                        {selectedItems.length} of {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} selected
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { if (window.confirm("Clear all items from cart?")) clearCart(); }}
                                className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition font-medium"
                            >
                                <TrashIcon size={14} />
                                Clear all
                            </button>
                        </div>
                    </div>

                    {/* Cart Items List */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        {cartItems.map((item) => {
                            const itemPrice = Number(item.price) || 0;
                            const lineTotal = itemPrice * (Number(item.quantity) || 1);
                            const isSelected = !uncheckedCartIds.includes(item.cartId);

                            return (
                                <div key={item.cartId}
                                    className={`group flex items-center gap-4 p-4 rounded-2xl border transition bg-white ${
                                        isSelected ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-75'
                                    }`}>

                                    {/* Item Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleItem(item.cartId)}
                                        className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FDE31E] transition flex-shrink-0"
                                    />

                                    {/* Product Image */}
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                        <img
                                            src={item.designImage ? getImageUrl(item.designImage) : getImageUrl(item.image)}
                                            alt={item.title || "Product"}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = '/placeholder.png'; }}
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 truncate">
                                            {item.title || "Signage Product"}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {item.size && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                    Size: {item.size}
                                                </span>
                                            )}
                                            {item.type && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                    {item.type}
                                                </span>
                                            )}
                                            {item.pieces > 0 && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                    {item.pieces} pcs
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">
                                            ₱{formatPrice(itemPrice)} each
                                        </p>
                                    </div>

                                    {/* Quantity Control */}
                                    <QtyControl item={item} updateQuantity={updateQuantity} />

                                    {/* Line Total */}
                                    <div className="w-28 text-right">
                                        <p className="font-bold text-gray-800 text-base">
                                            ₱{formatPrice(lineTotal)}
                                        </p>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => setDeleteTarget(item)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0"
                                        title="Remove item"
                                    >
                                        <TrashIcon size={16} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right - Order Summary */}
                <div className="w-[340px] bg-white border border-gray-100 shadow-sm rounded-2xl flex flex-col p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-5">Order Summary</h2>

                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Items Selected ({selectedItems.length})</span>
                            <span className="text-gray-700 font-medium">₱{formatPrice(safeSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Shipping Fee</span>
                            <span className="text-gray-700 font-medium">₱{formatPrice(SHIPPING_FEE)}</span>
                        </div>

                        <div className="border-t border-dashed border-gray-200 pt-4 mt-4">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800">Total</span>
                                <span className="text-2xl font-extrabold text-gray-900">
                                    ₱{formatPrice(total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mini Breakdown of Selected Items */}
                    <div className="mt-6 mb-6 space-y-2 text-xs text-gray-400 max-h-32 overflow-y-auto pr-1">
                        {selectedItems.map((item) => (
                            <div key={item.cartId} className="flex justify-between">
                                <span className="truncate max-w-[170px]">
                                    {item.title || "Item"} × {Number(item.quantity) || 1}
                                </span>
                                <span>
                                    ₱{formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}
                                </span>
                            </div>
                        ))}
                        {selectedItems.length === 0 && (
                            <p className="text-center text-gray-300 italic py-2">No items selected</p>
                        )}
                    </div>

                    <div className="space-y-3 mt-auto">
                        <button
                            onClick={handleCheckout}
                            disabled={selectedItems.length === 0}
                            className={`w-full py-3.5 rounded-xl font-bold transition shadow-sm flex items-center justify-center gap-2 ${
                                selectedItems.length > 0
                                    ? "bg-[#FDE31E] hover:bg-yellow-400 text-black active:scale-95"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                            Proceed to Checkout ({selectedItems.length}) →
                        </button>
                        <button
                            onClick={() => navigate('/customer-dashboard')}
                            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium transition"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>

            {/* ====================== MOBILE VIEW ====================== */}
            <div className="lg:hidden pt-16 pb-10 min-h-screen bg-gray-50">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={handleToggleAll}
                            className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FDE31E] transition"
                        />
                        <div>
                            <h1 className="text-lg font-bold text-gray-800">Shopping Cart</h1>
                            <p className="text-xs text-gray-400">
                                {selectedItems.length} of {cartItems.length} selected
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { if (window.confirm("Clear all items from cart?")) clearCart(); }}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                        <TrashIcon size={12} /> Clear all
                    </button>
                </div>

                <div className="px-4 mt-4 space-y-4">
                    {cartItems.map((item) => {
                        const itemPrice = Number(item.price) || 0;
                        const lineTotal = itemPrice * (Number(item.quantity) || 1);
                        const isSelected = !uncheckedCartIds.includes(item.cartId);

                        return (
                            <div key={item.cartId} className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 transition ${
                                isSelected ? 'border-gray-100' : 'border-gray-50 opacity-75'
                            }`}>
                                {/* Item Checkbox */}
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleItem(item.cartId)}
                                    className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FDE31E] transition flex-shrink-0"
                                />

                                {/* Image */}
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                    <img
                                        src={item.designImage ? getImageUrl(item.designImage) : getImageUrl(item.image)}
                                        alt={item.title || "Product"}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                                    />
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <h3 className="font-bold text-gray-800 leading-snug line-clamp-2 text-sm flex-1">
                                            {item.title || "Signage Product"}
                                        </h3>
                                        <button
                                            onClick={() => setDeleteTarget(item)}
                                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                                        >
                                            <TrashIcon size={14} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {item.size && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                Size: {item.size}
                                            </span>
                                        )}
                                        {item.type && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                {item.type}
                                            </span>
                                        )}
                                        {item.pieces > 0 && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                {item.pieces} pcs
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <QtyControl item={item} updateQuantity={updateQuantity} />
                                        <p className="font-extrabold text-gray-800">
                                            ₱{formatPrice(lineTotal)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Mobile Order Summary */}
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm mt-6">
                        <h2 className="text-base font-bold text-gray-800 mb-4">Order Summary</h2>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Items Selected ({selectedItems.length})</span>
                                <span className="font-semibold text-gray-700">₱{formatPrice(safeSubtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>Shipping Fee</span>
                                <span className="font-semibold text-gray-700">₱{formatPrice(SHIPPING_FEE)}</span>
                            </div>
                            <div className="border-t border-dashed border-gray-200 pt-4 flex justify-between items-center">
                                <span className="font-bold text-gray-800">Total</span>
                                <span className="text-2xl font-extrabold text-gray-900">₱{formatPrice(total)}</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <button
                                onClick={handleCheckout}
                                disabled={selectedItems.length === 0}
                                className={`w-full py-3.5 rounded-xl font-bold transition shadow-sm flex items-center justify-center gap-2 ${
                                    selectedItems.length > 0
                                        ? "bg-[#FDE31E] hover:bg-yellow-400 text-black"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                            >
                                Proceed to Checkout ({selectedItems.length}) →
                            </button>
                            <button
                                onClick={() => navigate('/customer-dashboard')}
                                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 font-medium transition hover:bg-gray-50"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <ConfirmModal
                    item={deleteTarget}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    );
};

export default CustomerCart;
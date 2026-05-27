import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useCart } from "../../context/CartContext";
import { useAuth } from '../../context/CustomerAuthContext';
import LoginRegisterModal from "../LoginRegisterModal";
import DesignChatbox from "../DesignChatbox";
import { getBestPromo, getDiscountedPrice } from "../PromoTag";
import PromoApi from "../../services/PromoApi";
import { getImageUrl } from "../../services/api";
import CartToast from "../CartToast";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalSignage = ({ signage, onClose }) => {
  const rightPanelRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rightPanelRef.current) {
        rightPanelRef.current.scrollTop = 0;
        window.scrollTo(0, 0);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser, isVerified } = useAuth();
  const { addItem, cartItems } = useCart();

  const cartCount = useMemo(() => {
    const productId = signage.id || signage.product_id;
    return cartItems
      .filter((c) => c.productId === productId)
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, signage]);

  const isCustomizableProduct =
    signage.is_customizable !== 0 &&
    signage.is_customizable !== false &&
    signage.is_customizable !== "0" &&
    signage.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

  // Out of stock check — adjust field name to match your API
  const stock = signage?.stock ?? signage?.quantity_in_stock ?? null;
  const isOutOfStock = stock !== null && Number(stock) <= 0;

  const [quantity, setQuantity] = useState(1);
  const [width, setWidth] = useState("1");
  const [height, setHeight] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    PromoApi.getActive()
      .then((data) => setPromos(Array.isArray(data) ? data : []))
      .catch(() => setPromos([]));
  }, []);

  const title = signage?.title || signage?.product_name || "Signage Product";
  const category = signage?.category || signage?.product_type || "Signage";
  const description = signage?.product_description || signage?.description || "";

  const rawSqftPrice = useMemo(() => {
    console.log("🛠️ ModalSignage - Signage Data:", signage);
    const raw = signage?.sqft || signage?.price || signage?.product_price || "0";
    console.log("💰 Extracted Raw Price:", raw);
    const cleaned = String(raw)
      .replace(/₱/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .replace(/per.*$/gi, '')
      .replace(/[^0-9.]/g, '')
      .trim();
    const parsed = parseFloat(cleaned);
    const result = isNaN(parsed) ? 0 : parsed;
    console.log("✅ Parsed Numeric Price:", result);
    return result;
  }, [signage]);

  const promo = getBestPromo(signage, promos);
  let discountedSqftPrice = getDiscountedPrice(rawSqftPrice, promo);
  if (isNaN(discountedSqftPrice)) discountedSqftPrice = rawSqftPrice;
  const hasDiscount =
    discountedSqftPrice !== rawSqftPrice &&
    promo &&
    (promo.discount_type === "percentage" || promo.discount_type === "fixed");

  const handleGetSubtotal = () => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    const q = parseFloat(quantity);
    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0 && !isNaN(q) && q > 0) {
      setIsCalculating(true);
      const total = discountedSqftPrice * w * h * q;
      console.log(`🧮 Calculating Signage Subtotal on button click: ${discountedSqftPrice} * ${w} * ${h} * ${q} = ${total}`);
      setSubtotal(total);
      setSubmitError(null);
      setTimeout(() => setIsCalculating(false), 300);
    } else {
      setSubmitError("Please enter valid width, height, and quantity.");
    }
  };

  // Run calculation initially when component mounts
  useEffect(() => {
    handleGetSubtotal();
  }, [discountedSqftPrice]);

  const formatPrice = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const validateOrder = (checkPaymentMethod = true) => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (subtotal <= 0) { setSubmitError("Please enter valid dimensions and quantity."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null);
    return true;
  };

  const buildPayload = () => ({
    product: {
      id: signage.id || signage._id || "unknown",
      title,
      price: discountedSqftPrice,
      image: signage.image || signage.product_image || null,
      originalPrice: hasDiscount ? rawSqftPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
    },
    quantity,
    size: `${width} x ${height} ft`,
    pieces: quantity,
    category: "Signage",
    type: category,
    subtotal,
    initialPaymentMethod: paymentMethod,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : null,
    timestamp: Date.now()
  });

  const buildCartItem = () => ({
    productId: signage.id || signage._id || "unknown",
    title,
    price: discountedSqftPrice,
    image: signage.image || signage.product_image || null,
    size: `${width} x ${height} ft`,
    pieces: quantity,
    quantity,
    paymentMethod,
    category: "Signage",
    type: category,
    subtotal,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : null,
    originalPrice: hasDiscount ? rawSqftPrice : null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
  });

  const handleBuyNow = () => {
    if (!validateOrder()) return;
    if (!currentUser) {
      try {
        sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(buildPayload()));
        sessionStorage.setItem("stickify_checkout_intent", "true");
      } catch (e) { console.error("Failed to persist checkout data", e); }
      setShowAuthModal(true);
      return;
    }
    if (!isVerified) {
      setSubmitError("Please verify your email address to proceed with checkout.");
      return;
    }
    setIsSubmitting(true);
    try {
      setCheckoutData(buildPayload());
      onClose();
      navigate("/customer-checkout", { replace: true });
    } catch (error) {
      console.error("Checkout preparation failed:", error);
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (!validateOrder(false)) return;
    addItem(buildCartItem());
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Derived button states
  const checkoutDisabled =
    isOutOfStock ||
    isSubmitting ||
    subtotal <= 0 ||
    !paymentMethod ||
    (currentUser && !isVerified) ||
    (isCustomMode && !uploadedImage?.preview);

  const checkoutLabel = isOutOfStock
    ? "Out of Stock"
    : isCustomMode && !uploadedImage?.preview
      ? "Upload Design to Proceed"
      : currentUser && !isVerified
        ? "Verification Required"
        : isSubmitting
          ? "Processing..."
          : "Proceed to Checkout";

  const cartDisabled =
    isOutOfStock ||
    subtotal <= 0 ||
    (isCustomMode && !uploadedImage?.preview);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-[40px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative"
          style={{ height: "90vh", maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-8 right-10 z-20 text-3xl font-bold text-gray-300 hover:text-black transition-colors"
          >
            ×
          </button>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* LEFT Panel */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 overflow-hidden">

              {/* Static top info */}
              <div className={`p-8 pb-4 bg-gray-50/30 flex flex-col gap-4 overflow-y-auto custom-scrollbar ${isCustomizableProduct ? 'flex-shrink-0' : 'flex-1'}`}>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{title}</h2>
                  <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{category}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {hasDiscount ? (
                    <>
                      <span className="text-sm line-through text-gray-400 font-medium">₱ {formatPrice(rawSqftPrice)} per sqft</span>
                      <span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(discountedSqftPrice)} per sqft</span>
                    </>
                  ) : (
                    <span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(rawSqftPrice)} per sqft</span>
                  )}
                  {promo && (
                    <span className="text-[10px] bg-[#FFE100] text-black font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                      {promo.discount_type === "percentage"
                        ? `${promo.discount_value}% OFF`
                        : promo.discount_type === "fixed"
                          ? `₱${promo.discount_value} OFF`
                          : "PROMO"}
                    </span>
                  )}
                </div>

                {description && <p className="text-sm text-gray-500 leading-relaxed italic">{description}</p>}

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">Width</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">feet</span>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={width}
                        onChange={(e) => {
                          setWidth(e.target.value);
                          setSubtotal(0); // Reset subtotal on input change
                        }}
                        className="w-20 px-3 py-1.5 text-center font-black border border-gray-200 rounded-xl focus:border-[#FFE100] focus:outline-none text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">Height</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium">feet</span>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={height}
                        onChange={(e) => {
                          setHeight(e.target.value);
                          setSubtotal(0); // Reset subtotal on input change
                        }}
                        className="w-20 px-3 py-1.5 text-center font-black border border-gray-200 rounded-xl focus:border-[#FFE100] focus:outline-none text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">Quantity</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setQuantity(q => Math.max(1, q - 1));
                          setSubtotal(0); // Reset subtotal
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-lg transition-colors text-lg font-bold"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-black text-sm sm:text-base">{quantity}</span>
                      <button
                        onClick={() => {
                          setQuantity(q => q + 1);
                          setSubtotal(0); // Reset subtotal
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-lg transition-colors text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleGetSubtotal}
                      className="px-4 py-2 bg-black text-white font-black text-[10px] sm:text-[11px] rounded-xl tracking-wider hover:bg-gray-800 uppercase transition-all shadow-sm active:scale-95"
                    >
                      Get Subtotal
                    </button>
                  </div>
                </div>

                {subtotal > 0 && (
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-500 font-medium">Subtotal</span>
                      <span className="text-base sm:text-lg font-black text-gray-900 font-mono tracking-tighter">₱ {formatPrice(subtotal)}</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 leading-normal italic">
                      Note: Free installment for areas around Davao City. For outside Davao City, installment fee may vary base on your location.
                    </p>
                    <div className="flex justify-between items-center border-t border-gray-50 pt-3 text-xs sm:text-sm">
                      <span className="text-gray-800 font-bold">Total</span>
                      <span className="text-lg sm:text-xl font-black text-gray-900 font-mono tracking-tighter">₱ {formatPrice(subtotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chatbox — fills remaining height */}
              <div className="flex-1 min-h-0 px-8 pb-8 pt-2 bg-gray-50/30">
                {isCustomMode ? (
                  <DesignChatbox
                    onImageUpload={(img) => {
                      setUploadedImage({ preview: img });
                      setSubmitError(null);
                    }}
                    productId={signage.id}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                    <span className="text-4xl mb-3">📦</span>
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Standard / Readymade Order</h4>
                    <p className="text-xs text-gray-400 mt-2 max-w-[280px]">
                      This product will be printed using the standard/default design shown in the preview. No design files or artist approvals are needed.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT Panel */}
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-8 overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group relative" style={{ minHeight: "220px" }}>
                  <img
                    src={getImageUrl(signage.image || signage.product_image)}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={title}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">Project Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Material Cost (per sqft)</span>
                      <span className="font-bold text-gray-900">₱ {formatPrice(discountedSqftPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Dimensions</span>
                      <span className="font-bold text-gray-900">{width} x {height} ft</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-bold text-gray-900">{quantity} Unit(s)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {["COD", "GCash", "Pickup"].map((id) => (
                      <label
                        key={id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === id ? "border-[#FFE100] bg-yellow-50/30" : "border-gray-50 hover:border-gray-100"}`}
                      >
                        <input
                          type="radio"
                          checked={paymentMethod === id}
                          onChange={() => setPaymentMethod(id)}
                          className="w-5 h-5 accent-yellow-500"
                        />
                        <span className="text-sm font-bold text-gray-700">
                          {id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Estimated Total</p>
                  <div className={`flex items-baseline gap-1 transition-all duration-300 ${isCalculating ? "scale-105 blur-[1px] opacity-70" : "scale-100 blur-0 opacity-100"}`}>
                    <span className="text-xl font-bold text-yellow-400">₱</span>
                    <span className="text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span>
                  </div>
                  {promo?.discount_type === "free_shipping" && (
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">
                      Free Installation (Davao City) + Free Shipping
                    </p>
                  )}
                </div>
              </div>

              {/* ── BUTTONS ── */}
              <div className="mt-8 space-y-3">

                {/* Proceed to Checkout */}
                <button
                  onClick={handleBuyNow}
                  disabled={checkoutDisabled}
                  className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.98] shadow-lg
                    ${isOutOfStock
                      ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
                      : checkoutDisabled
                        ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                        : "bg-[#FFE100] text-black hover:bg-yellow-400 hover:shadow-yellow-200 hover:shadow-2xl"
                    }`}
                >
                  {checkoutLabel}
                </button>

                {/* Add to Cart */}
                <div className="relative">
                  <button
                  onClick={handleAddToCart}
                  disabled={cartDisabled}
                  style={
                    isOutOfStock || cartDisabled
                      ? { border: "1px solid #e5e7eb" } 
                      : { border: "2px solid #000000" }  
                  }
                  className={`
                    w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm 
                    transition-all duration-200 active:scale-[0.98]
                    ${isOutOfStock || cartDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white"
                    }
                  `}
                >
                  {isOutOfStock ? "Out of Stock" : "ADD TO CART"}
                </button>



                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[24px] h-[24px] bg-[#FFE100] text-black text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow-md leading-none border-2 border-white z-10 select-none pointer-events-none">
                      {cartCount}
                    </span>
                  )}

                  {showToast && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100]">
                      <CartToast
                        onViewCart={() => {
                          setShowToast(false);
                          onClose();
                          navigate("/cart");
                        }}
                        onClose={() => setShowToast(false)}
                      />
                    </div>
                  )}
                </div>

                {submitError && (
                  <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest mt-2">
                    {submitError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <LoginRegisterModal onClose={() => setShowAuthModal(false)} fromCheckout={true} />
      )}
    </>
  );
};

export default ModalSignage;
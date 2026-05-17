import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/CustomerAuthContext";
import { useCart } from "../context/CartContext";
import LoginRegisterModal from "./LoginRegisterModal";
import DesignChatbox from "./DesignChatbox";
import { getBestPromo, getDiscountedPrice } from "../components/PromoTag";
import PromoApi from "../services/PromoApi";
import { getImageUrl } from "../services/api";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const CartToast = ({ onViewCart, onClose }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl" style={{ animation: "toastIn 0.25s cubic-bezier(.34,1.56,.64,1) both" }}>
    <style>{`@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(16px) scale(0.95); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }`}</style>
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
    <span className="text-sm font-medium">Added to cart!</span>
    <button onClick={onViewCart} className="ml-1 text-sm font-bold text-yellow-400 hover:text-yellow-300 transition-colors">View Cart</button>
    <button onClick={onClose} className="ml-2 text-gray-500 hover:text-white transition-colors text-lg leading-none">×</button>
  </div>
);

const ModalMoreStickers = ({ sticker, onClose }) => {
  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser } = useAuth();
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("1.5 × 1.5");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [promos, setPromos] = useState([]);
  const subtotalRef = useRef(null);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    PromoApi.getActive().then((data) => setPromos(Array.isArray(data) ? data : [])).catch(() => setPromos([]));
  }, []);

  const sizePricing = {
    "1.5 × 1.5": 180, "2 × 2": 200, "2 × 3": 220, "2.5 x 2.5": 240,
    "3 × 3": 250, "3.5 x 3.5": 280, "4 x 4": 320, "4 x 1": 230,
    "4 x 2": 260, "5 x 5": 380, "6 × 6": 450, "7 × 7": 550,
    "8 × 8": 680, "9 × 9": 850,
  };

  const sizes = [
    { size: "1.5 × 1.5", pieces: 78 }, { size: "2 × 2", pieces: 40 },
    { size: "2 × 3", pieces: 30 }, { size: "2.5 x 2.5", pieces: 32 },
    { size: "3 × 3", pieces: 21 }, { size: "3.5 x 3.5", pieces: 15 },
    { size: "4 x 4", pieces: 10 }, { size: "4 x 1", pieces: 45 },
    { size: "4 x 2", pieces: 20 }, { size: "5 x 5", pieces: 8 },
    { size: "6 × 6", pieces: 4 }, { size: "7 × 7", pieces: 3 },
    { size: "8 × 8", pieces: 2 }, { size: "9 × 9", pieces: 2 },
  ];

  const dbPrice = useMemo(() => {
    console.log("🛠️ ModalMoreStickers - Sticker Data:", sticker);
    const raw = sticker.product_price ?? sticker.price ?? 0;
    console.log("💰 Extracted Raw Price:", raw);

    const parsed = typeof raw === "string"
      ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0)
      : (parseFloat(raw) || 0);

    console.log("✅ Parsed Numeric Price:", parsed);
    return parsed;
  }, [sticker]);

  const rawPrice = selectedSize ? (sizePricing[selectedSize] || dbPrice) : dbPrice;
  const promo = getBestPromo(sticker, promos);
  let discountedPrice = getDiscountedPrice(rawPrice, promo);
  if (isNaN(discountedPrice)) discountedPrice = rawPrice;
  const hasDiscount = discountedPrice !== rawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");
  const description = sticker?.product_description || sticker?.description;

  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    const total = discountedPrice * quantity;
    console.log(`🧮 Calculating Sticker Subtotal: ${discountedPrice} * ${quantity} = ${total}`);
    setSubtotal(total);
  }, [discountedPrice, quantity]);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) { setSubmitError("Only JPG, JPEG and PNG files are allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { setSubmitError("File size should be less than 10MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setUploadedImage({ file, preview: reader.result }); setSubmitError(null); };
    reader.readAsDataURL(file);
  }, []);

  const validateOrder = (checkPaymentMethod = true) => {
    if (!uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (!selectedSize) { setSubmitError("Please select a sticker size first."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const buildPayload = () => ({
    product: {
      id: sticker.id || sticker._id || sticker.product_id || "unknown",
      title: sticker.title || sticker.name || "More Stickers",
      price: discountedPrice,
      image: sticker.image || sticker.product_image || null,
      originalPrice: hasDiscount ? rawPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
      discountType: promo?.discount_type || null,
    },
    quantity,
    size: selectedSize,
    pieces: sizes.find((s) => s.size === selectedSize)?.pieces || 0,
    category: "Stickers",
    type: "more",
    subtotal,
    initialPaymentMethod: paymentMethod,
    designImage: uploadedImage?.preview || null,
    timestamp: Date.now()
  });

  const buildCartItem = () => ({
    productId: sticker.id || sticker._id || sticker.product_id || "unknown",
    title: sticker.title || sticker.name || "More Stickers",
    price: discountedPrice,
    image: sticker.image || sticker.product_image || null,
    size: selectedSize,
    pieces: sizes.find((s) => s.size === selectedSize)?.pieces || 0,
    quantity,
    paymentMethod,
    category: "Stickers",
    type: "more",
    subtotal,
    designImage: uploadedImage?.preview || null,
    originalPrice: hasDiscount ? rawPrice : null,
    promotion_id: promo?.promotion_id || null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
  });

  const handleBuyNow = () => {
    if (!validateOrder()) return;
    if (!currentUser) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(buildPayload()));
      sessionStorage.setItem("stickify_checkout_intent", "true");
      setShowAuthModal(true);
      return;
    }
    setIsSubmitting(true);
    try {
      setCheckoutData(buildPayload());
      onClose();
      navigate("/customer-checkout", { replace: true });
    } catch (error) {
      console.error(error);
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

  const formatPrice = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    if (selectedSize && subtotalRef.current) {
      subtotalRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSize]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={onClose}>
        <div
          className="bg-white sm:rounded-[40px] rounded-t-[32px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative transition-all duration-300"
          style={{ height: window.innerWidth < 768 ? "95vh" : "90vh", maxHeight: "95vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button - Responsive Position */}
          <button 
            onClick={onClose} 
            className="absolute top-4 right-5 sm:top-8 sm:right-10 z-30 w-10 h-10 flex items-center justify-center bg-white/80 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none rounded-full text-2xl font-bold text-gray-400 hover:text-black transition-all shadow-sm sm:shadow-none"
          >
            ×
          </button>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {/* LEFT Panel (Info & Pricing) */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 md:overflow-hidden bg-gray-50/30">

              <div className="flex-shrink-0 p-5 sm:p-8 pb-4 flex flex-col gap-4 md:overflow-y-auto custom-scrollbar" style={{ maxHeight: window.innerWidth >= 768 ? "55%" : "none" }}>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{sticker?.title || "More Stickers"}</h2>
                  <p className="text-xs sm:text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">Premium Sticker Sheets</p>
                </div>

                {description && <p className="text-xs sm:text-sm text-gray-500 leading-relaxed italic line-clamp-3 sm:line-clamp-none">{description}</p>}

                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                  <h4 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Size & Pricing Table</h4>
                  <table className="w-full text-xs min-w-[300px]">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="py-2 text-left font-black text-gray-400 uppercase tracking-tighter text-[9px]">Sticker Size</th>
                        <th className="py-2 text-left font-black text-gray-400 uppercase tracking-tighter text-[9px]">Pieces</th>
                        <th className="py-2 text-right font-black text-gray-400 uppercase tracking-tighter text-[9px]">Price/Sheet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sizes.map(({ size, pieces }) => {
                        const isSelected = selectedSize === size;
                        const sizeRawPrice = sizePricing[size];
                        const sizeDiscounted = getDiscountedPrice(sizeRawPrice, promo);
                        const sizeHasDiscount = sizeDiscounted !== sizeRawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");
                        return (
                          <tr key={size} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-yellow-50/30' : 'hover:bg-gray-50/50'}`} onClick={() => setSelectedSize(size)}>
                            <td className="py-2.5 sm:py-3 font-bold flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#FFE100]' : 'border-gray-200'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFE100]" />}
                              </div>
                              <span className="text-gray-700 text-[11px] sm:text-xs">{size}</span>
                            </td>
                            <td className="py-2.5 sm:py-3 text-gray-500 font-medium text-[11px] sm:text-xs">{pieces} pcs</td>
                            <td className="py-2.5 sm:py-3 text-right">
                              {sizeHasDiscount ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] sm:text-[9px] line-through text-gray-400">₱{formatPrice(sizeRawPrice)}</span>
                                  <span className="text-gray-900 font-black italic text-[11px] sm:text-xs">₱{formatPrice(sizeDiscounted)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-900 font-black italic text-[11px] sm:text-xs">₱{formatPrice(sizeRawPrice)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Chatbox Panel */}
              <div className="flex-1 min-h-[300px] md:min-h-0 px-5 sm:px-8 pb-8 pt-2">
                <DesignChatbox 
                  onImageUpload={(img) => {
                    setUploadedImage({ preview: img });
                    setSubmitError(null);
                  }} 
                  productId={sticker.product_id || sticker.id}
                />
              </div>
            </div>

            {/* RIGHT Panel (Configuration & Checkout) */}
            <div className="w-full md:w-1/2 p-5 sm:p-8 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group">
                  <img
                    src={getImageUrl(sticker?.image || sticker?.product_image)}
                    className="w-full h-40 sm:h-48 object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={sticker?.title}
                  />
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Quantity</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:bg-white hover:shadow-sm rounded-xl transition-all text-xl font-bold">−</button>
                        <span className="w-8 text-center font-black text-base sm:text-lg">{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:bg-white hover:shadow-sm rounded-xl transition-all text-xl font-bold">+</button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-2 px-1">
                      <span className="text-gray-500">Sheet Unit Price</span>
                      <div className="flex flex-col items-end">
                        {hasDiscount ? (
                          <>
                            <span className="text-[9px] sm:text-[10px] line-through text-gray-400">₱ {formatPrice(rawPrice)}</span>
                            <span className="font-bold text-gray-900">₱ {formatPrice(discountedPrice)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900">₱ {formatPrice(rawPrice)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {["COD", "GCash", "Pickup"].map((id) => (
                      <label key={id} className={`flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === id ? "border-[#FFE100] bg-yellow-50/30" : "border-gray-50 hover:border-gray-100"}`}>
                        <input type="radio" checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-4 h-4 sm:w-5 sm:h-5 accent-yellow-500" />
                        <span className="text-xs sm:text-sm font-bold text-gray-700">{id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div ref={subtotalRef} className="bg-gray-900 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group mt-4">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 transition-transform group-hover:scale-110"></div>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Estimated Total</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-bold text-yellow-400">₱</span>
                    <span className="text-4xl sm:text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span>
                  </div>
                  {promo?.discount_type === "free_shipping" && (
                    <p className="text-[9px] sm:text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">✓ Free Shipping Included</p>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3 sm:space-y-4">
                <button 
                  onClick={handleBuyNow} 
                  disabled={isSubmitting || subtotal <= 0 || !paymentMethod || !uploadedImage?.preview} 
                  className={`w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm transition-all active:scale-[0.98] shadow-xl
                    ${(isSubmitting || subtotal <= 0 || !paymentMethod || !uploadedImage?.preview)
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400"
                    }`}
                >
                  {!uploadedImage?.preview ? "Upload Design to Proceed" : (isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <button 
                  onClick={handleAddToCart} 
                  disabled={subtotal <= 0 || !uploadedImage?.preview} 
                  className={`w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm border-2 transition-all
                    ${!uploadedImage?.preview ? "border-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-100 text-gray-900 hover:bg-gray-50"}`}
                >
                  Add to Cart
                </button>
                {submitError && <p className="text-red-500 text-[9px] sm:text-[10px] text-center font-black uppercase tracking-widest mt-4">{submitError}</p>}
              </div>
              
              {/* Extra spacer for mobile bottom padding */}
              <div className="h-10 md:hidden" />
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} />}
      {showToast && <CartToast onViewCart={() => { setShowToast(false); onClose(); navigate("/cart"); }} onClose={() => setShowToast(false)} />}
    </>
  );
};

export default ModalMoreStickers;
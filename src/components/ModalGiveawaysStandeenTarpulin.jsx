import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../context/UIContext";
import { useAuth } from '../context/CustomerAuthContext';
import { useCart } from "../context/CartContext";
import LoginRegisterModal from "./LoginRegisterModal";
import DesignChatbox from "./DesignChatbox";
import { getBestPromo, getDiscountedPrice } from "../components/PromoTag";
import PromoApi from "../services/PromoApi";
import CartToast from "./CartToast";
import { getImageUrl } from "../services/api";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalGiveawaysStandeenTarpulin = ({ giveaways, onClose }) => {
  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser } = useAuth();
  const { addItem } = useCart();

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
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    PromoApi.getActive().then((data) => setPromos(Array.isArray(data) ? data : [])).catch(() => setPromos([]));
  }, []);

  const isStandee = giveaways.type?.toLowerCase().includes("standee") ||
    giveaways.product_name?.toLowerCase().includes("standee") ||
    giveaways.title?.toLowerCase().includes("standee");

  const rawPrice = useMemo(() => {
    const title = (giveaways.title || giveaways.product_name || "").toLowerCase();
    if (title.includes("tarp")) return 30;
    if (title.includes("standee") || title.includes("wall decor")) return 200;
    const raw = giveaways.price || giveaways.product_price || "0";
    return parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
  }, [giveaways]);

  const promo = getBestPromo(giveaways, promos);
  let discountedPrice = getDiscountedPrice(rawPrice, promo);
  if (isNaN(discountedPrice)) discountedPrice = rawPrice;
  const hasDiscount = discountedPrice !== rawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");

  const isTarpaulin = giveaways.category?.toLowerCase().includes("tarp") || giveaways.title?.toLowerCase().includes("tarp");

  useEffect(() => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    const q = parseFloat(quantity);
    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0 && !isNaN(q) && q > 0) {
      setSubtotal((isStandee || isTarpaulin) ? discountedPrice * w * h * q : discountedPrice * q);
    } else {
      setSubtotal(0);
    }
  }, [width, height, quantity, discountedPrice, isStandee, isTarpaulin]);

  const description = giveaways?.product_description || giveaways?.description;

  const formatPrice = (num) => num.toLocaleString("en-PH", { minimumFractionDigits: 2 });

  const validateOrder = () => {
    if (!uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (subtotal <= 0) { setSubmitError("Please enter valid dimensions and quantity."); return false; }
    if (!paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const sizeLabel = `${width} x ${height} ${isStandee ? "ft" : "inches"}`;
  const productTitle = isStandee
    ? (giveaways.product_name || giveaways.title || "Standee")
    : (giveaways.category || "Tarpulin");

  const buildCartItem = () => ({
    productId: giveaways.product_id || giveaways.id || "unknown",
    title: productTitle,
    price: discountedPrice,
    image: giveaways.product_image || giveaways.image || null,
    quantity,
    size: sizeLabel,
    pieces: quantity,
    category: "Giveaways",
    type: giveaways.type,
    designImage: uploadedImage?.preview || null,
    originalPrice: hasDiscount ? rawPrice : null,
    promotion_id: promo?.promotion_id || null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
    width: isStandee ? parseFloat(width) : null,
    height: isStandee ? parseFloat(height) : null,
  });

  const buildCheckoutPayload = () => ({
    product: {
      id: giveaways.product_id || giveaways.id || "unknown",
      title: productTitle,
      price: discountedPrice,
      image: giveaways.product_image || giveaways.image || null,
      originalPrice: hasDiscount ? rawPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
    },
    quantity,
    size: sizeLabel,
    category: "Giveaways",
    type: giveaways.type,
    subtotal,
    initialPaymentMethod: paymentMethod,
    designImage: uploadedImage?.preview || null,
    width: isStandee ? parseFloat(width) : null,
    height: isStandee ? parseFloat(height) : null,
  });

  const handleBuyNow = () => {
    if (!validateOrder()) return;
    if (!currentUser) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(buildCheckoutPayload()));
      setShowAuthModal(true);
      return;
    }
    setIsSubmitting(true);
    setCheckoutData(buildCheckoutPayload());
    onClose();
    navigate("/customer-checkout", { replace: true });
    setIsSubmitting(false);
  };

  const handleAddToCart = () => {
    if (!validateOrder()) return;
    addItem(buildCartItem());
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="bg-white rounded-[40px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative"
          style={{ height: "90vh", maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-8 right-10 z-20 text-3xl font-bold text-gray-300 hover:text-black transition-colors">×</button>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* LEFT Panel */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 overflow-hidden">

              {/* Static top info */}
              <div className="flex-shrink-0 p-8 pb-4 bg-gray-50/30 flex flex-col gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{productTitle}</h2>
                  <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{giveaways.type || "Professional Printing"}</p>
                </div>

                {description && <p className="text-sm text-gray-500 leading-relaxed italic">{description}</p>}

                <div className="flex items-center gap-3 flex-wrap">
                  {hasDiscount ? (
                    <>
                      <span className="text-sm line-through text-gray-400 font-medium">₱ {formatPrice(rawPrice)} / {isStandee ? "sqft" : "unit"}</span>
                      <span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(discountedPrice)} / {isStandee ? "sqft" : "unit"}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(rawPrice)} / {isStandee ? "sqft" : "unit"}</span>
                  )}
                  {promo && (
                    <span className="text-[10px] bg-[#FFE100] text-black font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                      {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : promo.discount_type === "fixed" ? `₱${promo.discount_value} OFF` : "PROMO"}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{isStandee ? "Width (ft)" : "Width (in)"}</span>
                      <input type="number" step="0.1" min="0.1" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full font-black text-lg outline-none" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{isStandee ? "Height (ft)" : "Height (in)"}</span>
                      <input type="number" step="0.1" min="0.1" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full font-black text-lg outline-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">−</button>
                      <span className="w-10 text-center font-black text-lg">{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chatbox — fills remaining height */}
              <div className="flex-1 min-h-0 px-8 pb-8 pt-2 bg-gray-50/30">
                <DesignChatbox 
                  onImageUpload={(img) => {
                    setUploadedImage({ preview: img });
                    setSubmitError(null);
                  }} 
                  productId={giveaways.product_id || giveaways.id}
                />
              </div>
            </div>

            {/* RIGHT Panel */}
            <div className="w-full md:w-1/2 p-8 overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group">
                  <img
                    src={getImageUrl(giveaways.product_image || giveaways.image)}
                    className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={productTitle}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">Project Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Unit Price</span>
                      <div className="flex flex-col items-end">
                        {hasDiscount ? (
                          <>
                            <span className="text-[10px] line-through text-gray-400">₱ {formatPrice(rawPrice)}</span>
                            <span className="font-bold text-gray-900">₱ {formatPrice(discountedPrice)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900">₱ {formatPrice(rawPrice)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Dimensions</span>
                      <span className="font-bold text-gray-900">{sizeLabel}</span>
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
                      <label key={id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === id ? "border-[#FFE100] bg-yellow-50/30" : "border-gray-50 hover:border-gray-100"}`}>
                        <input type="radio" checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-5 h-5 accent-yellow-500" />
                        <span className="text-sm font-bold text-gray-700">{id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 rounded-[32px] p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Estimated Total</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-yellow-400">₱</span>
                    <span className="text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span>
                  </div>
                  {promo?.discount_type === "free_shipping" && (
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">✓ Free Installation (Davao City) + Free Shipping</p>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button 
                  onClick={handleBuyNow} 
                  disabled={isSubmitting || subtotal <= 0 || !paymentMethod || !uploadedImage?.preview} 
                  className={`w-full py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-[0.98]
                    ${(isSubmitting || subtotal <= 0 || !paymentMethod || !uploadedImage?.preview)
                      ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400 shadow-yellow-100"
                    }`}
                >
                  {!uploadedImage?.preview ? "Upload Design to Proceed" : (isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <button 
                  onClick={handleAddToCart} 
                  disabled={subtotal <= 0 || !uploadedImage?.preview} 
                  className={`w-full py-6 rounded-[24px] font-black uppercase tracking-widest text-sm border-2 transition-all
                    ${!uploadedImage?.preview ? "border-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-100 text-gray-900 hover:bg-gray-50"}`}
                >
                  Add to Cart
                </button>
                {submitError && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest mt-4">{submitError}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} />}
      {showToast && <CartToast onViewCart={() => { setShowToast(false); onClose(); navigate("/cart"); }} onClose={() => setShowToast(false)} />}
    </>
  );
};

export default ModalGiveawaysStandeenTarpulin;
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useAuth } from '../../context/CustomerAuthContext';
import { useCart } from "../../context/CartContext";
import LoginRegisterModal from "../LoginRegisterModal";
import DesignChatbox from "../DesignChatbox";
import { getBestPromo, getDiscountedPrice } from "../PromoTag";
import PromoApi from "../../services/PromoApi";
import CartToast from "../CartToast";
import { getImageUrl } from "../../services/api";
import ModalRequestCustomization from "../modals/ModalRequestCustomization";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";
const formatPrice = (num) => {
  if (num === undefined || num === null) return "0.00";
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ModalGiveawaysStandeenTarpulin = ({ giveaways, onClose }) => {
  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser } = useAuth();
  const { addItem, cartItems } = useCart();

  const cartCount = useMemo(() => {
    const productId = giveaways.id || giveaways.product_id;
    return cartItems.filter((c) => c.productId === productId).reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, giveaways]);

  const isCustomizableProduct = giveaways.is_customizable !== 0 && giveaways.is_customizable !== false && giveaways.is_customizable !== "0" && giveaways.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

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
  const [showCustomizationRequest, setShowCustomizationRequest] = useState(false);
  const [promos, setPromos] = useState([]);
  const rightPanelRef = useRef(null);
  const subtotalRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rightPanelRef.current) { rightPanelRef.current.scrollTop = 0; window.scrollTo(0, 0); }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

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

  const handleGetSubtotal = () => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    const q = parseFloat(quantity);
    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0 && !isNaN(q) && q > 0) {
      setSubtotal((isStandee || isTarpaulin) ? discountedPrice * w * h * q : discountedPrice * q);
    } else { setSubtotal(0); }
  };

  const description = giveaways?.product_description || giveaways?.description;

  const validateOrder = (checkPaymentMethod = true) => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (subtotal <= 0) { setSubmitError("Please enter valid dimensions and quantity."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const sizeLabel = `${width} x ${height} ${isStandee ? "ft" : "inches"}`;
  const productTitle = isStandee ? (giveaways.product_name || giveaways.title || "Standee") : (giveaways.category || "Tarpulin");

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
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : null,
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
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : null,
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
    if (!validateOrder(false)) return;
    addItem(buildCartItem());
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Customizable product layout
  if (isCustomizableProduct) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={onClose}>
          <div className="bg-white sm:rounded-[44px] rounded-t-[36px] shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col" style={{ maxHeight: "93vh" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-5 right-5 z-30 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 text-lg font-bold leading-none transition-all duration-200 hover:bg-gray-900 hover:text-white hover:scale-110 hover:rotate-90 active:scale-95">×</button>
            <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height: "260px" }}>
              <img src={getImageUrl(giveaways.product_image || giveaways.image)} alt={productTitle} className="w-full h-full object-cover" style={{ filter: "saturate(1.05)" }} />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/60 to-transparent" />
              <div className="absolute top-5 left-5 flex items-center gap-1.5 bg-[#FFE100] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-black/30 inline-block" />
                Custom Order
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="px-10 pb-12 space-y-8 mt-1">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-yellow-500">{giveaways.type || "Printing"}</p>
                  <h2 className="text-[34px] font-black text-gray-900 tracking-tight leading-none">{productTitle}</h2>
                  {description && <p className="text-sm text-gray-400 font-medium leading-relaxed pt-1">{description}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: "📏", label: "Custom Size", sub: "Any dimensions" },
                    { icon: "🎨", label: "Your Artwork", sub: "Upload your file" },
                    { icon: "💰", label: "Get Quoted", sub: "Manual pricing" },
                  ].map((item) => (
                    <div key={item.label} className="group rounded-2xl p-5 flex flex-col gap-2 border border-gray-100 cursor-default transition-all duration-200 hover:border-yellow-300 hover:shadow-md hover:shadow-yellow-100 hover:-translate-y-1 hover:bg-[#fffde8]" style={{ background: "#fafafa" }}>
                      <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6 inline-block">{item.icon}</span>
                      <p className="text-[10px] font-black text-gray-800 uppercase tracking-wide leading-tight">{item.label}</p>
                      <p className="text-[9px] text-gray-400 font-medium leading-tight">{item.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 mb-4">How It Works</p>
                  {[
                    { step: "01", title: "Submit Your Request", text: "Specify size, quantity and upload your design." },
                    { step: "02", title: "Receive a Custom Quote", text: "Our team reviews and sends a tailored price." },
                    { step: "03", title: "Approve & We Print", text: "Confirm the quote and we handle production." },
                  ].map((s, i) => (
                    <div key={s.step} className="group flex gap-5 items-start p-3 rounded-2xl cursor-default transition-all duration-200 hover:bg-gray-50 hover:translate-x-1">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[11px] font-black transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-yellow-200" style={{ background: i === 0 ? "#FFE100" : "#f3f3f3", color: i === 0 ? "#000" : "#bbb" }}>
                        <span className="transition-colors duration-200" style={{ color: i === 0 ? "#000" : undefined }}>{s.step}</span>
                      </div>
                      <div className="pt-1.5 space-y-1">
                        <p className="text-[12px] font-black text-gray-800 uppercase tracking-wide transition-colors duration-200 group-hover:text-gray-900">{s.title}</p>
                        <p className="text-[11px] text-gray-400 font-medium leading-snug transition-colors duration-200 group-hover:text-gray-500">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-4 pb-2">
                  <button onClick={() => { if (!currentUser) setShowAuthModal(true); else setShowCustomizationRequest(true); }} className="group/btn w-full py-6 rounded-[22px] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50 active:scale-[0.98] active:translate-y-0" style={{ background: "#FFE100", color: "#000", boxShadow: "0 6px 24px rgba(255,225,0,0.35)" }}>
                    Request Customization
                    <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm transition-transform duration-200 group-hover/btn:translate-x-1.5">→</span>
                  </button>
                  <div className="flex items-center justify-center gap-4">
                    {[
                      { icon: "✓", text: "Free Consult" },
                      { icon: "✓", text: "No Upfront Fee" },
                      { icon: "✓", text: "Artist Support" },
                    ].map((t, i) => (
                      <React.Fragment key={t.text}>
                        {i > 0 && <span className="text-gray-200">|</span>}
                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5 transition-all duration-200 hover:text-gray-600 hover:-translate-y-0.5 cursor-default">
                          <span className="text-yellow-400 font-black transition-transform duration-200 hover:scale-125 inline-block">{t.icon}</span>
                          {t.text}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} />}
        {showCustomizationRequest && (
          <ModalRequestCustomization
            product={{
              id: giveaways.id || giveaways.product_id,
              title: productTitle,
              sizes: giveaways.sizes || [],
              category: "Giveaways",
            }}
            onClose={() => setShowCustomizationRequest(false)}
          />
        )}
      </>
    );
  }

  // Standard product layout
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={onClose}>
        <div className="bg-white sm:rounded-[40px] rounded-t-[32px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative transition-all duration-300" style={{ height: window.innerWidth < 768 ? "95vh" : "90vh", maxHeight: "95vh" }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-5 sm:top-8 sm:right-10 z-30 w-10 h-10 flex items-center justify-center bg-white/80 sm:bg-gray-100 backdrop-blur-sm sm:backdrop-blur-none rounded-full text-2xl font-bold text-gray-400 transition-all duration-200 hover:bg-gray-900 hover:text-white hover:scale-110 hover:rotate-90 active:scale-95 shadow-sm sm:shadow-none">×</button>
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 overflow-hidden">
              <div className={`p-5 sm:p-8 bg-gray-50/30 flex flex-col gap-4 ${isCustomizableProduct ? 'flex-shrink-0' : 'flex-1'} overflow-y-auto custom-scrollbar`}>
                <div><h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{productTitle}</h2><p className="text-xs sm:text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{giveaways.type || "Professional Printing"}</p></div>
                {description && <p className="text-xs sm:text-sm text-gray-500 leading-relaxed italic line-clamp-3 sm:line-clamp-none">{description}</p>}
                <div className="flex items-center gap-3 flex-wrap">{hasDiscount ? (<><span className="text-sm line-through text-gray-400 font-medium">₱ {formatPrice(rawPrice)} / {isStandee ? "sqft" : "unit"}</span><span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(discountedPrice)} / {isStandee ? "sqft" : "unit"}</span></>) : (<span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(rawPrice)} / {isStandee ? "sqft" : "unit"}</span>)}</div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4"><div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{isStandee ? "Width (ft)" : "Width (in)"}</span><input type="number" step="0.1" min="0.1" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full font-black text-lg outline-none" /></div><div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">{isStandee ? "Height (ft)" : "Height (in)"}</span><input type="number" step="0.1" min="0.1" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full font-black text-lg outline-none" /></div></div>
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</span><div className="flex items-center gap-1"><button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold transition-all duration-150 hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110 active:scale-95">−</button><span className="w-8 text-center font-black text-base sm:text-lg">{quantity}</span><button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold transition-all duration-150 hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110 active:scale-95">+</button></div></div>
                  <button onClick={handleGetSubtotal} className="w-full bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-2xl hover:bg-gray-700 transition-colors">Get Subtotal</button>
                </div>
              </div>
              <div className="flex-1 min-h-0 px-5 sm:px-8 pb-8 pt-2 bg-gray-50/30">
                {isCustomMode ? (<DesignChatbox onImageUpload={(img) => { setUploadedImage({ preview: img }); setSubmitError(null); }} productId={giveaways.product_id || giveaways.id} />) : (<div className="h-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center"><span className="text-4xl mb-3">📦</span><h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Standard / Readymade Order</h4><p className="text-xs text-gray-400 mt-2 max-w-[280px]">This product will be printed using the standard/default design shown in the preview. No design files or artist approvals are needed.</p></div>)}
              </div>
            </div>

            <div ref={rightPanelRef} className="w-full md:w-1/2 p-5 sm:p-8 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group flex items-center justify-center" style={{ minHeight: "220px" }}><img src={getImageUrl(giveaways.product_image || giveaways.image)} className="w-full max-h-48 sm:max-h-56 object-contain transition-transform duration-500 group-hover:scale-105" alt={productTitle} /></div>
                <div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Project Summary</h3><div className="space-y-6"><div className="flex justify-between text-xs sm:text-sm pt-2 px-1"><span className="text-gray-500">Unit Price</span>{hasDiscount ? (<div className="flex flex-col items-end"><span className="text-[9px] sm:text-[10px] line-through text-gray-400">₱ {formatPrice(rawPrice)}</span><span className="font-bold text-gray-900">₱ {formatPrice(discountedPrice)}</span></div>) : (<span className="font-bold text-gray-900">₱ {formatPrice(rawPrice)}</span>)}</div><div className="flex justify-between text-xs sm:text-sm px-1"><span className="text-gray-500">Dimensions</span><span className="font-bold text-gray-900">{sizeLabel}</span></div><div className="flex justify-between text-xs sm:text-sm px-1"><span className="text-gray-500">Quantity</span><span className="font-bold text-gray-900">{quantity} Unit(s)</span></div></div></div>
                <div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Payment Method</h3><div className="grid grid-cols-1 gap-2">{["COD", "GCash", "Pickup"].map((id) => (<label key={id} className={`flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${paymentMethod === id ? "border-[#FFE100] bg-yellow-50/40 shadow-sm shadow-yellow-100" : "border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/20"}`}><input type="radio" checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-4 h-4 sm:w-5 sm:h-5 accent-yellow-500" /><span className="text-xs sm:text-sm font-bold text-gray-700">{id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}</span></label>))}</div></div>
                <div ref={subtotalRef} className="bg-gray-900 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group mt-4 transition-all duration-300 hover:shadow-gray-300"><div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 transition-transform duration-300 group-hover:scale-125" /><p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Estimated Total</p><div className="flex items-baseline gap-1"><span className="text-lg sm:text-xl font-bold text-yellow-400">₱</span><span className="text-4xl sm:text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span></div>{promo?.discount_type === "free_shipping" && (<p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-2">✓ Free Installation (Davao City) + Free Shipping</p>)}</div>
              </div>
              <div className="mt-8 space-y-3 sm:space-y-4">
                <button onClick={handleBuyNow} disabled={isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomMode && !uploadedImage?.preview)} className={`group/checkout w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 ${(isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomMode && !uploadedImage?.preview)) ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none" : "bg-[#FFE100] text-black shadow-xl shadow-yellow-200/60 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50"}`}>{ (isCustomMode && !uploadedImage?.preview) ? "Upload Design to Proceed" : (isSubmitting ? "Processing..." : "Proceed to Checkout") }</button>
                <div className="relative"><button onClick={handleAddToCart} disabled={subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)} style={(subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)) ? { border: "1px solid #e5e7eb" } : { border: "1.5px solid #FFE100" }} className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.97] ${(subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)) ? "bg-white text-gray-300 cursor-not-allowed" : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200"}`}>Add to Cart</button>{cartCount > 0 && (<span className="absolute -top-2 -right-2 min-w-[24px] h-[24px] bg-[#FFE100] text-black text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow-md leading-none border-2 border-white z-10 select-none pointer-events-none">{cartCount}</span>)}{showToast && (<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100]"><CartToast onViewCart={() => { setShowToast(false); onClose(); navigate("/cart"); }} onClose={() => setShowToast(false)} /></div>)}</div>
                {submitError && <p className="text-red-500 text-[9px] sm:text-[10px] text-center font-black uppercase tracking-widest mt-4">{submitError}</p>}
              </div>
              <div className="h-10 md:hidden" />
            </div>
          </div>
        </div>
      </div>
      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default ModalGiveawaysStandeenTarpulin;
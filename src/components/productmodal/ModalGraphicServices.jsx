import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/CustomerAuthContext";
import { useCart } from "../../context/CartContext";
import { sendCustomerMessage } from "../../services/MessageAPI";
import { useUI } from "../../context/UIContext";
import { getImageUrl } from "../../services/api";
import LoginRegisterModal from "../LoginRegisterModal";
import CartToast from "../CartToast";
import { getDiscountedPrice } from "../PromoTag";
import check from "../../assets/servicesImgIcon/graphicservices/check.svg";
import ModalRequestCustomization from "../modals/ModalRequestCustomization";

const formatPrice = (price) => {
  if (price === undefined || price === null) return "0.00";
  return parseFloat(price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalGraphicServices = ({ product, onClose }) => {
  const rightPanelRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rightPanelRef.current) { rightPanelRef.current.scrollTop = 0; window.scrollTo(0, 0); }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser, isVerified } = useAuth();
  const { addItem, cartItems } = useCart();

  const cartCount = useMemo(() => {
    const productId = product.id || product.product_id;
    return cartItems.filter((c) => c.productId === productId).reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, product]);

  const isCustomizableProduct = product.is_customizable !== 0 && product.is_customizable !== false && product.is_customizable !== "0" && product.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

  const title = product.type || "Graphic Services";
  const tier = product.name || product.product_name || "Service";
  const category = product.product_category || product.category || "Graphic Services";
  const rawPrice = useMemo(() => {
    const raw = product.product_price ?? product.price ?? 0;
    return typeof raw === "string" ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0) : (parseFloat(raw) || 0);
  }, [product]);
  const promo = product.applied_promo;
  const hasDiscount = !!promo;
  const description = product.product_description || product.description;

  const packageDetails = useMemo(() => {
    if (product.package_details) return { inclusions: product.package_details.inclusions || [], timeline: product.package_details.timeline || [], payment: product.package_details.payment || [] };
    if (product.packageInclusions || product.timeline || product.payment) return { inclusions: product.packageInclusions || [], timeline: product.timeline || [], payment: product.payment || [] };
    const desc = description || "";
    const tierName = product.name || "";
    const subType = product.type || "";
    const getFallback = (tName, sType) => {
      const name = (tName || "").toLowerCase();
      const type = (sType || "").toLowerCase();
      let inclusions = ["35pcs 2x2 Stickers", "FB & Youtube Cover Design", "Profile Design", ".JPG & .PNG"];
      let timeline = ["7-10 Days Process"];
      let payment = ["50% Down payment before we proceed for editing", "50% Full payment upon approval and before we send the design"];
      if (name.includes("basic")) { const stickerCount = type.includes("moto") || type.includes("vlog") ? "45pcs" : "35pcs"; inclusions = [`${stickerCount} 2x2 Stickers`, "FB & Youtube Cover Design", "Profile Design", ".JPG & .PNG"]; timeline = ["7-10 Days Process"]; }
      else if (name.includes("standard")) { inclusions = ["60pcs 2x2 Stickers", "FB & Youtube Cover Design", "Profile Design", ".JPG & .PNG"]; timeline = ["7-10 Days Process"]; }
      else if (name.includes("premium")) { inclusions = ["70pcs 2x2 Stickers", "FB & Youtube Cover Design", "Profile Design", ".JPG & .PNG"]; timeline = ["7-10 Days Process"]; }
      return { inclusions, timeline, payment };
    };
    const fallback = getFallback(tierName, subType);
    if (!desc || desc.trim() === "" || !desc.includes('|')) return fallback;
    const sections = desc.split('|').map(s => s.trim());
    const details = {};
    sections.forEach(section => {
      if (section.toLowerCase().includes('inclusion')) { const items = section.split(':')[1]?.split(',').map(i => i.trim()) || []; details.inclusions = items; }
      else if (section.toLowerCase().includes('timeline')) { const timelineStr = section.split(':')[1]?.trim() || ''; details.timeline = [timelineStr]; }
      else if (section.toLowerCase().includes('payment')) { const payments = section.split(':')[1]?.split(',').map(p => p.trim()) || []; details.payment = payments; }
    });
    return { inclusions: details.inclusions || fallback.inclusions, timeline: details.timeline || fallback.timeline, payment: details.payment || fallback.payment };
  }, [product, description]);

  let discountedPrice = getDiscountedPrice(rawPrice, promo);
  if (isNaN(discountedPrice)) discountedPrice = rawPrice;

  const [quantity, setQuantity] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [showCustomizationRequest, setShowCustomizationRequest] = useState(false);
  const subtotalRef = useRef(null);

  useEffect(() => {
    setIsCalculating(true);
    const total = discountedPrice * quantity;
    setSubtotal(total);
    setTimeout(() => setIsCalculating(false), 500);
  }, [quantity, discountedPrice]);

  const buildPayload = () => ({
    product: { id: product.id || product.product_id, title, price: discountedPrice, image: product.image || product.product_image, originalPrice: hasDiscount ? rawPrice : null, promotion_id: promo?.promotion_id || null, promoApplied: promo?.name || null },
    quantity, category, type: product.type || "Graphic Service", subtotal, initialPaymentMethod: paymentMethod, customMode: isCustomMode ? "custom" : "standard", designImage: isCustomMode ? (uploadedImage?.preview || null) : null, timestamp: Date.now()
  });

  const handleBuyNow = async () => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return; }
    if (!paymentMethod) { setSubmitError("Please select a payment method."); return; }
    if (!currentUser) { sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(buildPayload())); setShowAuthModal(true); return; }
    if (!isVerified) { setSubmitError("Please verify your email address to proceed with checkout."); return; }
    setIsSubmitting(true); setSubmitError(null);
    try {
      if (isCustomMode && uploadedImage?.preview) { await sendCustomerMessage(`[DESIGN] Interested in graphic service: ${title}. Qty: ${quantity}. Subtotal: ₱${formatPrice(subtotal)}.`, null, product.id || product.product_id); }
      setCheckoutData(buildPayload()); onClose(); navigate("/customer-checkout");
    } catch (err) { console.error(err); setSubmitError("Failed to process request. Please try again."); } finally { setIsSubmitting(false); }
  };

  const handleAddToCart = () => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return; }
    const p = buildPayload();
    addItem({ productId: p.product.id, title: p.product.title, price: p.product.price, image: p.product.image, quantity: p.quantity, category: p.category, type: p.type, customMode: isCustomMode ? "custom" : "standard", designImage: p.designImage, originalPrice: p.product.originalPrice, promoApplied: p.product.promoApplied, discountType: promo?.discount_type || null });
    setShowToast(true);
  };

  // Customizable product layout
  if (isCustomizableProduct) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={onClose}>
          <div className="bg-white sm:rounded-[44px] rounded-t-[36px] shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col" style={{ maxHeight: "93vh" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-5 right-5 z-30 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 text-lg font-bold leading-none transition-all duration-200 hover:bg-gray-900 hover:text-white hover:scale-110 hover:rotate-90 active:scale-95">×</button>
            <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height: "260px" }}>
              <img src={getImageUrl(product.image || product.product_image)} alt={title} className="w-full h-full object-cover" style={{ filter: "saturate(1.05)" }} />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/60 to-transparent" />
              <div className="absolute top-5 left-5 flex items-center gap-1.5 bg-[#FFE100] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-default"><span className="w-1.5 h-1.5 rounded-full bg-black/30 inline-block" />Custom Order</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="px-10 pb-12 space-y-8 mt-1">
                <div className="space-y-2"><p className="text-[9px] font-black uppercase tracking-[0.3em] text-yellow-500">{tier}</p><h2 className="text-[34px] font-black text-gray-900 tracking-tight leading-none">{title}</h2>{description && <p className="text-sm text-gray-400 font-medium leading-relaxed pt-1">{description}</p>}</div>
                <div className="grid grid-cols-3 gap-4">{[
                  { icon: "🎨", label: "Custom Design", sub: "Unique artwork" },
                  { icon: "🖌️", label: "Revisions", sub: "Unlimited changes" },
                  { icon: "💰", label: "Get Quoted", sub: "Manual pricing" },
                ].map((item) => (<div key={item.label} className="group rounded-2xl p-5 flex flex-col gap-2 border border-gray-100 cursor-default transition-all duration-200 hover:border-yellow-300 hover:shadow-md hover:shadow-yellow-100 hover:-translate-y-1 hover:bg-[#fffde8]" style={{ background: "#fafafa" }}><span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6 inline-block">{item.icon}</span><p className="text-[10px] font-black text-gray-800 uppercase tracking-wide leading-tight">{item.label}</p><p className="text-[9px] text-gray-400 font-medium leading-tight">{item.sub}</p></div>))}</div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-1"><p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 mb-4">How It Works</p>{[
                  { step: "01", title: "Submit Your Request", text: "Describe your project and upload references." },
                  { step: "02", title: "Receive a Custom Quote", text: "Our designer reviews and sends a tailored price." },
                  { step: "03", title: "Approve & We Design", text: "Confirm the quote and we start creating." },
                ].map((s, i) => (<div key={s.step} className="group flex gap-5 items-start p-3 rounded-2xl cursor-default transition-all duration-200 hover:bg-gray-50 hover:translate-x-1"><div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[11px] font-black transition-all duration-200 group-hover:scale-110 group-hover:shadow-md group-hover:shadow-yellow-200" style={{ background: i === 0 ? "#FFE100" : "#f3f3f3", color: i === 0 ? "#000" : "#bbb" }}><span className="transition-colors duration-200" style={{ color: i === 0 ? "#000" : undefined }}>{s.step}</span></div><div className="pt-1.5 space-y-1"><p className="text-[12px] font-black text-gray-800 uppercase tracking-wide transition-colors duration-200 group-hover:text-gray-900">{s.title}</p><p className="text-[11px] text-gray-400 font-medium leading-snug transition-colors duration-200 group-hover:text-gray-500">{s.text}</p></div></div>))}</div>
                <div className="h-px bg-gray-100" />
                <div className="space-y-4 pb-2"><button onClick={() => { if (!currentUser) setShowAuthModal(true); else setShowCustomizationRequest(true); }} className="group/btn w-full py-6 rounded-[22px] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50 active:scale-[0.98] active:translate-y-0" style={{ background: "#FFE100", color: "#000", boxShadow: "0 6px 24px rgba(255,225,0,0.35)" }}>Request Customization<span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm transition-transform duration-200 group-hover/btn:translate-x-1.5">→</span></button><div className="flex items-center justify-center gap-4">{[
                  { icon: "✓", text: "Free Consult" }, { icon: "✓", text: "No Upfront Fee" }, { icon: "✓", text: "Artist Support" },
                ].map((t, i) => (<React.Fragment key={t.text}>{i > 0 && <span className="text-gray-200">|</span>}<span className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5 transition-all duration-200 hover:text-gray-600 hover:-translate-y-0.5 cursor-default"><span className="text-yellow-400 font-black transition-transform duration-200 hover:scale-125 inline-block">{t.icon}</span>{t.text}</span></React.Fragment>))}</div></div>
              </div>
            </div>
          </div>
        </div>
        {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} fromCheckout={true} />}
        {showCustomizationRequest && (<ModalRequestCustomization product={{ id: product.id || product.product_id, title: title, sizes: [], category: category }} onClose={() => setShowCustomizationRequest(false)} />)}
      </>
    );
  }

  // Standard product layout
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={onClose}>
        <div className="bg-white sm:rounded-[40px] rounded-t-[32px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative transition-all duration-300" style={{ height: window.innerWidth < 768 ? "95vh" : "90vh", maxHeight: "95vh" }} onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-5 sm:top-8 sm:right-10 z-30 w-10 h-10 flex items-center justify-center bg-white/80 sm:bg-gray-100 backdrop-blur-sm sm:backdrop-blur-none rounded-full text-2xl font-bold text-gray-400 transition-all duration-200 hover:bg-gray-900 hover:text-white hover:scale-110 hover:rotate-90 active:scale-95 shadow-sm sm:shadow-none">×</button>
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 md:overflow-y-auto custom-scrollbar bg-gray-50/30">
              <div className="p-5 sm:p-8 flex flex-col gap-4">
                <div><h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{title}</h2><p className="text-xs sm:text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{tier}</p></div>
                <div className="flex items-center gap-3 flex-wrap">{hasDiscount ? (<><span className="text-sm line-through text-gray-400 font-medium">₱ {formatPrice(rawPrice)}</span><span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(discountedPrice)}</span></>) : (<span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(rawPrice)}</span>)}{promo && (<span className="text-[10px] bg-[#FFE100] text-black font-black px-3 py-1 rounded-full uppercase tracking-tighter">{promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : promo.discount_type === "fixed" ? `₱${promo.discount_value} OFF` : "PROMO"}</span>)}</div>
                {description && <p className="text-xs sm:text-sm text-gray-500 leading-relaxed italic line-clamp-3 sm:line-clamp-none">{description}</p>}
                {packageDetails.inclusions?.length > 0 && (<div><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Package Inclusions</h4><div className="grid grid-cols-1 gap-2">{packageDetails.inclusions.map((item, idx) => (<div key={idx} className="flex items-start gap-2 text-sm text-gray-600"><img src={check} className="w-4 h-4 mt-0.5" alt="" /><span>{item}</span></div>))}</div></div>)}
                {packageDetails.timeline?.length > 0 && (<div><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Timeline</h4><div className="grid grid-cols-1 gap-2">{packageDetails.timeline.map((item, idx) => (<div key={idx} className="flex items-start gap-2 text-sm text-gray-600"><img src={check} className="w-4 h-4 mt-0.5" alt="" /><span>{item}</span></div>))}</div></div>)}
                {packageDetails.payment?.length > 0 && (<div><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Payment Term</h4><div className="grid grid-cols-1 gap-2">{packageDetails.payment.map((item, idx) => (<div key={idx} className="flex items-start gap-2 text-sm font-semibold text-yellow-600"><img src={check} className="w-4 h-4 mt-0.5" alt="" /><span>{item}</span></div>))}</div></div>)}
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity</span><div className="flex items-center gap-1"><button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold transition-all duration-150 hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110 active:scale-95">−</button><span className="w-8 text-center font-black text-base sm:text-lg">{quantity}</span><button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold transition-all duration-150 hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110 active:scale-95">+</button></div></div>
              </div>
            </div>
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-5 sm:p-8 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group flex items-center justify-center"><img src={getImageUrl(product.image || product.product_image)} className="w-full max-h-48 sm:max-h-56 object-contain transition-transform duration-500 group-hover:scale-105" alt={title} /></div>
                <div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Service Summary</h3><div className="space-y-6"><div className="flex justify-between text-xs sm:text-sm pt-2 px-1"><span className="text-gray-500">Service Fee</span><span className="font-bold text-gray-900">₱ {formatPrice(discountedPrice)}</span></div><div className="flex justify-between text-xs sm:text-sm px-1"><span className="text-gray-500">Quantity</span><span className="font-bold text-gray-900">{quantity} Project(s)</span></div></div></div>
                <div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Payment Method</h3><div className="grid grid-cols-1 gap-2">{["COD", "GCash", "Pickup"].map((id) => (<label key={id} className={`flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${paymentMethod === id ? "border-[#FFE100] bg-yellow-50/40 shadow-sm shadow-yellow-100" : "border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/20"}`}><input type="radio" checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-4 h-4 sm:w-5 sm:h-5 accent-yellow-500" /><span className="text-xs sm:text-sm font-bold text-gray-700">{id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}</span></label>))}</div></div>
                <div ref={subtotalRef} className="bg-gray-900 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group mt-4 transition-all duration-300 hover:shadow-gray-300"><div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 transition-transform duration-300 group-hover:scale-125" /><p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Estimated Total</p><div className={`flex items-baseline gap-1 transition-all duration-300 ${isCalculating ? "scale-105 blur-[1px] opacity-70" : "scale-100 blur-0 opacity-100"}`}><span className="text-lg sm:text-xl font-bold text-yellow-400">₱</span><span className="text-4xl sm:text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span></div></div>
              </div>
              <div className="mt-8 space-y-3 sm:space-y-4">
                <button onClick={handleBuyNow} disabled={isSubmitting || subtotal <= 0 || !paymentMethod || (currentUser && !isVerified) || (isCustomMode && !uploadedImage?.preview)} className={`group/checkout w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 ${(isSubmitting || subtotal <= 0 || !paymentMethod || (currentUser && !isVerified) || (isCustomMode && !uploadedImage?.preview)) ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none" : "bg-[#FFE100] text-black shadow-xl shadow-yellow-200/60 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50"}`}>{ (isCustomMode && !uploadedImage?.preview) ? "Upload Design to Proceed" : (currentUser && !isVerified ? "Verification Required" : isSubmitting ? "Processing..." : "Proceed to Checkout") }</button>
                <div className="relative"><button onClick={handleAddToCart} disabled={subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)} style={(subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)) ? { border: "1px solid #e5e7eb" } : { border: "1.5px solid #FFE100" }} className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.97] ${(subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)) ? "bg-white text-gray-300 cursor-not-allowed" : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200"}`}>Add to Cart</button>{cartCount > 0 && (<span className="absolute -top-2 -right-2 min-w-[24px] h-[24px] bg-[#FFE100] text-black text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow-md leading-none border-2 border-white z-10 select-none pointer-events-none">{cartCount}</span>)}{showToast && (<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100]"><CartToast onViewCart={() => { setShowToast(false); onClose(); navigate("/cart"); }} onClose={() => setShowToast(false)} /></div>)}</div>
                {submitError && <p className="text-red-500 text-[9px] sm:text-[10px] text-center font-black uppercase tracking-widest mt-4">{submitError}</p>}
              </div>
              <div className="h-10 md:hidden" />
            </div>
          </div>
        </div>
      </div>
      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} fromCheckout={true} />}
    </>
  );
};

export default ModalGraphicServices;  
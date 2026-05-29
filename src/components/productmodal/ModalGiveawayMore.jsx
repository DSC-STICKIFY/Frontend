import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useAuth } from '../../context/CustomerAuthContext';
import { useCart } from "../../context/CartContext";
import LoginRegisterModal from "../LoginRegisterModal";
import { getBestPromo, getDiscountedPrice } from "../PromoTag";
import PromoApi from "../../services/PromoApi";
import CartToast from "../CartToast";
import { getImageUrl } from "../../services/api";
import ModalRequestCustomization from "../modals/ModalRequestCustomization";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const DEFAULT_GIVEAWAY_OPTIONS = {
  "Keychain": [{ pcs: 10, price: 60 }, { pcs: 25, price: 50 }, { pcs: 50, price: 45 }, { pcs: 100, price: 40 }, { pcs: 200, price: 35 }, { pcs: 500, price: 25 }],
  "ID Lace": [{ pcs: 10, price: 100 }, { pcs: 25, price: 90 }, { pcs: 50, price: 80 }, { pcs: 100, price: 70 }, { pcs: 200, price: 60 }, { pcs: 500, price: 45 }, { pcs: 1000, price: 40 }],
  "Caps": [{ pcs: 1, price: 450 }, { pcs: 10, price: 250 }, { pcs: 25, price: 220 }, { pcs: 50, price: 210 }, { pcs: 100, price: 200 }, { pcs: 500, price: 120 }],
};

const formatPrice = (num) => {
  if (num === undefined || num === null) return "0.00";
  return num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ModalGiveawayMore = ({ giveaways, onClose }) => {
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
  const { currentUser } = useAuth();
  const { addItem, cartItems } = useCart();

  const cartCount = useMemo(() => {
    const productId = giveaways.id || giveaways.product_id;
    return cartItems
      .filter((c) => c.productId === productId)
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, giveaways]);

  const isCustomizableProduct = giveaways.is_customizable !== 0 && giveaways.is_customizable !== false && giveaways.is_customizable !== "0" && giveaways.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

  const hasDbSizes = giveaways.sizes && giveaways.sizes.length > 0;
  const hasDbDesigns = giveaways.designs && giveaways.designs.length > 0;

  const [selectedDesign, setSelectedDesign] = useState(null);
  const [selectedSizeObj, setSelectedSizeObj] = useState(hasDbSizes ? giveaways.sizes[0] : null);

  const stockCount = giveaways.product_quantity !== undefined ? parseInt(giveaways.product_quantity) : 0;
  const isOutOfStock = !isCustomizableProduct && stockCount <= 0;

  const options = useMemo(() => {
    const rawTitle = (giveaways?.title || giveaways?.product_name || giveaways?.name || "").toLowerCase();
    const rawType = (giveaways?.type || giveaways?.product_type || "").toLowerCase();
    const identifier = `${rawTitle} ${rawType}`;

    if (identifier.includes("keychain")) return DEFAULT_GIVEAWAY_OPTIONS["Keychain"];
    if (identifier.includes("lace") || identifier.includes("id") || identifier.includes("lanyard")) return DEFAULT_GIVEAWAY_OPTIONS["ID Lace"];
    if (identifier.includes("cap")) return DEFAULT_GIVEAWAY_OPTIONS["Caps"];
    return DEFAULT_GIVEAWAY_OPTIONS["Keychain"];
  }, [giveaways]);

  const [selectedPcs, setSelectedPcs] = useState(10);
  const [numSets, setNumSets] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCustomizationRequest, setShowCustomizationRequest] = useState(false);
  const [promos, setPromos] = useState([]);
  const subtotalRef = useRef(null);

  useEffect(() => {
    PromoApi.getActive().then((data) => setPromos(Array.isArray(data) ? data : [])).catch(() => setPromos([]));
  }, []);

  useEffect(() => {
    setSelectedDesign(null);
    setSelectedSizeObj(giveaways?.sizes && giveaways.sizes.length > 0 ? giveaways.sizes[0] : null);
    setSelectedPcs(options && options.length > 0 ? options[0].pcs : 10);
    setNumSets(1);
    setPaymentMethod(null);
    setUploadedImage(null);
    setSubmitError(null);
  }, [giveaways]);

  useEffect(() => {
    if (!isCustomizableProduct && selectedPcs * numSets > stockCount) {
      const maxSets = Math.max(1, Math.floor(stockCount / selectedPcs));
      setNumSets(maxSets);
    }
  }, [selectedPcs, stockCount, isCustomizableProduct]);

  const dbPrice = useMemo(() => {
    const raw = giveaways.product_price ?? giveaways.price ?? 0;
    return typeof raw === "string" ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0) : (parseFloat(raw) || 0);
  }, [giveaways]);

  const getTierRawPrice = useCallback((pcs) => {
    if (!options || options.length === 0) return dbPrice;
    const sorted = [...options].sort((a, b) => b.pcs - a.pcs);
    const tier = sorted.find(opt => pcs >= opt.pcs) || sorted[sorted.length - 1];
    return tier?.price || dbPrice;
  }, [options, dbPrice]);

  const promo = getBestPromo(giveaways, promos);
  const designAddon = selectedDesign ? parseFloat(selectedDesign.additional_price || 0) : 0;
  const sizeAddon = (!isCustomMode && selectedSizeObj) ? parseFloat(selectedSizeObj.additional_price || 0) : 0;

  const getDiscountedTierPrice = useCallback((pcs) => {
    const raw = getTierRawPrice(pcs) + designAddon + sizeAddon;
    const discounted = getDiscountedPrice(raw, promo);
    return isNaN(discounted) ? raw : discounted;
  }, [getTierRawPrice, promo, designAddon, sizeAddon]);

  const totalQuantity = useMemo(() => selectedPcs * numSets, [selectedPcs, numSets]);
  const tierRawPrice = getTierRawPrice(totalQuantity) + designAddon + sizeAddon;
  const tierDiscountedPrice = getDiscountedTierPrice(totalQuantity);
  const hasDiscount = tierDiscountedPrice !== tierRawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");

  const description = giveaways?.product_description || giveaways?.description;
  useEffect(() => {
    setSubtotal(tierDiscountedPrice * numSets);
  }, [tierDiscountedPrice, numSets]);

  const validateOrder = (checkPaymentMethod = true) => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (subtotal <= 0) { setSubmitError("Please select valid pieces and quantity."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const getPreviewImage = () => {
    if (isCustomMode && uploadedImage?.preview) return uploadedImage.preview;
    if (!isCustomMode && selectedDesign && selectedDesign.design_image) return getImageUrl(selectedDesign.design_image);
    return getImageUrl(giveaways.product_image || giveaways.image);
  };

  const buildCartItem = () => ({
    productId: giveaways.id || giveaways.product_id || "unknown",
    title: giveaways.title || giveaways.product_name || giveaways.category || "Giveaway",
    price: tierDiscountedPrice,
    image: getPreviewImage(),
    quantity: numSets,
    pieces: selectedPcs * numSets,
    category: "Giveaways",
    type: giveaways.type,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : (selectedDesign ? getImageUrl(selectedDesign.design_image) : null),
    designId: (!isCustomMode && selectedDesign) ? selectedDesign.id : null,
    designName: (!isCustomMode && selectedDesign) ? selectedDesign.design_name : (isCustomMode ? "Custom Design" : "Standard Design"),
    sizeId: (!isCustomMode && selectedSizeObj) ? selectedSizeObj.id : null,
    originalPrice: hasDiscount ? tierRawPrice : null,
    promotion_id: promo?.promotion_id || null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
  });

  const buildCheckoutPayload = () => ({
    product: {
      id: giveaways.id || giveaways.product_id || "unknown",
      title: giveaways.title || giveaways.product_name || giveaways.category || "Giveaway",
      price: tierDiscountedPrice,
      image: getPreviewImage(),
      originalPrice: hasDiscount ? tierRawPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
    },
    quantity: numSets,
    pieces: selectedPcs * numSets,
    category: "Giveaways",
    type: giveaways.type,
    subtotal,
    initialPaymentMethod: paymentMethod,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : (selectedDesign ? getImageUrl(selectedDesign.design_image) : null),
    designId: (!isCustomMode && selectedDesign) ? selectedDesign.id : null,
    designName: (!isCustomMode && selectedDesign) ? selectedDesign.design_name : (isCustomMode ? "Custom Design" : "Standard Design"),
    sizeId: (!isCustomMode && selectedSizeObj) ? selectedSizeObj.id : null,
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
              <img src={getPreviewImage()} alt={giveaways?.title} className="w-full h-full object-cover" style={{ filter: "saturate(1.05)" }} />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/60 to-transparent" />
              <div className="absolute top-5 left-5 flex items-center gap-1.5 bg-[#FFE100] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-black/30 inline-block" />
                Custom Order
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="px-10 pb-12 space-y-8 mt-1">
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-yellow-500">{giveaways.type || "Giveaway"}</p>
                  <h2 className="text-[34px] font-black text-gray-900 tracking-tight leading-none">{giveaways.title || giveaways.product_name || "Giveaway"}</h2>
                  {description && <p className="text-sm text-gray-400 font-medium leading-relaxed pt-1">{description}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: "🎁", label: "Any Quantity", sub: "Bulk ordering" },
                    { icon: "🎨", label: "Your Artwork", sub: "Upload your design" },
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
                    { step: "01", title: "Submit Your Request", text: "Choose quantity and upload your design reference." },
                    { step: "02", title: "Receive a Custom Quote", text: "Our artist reviews your specs and sends a tailored price." },
                    { step: "03", title: "Approve & We Produce", text: "Confirm the quote and we handle production." },
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
              title: giveaways.title || giveaways.product_name,
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
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {/* LEFT Panel */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 md:overflow-y-auto custom-scrollbar bg-gray-50/30">
              <div className="p-5 sm:p-8 flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{giveaways.title || giveaways.product_name || "Giveaway"}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs sm:text-sm font-bold text-yellow-600 uppercase tracking-widest italic">{giveaways.type}</p>
                    {isOutOfStock ? (
                      <span className="text-[10px] font-black uppercase bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">Sold Out</span>
                    ) : stockCount <= 5 ? (
                      <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">Only {stockCount} Left!</span>
                    ) : (
                      <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">{stockCount} In Stock</span>
                    )}
                  </div>
                </div>
                {description && <p className="text-xs sm:text-sm text-gray-500 leading-relaxed italic line-clamp-3 sm:line-clamp-none">{description}</p>}
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-x-auto">
                  <h4 className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Bulk Pricing Table</h4>
                  <table className="w-full text-xs min-w-[300px]">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="py-2 text-left font-black text-gray-400 uppercase tracking-tighter text-[9px]">Quantity Per Set</th>
                        <th className="py-2 text-right font-black text-gray-400 uppercase tracking-tighter text-[9px]">Price Per Set</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {options.sort((a, b) => a.pcs - b.pcs).map((item) => {
                        const raw = item.price;
                        const disc = getDiscountedPrice(raw, promo);
                        const itemHasDiscount = disc !== raw && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");
                        const sorted = [...options].sort((a, b) => a.pcs - b.pcs);
                        const nextTier = sorted.find(o => o.pcs > item.pcs);
                        const isActiveTier = totalQuantity >= item.pcs && (!nextTier || totalQuantity < nextTier.pcs);
                        const isOutOfStockForTier = !isCustomizableProduct && item.pcs > stockCount;
                        return (
                          <tr key={item.pcs} onClick={() => { if (!isOutOfStockForTier) setSelectedPcs(item.pcs); }} className={`group transition-all duration-150 ${isOutOfStockForTier ? 'opacity-50 cursor-not-allowed pointer-events-none bg-gray-50/10' : isActiveTier ? 'bg-yellow-50/60 cursor-pointer' : 'hover:bg-gray-50 hover:translate-x-0.5 cursor-pointer'}`}>
                            <td className="py-2.5 sm:py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${isActiveTier ? "border-[#FFE100]" : "border-gray-200"}`}>
                                  {isActiveTier && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFE100] animate-[scale-in_0.15s_ease-out]" />}
                                </div>
                                <span className={`font-bold text-[11px] sm:text-xs ${isActiveTier ? 'text-gray-900' : 'text-gray-500'}`}>{item.pcs} {item.pcs === 1 ? "piece" : "pieces"}</span>
                              </div>
                            </td>
                            <td className="py-2.5 sm:py-3 text-right pr-2">
                              {itemHasDiscount ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[8px] sm:text-[9px] line-through text-gray-400">₱{formatPrice(raw)}</span>
                                  <span className={`font-black italic text-[11px] sm:text-xs ${isActiveTier ? 'text-gray-900' : 'text-gray-500'}`}>₱{formatPrice(disc)}</span>
                                </div>
                              ) : (
                                <span className={`font-black italic text-[11px] sm:text-xs ${isActiveTier ? 'text-gray-900' : 'text-gray-500'}`}>₱{formatPrice(raw)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pieces per set</span>
                    <select className="border-none bg-transparent font-black text-sm outline-none cursor-pointer" value={selectedPcs} onChange={(e) => setSelectedPcs(Number(e.target.value))}>
                      {options.map((opt) => (<option key={opt.pcs} value={opt.pcs} disabled={!isCustomizableProduct && opt.pcs > stockCount}>{opt.pcs} pieces</option>))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Number of sets</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setNumSets(s => Math.max(1, s - 1))} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold transition-all duration-150 hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                      <span className="w-8 text-center font-black text-base sm:text-lg">{numSets}</span>
                      <button onClick={() => setNumSets(s => !isCustomizableProduct ? Math.min(Math.floor(stockCount / selectedPcs), s + 1) : s + 1)} disabled={!isCustomizableProduct && selectedPcs * (numSets + 1) > stockCount} className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold transition-all duration-150 hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT Panel */}
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-5 sm:p-8 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group flex items-center justify-center" style={{ minHeight: "220px" }}>
                    <img src={getPreviewImage()} className="w-full max-h-48 sm:max-h-56 object-contain transition-transform duration-500 group-hover:scale-105" alt={giveaways.type} />
                  </div>
                  {hasDbDesigns && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider italic">Available Designs Gallery</span>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
                        <button onClick={() => setSelectedDesign(null)} className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 ${selectedDesign === null ? 'border-yellow-400 ring-2 ring-yellow-400/30 scale-105' : 'border-gray-200 hover:border-yellow-300'}`}>
                          <img src={getImageUrl(giveaways.product_image || giveaways.image)} className="w-full h-full object-cover" alt="Default Design" />
                        </button>
                        {giveaways.designs.map((design) => (
                          <button key={design.id} onClick={() => setSelectedDesign(design)} className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 ${selectedDesign?.id === design.id ? 'border-yellow-400 ring-2 ring-yellow-400/30 scale-105' : 'border-gray-200 hover:border-yellow-300'}`}>
                            <img src={getImageUrl(design.design_image || giveaways.product_image || giveaways.image)} className="w-full h-full object-cover" alt={design.design_name} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {((!isCustomMode && hasDbSizes) || hasDbDesigns) && (
                  <div className="bg-gray-50/50 p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Configurations</h3>
                    {hasDbDesigns && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Choose Design</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => setSelectedDesign(null)} className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${selectedDesign === null ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-100 bg-white hover:border-yellow-200'}`}>
                            <img src={getImageUrl(giveaways.product_image || giveaways.image)} className="w-12 h-12 object-cover rounded-lg bg-gray-50 flex-shrink-0" alt="Standard Design" />
                            <div className="text-left min-w-0">
                              <span className="text-[10px] font-bold text-gray-800 block truncate leading-tight">Standard Design</span>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Default</span>
                            </div>
                          </button>
                          {giveaways.designs.map((design) => {
                            const isSelected = selectedDesign?.id === design.id;
                            return (
                              <button key={design.id} onClick={() => setSelectedDesign(design)} className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${isSelected ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-100 bg-white hover:border-yellow-200'}`}>
                                <img src={getImageUrl(design.design_image || giveaways.product_image || giveaways.image)} className="w-12 h-12 object-cover rounded-lg bg-gray-50 flex-shrink-0" alt={design.design_name} />
                                <div className="text-left min-w-0">
                                  <span className="text-[10px] font-bold text-gray-800 block truncate leading-tight">{design.design_name}</span>
                                  {parseFloat(design.additional_price) > 0 ? (
                                    <span className="text-[8px] font-black text-yellow-600">+ ₱{parseFloat(design.additional_price).toFixed(2)}</span>
                                  ) : (
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Free</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!isCustomMode && hasDbSizes && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{hasDbDesigns ? "2." : "1."} Size Option</h3>
                        <div className="flex flex-wrap gap-2">
                          {giveaways.sizes.map((size) => {
                            const isSelected = selectedSizeObj?.id === size.id;
                            return (
                              <button key={size.id} onClick={() => setSelectedSizeObj(size)} className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm flex flex-col items-center justify-center gap-0.5 ${isSelected ? 'border-yellow-400 bg-yellow-50 text-gray-900' : 'border-gray-100 bg-white text-gray-600 hover:border-yellow-200'}`}>
                                <span>{size.size_name}</span>
                                {parseFloat(size.additional_price) > 0 && <span className="text-[9px] font-black text-yellow-600">+₱{parseFloat(size.additional_price)}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Order Summary</h3>
                  <div className="space-y-6">
                    <div className="flex justify-between text-xs sm:text-sm pt-2 px-1">
                      <span className="text-gray-500">Tier Unit Price</span>
                      {hasDiscount ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] sm:text-[10px] line-through text-gray-400">₱ {formatPrice(tierRawPrice)}</span>
                          <span className="font-bold text-gray-900">₱ {formatPrice(tierDiscountedPrice)}</span>
                        </div>
                      ) : (
                        <span className="font-bold text-gray-900">₱ {formatPrice(tierRawPrice)}</span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm px-1">
                      <span className="text-gray-500">Total Pieces</span>
                      <span className="font-bold text-gray-900">{selectedPcs * numSets} Piece(s)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {["COD", "GCash", "Pickup"].map((id) => (
                      <label key={id} className={`flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${paymentMethod === id ? "border-[#FFE100] bg-yellow-50/40 shadow-sm shadow-yellow-100" : "border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/20"}`}>
                        <input type="radio" checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-4 h-4 sm:w-5 sm:h-5 accent-yellow-500" />
                        <span className="text-xs sm:text-sm font-bold text-gray-700">{id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div ref={subtotalRef} className="bg-gray-900 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group mt-4 transition-all duration-300 hover:shadow-gray-300">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 transition-transform duration-300 group-hover:scale-125" />
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Estimated Total</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-bold text-yellow-400">₱</span>
                    <span className="text-4xl sm:text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span>
                  </div>
                  {promo?.discount_type === "free_shipping" && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Free Shipping Active</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-3 sm:space-y-4">
                <button onClick={handleBuyNow} disabled={isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod} className={`group/checkout w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 ${(isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod) ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none" : "bg-[#FFE100] text-black shadow-xl shadow-yellow-200/60 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50"}`}>
                  {isOutOfStock ? "Out of Stock" : (isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <div className="relative">
                  <button onClick={handleAddToCart} disabled={isOutOfStock} style={isOutOfStock ? { border: "1px solid #e5e7eb" } : { border: "1.5px solid #FFE100" }} className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.97] ${isOutOfStock ? "bg-white text-gray-300 cursor-not-allowed" : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200"}`}>
                    Add to Cart
                  </button>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[24px] h-[24px] bg-[#FFE100] text-black text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow-md leading-none border-2 border-white z-10 select-none pointer-events-none">
                      {cartCount}
                    </span>
                  )}
                  {showToast && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100]">
                      <CartToast onViewCart={() => { setShowToast(false); onClose(); navigate("/cart"); }} onClose={() => setShowToast(false)} />
                    </div>
                  )}
                </div>
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

export default ModalGiveawayMore;
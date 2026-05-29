import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/CustomerAuthContext";
import { useCart } from "../../context/CartContext";
import LoginRegisterModal from "../LoginRegisterModal";
import { getBestPromo, getDiscountedPrice } from "../PromoTag";
import PromoApi from "../../services/PromoApi";
import { getImageUrl } from "../../services/api";
import CartToast from "../CartToast";
import ModalRequestCustomization from "../modals/ModalRequestCustomization";

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalMoreStickers = ({ sticker, onClose }) => {
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
    const productId = sticker.id || sticker.product_id;
    return cartItems
      .filter((c) => c.productId === productId)
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, sticker]);

  const hasDbSizes = sticker.sizes && sticker.sizes.length > 0;
  const hasDbDesigns = sticker.designs && sticker.designs.length > 0;
  const hasDbQualities = false;

  const [selectedDesign, setSelectedDesign] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState(null);

  const defaultLegacySize = "1.5 × 1.5";
  const [selectedSizeObj, setSelectedSizeObj] = useState(hasDbSizes ? sticker.sizes[0] : null);
  const [selectedLegacySize, setSelectedLegacySize] = useState(hasDbSizes ? null : defaultLegacySize);

  const isCustomizableProduct = sticker.is_customizable !== 0 && sticker.is_customizable !== false && sticker.is_customizable !== "0" && sticker.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

  const stockCount = sticker.product_quantity !== undefined ? parseInt(sticker.product_quantity) : 0;
  const isOutOfStock = !isCustomizableProduct && stockCount <= 0;

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCustomizationRequest, setShowCustomizationRequest] = useState(false);
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

  useEffect(() => {
    if (!isCustomizableProduct && quantity > stockCount) {
      setQuantity(Math.max(1, stockCount));
    } else if (quantity === 0) {
      setQuantity(1);
    }
  }, [isOutOfStock, stockCount, isCustomizableProduct, quantity]);

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
    const raw = sticker.product_price ?? sticker.price ?? 0;
    return typeof raw === "string" ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0) : (parseFloat(raw) || 0);
  }, [sticker]);

  const activeBasePrice = (!isCustomMode && selectedDesign) ? parseFloat(selectedDesign.additional_price || 0) : dbPrice;
  const qualityAddon = 0;

  let sizeSheetPrice = dbPrice;
  let currentSizeName = "";
  let currentPieces = 0;

  if (hasDbSizes) {
    if (selectedSizeObj) {
      const sizeAddon = parseFloat(selectedSizeObj.additional_price || 0);
      sizeSheetPrice = activeBasePrice + sizeAddon;
      currentSizeName = selectedSizeObj.size_name;
      const matched = sizes.find(s => s.size.toLowerCase() === currentSizeName.toLowerCase());
      currentPieces = matched ? matched.pieces : 0;
    }
  } else {
    currentSizeName = selectedLegacySize || defaultLegacySize;
    const matched = sizes.find(s => s.size === currentSizeName);
    currentPieces = matched ? matched.pieces : 0;
    const perPiecePrice = sizePricing[currentSizeName] || dbPrice;
    sizeSheetPrice = perPiecePrice * currentPieces;
  }

  const rawPrice = sizeSheetPrice + qualityAddon;
  const promo = getBestPromo(sticker, promos);
  let discountedPrice = getDiscountedPrice(rawPrice, promo);
  if (isNaN(discountedPrice)) discountedPrice = rawPrice;
  const hasDiscount = discountedPrice !== rawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");
  const description = sticker?.product_description || sticker?.description;

  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    setSubtotal(discountedPrice * quantity);
  }, [discountedPrice, quantity]);

  const getPreviewImage = useCallback(() => {
    if (isCustomMode && uploadedImage?.preview) return uploadedImage.preview;
    if (!isCustomMode && selectedDesign && selectedDesign.design_image) return selectedDesign.design_image;
    return getImageUrl(sticker?.image || sticker?.product_image);
  }, [isCustomMode, uploadedImage, selectedDesign, sticker]);

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
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (hasDbSizes && !selectedSizeObj) { setSubmitError("Please select a size first."); return false; }
    if (!hasDbSizes && !selectedLegacySize) { setSubmitError("Please select a size first."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const buildPayload = () => ({
    product: {
      id: sticker.id || sticker._id || sticker.product_id || "unknown",
      title: sticker.title || sticker.name || "More Stickers",
      price: discountedPrice,
      image: getPreviewImage(),
      originalPrice: hasDiscount ? rawPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
      discountType: promo?.discount_type || null,
    },
    quantity,
    size: currentSizeName,
    pieces: currentPieces,
    category: "Stickers",
    type: "more",
    subtotal,
    initialPaymentMethod: paymentMethod,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : (selectedDesign?.design_image || null),
    designId: (!isCustomMode && selectedDesign) ? selectedDesign.id : null,
    designName: (!isCustomMode && selectedDesign) ? selectedDesign.design_name : (isCustomMode ? "Custom Design" : "Standard Design"),
    qualityId: selectedQuality ? selectedQuality.id : null,
    qualityName: selectedQuality ? selectedQuality.quality_name : null,
    timestamp: Date.now()
  });

  const buildCartItem = () => ({
    productId: sticker.id || sticker._id || sticker.product_id || "unknown",
    title: sticker.title || sticker.name || "More Stickers",
    price: discountedPrice,
    image: getPreviewImage(),
    size: currentSizeName,
    pieces: currentPieces,
    quantity,
    paymentMethod,
    category: "Stickers",
    type: "more",
    subtotal,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : (selectedDesign?.design_image || null),
    designId: (!isCustomMode && selectedDesign) ? selectedDesign.id : null,
    designName: (!isCustomMode && selectedDesign) ? selectedDesign.design_name : (isCustomMode ? "Custom Design" : "Standard Design"),
    qualityId: selectedQuality ? selectedQuality.id : null,
    qualityName: selectedQuality ? selectedQuality.quality_name : null,
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
    if ((selectedSizeObj || selectedLegacySize) && subtotalRef.current) {
      subtotalRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSizeObj, selectedLegacySize]);

  // ─── CUSTOMIZABLE PRODUCT LAYOUT ──────────────────────────────────────────
  if (isCustomizableProduct) {
    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
          onClick={onClose}
        >
          <div
            className="bg-white sm:rounded-[44px] rounded-t-[36px] shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col"
            style={{ maxHeight: "93vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close — spins 90deg + turns dark on hover */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-30 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 text-lg font-bold leading-none
                transition-all duration-200
                hover:bg-gray-900 hover:text-white hover:scale-110 hover:rotate-90
                active:scale-95"
            >
              ×
            </button>

            {/* Hero */}
            <div className="relative w-full overflow-hidden flex-shrink-0" style={{ height: "260px" }}>
              <img
                src={getPreviewImage()}
                alt={sticker?.title}
                className="w-full h-full object-cover"
                style={{ filter: "saturate(1.05)" }}
              />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/60 to-transparent" />

              {/* Badge — subtle spring lift on hover */}
              <div className="absolute top-5 left-5 flex items-center gap-1.5 bg-[#FFE100] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md
                transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-black/30 inline-block" />
                Custom Order
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="px-10 pb-12 space-y-8 mt-1">

                {/* Title */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-yellow-500">
                    Premium Sticker Sheets
                  </p>
                  <h2 className="text-[34px] font-black text-gray-900 tracking-tight leading-none">
                    {sticker?.title || "Custom Stickers"}
                  </h2>
                  {description && (
                    <p className="text-sm text-gray-400 font-medium leading-relaxed pt-1">
                      {description}
                    </p>
                  )}
                </div>

                {/* Feature cards — icon bounces, card lifts */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: "", label: "Any Size", sub: "Custom dimensions" },
                    { icon: "", label: "Your Artwork", sub: "Upload your file" },
                    { icon: "", label: "Get Quoted", sub: "Manual pricing" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="group rounded-2xl p-5 flex flex-col gap-2 border border-gray-100 cursor-default
                        transition-all duration-200
                        hover:border-yellow-300 hover:shadow-md hover:shadow-yellow-100 hover:-translate-y-1 hover:bg-[#fffde8]"
                      style={{ background: "#fafafa" }}
                    >
                      <span className="text-2xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6 inline-block">{item.icon}</span>
                      <p className="text-[10px] font-black text-gray-800 uppercase tracking-wide leading-tight">{item.label}</p>
                      <p className="text-[9px] text-gray-400 font-medium leading-tight">{item.sub}</p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-gray-100" />

                {/* How it works — row slides right, badge flips yellow */}
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 mb-4">
                    How It Works
                  </p>
                  {[
                    { step: "01", title: "Submit Your Request", text: "Choose size, quantity and upload your design reference." },
                    { step: "02", title: "Receive a Custom Quote", text: "Our artist reviews your specs and sends a tailored price." },
                    { step: "03", title: "Approve & We Print", text: "Confirm the quote and we handle production end-to-end." },
                  ].map((s, i) => (
                    <div
                      key={s.step}
                      className="group flex gap-5 items-start p-3 rounded-2xl cursor-default
                        transition-all duration-200
                        hover:bg-gray-50 hover:translate-x-1"
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-[11px] font-black
                          transition-all duration-200
                          group-hover:scale-110 group-hover:shadow-md group-hover:shadow-yellow-200"
                        style={{
                          background: i === 0 ? "#FFE100" : "#f3f3f3",
                          color: i === 0 ? "#000" : "#bbb",
                        }}
                        // non-active badges flip to yellow on hover via inline style trick using group
                      >
                        <span
                          className="transition-colors duration-200"
                          style={{ color: i === 0 ? "#000" : undefined }}
                        >
                          {s.step}
                        </span>
                      </div>
                      <div className="pt-1.5 space-y-1">
                        <p className="text-[12px] font-black text-gray-800 uppercase tracking-wide transition-colors duration-200 group-hover:text-gray-900">{s.title}</p>
                        <p className="text-[11px] text-gray-400 font-medium leading-snug transition-colors duration-200 group-hover:text-gray-500">{s.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-gray-100" />

                {/* CTA block */}
                <div className="space-y-4 pb-2">
                  {/* Main CTA — lifts, arrow slides right */}
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setShowAuthModal(true);
                      } else {
                        setShowCustomizationRequest(true);
                      }
                    }}
                    className="group/btn w-full py-6 rounded-[22px] font-black uppercase tracking-widest text-sm
                      flex items-center justify-center gap-3
                      transition-all duration-200
                      hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50 active:scale-[0.98] active:translate-y-0"
                    style={{ background: "#FFE100", color: "#000", boxShadow: "0 6px 24px rgba(255,225,0,0.35)" }}
                  >
                    Request Customization
                    <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm
                      transition-transform duration-200 group-hover/btn:translate-x-1.5">
                      →
                    </span>
                  </button>

                  {/* Trust row — items lift individually */}
                  <div className="flex items-center justify-center gap-4">
                    {[
                      { icon: "✓", text: "Free Consult" },
                      { icon: "✓", text: "No Upfront Fee" },
                      { icon: "✓", text: "Artist Support" },
                    ].map((t, i) => (
                      <React.Fragment key={t.text}>
                        {i > 0 && <span className="text-gray-200">|</span>}
                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1.5
                          transition-all duration-200 hover:text-gray-600 hover:-translate-y-0.5 cursor-default">
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
              id: sticker.id || sticker.product_id,
              title: sticker.title || sticker.product_name,
              sizes: sticker.sizes || [],
              category: "Stickers",
            }}
            onClose={() => setShowCustomizationRequest(false)}
          />
        )}
      </>
    );
  }

  // ─── STANDARD PRODUCT LAYOUT ──────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4" onClick={onClose}>
        <div
          className="bg-white sm:rounded-[40px] rounded-t-[32px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative transition-all duration-300"
          style={{ height: window.innerWidth < 768 ? "95vh" : "90vh", maxHeight: "95vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close — spins + darkens */}
          <button
            onClick={onClose}
            className="absolute top-4 right-5 sm:top-8 sm:right-10 z-30 w-10 h-10 flex items-center justify-center bg-white/80 sm:bg-gray-100 backdrop-blur-sm sm:backdrop-blur-none rounded-full text-2xl font-bold text-gray-400
              transition-all duration-200
              hover:bg-gray-900 hover:text-white hover:scale-110 hover:rotate-90
              active:scale-95
              shadow-sm sm:shadow-none"
          >
            ×
          </button>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
            {/* LEFT Panel */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 md:overflow-y-auto custom-scrollbar bg-gray-50/30">
              <div className="p-5 sm:p-8 flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{sticker?.title || "More Stickers"}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-xs sm:text-sm font-bold text-yellow-600 uppercase tracking-widest italic">Premium Sticker Sheets</p>
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

                {!hasDbSizes && (
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
                          const isSelected = selectedLegacySize === size;
                          const isOutOfStockForSize = pieces > stockCount;
                          const sizeRawPrice = sizePricing[size] || dbPrice;
                          const sizeDiscounted = getDiscountedPrice(sizeRawPrice, promo);
                          const sizeHasDiscount = sizeDiscounted !== sizeRawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");
                          return (
                            <tr
                              key={size}
                              onClick={() => { if (!isOutOfStockForSize) setSelectedLegacySize(size); }}
                              className={`
                                cursor-pointer
                                transition-all duration-150
                                ${isSelected
                                  ? "bg-yellow-50/60"
                                  : "hover:bg-gray-50 hover:translate-x-0.5"
                                }
                                ${isOutOfStockForSize ? "opacity-50 cursor-not-allowed" : ""}
                              `}
                            >
                              <td className="py-2.5 sm:py-3 font-bold">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${isSelected ? "border-[#FFE100]" : "border-gray-200"}`}>
                                    {isSelected && (
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFE100] animate-[scale-in_0.15s_ease-out]" />
                                    )}
                                  </div>
                                  <span className="text-gray-700 text-[11px] sm:text-xs">{size}</span>
                                </div>
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
                )}
              </div>
            </div>

            {/* RIGHT Panel */}
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-5 sm:p-8 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  {/* Preview image — zooms on hover */}
                  <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group flex items-center justify-center">
                    <img
                      src={getPreviewImage()}
                      className="w-full max-h-48 sm:max-h-56 object-contain transition-transform duration-500 group-hover:scale-105"
                      alt={selectedDesign?.design_name || sticker?.title}
                    />
                  </div>

                  {hasDbDesigns && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider italic">Available Designs Gallery</span>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
                        {/* Design thumbnails — spring scale + yellow ring */}
                        <button
                          onClick={() => setSelectedDesign(null)}
                          className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0
                            transition-all duration-200
                            hover:scale-110 hover:shadow-md active:scale-95
                            ${selectedDesign === null
                              ? "border-yellow-400 ring-2 ring-yellow-400/30 scale-105"
                              : "border-gray-200 hover:border-yellow-300"
                            }`}
                        >
                          <img src={getImageUrl(sticker?.image || sticker?.product_image)} className="w-full h-full object-cover" alt="Default Design" />
                        </button>
                        {sticker.designs.map((design) => (
                          <button
                            key={design.id}
                            onClick={() => setSelectedDesign(design)}
                            className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0
                              transition-all duration-200
                              hover:scale-110 hover:shadow-md active:scale-95
                              ${selectedDesign?.id === design.id
                                ? "border-yellow-400 ring-2 ring-yellow-400/30 scale-105"
                                : "border-gray-200 hover:border-yellow-300"
                              }`}
                          >
                            <img src={getImageUrl(design.design_image || sticker?.image || sticker?.product_image)} className="w-full h-full object-cover" alt={design.design_name} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Configuration</h3>
                  <div className="space-y-6">
                    {(!isCustomizableProduct || hasDbDesigns) && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Choose Design</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {/* Design card — lifts + yellow ring on selected */}
                          <button
                            onClick={() => setSelectedDesign(null)}
                            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2
                              transition-all duration-200
                              hover:-translate-y-0.5 hover:shadow-sm active:scale-95
                              ${selectedDesign === null
                                ? "border-yellow-400 bg-yellow-50 shadow-md shadow-yellow-100"
                                : "border-gray-100 bg-white hover:border-yellow-200"
                              }`}
                          >
                            <img src={getImageUrl(sticker?.image || sticker?.product_image)} className="w-full aspect-square object-cover rounded-lg bg-gray-50" alt="Standard Design" />
                            <span className="text-[9px] font-bold text-gray-800 text-center leading-tight mt-1 truncate w-full">Standard Design</span>
                            <span className="text-[8px] font-black text-gray-400">Default</span>
                          </button>
                          {sticker.designs.map((design) => (
                            <button
                              key={design.id}
                              onClick={() => setSelectedDesign(design)}
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2
                                transition-all duration-200
                                hover:-translate-y-0.5 hover:shadow-sm active:scale-95
                                ${selectedDesign?.id === design.id
                                  ? "border-yellow-400 bg-yellow-50 shadow-md shadow-yellow-100"
                                  : "border-gray-100 bg-white hover:border-yellow-200"
                                }`}
                            >
                              <img src={getImageUrl(design.design_image || sticker?.image || sticker?.product_image)} className="w-full aspect-square object-cover rounded-lg bg-gray-50" alt={design.design_name} />
                              <span className="text-[9px] font-bold text-gray-800 text-center leading-tight mt-1 truncate w-full">{design.design_name}</span>
                              {parseFloat(design.additional_price) > 0 && <span className="text-[8px] font-black text-yellow-600">₱{parseFloat(design.additional_price).toFixed(2)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasDbSizes && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          {(!hasDbDesigns && !isCustomizableProduct) ? "1." : "2."} Size Option
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {sticker.sizes.map((size) => (
                            <button
                              key={size.id}
                              onClick={() => setSelectedSizeObj(size)}
                              className={`px-4 py-2 rounded-xl border-2 text-xs font-bold
                                transition-all duration-200
                                hover:-translate-y-0.5 hover:shadow-sm active:scale-95
                                flex flex-col items-center justify-center gap-0.5
                                ${selectedSizeObj?.id === size.id
                                  ? "border-yellow-400 bg-yellow-50 text-gray-900 shadow-md shadow-yellow-100"
                                  : "border-gray-100 bg-white text-gray-600 hover:border-yellow-200"
                                }`}
                            >
                              <span>{size.size_name}</span>
                              {parseFloat(size.additional_price) > 0 && <span className="text-[9px] font-black text-yellow-600">+₱{parseFloat(size.additional_price)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity — buttons scale + get white card shadow */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Quantity</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={isOutOfStock || quantity <= 1}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold
                            transition-all duration-150
                            hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110
                            active:scale-95
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:scale-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-black text-base sm:text-lg">{quantity}</span>
                        <button
                          onClick={() => setQuantity(q => { if (!isCustomizableProduct) { return Math.min(stockCount, q + 1); } return q + 1; })}
                          disabled={isOutOfStock || (!isCustomizableProduct && quantity >= stockCount)}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 rounded-xl text-xl font-bold
                            transition-all duration-150
                            hover:bg-white hover:shadow-sm hover:text-gray-800 hover:scale-110
                            active:scale-95
                            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:scale-100"
                        >
                          +
                        </button>
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

                {/* Payment method — border + bg animate on hover/selected */}
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Payment Method</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {["COD", "GCash", "Pickup"].map((id) => (
                      <label
                        key={id}
                        className={`flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer
                          transition-all duration-200
                          hover:-translate-y-0.5 hover:shadow-sm
                          ${paymentMethod === id
                            ? "border-[#FFE100] bg-yellow-50/40 shadow-sm shadow-yellow-100"
                            : "border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/20"
                          }`}
                      >
                        <input type="radio" checked={paymentMethod === id} onChange={() => setPaymentMethod(id)} className="w-4 h-4 sm:w-5 sm:h-5 accent-yellow-500" />
                        <span className="text-xs sm:text-sm font-bold text-gray-700">{id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subtotal card */}
                <div ref={subtotalRef} className="bg-gray-900 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-gray-200 relative overflow-hidden group mt-4
                  transition-all duration-300 hover:shadow-gray-300">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 transition-transform duration-300 group-hover:scale-125" />
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
                {/* Checkout CTA — lifts + shadow blooms, arrow slides */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod}
                  className={`group/checkout w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm
                    transition-all duration-200 active:scale-[0.97]
                    flex items-center justify-center gap-3
                    ${(isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod)
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                      : "bg-[#FFE100] text-black shadow-xl shadow-yellow-200/60 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-yellow-300/50"
                    }`}
                >
                  {isOutOfStock ? "SOLD OUT / OUT OF STOCK" : (isSubmitting ? "Processing..." : (
                    <>
                      Proceed to Checkout
                      <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-sm
                        transition-transform duration-200 group-hover/checkout:translate-x-1">
                        →
                      </span>
                    </>
                  ))}
                </button>

                {/* Add to Cart — inverts to dark on hover */}
                <div className="relative">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    style={isOutOfStock ? { border: "1px solid #e5e7eb" } : { border: "1.5px solid #FFE100" }}
                    className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm
                      transition-all duration-200 active:scale-[0.97]
                      ${isOutOfStock
                        ? "bg-white text-gray-300 cursor-not-allowed"
                        : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200"
                      }`}
                  >
                    Add to Cart
                  </button>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[24px] h-[24px] bg-[#FFE100] text-black text-xs font-black rounded-full flex items-center justify-center px-1.5 shadow-md leading-none border-2 border-white z-10 select-none pointer-events-none">
                      {cartCount}
                    </span>
                  )}
                  {showToast && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100]">
                      <CartToast
                        onViewCart={() => { setShowToast(false); onClose(); navigate("/cart"); }}
                        onClose={() => setShowToast(false)}
                      />
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

      {showCustomizationRequest && (
        <ModalRequestCustomization
          product={{
            id: sticker.id || sticker.product_id,
            title: sticker.title || sticker.product_name,
            sizes: sticker.sizes || [],
            category: "Stickers",
          }}
          onClose={() => setShowCustomizationRequest(false)}
        />
      )}
    </>
  );
};

export default ModalMoreStickers;
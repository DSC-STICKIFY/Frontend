import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../../context/UIContext";
import { useAuth } from "../../context/CustomerAuthContext";
import { useCart } from "../../context/CartContext";
import LoginRegisterModal from "../LoginRegisterModal";
import DesignChatbox from "../DesignChatbox";
import { getBestPromo, getDiscountedPrice } from "../PromoTag";
import PromoApi from "../../services/PromoApi";
import { getImageUrl } from "../../services/api";

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
  const rightPanelRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (rightPanelRef.current) {
        rightPanelRef.current.scrollTop = 0;
        // Also scroll the window/body just in case
        window.scrollTo(0, 0);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser } = useAuth();
  const { addItem } = useCart();

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

  const [quantity, setQuantity] = useState(1);
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
    const raw = sticker.product_price ?? sticker.price ?? 0;
    return typeof raw === "string" ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0) : (parseFloat(raw) || 0);
  }, [sticker]);

  const activeBasePrice = (!isCustomMode && selectedDesign) ? parseFloat(selectedDesign.additional_price || 0) : dbPrice;
  const qualityAddon = 0;

  let sizeAddon = 0;
  let currentSizeName = "";
  let currentPieces = 0;

  if (hasDbSizes) {
    if (selectedSizeObj) {
      sizeAddon = parseFloat(selectedSizeObj.additional_price || 0);
      currentSizeName = selectedSizeObj.size_name;
      const matched = sizes.find(s => s.size.toLowerCase() === currentSizeName.toLowerCase());
      currentPieces = matched ? matched.pieces : 0;
    }
  } else {
    currentSizeName = selectedLegacySize || defaultLegacySize;
    const matched = sizes.find(s => s.size === currentSizeName);
    currentPieces = matched ? matched.pieces : 0;
    const legacySizePrice = sizePricing[currentSizeName] || dbPrice;
    sizeAddon = Math.max(0, legacySizePrice - dbPrice);
  }

  const rawPrice = activeBasePrice + qualityAddon + sizeAddon;
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
            {/* LEFT Panel (Info & Pricing/Chat) */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 md:overflow-hidden bg-gray-50/30">

              <div className="flex-shrink-0 p-5 sm:p-8 pb-4 flex flex-col gap-4 md:overflow-y-auto custom-scrollbar" style={{ maxHeight: window.innerWidth >= 768 ? "55%" : "none" }}>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">{sticker?.title || "More Stickers"}</h2>
                  <p className="text-xs sm:text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">Premium Sticker Sheets</p>
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
                          const sizeRawPrice = sizePricing[size] || dbPrice;
                          const sizeDiscounted = getDiscountedPrice(sizeRawPrice, promo);
                          const sizeHasDiscount = sizeDiscounted !== sizeRawPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");
                          return (
                            <tr key={size} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-yellow-50/30' : 'hover:bg-gray-50/50'}`} onClick={() => setSelectedLegacySize(size)}>
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
                )}
              </div>

              {/* Chatbox Panel */}
              <div className="flex-1 min-h-[300px] md:min-h-0 px-5 sm:px-8 pb-8 pt-2">
                {isCustomMode ? (
                  <DesignChatbox
                    onImageUpload={(img) => {
                      setUploadedImage({ preview: img });
                      setSubmitError(null);
                    }}
                    productId={sticker.product_id || sticker.id}
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

            {/* RIGHT Panel (Configuration & Checkout) */}
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-5 sm:p-8 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group flex items-center justify-center">
                    <img
                      src={getPreviewImage()}
                      className="w-full max-h-48 sm:max-h-56 object-contain transition-transform duration-700 group-hover:scale-105"
                      alt={selectedDesign?.design_name || sticker?.title}
                    />
                  </div>

                  {hasDbDesigns && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider italic">Available Designs Gallery</span>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
                        <button
                          onClick={() => setSelectedDesign(null)}
                          className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${selectedDesign === null ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200 hover:border-gray-300'}`}
                          title="Default Design"
                        >
                          <img src={getImageUrl(sticker?.image || sticker?.product_image)} className="w-full h-full object-cover" alt="Default Design" />
                        </button>
                        {sticker.designs.map((design) => {
                          const isActive = selectedDesign?.id === design.id;
                          return (
                            <button
                              key={design.id}
                              onClick={() => setSelectedDesign(design)}
                              className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${isActive ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200 hover:border-gray-300'}`}
                              title={design.design_name}
                            >
                              <img src={getImageUrl(design.design_image || sticker?.image || sticker?.product_image)} className="w-full h-full object-cover" alt={design.design_name} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">Configuration</h3>

                  <div className="space-y-6">
                    {/* DESIGN SELECTOR */}
                    {(!isCustomizableProduct || hasDbDesigns) && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Choose Design</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          <button
                            onClick={() => setSelectedDesign(null)}
                            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all overflow-hidden ${selectedDesign === null ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                          >
                            <img src={getImageUrl(sticker?.image || sticker?.product_image)} className="w-full aspect-square object-cover rounded-lg bg-gray-50" alt="Standard Design" />
                            <span className="text-[9px] font-bold text-gray-800 text-center leading-tight mt-1 truncate w-full">Standard Design</span>
                            <span className="text-[8px] font-black text-gray-400">Default</span>
                          </button>
                          {sticker.designs.map((design) => (
                            <button
                              key={design.id}
                              onClick={() => setSelectedDesign(design)}
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all overflow-hidden ${selectedDesign?.id === design.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                            >
                              <img src={getImageUrl(design.design_image || sticker?.image || sticker?.product_image)} className="w-full aspect-square object-cover rounded-lg bg-gray-50" alt={design.design_name} />
                              <span className="text-[9px] font-bold text-gray-800 text-center leading-tight mt-1 truncate w-full">{design.design_name}</span>
                              {parseFloat(design.additional_price) > 0 && <span className="text-[8px] font-black text-yellow-600">₱{parseFloat(design.additional_price).toFixed(2)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* QUALITY SELECTOR REMOVED */}

                    {/* SIZE SELECTOR */}
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
                              className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${selectedSizeObj?.id === size.id ? 'border-yellow-400 bg-yellow-50 text-gray-900' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'}`}
                            >
                              <span>{size.size_name}</span>
                              {parseFloat(size.additional_price) > 0 && <span className="text-[9px] font-black text-yellow-600">+₱{parseFloat(size.additional_price)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

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
                  disabled={isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomMode && !uploadedImage?.preview)}
                  className={`w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm transition-all active:scale-[0.98] shadow-xl
                    ${(isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomMode && !uploadedImage?.preview))
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400"
                    }`}
                >
                  {(isCustomMode && !uploadedImage?.preview) ? "Upload Design to Proceed" : (isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)}
                  className={`w-full py-5 sm:py-6 rounded-[20px] sm:rounded-[24px] font-black uppercase tracking-widest text-xs sm:text-sm border-2 transition-all
                    ${(isCustomMode && !uploadedImage?.preview) ? "border-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-100 text-gray-900 hover:bg-gray-50"}`}
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
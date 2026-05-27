import React, { useState, useEffect, useMemo, useRef } from "react";
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

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalGiveawaysMugnShirt = ({ giveaways, onClose }) => {
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

  const { isShirt, isMug } = useMemo(() => {
    const cat = (giveaways.category || "").toLowerCase();
    const tit = (giveaways.title || "").toLowerCase();
    const pnm = (giveaways.product_name || "").toLowerCase();
    const typ = (giveaways.type || giveaways.product_type || "").toLowerCase();
    const combined = `${cat} ${tit} ${pnm} ${typ}`;

    return {
      isShirt: combined.includes("shirt"),
      isMug: combined.includes("mug")
    };
  }, [giveaways]);

  const [quantity, setQuantity] = useState(1);
  const [numSets, setNumSets] = useState(1);
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    PromoApi.getActive().then((data) => setPromos(Array.isArray(data) ? data : [])).catch(() => setPromos([]));
  }, []);

  // Reset all user selections when active product changes
  useEffect(() => {
    setSelectedDesign(null);
    setSelectedSizeObj(giveaways?.sizes && giveaways.sizes.length > 0 ? giveaways.sizes[0] : null);
    setQuantity(1);
    setPaymentMethod(null);
    setUploadedImage(null);
    setSubmitError(null);
    setSubtotal(0);
    setSelectedSubtype(null);
  }, [giveaways]);

  // Clamp quantity to stockCount if ready-made
  useEffect(() => {
    if (!isCustomizableProduct && quantity > stockCount) {
      setQuantity(Math.max(1, stockCount));
    }
  }, [isOutOfStock, stockCount, isCustomizableProduct, quantity]);

  const dbPrice = useMemo(() => {
    const raw = giveaways.product_price || giveaways.price || 0;
    return typeof raw === "string"
      ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0)
      : (parseFloat(raw) || 0);
  }, [giveaways]);

  useEffect(() => {
    const tit = (giveaways.title || "").toLowerCase();
    const pnm = (giveaways.product_name || "").toLowerCase();
    const typ = (giveaways.type || giveaways.product_type || "").toLowerCase();
    const dsc = (giveaways.description || giveaways.product_description || "").toLowerCase();
    const combined = `${tit} ${pnm} ${typ} ${dsc}`;

    console.log("🔍 MugnShirt Modal - Detection for ID:", giveaways.id || giveaways.product_id, { combined });

    if (isShirt) {
      if (combined.includes("dtf")) setSelectedSubtype("DTF");
      else setSelectedSubtype("Sublimation");
    } else if (isMug) {
      if (combined.includes("magic")) setSelectedSubtype("Magic");
      else setSelectedSubtype("White");
    }
  }, [giveaways.id, giveaways.product_id, isShirt, isMug]);

  const getRawPricePerPiece = (qty) => {
    if (isShirt) {
      if (selectedSubtype === "DTF") {
        if (qty >= 500) return 250;
        if (qty >= 100) return 300;
        if (qty >= 50) return 350;
        if (qty >= 10) return 400;
        return 700;
      } else { // Sublimation
        if (qty >= 500) return 150;
        if (qty >= 100) return 200;
        if (qty >= 50) return 250;
        if (qty >= 10) return 300;
        return 500;
      }
    } else if (isMug) {
      if (selectedSubtype === "Magic") {
        if (qty >= 500) return 150;
        if (qty >= 100) return 200;
        if (qty >= 50) return 250;
        if (qty >= 10) return 300;
        return 550;
      } else { // White
        if (qty >= 500) return 100;
        if (qty >= 100) return 150;
        if (qty >= 50) return 200;
        if (qty >= 10) return 250;
        return 500;
      }
    }
    return dbPrice || 500;
  };

  const promo = getBestPromo(giveaways, promos);
  const designAddon = selectedDesign ? parseFloat(selectedDesign.additional_price || 0) : 0;
  const sizeAddon = (!isCustomMode && selectedSizeObj) ? parseFloat(selectedSizeObj.additional_price || 0) : 0;

  const totalQuantity = quantity;
  const rawUnitPrice = getRawPricePerPiece(totalQuantity);
  const adjustedUnitPrice = rawUnitPrice + designAddon + sizeAddon;
  let discountedUnitPrice = getDiscountedPrice(adjustedUnitPrice, promo);
  if (isNaN(discountedUnitPrice)) discountedUnitPrice = adjustedUnitPrice;
  const hasDiscount = discountedUnitPrice !== adjustedUnitPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");

  // Auto-calculate subtotal whenever pricing inputs change
  useEffect(() => {
    setIsCalculating(true);
    setUnitPrice(discountedUnitPrice);
    setSubtotal(discountedUnitPrice * totalQuantity);
    setSubmitError(null);
    setTimeout(() => setIsCalculating(false), 300);
  }, [discountedUnitPrice, quantity, designAddon, sizeAddon]);

  const description = giveaways?.product_description || giveaways?.description;

  const formatPrice = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  };

  const getDiscountedForTier = (tierQty) => {
    const raw = getRawPricePerPiece(tierQty);
    return getDiscountedPrice(raw, promo);
  };

  const validateOrder = (checkPaymentMethod = true) => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (subtotal <= 0) { setSubmitError("Please select a valid quantity."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const getPreviewImage = () => {
    if (isCustomMode && uploadedImage?.preview) return uploadedImage.preview;
    if (!isCustomMode && selectedDesign && selectedDesign.design_image) return getImageUrl(selectedDesign.design_image);
    return getImageUrl(giveaways.product_image || giveaways.image);
  };

  const buildCartItem = () => ({
    productId: giveaways.product_id || giveaways.id || "unknown",
    title: `${selectedSubtype} ${isShirt ? "Shirt" : "Mug"}`,
    price: unitPrice,
    image: getPreviewImage(),
    quantity: totalQuantity,
    pieces: totalQuantity,
    category: "Giveaways",
    type: giveaways.type,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : (selectedDesign ? getImageUrl(selectedDesign.design_image) : null),
    designId: (!isCustomMode && selectedDesign) ? selectedDesign.id : null,
    designName: (!isCustomMode && selectedDesign) ? selectedDesign.design_name : (isCustomMode ? "Custom Design" : "Standard Design"),
    sizeId: (!isCustomMode && selectedSizeObj) ? selectedSizeObj.id : null,
    originalPrice: hasDiscount ? adjustedUnitPrice : null,
    promotion_id: promo?.promotion_id || null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
  });

  const buildCheckoutPayload = () => ({
    product: {
      id: giveaways.product_id || giveaways.id || "unknown",
      title: `${selectedSubtype} ${isShirt ? "Shirt" : "Mug"}`,
      price: unitPrice,
      image: getPreviewImage(),
      originalPrice: hasDiscount ? adjustedUnitPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
    },
    quantity: totalQuantity,
    pieces: totalQuantity,
    category: "Giveaways",
    type: giveaways.type,
    spec: giveaways.spec,
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

  const options = [1, 10, 50, 100, 500];

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
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 overflow-hidden">
              <div className={`p-8 pb-4 bg-gray-50/30 flex flex-col gap-4 overflow-y-auto custom-scrollbar ${isCustomizableProduct ? 'flex-shrink-0' : 'flex-1'}`} style={isCustomizableProduct ? { maxHeight: "55%" } : {}}>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{giveaways.category || giveaways.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest italic">{giveaways.type}</p>
                    {!isCustomizableProduct && (
                      isOutOfStock ? (
                        <span className="text-[10px] font-black uppercase bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                          Sold Out
                        </span>
                      ) : stockCount <= 5 ? (
                        <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 animate-pulse">
                          Only {stockCount} Left!
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {stockCount} In Stock
                        </span>
                      )
                    )}
                  </div>
                </div>

                {description && <p className="text-sm text-gray-500 leading-relaxed italic">{description}</p>}

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Bulk Pricing Table</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="py-2 text-left font-black text-gray-400 uppercase tracking-tighter text-[9px]">Quantity Range</th>
                        <th className="py-2 text-right font-black text-gray-400 uppercase tracking-tighter text-[9px]">Price Per Piece</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {options.map(tier => {
                        const rawTierPrice = getRawPricePerPiece(tier);
                        const discTierPrice = getDiscountedPrice(rawTierPrice, promo);
                        const tierHasDiscount = discTierPrice !== rawTierPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");

                        const sorted = [...options].sort((a, b) => a - b);
                        const nextTierIdx = sorted.indexOf(tier) + 1;
                        const nextTier = nextTierIdx < sorted.length ? sorted[nextTierIdx] : null;
                        const isActiveTier = totalQuantity >= tier && (!nextTier || totalQuantity < nextTier);

                        const isOutOfStockForTier = !isCustomizableProduct && tier > stockCount;

                        return (
                          <tr
                            key={`${selectedSubtype}-${tier}`}
                            onClick={() => {
                              if (!isOutOfStockForTier) setQuantity(tier);
                            }}
                            className={`group transition-all duration-200 ${
                              isOutOfStockForTier
                                ? 'opacity-50 cursor-not-allowed pointer-events-none bg-gray-50/10'
                                : isActiveTier
                                  ? 'bg-yellow-50/50 cursor-pointer'
                                  : 'hover:bg-gray-50/30 cursor-pointer'
                            }`}
                          >
                            <td className="py-3 px-2 flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${isActiveTier ? 'border-[#FFE100]' : 'border-gray-200 group-hover:border-gray-300'
                                }`}>
                                {isActiveTier && <div className="w-1.5 h-1.5 rounded-full bg-[#FFE100]" />}
                              </div>
                              <span className={`font-bold transition-colors ${isActiveTier ? 'text-gray-900' : 'text-gray-500'}`}>
                                {tier} {tier === 1 ? "piece" : "pieces"}
                              </span>
                            </td>
                            <td className="py-3 text-right pr-2">
                              {tierHasDiscount ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] line-through text-gray-400">₱{formatPrice(rawTierPrice)}</span>
                                  <span className={`font-black italic transition-colors ${isActiveTier ? 'text-gray-900' : 'text-gray-500'}`}>₱{formatPrice(discTierPrice)}</span>
                                </div>
                              ) : (
                                <span className={`font-black italic transition-colors ${isActiveTier ? 'text-gray-900' : 'text-gray-500'}`}>₱{formatPrice(rawTierPrice)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">−</button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setQuantity(!isCustomizableProduct ? Math.min(stockCount, val) : val);
                      }}
                      className="w-16 px-2 py-1.5 text-center font-black border border-gray-200 rounded-xl focus:border-[#FFE100] focus:outline-none text-sm"
                    />
                    <button 
                      onClick={() => setQuantity(q => !isCustomizableProduct ? Math.min(stockCount, q + 1) : q + 1)} 
                      disabled={!isCustomizableProduct && quantity >= stockCount}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 px-8 pb-8 pt-2 bg-gray-50/30">
                {isCustomMode ? (
                  <DesignChatbox
                    onImageUpload={(img) => {
                      setUploadedImage({ preview: img });
                      setSubmitError(null);
                    }}
                    productId={giveaways.product_id || giveaways.id}
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
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group relative" style={{ minHeight: "220px" }}>
                    <img
                      src={getPreviewImage()}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      alt={giveaways.type}
                    />
                  </div>

                  {/* Design Thumbnail Gallery */}
                  {hasDbDesigns && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider italic">Available Designs Gallery</span>
                      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
                        <button
                          onClick={() => setSelectedDesign(null)}
                          className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${selectedDesign === null ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200 hover:border-gray-300'}`}
                          title="Default Design"
                        >
                          <img src={getImageUrl(giveaways.product_image || giveaways.image)} className="w-full h-full object-cover" alt="Default Design" />
                        </button>
                        {giveaways.designs.map((design) => {
                          const isActive = selectedDesign?.id === design.id;
                          return (
                            <button
                              key={design.id}
                              onClick={() => setSelectedDesign(design)}
                              className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all hover:scale-105 active:scale-95 ${isActive ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200 hover:border-gray-300'}`}
                              title={design.design_name}
                            >
                              <img src={getImageUrl(design.design_image || giveaways.product_image || giveaways.image)} className="w-full h-full object-cover" alt={design.design_name} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Configurations */}
                {((!isCustomMode && hasDbSizes) || hasDbDesigns) && (
                  <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Configurations</h3>

                    {/* Choose Design Selector Grid */}
                    {hasDbDesigns && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. Choose Design</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedDesign(null)}
                            className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all overflow-hidden ${selectedDesign === null ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                          >
                            <img src={getImageUrl(giveaways.product_image || giveaways.image)} className="w-12 h-12 object-cover rounded-lg bg-gray-50 flex-shrink-0" alt="Standard Design" />
                            <div className="text-left min-w-0">
                              <span className="text-[10px] font-bold text-gray-800 block truncate leading-tight">Standard Design</span>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Default</span>
                            </div>
                          </button>
                          {giveaways.designs.map((design) => {
                            const isSelected = selectedDesign?.id === design.id;
                            return (
                              <button
                                key={design.id}
                                onClick={() => setSelectedDesign(design)}
                                className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all overflow-hidden ${isSelected ? 'border-yellow-400 bg-yellow-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                              >
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

                    {/* Choose Size Option Selector */}
                    {!isCustomMode && hasDbSizes && (
                      <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          {hasDbDesigns ? "2." : "1."} Size Option
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {giveaways.sizes.map((size) => {
                            const isSelected = selectedSizeObj?.id === size.id;
                            return (
                              <button
                                key={size.id}
                                onClick={() => setSelectedSizeObj(size)}
                                className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${isSelected ? 'border-yellow-400 bg-yellow-50 text-gray-900' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'}`}
                              >
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
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">Order Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tier Unit Price</span>
                      <div className="flex flex-col items-end">
                        {hasDiscount ? (
                          <>
                            <span className="text-[10px] line-through text-gray-400">₱ {formatPrice(adjustedUnitPrice)}</span>
                            <span className="font-bold text-gray-900 italic">₱ {formatPrice(unitPrice)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900 italic">₱ {formatPrice(unitPrice)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-500">Total Pieces</span>
                      <span className="font-bold text-gray-900">{totalQuantity} Piece(s)</span>
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
                  <div className={`flex items-baseline gap-1 transition-all duration-300 ${isCalculating ? "scale-105 blur-[1px] opacity-70" : "scale-100 blur-0 opacity-100"}`}>
                    <span className="text-xl font-bold text-yellow-400">₱</span>
                    <span className="text-5xl font-black tracking-tighter italic">{formatPrice(subtotal)}</span>
                  </div>
                  {promo?.discount_type === "free_shipping" && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Free Shipping Active</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomMode && !uploadedImage?.preview)}
                  className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.98] shadow-lg
                    ${(isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomMode && !uploadedImage?.preview))
                      ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400 hover:shadow-yellow-200 hover:shadow-2xl"
                    }`}
                >
                  {isOutOfStock ? "Out of Stock" : (isCustomMode && !uploadedImage?.preview) ? "Upload Design to Proceed" : (isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <div className="relative">
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock || subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)}
                    style={
                      (isOutOfStock || subtotal <= 0 || (isCustomMode && !uploadedImage?.preview))
                        ? { border: "1px solid #e5e7eb" }
                        : { border: "1px solid #FFE100" }
                    }
                    className={`
                      w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm
                      transition-all duration-200 active:scale-[0.98]
                      ${(isOutOfStock || subtotal <= 0 || (isCustomMode && !uploadedImage?.preview))
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white"
                      }
                    `}
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
                {submitError && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest mt-4">{submitError}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
};

export default ModalGiveawaysMugnShirt;
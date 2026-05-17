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

const ModalGiveawaysMugnShirt = ({ giveaways, onClose }) => {
  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser } = useAuth();
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
  const totalQuantity = useMemo(() => quantity * numSets, [quantity, numSets]);
  const rawUnitPrice = getRawPricePerPiece(totalQuantity);
  let discountedUnitPrice = getDiscountedPrice(rawUnitPrice, promo);
  if (isNaN(discountedUnitPrice)) discountedUnitPrice = rawUnitPrice;
  const hasDiscount = discountedUnitPrice !== rawUnitPrice && promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed");

  const description = giveaways?.product_description || giveaways?.description;

  useEffect(() => {
    setIsCalculating(true);
    setUnitPrice(discountedUnitPrice);
    setSubtotal(discountedUnitPrice * totalQuantity);
    setTimeout(() => setIsCalculating(false), 500);
  }, [totalQuantity, discountedUnitPrice]);

  const formatPrice = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  };

  const getDiscountedForTier = (tierQty) => {
    const raw = getRawPricePerPiece(tierQty);
    return getDiscountedPrice(raw, promo);
  };

  const validateOrder = (checkPaymentMethod = true) => {
    if (!uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (subtotal <= 0) { setSubmitError("Please select a valid quantity."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const buildCartItem = () => ({
    productId: giveaways.product_id || giveaways.id || "unknown",
    title: `${selectedSubtype} ${isShirt ? "Shirt" : "Mug"}`,
    price: unitPrice,
    image: giveaways.image || null,
    quantity: totalQuantity,
    pieces: totalQuantity,
    category: "Giveaways",
    type: giveaways.type,
    designImage: uploadedImage?.preview || null,
    originalPrice: hasDiscount ? rawUnitPrice : null,
    promotion_id: promo?.promotion_id || null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
  });

  const buildCheckoutPayload = () => ({
    product: {
      id: giveaways.product_id || giveaways.id || "unknown",
      title: `${selectedSubtype} ${isShirt ? "Shirt" : "Mug"}`,
      price: unitPrice,
      image: giveaways.image || null,
      originalPrice: hasDiscount ? rawUnitPrice : null,
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
    designImage: uploadedImage?.preview || null,
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
              <div className="flex-shrink-0 p-8 pb-4 bg-gray-50/30 flex flex-col gap-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: "55%" }}>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{giveaways.category || giveaways.title}</h2>
                  <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{giveaways.type}</p>
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

                        return (
                          <tr 
                            key={`${selectedSubtype}-${tier}`} 
                            onClick={() => setQuantity(tier)}
                            className={`group cursor-pointer transition-all duration-200 ${
                              isActiveTier ? 'bg-yellow-50/50' : 'hover:bg-gray-50/30'
                            }`}
                          >
                            <td className="py-3 px-2 flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                                isActiveTier ? 'border-[#FFE100]' : 'border-gray-200 group-hover:border-gray-300'
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

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Number of Sets</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setNumSets(s => Math.max(1, s - 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">−</button>
                      <span className="w-10 text-center font-black text-lg">{numSets}</span>
                      <button onClick={() => setNumSets(s => s + 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">+</button>
                    </div>
                  </div>


                </div>
              </div>

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
                    src={getImageUrl(giveaways.image || giveaways.product_image)}
                    className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={giveaways.type}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">Order Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Tier Unit Price</span>
                      <div className="flex flex-col items-end">
                        {unitPrice !== rawUnitPrice ? (
                          <>
                            <span className="text-[10px] line-through text-gray-400">₱ {formatPrice(rawUnitPrice)}</span>
                            <span className="font-bold text-gray-900 font-mono tracking-tighter italic">₱ {formatPrice(unitPrice)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-gray-900 font-mono tracking-tighter italic">₱ {formatPrice(unitPrice)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-500 uppercase tracking-tighter text-[11px] font-bold">Total Pieces</span>
                      <span className="font-bold text-gray-900 text-lg">{totalQuantity} Piece(s)</span>
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

export default ModalGiveawaysMugnShirt;
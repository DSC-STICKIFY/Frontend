import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUI } from "../context/UIContext";
import { useAuth } from '../context/CustomerAuthContext';
import { useCart } from "../context/CartContext";
import LoginRegisterModal from "./LoginRegisterModal";
import DesignChatbox from "./DesignChatbox";
import { getBestPromo, getDiscountedPrice } from "../components/PromoTag";
import PromoApi from "../services/PromoApi";

import { getImageUrl } from "../services/api";
const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const DEFAULT_CALLING_CARD_OPTIONS = [
  { pcs: 100, price: 500, type: "Front" },
  { pcs: 100, price: 700, type: "Front & Back" },
];

import CartToast from "./CartToast";

const ModalGiveawayCallingCard = ({ giveaways, onClose }) => {
  const navigate = useNavigate();
  const { setCheckoutData } = useUI();
  const { currentUser } = useAuth();
  const { addItem } = useCart();

  const isCustomizable = giveaways.is_customizable !== 0 && giveaways.is_customizable !== false && giveaways.is_customizable !== "0" && giveaways.is_customizable !== undefined;

  const options = DEFAULT_CALLING_CARD_OPTIONS;
  const [selectedOption, setSelectedOption] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    PromoApi.getActive()
      .then((data) => setPromos(Array.isArray(data) ? data : []))
      .catch(() => setPromos([]));
  }, []);

  const promo = getBestPromo(giveaways, promos);

  const getDiscountedOptionPrice = (rawPrice) => {
    const discounted = getDiscountedPrice(rawPrice, promo);
    return isNaN(discounted) ? rawPrice : discounted;
  };

  const optionsWithDiscount = options.map(opt => ({
    ...opt,
    rawPrice: opt.price,
    discountedPrice: getDiscountedOptionPrice(opt.price),
  }));

  useEffect(() => {
    if (!selectedOption) {
      const isBack = giveaways?.type?.toLowerCase().includes("back") || 
                     giveaways?.title?.toLowerCase().includes("back");
      const initial = optionsWithDiscount.find(opt => 
        isBack ? opt.type === "Front & Back" : opt.type === "Front"
      ) || optionsWithDiscount[0];
      setSelectedOption(initial);
    }
  }, [giveaways?.type, giveaways?.title, optionsWithDiscount]);

  const description = giveaways?.product_description || giveaways?.description;

  useEffect(() => {
    if (selectedOption) {
      setSubtotal(selectedOption.discountedPrice);
    } else {
      setSubtotal(0);
    }
  }, [selectedOption]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setUploadedImage({ file, preview: reader.result }); setSubmitError(null); };
    reader.readAsDataURL(file);
  };

  const validateOrder = (checkPaymentMethod = true) => {
    if (isCustomizable && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return false; }
    if (!selectedOption) { setSubmitError("Please select an option."); return false; }
    if (checkPaymentMethod && !paymentMethod) { setSubmitError("Please select a payment method."); return false; }
    setSubmitError(null); return true;
  };

  const cardType = selectedOption?.type === "Front" ? "Front only" : "Front & Back";
  const finalPrice = selectedOption?.discountedPrice || 0;
  const hasDiscount = selectedOption && selectedOption.rawPrice !== selectedOption.discountedPrice;

  const buildCartItem = () => ({
    productId:   giveaways.product_id || giveaways.id || "unknown",
    title:       giveaways.product_name || giveaways.title || giveaways.category || "Calling Card",
    price:       finalPrice,
    image:       giveaways.product_image || giveaways.image || null,
    quantity:    1,
    pieces:      selectedOption?.pcs || 0,
    category:    "Giveaways",
    type:        cardType,
    designImage: isCustomizable ? (uploadedImage?.preview || null) : null,
    originalPrice: hasDiscount ? selectedOption.rawPrice : null,
    promoApplied: promo?.name || null,
    discountType: promo?.discount_type || null,
  });

  const buildCheckoutPayload = () => ({
    product: {
      id:    giveaways.product_id || giveaways.id || "unknown",
      title: giveaways.product_name || giveaways.title || giveaways.category || "Calling Card",
      price: finalPrice,
      image: giveaways.product_image || giveaways.image || null,
      originalPrice: hasDiscount ? selectedOption.rawPrice : null,
      promoApplied: promo?.name || null,
    },
    quantity: 1,
    pieces:   selectedOption?.pcs || 0,
    category: "Giveaways",
    type:     cardType,
    subtotal,
    initialPaymentMethod: paymentMethod,
    designImage: isCustomizable ? (uploadedImage?.preview || null) : null,
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

  const formatPrice = (num) => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-[40px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden max-h-[92vh] relative" onClick={(e) => e.stopPropagation()}>

          <button onClick={onClose} className="absolute top-8 right-10 z-20 text-3xl font-bold text-gray-300 hover:text-black transition-colors">×</button>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* LEFT Panel – Info + Pricing Table + Chat */}
            <div className="w-full md:w-1/2 p-8 bg-gray-50/30 flex flex-col gap-6 h-full overflow-hidden border-r border-gray-100">
              <div className={`overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4 ${isCustomizable ? 'flex-shrink-0 max-h-[45%]' : 'flex-1 max-h-none'}`}>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{giveaways.product_name || giveaways.title || giveaways.category || "Calling Card"}</h2>
                  <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{giveaways.type || "Professional Printing"}</p>
                </div>

                {description && <p className="text-sm text-gray-500 leading-relaxed italic">{description}</p>}

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Print Options</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="py-2 text-left font-black text-gray-400 uppercase tracking-tighter text-[9px]">Card Type</th>
                        <th className="py-2 text-right font-black text-gray-400 uppercase tracking-tighter text-[9px]">Price (100 pcs)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {optionsWithDiscount.map((opt) => {
                        const isSelected = selectedOption?.type === opt.type;
                        const itemHasDiscount = opt.rawPrice !== opt.discountedPrice;
                        return (
                          <tr key={opt.type} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-yellow-50/30' : 'hover:bg-gray-50/50'}`} onClick={() => setSelectedOption(opt)}>
                            <td className="py-3 font-bold flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[#FFE100]' : 'border-gray-200'}`}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#FFE100]" />}
                                </div>
                                <span className="text-gray-700">{opt.type}</span>
                            </td>
                            <td className="py-3 text-right">
                              {itemHasDiscount ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] line-through text-gray-400">₱{formatPrice(opt.rawPrice)}</span>
                                  <span className="text-gray-900 font-black italic">₱{formatPrice(opt.discountedPrice)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-900 font-black italic">₱{formatPrice(opt.rawPrice)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Minimum of 100 pcs per order</p>
              </div>

              {isCustomizable && (
                <div className="flex-1 min-h-0 bg-white">
                  <DesignChatbox 
                    onImageUpload={(img) => {
                      setUploadedImage({ preview: img });
                      setSubmitError(null);
                    }} 
                    productId={giveaways.product_id || giveaways.id}
                  />
                </div>
              )}
            </div>

            {/* RIGHT Panel – Summary + Actions */}
            <div className="w-full md:w-1/2 p-8 overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group">
                  <img src={getImageUrl(giveaways.product_image || giveaways.image)} className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105" alt={giveaways.type} />
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">Print Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Package Price</span>
                      <div className="flex flex-col items-end">
                        {hasDiscount ? (
                            <>
                                <span className="text-[10px] line-through text-gray-400">₱ {formatPrice(selectedOption?.rawPrice)}</span>
                                <span className="font-bold text-gray-900">₱ {formatPrice(selectedOption?.discountedPrice)}</span>
                            </>
                        ) : (
                            <span className="font-bold text-gray-900">₱ {formatPrice(selectedOption?.rawPrice)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Selected Quantity</span>
                      <span className="font-bold text-gray-900">{selectedOption?.pcs || 100} Piece(s)</span>
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
                  disabled={isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomizable && !uploadedImage?.preview)} 
                  className={`w-full py-6 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-[0.98]
                    ${(isSubmitting || subtotal <= 0 || !paymentMethod || (isCustomizable && !uploadedImage?.preview))
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400 shadow-yellow-100"
                    }`}
                >
                  {(isCustomizable && !uploadedImage?.preview) ? "Upload Design to Proceed" : (isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <button 
                  onClick={handleAddToCart} 
                  disabled={subtotal <= 0 || (isCustomizable && !uploadedImage?.preview)} 
                  className={`w-full py-6 rounded-[24px] font-black uppercase tracking-widest text-sm border-2 transition-all
                    ${(isCustomizable && !uploadedImage?.preview) ? "border-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-100 text-gray-900 hover:bg-gray-50"}`}
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

export default ModalGiveawayCallingCard;
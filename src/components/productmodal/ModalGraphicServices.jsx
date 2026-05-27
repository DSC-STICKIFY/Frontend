import React, { useState, useEffect, useMemo , useRef} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/CustomerAuthContext";
import { useCart } from "../../context/CartContext";
import { sendCustomerMessage } from "../../services/MessageAPI";
import { useUI } from "../../context/UIContext";
import { getImageUrl } from "../../services/api";
import LoginRegisterModal from "../LoginRegisterModal";
import CartToast from "../CartToast";
import DesignChatbox from "../DesignChatbox";
import { getDiscountedPrice } from "../PromoTag";
import check from "../../assets/servicesImgIcon/graphicservices/check.svg";

const formatPrice = (price) => {
  if (price === undefined || price === null) return "0.00";
  return parseFloat(price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalGraphicServices = ({ product, onClose }) => {
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
  const { currentUser, isVerified } = useAuth();
  const { addItem, cartItems } = useCart();

  const cartCount = useMemo(() => {
    const productId = product.id || product.product_id;
    return cartItems
      .filter((c) => c.productId === productId)
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, product]);

  const isCustomizableProduct = product.is_customizable !== 0 && product.is_customizable !== false && product.is_customizable !== "0" && product.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

  const title = product.type || "Graphic Services";
  const tier = product.name || product.product_name || "Service";
  const category = product.product_category || product.category || "Graphic Services";
  const rawPrice = useMemo(() => {
    console.log("🛠️ ModalGraphicServices - Product Data:", product);
    const raw = product.product_price ?? product.price ?? 0;
    console.log("💰 Extracted Raw Price:", raw);

    const parsed = typeof raw === "string"
      ? (parseFloat(raw.replace(/[^0-9.]/g, "")) || 0)
      : (parseFloat(raw) || 0);

    console.log("✅ Parsed Numeric Price:", parsed);
    return parsed;
  }, [product]);
  const promo = product.applied_promo;
  const hasDiscount = !!promo;
  const description = product.product_description || product.description;

  const packageDetails = useMemo(() => {
    // 1. If product already has package_details, return it
    if (product.package_details) {
      return {
        inclusions: product.package_details.inclusions || product.package_details.packageInclusions || [],
        timeline: product.package_details.timeline || [],
        payment: product.package_details.payment || []
      };
    }
    
    // 2. If product has packageInclusions / timeline / payment directly
    if (product.packageInclusions || product.timeline || product.payment) {
      return {
        inclusions: product.packageInclusions || product.inclusions || [],
        timeline: product.timeline || [],
        payment: product.payment || []
      };
    }

    // 3. Parse from description
    const desc = description || "";
    const tierName = product.name || product.product_name || "";
    const subType = product.type || "";
    
    // Fallback generator
    const getFallback = (tName, sType) => {
      const name = (tName || "").toLowerCase();
      const type = (sType || "").toLowerCase();

      let inclusions = [
        "35pcs 2x2 Stickers",
        "FB & Youtube Cover Design",
        "Profile Design",
        ".JPG & .PNG",
      ];
      let timeline = ["7-10 Days Process"];
      let payment = [
        "50% Down payment before we proceed for editing",
        "50% Full payment upon approval and before we send the design",
      ];

      if (name.includes("basic")) {
        const stickerCount = type.includes("moto") || type.includes("vlog") ? "45pcs" : "35pcs";
        inclusions = [
          `${stickerCount} 2x2 Stickers`,
          "FB & Youtube Cover Design",
          "Profile Design",
          ".JPG & .PNG",
        ];
        timeline = ["7-10 Days Process"];
      } else if (name.includes("standard")) {
        inclusions = [
          "60pcs 2x2 Stickers",
          "FB & Youtube Cover Design",
          "Profile Design",
          ".JPG & .PNG",
        ];
        timeline = ["7-10 Days Process"];
      } else if (name.includes("premium")) {
        inclusions = [
          "70pcs 2x2 Stickers",
          "FB & Youtube Cover Design",
          "Profile Design",
          ".JPG & .PNG",
        ];
        timeline = ["7-10 Days Process"];
      } else if (name.includes("starter") && (type.includes("moto") || type.includes("vlog"))) {
        timeline = ["7-10 Days Process"];
      }

      return { inclusions, timeline, payment };
    };

    const fallback = getFallback(tierName, subType);
    if (!desc || desc.trim() === "" || !desc.includes('|')) {
      return fallback;
    }

    const sections = desc.split('|').map(s => s.trim());
    const details = {};
    sections.forEach(section => {
      if (section.toLowerCase().includes('inclusion')) {
        const items = section.split(':')[1]?.split(',').map(i => i.trim()) || [];
        details.inclusions = items;
      } else if (section.toLowerCase().includes('timeline')) {
        const timelineStr = section.split(':')[1]?.trim() || '';
        details.timeline = [timelineStr];
      } else if (section.toLowerCase().includes('payment')) {
        const payments = section.split(':')[1]?.split(',').map(p => p.trim()) || [];
        details.payment = payments;
      }
    });

    return {
      inclusions: details.inclusions || fallback.inclusions,
      timeline: details.timeline || fallback.timeline,
      payment: details.payment || fallback.payment
    };
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

  useEffect(() => {
    setIsCalculating(true);
    const total = discountedPrice * quantity;
    console.log(`🧮 Calculating Subtotal: ${discountedPrice} * ${quantity} = ${total}`);
    setSubtotal(total);
    setTimeout(() => setIsCalculating(false), 500);
  }, [quantity, discountedPrice]);

  const buildPayload = () => ({
    product: {
      id: product.id || product.product_id,
      title,
      price: discountedPrice,
      image: product.image || product.product_image,
      originalPrice: hasDiscount ? rawPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
    },
    quantity,
    category,
    type: product.type || "Graphic Service",
    subtotal,
    initialPaymentMethod: paymentMethod,
    customMode: isCustomMode ? "custom" : "standard",
    designImage: isCustomMode ? (uploadedImage?.preview || null) : null,
    timestamp: Date.now()
  });

  const handleBuyNow = async () => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return; }
    if (!paymentMethod) { setSubmitError("Please select a payment method."); return; }
    if (!currentUser) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(buildPayload()));
      setShowAuthModal(true);
      return;
    }
    if (!isVerified) {
      setSubmitError("Please verify your email address to proceed with checkout.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isCustomMode && uploadedImage?.preview) {
        const inquiryBody = `[DESIGN] Interested in graphic service: ${title}. Qty: ${quantity}. Subtotal: ₱${formatPrice(subtotal)}.`;
        await sendCustomerMessage(inquiryBody, null, product.id || product.product_id);
      }
      setCheckoutData(buildPayload());
      onClose();
      navigate("/customer-checkout");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return; }
    const p = buildPayload();
    addItem({
      productId: p.product.id,
      title: p.product.title,
      price: p.product.price,
      image: p.product.image,
      quantity: p.quantity,
      category: p.category,
      type: p.type,
      customMode: isCustomMode ? "custom" : "standard",
      designImage: p.designImage,
      originalPrice: p.product.originalPrice,
      promoApplied: p.product.promoApplied,
      discountType: promo?.discount_type || null,
    });
    setShowToast(true);
  };



  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div
          className="bg-white rounded-[32px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden relative"
          style={{ height: "90vh", maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-6 right-8 z-20 text-3xl font-bold text-gray-300 hover:text-black transition-colors">×</button>

          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
            {/* LEFT Panel */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 overflow-hidden">

              {/* Static top info */}
              <div className={`p-8 pb-4 bg-gray-50/30 flex flex-col gap-4 overflow-y-auto custom-scrollbar ${isCustomMode ? 'flex-shrink-0' : 'flex-1'}`}>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{title}</h2>
                  <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest mt-1 italic">{tier}</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {hasDiscount ? (
                    <>
                      <span className="text-sm line-through text-gray-400 font-medium">₱ {formatPrice(rawPrice)}</span>
                      <span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(discountedPrice)}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-black text-gray-900 italic">₱ {formatPrice(rawPrice)}</span>
                  )}
                  {promo && (
                    <span className="text-[10px] bg-[#FFE100] text-black font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                      {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : promo.discount_type === "fixed" ? `₱${promo.discount_value} OFF` : "PROMO"}
                    </span>
                  )}
                </div>

                {description && <p className="text-sm text-gray-500 leading-relaxed italic">{description}</p>}

                {packageDetails.inclusions && packageDetails.inclusions.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Package Inclusions</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {packageDetails.inclusions.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <img src={check} className="w-4 h-4 mt-0.5" alt="" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {packageDetails.timeline && packageDetails.timeline.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Timeline</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {packageDetails.timeline.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <img src={check} className="w-4 h-4 mt-0.5" alt="" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {packageDetails.payment && packageDetails.payment.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Payment Term</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {packageDetails.payment.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm font-semibold text-yellow-600">
                          <img src={check} className="w-4 h-4 mt-0.5" alt="" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">−</button>
                    <span className="w-10 text-center font-black text-lg">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold">+</button>
                  </div>
                </div>
              </div>

              {/* Chatbox — fills remaining height */}
              <div className="flex-1 min-h-0 px-8 pb-8 pt-2 bg-gray-50/30">
                {isCustomMode ? (
                  <DesignChatbox 
                    onImageUpload={(img) => {
                      setUploadedImage({ preview: img });
                      setSubmitError(null);
                    }} 
                    productId={product.id || product.product_id}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                    <span className="text-4xl mb-3">🎨</span>
                    <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Ready-Made Design Service</h4>
                    <p className="text-xs text-gray-400 mt-2 max-w-[280px]">
                      This service will be processed as a standard ready-made design. The finalized design files will be sent to you directly after purchase.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT Panel */}
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-4">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group">
                  <img src={getImageUrl(product.image || product.product_image)} className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105" alt={title} />
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">Service Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Service Fee</span>
                      <span className="font-bold text-gray-900">₱ {formatPrice(discountedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-bold text-gray-900">{quantity} Project(s)</span>
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
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <button
                  onClick={handleBuyNow}
                  disabled={isSubmitting || subtotal <= 0 || !paymentMethod || (currentUser && !isVerified) || (isCustomMode && !uploadedImage?.preview)}
                  className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.98] shadow-lg
                    ${(isSubmitting || subtotal <= 0 || !paymentMethod || (currentUser && !isVerified) || (isCustomMode && !uploadedImage?.preview))
                      ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400 hover:shadow-yellow-200 hover:shadow-2xl"
                    }`}
                >
                  {(isCustomMode && !uploadedImage?.preview) ? "Upload Design to Proceed" : (currentUser && !isVerified ? "Verification Required" : isSubmitting ? "Processing..." : "Proceed to Checkout")}
                </button>
                <div className="relative">
                  <button 
                    onClick={handleAddToCart} 
                    disabled={subtotal <= 0 || (isCustomMode && !uploadedImage?.preview)} 
                    style={
                      (subtotal <= 0 || (isCustomMode && !uploadedImage?.preview))
                        ? { border: "1px solid #e5e7eb" }
                        : { border: "1px solid #FFE100" }
                    }
                    className={`
                      w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm
                      transition-all duration-200 active:scale-[0.98]
                      ${(subtotal <= 0 || (isCustomMode && !uploadedImage?.preview))
                        ? "bg-white text-gray-300 cursor-not-allowed"
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

      {showAuthModal && <LoginRegisterModal onClose={() => setShowAuthModal(false)} fromCheckout={true} />}
    </>
  );
};

export default ModalGraphicServices;
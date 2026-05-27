import React, { useState, useEffect, useMemo , useRef} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/CustomerAuthContext";
import { useCart } from "../../context/CartContext";
import { sendCustomerMessage } from "../../services/MessageAPI";
import { useUI } from "../../context/UIContext";
import LoginRegisterModal from "../LoginRegisterModal";
import CartToast from "../CartToast";
import DesignChatbox from "../DesignChatbox";
import { getDiscountedPrice } from "../PromoTag";
import { getImageUrl } from "../../services/api";

const formatPrice = (price) => {
  if (price === undefined || price === null) return "0.00";
  return parseFloat(price).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const ModalAssortedHologram = ({ sticker, product, onClose }) => {
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

  const item = sticker || product;

  const cartCount = useMemo(() => {
    const productId = item.id || item.product_id;
    return cartItems
      .filter((c) => c.productId === productId)
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [cartItems, item]);

  const isCustomizable = item.is_customizable !== 0 && item.is_customizable !== false && item.is_customizable !== "0" && item.is_customizable !== undefined;

  const title = item.product_name || item.title || "Hologram Set";
  const category = item.category || "Hologram";
  
  const isCustomizableProduct = item.is_customizable !== 0 && item.is_customizable !== false && item.is_customizable !== "0" && item.is_customizable !== undefined;
  const isCustomMode = isCustomizableProduct;

  const stockCount = item.product_quantity !== undefined ? parseInt(item.product_quantity) : 0;
  const isOutOfStock = !isCustomizableProduct && stockCount <= 0;

  const rawPrice = useMemo(() => {
    const raw = item.product_price || item.price || "0";
    return parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
  }, [item]);

  const promo = item.applied_promo;
  const hasDiscount = !!promo;
  const description = item.product_description || item.description;

  let discountedPrice = getDiscountedPrice(rawPrice, promo);
  if (isNaN(discountedPrice)) discountedPrice = rawPrice;

  const [quantity, setQuantity] = useState(1);
  const [subtotal, setSubtotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);

  useEffect(() => {
    if (!isCustomizableProduct && quantity > stockCount) {
      setQuantity(Math.max(1, stockCount));
    } else if (quantity === 0) {
      setQuantity(1);
    }
  }, [isOutOfStock, stockCount, isCustomizableProduct, quantity]);

  useEffect(() => {
    setSubtotal(discountedPrice * quantity);
  }, [quantity, discountedPrice]);

  const buildPayload = () => ({
    product: {
      id: item.id || item.product_id,
      title,
      price: discountedPrice,
      image: item.image || item.product_image,
      originalPrice: hasDiscount ? rawPrice : null,
      promotion_id: promo?.promotion_id || null,
      promoApplied: promo?.name || null,
    },
    quantity,
    category,
    type: item.type || "Hologram",
    subtotal,
    initialPaymentMethod: paymentMethod,
    designImage: uploadedImage?.preview || null,
    timestamp: Date.now()
  });

  const handleBuyNow = async () => {
    if (isCustomMode && !uploadedImage?.preview) { setSubmitError("Please upload your design first."); return; }
    if (!paymentMethod) {
      setSubmitError("Please select a payment method.");
      return;
    }
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
        const inquiryBody = `[DESIGN] Interested in hologram set: ${title}. Qty: ${quantity}. Subtotal: ₱${formatPrice(subtotal)}.`;
        await sendCustomerMessage(inquiryBody, null, item.product_id || item.id);
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
      originalPrice: p.product.originalPrice,
      promotion_id: p.product.promotion_id,
      promoApplied: p.product.promoApplied,
      discountType: promo?.discount_type || null,
      image: p.product.image,
      quantity: p.quantity,
      category: p.category,
      type: p.type,
      customMode: p.customMode,
      designImage: p.designImage
    });
    setShowToast(true);
  };



  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-[32px] shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden"
          style={{ height: "90vh", maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-8 z-20 text-3xl font-bold text-gray-300 hover:text-black transition-colors"
          >
            ×
          </button>

          {/* Two-column layout — both columns fill the modal height */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

            {/* LEFT panel */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-100 overflow-hidden">

              {/* Static top info — scroll only if not customizable */}
              <div className={`p-8 pb-4 bg-gray-50/30 flex flex-col gap-4 overflow-y-auto custom-scrollbar ${isCustomizable ? 'flex-shrink-0' : 'flex-1'}`}>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">{title}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm font-bold text-yellow-600 uppercase tracking-widest italic">{category}</p>
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
                      {promo.discount_type === "percentage"
                        ? `${promo.discount_value}% OFF`
                        : promo.discount_type === "fixed"
                          ? `₱${promo.discount_value} OFF`
                          : "PROMO"}
                    </span>
                  )}
                </div>

                {description && (
                  <p className="text-sm text-gray-500 leading-relaxed italic">{description}</p>
                )}

                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Quantity</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={isOutOfStock || quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-black text-lg">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => {
                        if (!isCustomizableProduct) {
                          return Math.min(stockCount, q + 1);
                        }
                        return q + 1;
                      })}
                      disabled={isOutOfStock || (!isCustomizableProduct && quantity >= stockCount)}
                      className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-xl transition-colors text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Design Chatbox or Standard Info */}
              <div className="flex-1 min-h-[250px] px-8 pb-8 pt-2 bg-gray-50/30">
                {isCustomMode ? (
                  <DesignChatbox 
                    onImageUpload={(img) => {
                      setUploadedImage({ preview: img });
                      setSubmitError(null);
                    }} 
                    productId={item.product_id || item.id}
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

            {/* RIGHT panel */}
            <div ref={rightPanelRef} className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar bg-white flex flex-col">
              <div className="flex-1 space-y-4">
                <div className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group">
                  <img
                    src={getImageUrl(item.image || item.product_image)}
                    className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={title}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 italic">
                    Configuration Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Unit Price</span>
                      <span className="font-bold text-gray-900">₱ {formatPrice(discountedPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-bold text-gray-900">{quantity} Sets</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {["COD", "GCash", "Pickup"].map((id) => (
                      <label
                        key={id}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === id
                            ? "border-[#FFE100] bg-yellow-50/30"
                            : "border-gray-50 hover:border-gray-100"
                          }`}
                      >
                        <input
                          type="radio"
                          checked={paymentMethod === id}
                          onChange={() => setPaymentMethod(id)}
                          className="w-5 h-5 accent-yellow-500"
                        />
                        <span className="text-sm font-bold text-gray-700">
                          {id === "COD" ? "Cash on Delivery" : id === "Pickup" ? "Store Pickup" : "GCash"}
                        </span>
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
                </div>
              </div>

              <div className="mt-4 space-y-4 relative">
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod || (currentUser && !isVerified) || (isCustomMode && !uploadedImage?.preview)}
                  className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-[0.98]
                    ${(isOutOfStock || isSubmitting || subtotal <= 0 || !paymentMethod || (currentUser && !isVerified) || (isCustomMode && !uploadedImage?.preview))
                      ? "bg-gray-100 text-gray-300 shadow-none cursor-not-allowed"
                      : "bg-[#FFE100] text-black hover:bg-yellow-400"
                    }`}
                >
                  {isOutOfStock ? "SOLD OUT / OUT OF STOCK" : ((isCustomMode && !uploadedImage?.preview) ? "Upload Design to Proceed" : (currentUser && !isVerified ? "Verification Required" : isSubmitting ? "Processing..." : "Proceed to Checkout"))}
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
                    className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-sm transition-all duration-200 active:scale-[0.98]
                      ${(isOutOfStock || subtotal <= 0 || (isCustomMode && !uploadedImage?.preview))
                        ? "bg-white text-gray-300 cursor-not-allowed"
                        : "bg-white text-gray-900 hover:bg-gray-900 hover:text-white"
                      }`}
                  >
                    {isOutOfStock ? "Out of Stock" : "Add to Cart"}
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
                {submitError && (
                  <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest mt-4">
                    {submitError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAuthModal && (
        <LoginRegisterModal onClose={() => setShowAuthModal(false)} fromCheckout={true} />
      )}
    </>
  );
};

export default ModalAssortedHologram;
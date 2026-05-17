import React, { useState, useMemo, useEffect, useRef } from "react";
import { useUI } from "../../context/UIContext";
import { useAuth } from '../../context/CustomerAuthContext';
import { placeOrder } from "../../services/OrdersAPI";
import { useCart } from "../../context/CartContext";
import { useProducts } from "../../context/ProductsContext";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../../services/api";
import { handleGcashPayment } from "../../services/eWalletPaymentAPI";
import api from "../../services/api";
import {
  fetchCustomerMessages,
  sendCustomerMessage,
} from "../../services/MessageAPI";
import { useLocation } from 'react-router-dom';

// ── Promo Modal ───────────────────────────────────────────────────────────────
const PromoModal = ({ promos, subtotal, quantity, onSelect, onClose }) => {
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");


  const isEligible = (promo) => {
    if (promo.min_amount && subtotal < promo.min_amount) return false;
    if (promo.min_quantity && quantity < promo.min_quantity) return false;
    if (promo.usage_limit && promo.user_usage_count >= promo.usage_limit) return false;
    return true;
  };

  const getDiscount = (promo) => {
    if (!isEligible(promo)) return 0;
    if (promo.discount_type === "fixed") return Math.min(promo.discount_value, subtotal);
    if (promo.discount_type === "percentage") {
      const d = subtotal * (promo.discount_value / 100);
      return promo.max_discount ? Math.min(d, promo.max_discount) : d;
    }
    if (promo.discount_type === "free_shipping") return 100;
    return 0;
  };

  const handleCodeApply = () => {
    const found = promos.find(
      (p) => p.name?.toLowerCase() === code.toLowerCase() && isEligible(p)
    );
    if (found) {
      onSelect(found);
    } else {
      setCodeError("Invalid or ineligible promo code.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Select Promotion</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setCodeError(""); }}
              placeholder="Enter promo code"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={handleCodeApply}
              className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
            >Apply</button>
          </div>
          {codeError && <p className="text-red-500 text-xs mt-1.5">{codeError}</p>}
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {(() => {
            const visiblePromos = promos.filter(p => {
              // Server already filtered by display_type=checkout & active status.
              // Only hide promos the current user has already exhausted.
              const limit = Number(p.usage_limit);
              const used = Number(p.user_usage_count || 0);
              return !limit || used < limit;
            });

            if (visiblePromos.length === 0) {
              return <p className="text-center text-gray-400 py-8 text-sm">No active promotions available.</p>;
            }

            return visiblePromos.map((promo) => {
              const eligible = isEligible(promo);
              const discount = getDiscount(promo);
              return (
                <div
                  key={promo.promotion_id || promo.id}
                  className={`border rounded-xl p-4 transition ${eligible
                    ? "border-gray-200 hover:border-yellow-400 cursor-pointer hover:bg-yellow-50"
                    : "border-gray-100 opacity-60 cursor-not-allowed bg-gray-50"
                    }`}
                  onClick={() => eligible && onSelect(promo)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M17 17h.01M7 17h.01M17 7h.01M3 12h18M12 3v18" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{promo.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{promo.description}</p>
                        {promo.min_amount > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Min. Spend ₱{Number(promo.min_amount).toLocaleString("en-PH")}
                          </p>
                        )}
                        {promo.end_date && (
                          <p className="text-xs text-gray-400">
                            Valid until {new Date(promo.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {discount > 0 ? (
                        <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-2.5 py-1 rounded-lg">
                          -₱{discount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-200 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-lg">
                          {promo.discount_type === "percentage"
                            ? `${promo.discount_value}% off`
                            : promo.discount_type === "free_shipping"
                              ? "Free Ship"
                              : `₱${promo.discount_value} off`}
                        </span>
                      )}
                    </div>
                  </div>
                  {!eligible && (
                    <p className="text-xs text-orange-500 mt-2">
                      {promo.min_amount && subtotal < promo.min_amount
                        ? `Add ₱${(promo.min_amount - subtotal).toLocaleString("en-PH")} more to use this promo`
                        : `Requires minimum ${promo.min_quantity} items`}
                    </p>
                  )}
                </div>
              );
            });
          })()}
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition">OK</button>
        </div>
      </div>
    </div>
  );
};

// ── Messages Section ──────────────────────────────────────────────────────────
const MessagesSection = ({ currentUser, orderItems }) => {
  const activeProductId = orderItems?.[0]?.productId || null;
  const activeProductName = orderItems?.[0]?.title || "Product";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingImg, setPendingImg] = useState(null);
  const [imgError, setImgError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      try {
        setIsLoading(true);
        setFetchError("");
        // Pass activeProductId to fetch only messages for this product
        const data = await fetchCustomerMessages(activeProductId);
        const normalised = (Array.isArray(data) ? data : []).map((m) => ({
          from: m.sender_type === "customer" ? "user" : "bot",
          text: m.body || "",
          imageUrl: m.image ? `${import.meta.env.VITE_API_URL}/storage/${m.image}` : null,
          createdAt: m.created_at,
          productId: m.product_id, // Keep track of product_id
        }));
        setMessages(normalised);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setFetchError("Could not load messages. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };
    load();

    // REAL-TIME: Listen for admin replies specifically for this product
    if (window.Echo && currentUser) {
      const channel = window.Echo.private(`chat.${currentUser.id}`);
      channel.listen('MessageSent', (e) => {
        // Only append if it's from admin AND matches our active product
        // (Null check for product_id if it's a general message, but here we want product-specific)
        if (e.message.sender_type === 'admin' && String(e.message.product_id) === String(activeProductId)) {
          setMessages((prev) => {
             // Deduplicate by body/time if needed, but simple append for now
             const isDuplicate = prev.some(m => m.text === e.message.body && m.createdAt === e.message.created_at);
             if (isDuplicate) return prev;
             
             return [...prev, {
                from: "bot",
                text: e.message.body || "",
                imageUrl: e.message.image ? `${import.meta.env.VITE_API_URL}/storage/${e.message.image}` : null,
                createdAt: e.message.created_at,
                productId: e.message.product_id
             }];
          });
        }
      });
      return () => channel.stopListening('MessageSent');
    }
  }, [currentUser, activeProductId]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setImgError("Only JPG / PNG allowed."); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImgError("Max file size is 10 MB."); return;
    }
    setImgError("");
    const preview = await new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(file);
    });
    setPendingImg({ file, preview });
    e.target.value = "";
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !pendingImg) return;
    if (isSending) return;
    const optimistic = { from: "user", text, imageUrl: pendingImg?.preview || null, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    const imgFile = pendingImg?.file || null;
    setPendingImg(null);
    setIsSending(true);
    try {
      await sendCustomerMessage(text || null, imgFile, activeProductId);
    } catch (err) {
      console.error("Send failed:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { from: "bot", text: "⚠ Failed to send. Please try again.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const BotAvatar = () => (
    <div className="w-7 h-7 rounded-full bg-[#FFE100] flex items-center justify-center flex-shrink-0">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    </div>
  );

  return (
    <section className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Messages with Support
        </h2>
        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
          Discussing: {activeProductName}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5 min-h-[200px] max-h-[380px] overflow-y-auto bg-white">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-sm">Loading messages…</span>
            </div>
          </div>
        ) : fetchError ? (
          <p className="text-center text-red-500 text-sm py-8">{fetchError}</p>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-400">
            <svg className="w-10 h-10 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Messages you sent from the product modal will appear here.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "items-start gap-2"}`}>
              {msg.from !== "user" && <BotAvatar />}
              <div className={`text-sm leading-relaxed px-4 py-2.5 rounded-2xl max-w-[80%] shadow-sm ${msg.from === "user"
                ? "bg-[#FFE100] text-gray-900 rounded-tr-none font-medium"
                : "bg-gray-100 text-gray-700 rounded-tl-none"
                }`}>
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="attachment"
                    className="rounded-lg mb-2 max-h-48 object-contain w-full"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
                {msg.text && <p>{msg.text}</p>}
                {msg.createdAt && (
                  <p className={`text-[10px] mt-1 ${msg.from === "user" ? "text-yellow-700/60 text-right" : "text-gray-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className="flex items-start gap-2">
            <BotAvatar />
            <div className="bg-gray-100 text-gray-400 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none">Sending…</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {pendingImg && (
        <div className="px-5 pb-2 flex items-center gap-3 bg-white border-t border-gray-100 pt-2">
          <div className="relative w-14 h-14 rounded-lg border border-yellow-200 overflow-hidden bg-gray-50">
            <img src={pendingImg.preview} alt="pending" className="w-full h-full object-cover" />
            <button onClick={() => setPendingImg(null)}
              className="absolute top-0 right-0 bg-black/60 text-white w-5 h-5 flex items-center justify-center text-xs hover:bg-black transition-colors">×</button>
          </div>
          <span className="text-xs text-gray-500">Image ready to send</span>
        </div>
      )}
      {imgError && <p className="text-red-500 text-xs px-5 pb-1 bg-white">{imgError}</p>}
      <div className="flex items-center gap-2 p-3 bg-white border-t border-gray-100">
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FFE100] hover:bg-yellow-400 transition flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#333" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handleFileChange} />
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message or ask about your order…"
          disabled={isSending}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-300 placeholder:text-gray-400 disabled:opacity-50"
        />
        <button onClick={handleSend} disabled={isSending || (!input.trim() && !pendingImg)} className="flex-shrink-0 disabled:opacity-40">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#FFE100" className="hover:scale-110 transition-transform active:scale-90">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  resolveUserAddress — same priority as UserModel.resolvedAddress accessor
//  Tries every field name the user object might have for address.
// ─────────────────────────────────────────────────────────────────────────────
const resolveUserAddress = (user) => {
  if (!user) return "";
  return (
    user.address ||
    user.full_address ||
    user.delivery_address ||
    user.shipping_address ||
    user.profile?.address ||
    ""
  );
};

const resolveUserContact = (user) => {
  if (!user) return "";
  return (
    user.contact_number ||
    user.contactNumber ||  // camelCase variant
    user.phone ||
    user.phone_number ||
    user.phoneNumber ||
    user.mobile ||
    user.mobile_number ||
    user.profile?.contact_number ||
    user.profile?.phone ||
    ""
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CustomerCheckout = () => {
  const { currentUser, isVerified, isAuthenticated, loading: authLoading } = useAuth();
  const { checkoutData, clearCheckoutData } = useUI();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProducts } = useProducts();

  const isSubmittingRef = useRef(false); // ← add here, inside CustomerCheckout

  const [address, setAddress] = useState(null);
  const [contactNumber, setContactNumber] = useState(null);

  // ── FIX: isEditing starts false — we derive the right value once user loads
  const [isEditing, setIsEditing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [isEditingPayment, setIsEditingPayment] = useState(false);

  useEffect(() => {
    if (checkoutData?.initialPaymentMethod) {
      setPaymentMethod(checkoutData.initialPaymentMethod);
    }
  }, [checkoutData]);

  const [orderItems, setOrderItems] = useState([]);

  useEffect(() => {
    if (checkoutData && orderItems.length === 0) {
      if (checkoutData.cartItems && checkoutData.cartItems.length > 0) {
        setOrderItems(checkoutData.cartItems.map((item) => ({
          productId: item.productId,
          title: item.title,
          price: item.price,
          originalPrice: item.originalPrice || null,
          promoApplied: item.promoApplied || item.promoName || null,
          image: item.image,
          quantity: item.quantity,
          size: item.size || null,
          pieces: item.pieces || 0,
          type: item.type || "",
          category: item.category || "",
          designImage: item.designImage || null,
        })));
      } else if (checkoutData.product) {
        setOrderItems([{
          productId: checkoutData.product.id || checkoutData.product.product_id,
          title: checkoutData.product.title,
          price: checkoutData.product.price,
          originalPrice: checkoutData.product.originalPrice || null,
          promoApplied: checkoutData.product.promoApplied || null,
          image: checkoutData.product.product_image || checkoutData.product.image,
          quantity: Number(checkoutData.quantity) || 1,
          size: checkoutData.size || null,
          pieces: checkoutData.pieces || 0,
          type: checkoutData.type || "",
          category: checkoutData.category || "",
          designImage: checkoutData.designImage || null,
        }]);
      }
    }
  }, [checkoutData]);

  const [promos, setPromos] = useState([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── FIX: single source-of-truth sync from currentUser ───────────────────
  // Runs whenever currentUser changes (e.g. after AuthContext finishes loading).
  // Only overwrites if the field is still null (user hasn't manually edited yet).
  useEffect(() => {
    if (!currentUser) return;

    const userAddress = resolveUserAddress(currentUser);
    const userContact = resolveUserContact(currentUser);

    // Only set if still null (not yet initialized)
    setAddress(prev => (prev === null || prev === "") ? userAddress : prev);
    setContactNumber(prev => (prev === null || prev === "") ? userContact : prev);

    // Open edit mode only if the user genuinely has no saved address
    setIsEditing(prev => {
      // If already editing, keep it open
      if (prev) return prev;
      // Open edit mode if address is empty after loading
      return !userAddress.trim();
    });
  }, [currentUser]);

  useEffect(() => {
    const loadPromos = async () => {
      try {
        // Fetch only checkout-type vouchers — product-level promos are already baked into item prices.
        const res = await api.get("/promotions/active?display_type=checkout");
        const data = res.data?.data || res.data || [];
        setPromos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load promotions:", err);
        setPromos([]);
      }
    };
    loadPromos();
  }, []);

  // Collect promo IDs already applied at product level on any order item.
  // These are excluded from checkout-level promo selection to prevent double-dipping.
  const productLevelPromoIds = useMemo(() => {
    const ids = new Set();
    orderItems.forEach(item => {
      const pid = item.applied_promo?.promotion_id ?? item.applied_promo?.id;
      if (pid) ids.add(pid);
    });
    return ids;
  }, [orderItems]);

  // Promos available for checkout-level selection (not already applied to product prices).
  const checkoutPromos = useMemo(
    () => promos.filter(p => !productLevelPromoIds.has(p.promotion_id ?? p.id)),
    [promos, productLevelPromoIds]
  );

  // Auto-apply the best eligible checkout promo once both promos + order items are ready.
  // Skipped if the user has already manually chosen a promo.
  useEffect(() => {
    if (checkoutPromos.length === 0 || orderItems.length === 0 || selectedPromo) return;

    // Use original prices (before product-level discounts) as the base
    const subtotal = orderItems.reduce((sum, i) => sum + (i.originalPrice || i.price) * i.quantity, 0);
    const qty = orderItems.reduce((sum, i) => sum + i.quantity, 0);
    const shipping = paymentMethod === "Pickup" ? 0 : 100;

    const calcDiscount = (p) => {
      if (p.min_amount && subtotal < p.min_amount) return 0;
      if (p.min_quantity && qty < p.min_quantity) return 0;
      if (p.discount_type === "fixed") return Math.min(p.discount_value, subtotal);
      if (p.discount_type === "percentage") {
        const d = subtotal * (p.discount_value / 100);
        return p.max_discount ? Math.min(d, p.max_discount) : d;
      }
      if (p.discount_type === "free_shipping") return shipping;
      return 0;
    };

    const eligible = checkoutPromos.filter(p => calcDiscount(p) > 0);
    if (eligible.length === 0) return;

    const best = eligible.reduce((a, b) => calcDiscount(a) >= calcDiscount(b) ? a : b);
    setSelectedPromo(best);
  }, [checkoutPromos, orderItems]); // intentionally excludes selectedPromo — fires once

  const SHIPPING_FEE = paymentMethod === "Pickup" ? 0 : 100;

  // Subtotal using already-discounted item prices (for display and total)
  const merchandiseSubtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems]
  );

  // Original subtotal before any product-level promos — used as the checkout promo base
  // so the checkout promo never double-counts a discount already baked into item.price.
  const originalSubtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + (item.originalPrice || item.price) * item.quantity, 0),
    [orderItems]
  );

  const totalQuantity = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.quantity, 0),
    [orderItems]
  );

  const promoDiscount = useMemo(() => {
    if (!selectedPromo) return 0;
    const { discount_type, discount_value, min_amount, min_quantity, max_discount } = selectedPromo;
    // Apply against original subtotal to avoid compounding on top of already-discounted prices
    if (min_amount && originalSubtotal < min_amount) return 0;
    if (min_quantity && totalQuantity < min_quantity) return 0;
    if (discount_type === "fixed") return Math.min(discount_value, originalSubtotal);
    if (discount_type === "percentage") {
      const d = originalSubtotal * (discount_value / 100);
      return max_discount ? Math.min(d, max_discount) : d;
    }
    if (discount_type === "free_shipping") return SHIPPING_FEE;
    return 0;
  }, [selectedPromo, originalSubtotal, totalQuantity, SHIPPING_FEE]);

  const totalPayment = merchandiseSubtotal + SHIPPING_FEE - promoDiscount;

  const handleQuantityChange = (index, newQty) => {
    if (newQty < 1) return;
    setOrderItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: newQty } : item))
    );
  };

  const fullName =
    `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() || "Customer";

  const handleCancel = () => {
    // Revert to whatever the user profile has
    setAddress(resolveUserAddress(currentUser));
    setContactNumber(resolveUserContact(currentUser));
    setIsEditing(false);
    setSubmitError(null);
  };

  const handleSave = () => {
    if (!address?.trim()) { setSubmitError("Delivery address is required."); return; }
    if (!contactNumber?.trim()) { setSubmitError("Contact number is required."); return; }
    setIsEditing(false);
    setSubmitError(null);
  };

  const handleSelectPromo = (promo) => {
    setSelectedPromo(promo);
    setShowPromoModal(false);
  };


  const handleSubmit = async () => {
    if (isSubmittingRef.current) return; // ← block double submission immediately
    isSubmittingRef.current = true;
    setSubmitError(null);
    if (!currentUser) { setSubmitError("Please log in again."); return; }
    if (!isVerified) { setSubmitError("Please verify your email to place an order."); return; }
    if (!address?.trim()) { setSubmitError("Delivery address is required."); return; }
    if (!contactNumber?.trim()) { setSubmitError("Contact number is required."); return; }

    setIsSubmitting(true);

    const userId = currentUser?.id || currentUser?.user_id || currentUser?.user?.id || "";
    const orderData = new FormData();
    orderData.append("user_id", userId);
    orderData.append("total_price", Number(totalPayment));
    orderData.append("address", address.trim());
    orderData.append("contact_number", contactNumber.trim());
    orderData.append("payment_method", paymentMethod);
    orderData.append("courier", paymentMethod === "Pickup" ? "Self-Pickup" : "J&T");
    orderData.append("order_date", new Date().toISOString().slice(0, 19).replace("T", " "));
    orderData.append("status", "Pending");
    if (selectedPromo) orderData.append("promotion_id", String(selectedPromo.promotion_id || selectedPromo.id));
    if (promoDiscount > 0) orderData.append("discount_amount", String(promoDiscount));

    orderItems.forEach((item, index) => {
      const designFile = item.designImage instanceof File ? item.designImage : null;
      const itemSubtotal = item.price * item.quantity;
      const orderSize = item.size || "Standard";
      orderData.append(`items[${index}][product_id]`, String(item.productId || ""));
      orderData.append(`items[${index}][product_name]`, item.title || "");
      orderData.append(`items[${index}][category]`, item.category || "");
      orderData.append(`items[${index}][type]`, item.type || "");
      orderData.append(`items[${index}][quantity]`, String(item.quantity));
      orderData.append(`items[${index}][pieces]`, String(item.pieces || 0));
      orderData.append(`items[${index}][item_price]`, String(item.price || 0));
      orderData.append(`items[${index}][subtotal]`, String(itemSubtotal));
      orderData.append(`items[${index}][size]`, orderSize);
      orderData.append(`items[${index}][comments]`, "None");
      if (designFile) orderData.append(`items[${index}][order_image]`, designFile);
    });

    try {
      const response = await placeOrder(orderData);
      console.log("placeOrder response:", response);
      const newOrderId = response?.order_id || response?.id || null;
      console.log("newOrderId being sent to GCash:", newOrderId);
      if (!newOrderId) throw new Error("Order ID not returned from backend.");

      if (paymentMethod.toUpperCase() === "GCASH") {
        await handleGcashPayment(newOrderId);
        return;
      }
      setSubmitSuccess(true);
      refreshProducts(); // Refresh promos so used ones disappear
      setTimeout(() => {
        navigate("/customer-orders", { replace: true });
      }, 2000);
    } catch (error) {
      const backendData = error.response?.data;
      setSubmitError(backendData?.message || backendData?.error || error.message || "Failed to place order.");
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false; // ← release
    }
  };

  // address/contact are null while AuthContext is still loading
  const addressValue = address ?? "";
  const contactValue = contactNumber ?? "";
  const canSubmit = !!addressValue.trim() && !!contactValue.trim() && !isSubmitting && !submitSuccess && orderItems.length > 0;

  // Show loading skeleton while auth is resolving
  if (authLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 min-h-[calc(100vh-40px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading your details…</p>
        </div>
      </div>
    );
  }

  if (!checkoutData || orderItems.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No items in checkout</h2>
        <p className="text-gray-600 mb-6">Please select a product first.</p>
        <button onClick={() => navigate("/customer-dashboard")}
          className="px-8 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg transition">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 min-h-[calc(100vh-2.5rem)] flex flex-col">
      {showPromoModal && (
        <PromoModal
          promos={checkoutPromos}
          subtotal={originalSubtotal}
          quantity={totalQuantity}
          onSelect={handleSelectPromo}
          onClose={() => setShowPromoModal(false)}
        />
      )}

      <div className="p-5 mx-auto">
        <button onClick={() => navigate(-1)}
          className="absolute top-9 right-6 flex items-center gap-2 px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm">
          ← Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-7">
          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-7">

            {/* Delivery Address */}
            <section className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-semibold flex items-center gap-2.5">
                  <span className="text-green-600 text-2xl leading-none">●</span>
                  Delivery Address
                </h2>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium transition">
                    Change
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input type="text" disabled value={fullName}
                      className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input type="tel" value={contactValue}
                      onChange={(e) => setContactNumber(e.target.value.trim())}
                      placeholder="09171234567"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Delivery Address <span className="text-red-500">*</span>
                    </label>
                    <textarea rows={3} value={addressValue}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House #, Street, Barangay, City, Province, ZIP code"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-y min-h-[100px]" />
                  </div>
                  <div className="flex justify-end gap-4 pt-3">
                    <button onClick={handleCancel}
                      className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                      Cancel
                    </button>
                    <button onClick={handleSave}
                      className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition">
                      Save
                    </button>
                  </div>
                  {submitError && <p className="text-red-600 text-sm text-center pt-2">{submitError}</p>}
                </div>
              ) : (
                <div className="p-6 space-y-2">
                  <p className="font-medium text-gray-900 text-lg">{fullName}</p>
                  <p className={contactValue.trim() ? "text-gray-700" : "text-red-600 italic"}>
                    {contactValue.trim() || "No contact number provided"}
                  </p>
                  <p className={`whitespace-pre-line leading-relaxed ${addressValue.trim() ? "text-gray-700" : "text-red-600 italic"}`}>
                    {addressValue.trim() || "No delivery address provided"}
                  </p>
                </div>
              )}
            </section>

            {/* Order Items */}
            <section className="rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Order Items
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({orderItems.length} item{orderItems.length !== 1 ? "s" : ""})
                  </span>
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-5 font-semibold text-gray-700">Product</th>
                    <th className="text-left p-5 font-semibold text-gray-700 hidden sm:table-cell">Details</th>
                    <th className="text-right p-5 font-semibold text-gray-700 hidden sm:table-cell">Unit Price</th>
                    <th className="text-center p-5 font-semibold text-gray-700">Qty</th>
                    <th className="text-right p-5 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg border overflow-hidden flex-shrink-0">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.title || "Product"}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = "/placeholder.png"; }}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 leading-snug">{item.title || "Product"}</p>
                            <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                              {item.size && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Size: {item.size}</span>}
                              {item.type && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.type}</span>}
                              {item.pieces > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.pieces} pcs</span>}
                            </div>
                            <div className="sm:hidden flex flex-col mt-1">
                              <p className="text-xs text-gray-400">
                                ₱{Number(item.originalPrice || item.price).toLocaleString("en-PH")} each
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-gray-500 hidden sm:table-cell">
                        {[item.type || null, item.size ? `Size: ${item.size}` : null, item.pieces ? `${item.pieces} pcs` : null]
                          .filter(Boolean).join(" • ") || "—"}
                      </td>
                      <td className="p-5 text-right text-gray-700 hidden sm:table-cell">
                        ₱{Number(item.originalPrice || item.price).toLocaleString("en-PH")}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleQuantityChange(index, item.quantity - 1)}
                            className="w-6 h-6 rounded-full border flex items-center justify-center text-lg hover:bg-gray-100 transition">−</button>
                          <span className="text-base w-7 text-center font-medium">{item.quantity}</span>
                          <button onClick={() => handleQuantityChange(index, item.quantity + 1)}
                            className="w-6 h-6 rounded-full border flex items-center justify-center text-lg hover:bg-gray-100 transition">+</button>
                        </div>
                      </td>
                      <td className="p-5 text-right font-bold text-gray-900">
                        ₱{(item.price * item.quantity).toLocaleString("en-PH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-5 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Shipping Fee</span>
                  <span className="font-medium">
                    {paymentMethod === "Pickup"
                      ? <span className="text-green-600 font-semibold">Free (Pickup)</span>
                      : `₱${SHIPPING_FEE.toLocaleString("en-PH")}`}
                  </span>
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                {!isEditingPayment && (
                  <button onClick={() => setIsEditingPayment(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium transition">
                    Change
                  </button>
                )}
              </div>
              {isEditingPayment ? (
                <div className="p-6 space-y-4">
                  <div className="grid gap-3">
                    {[
                      { id: "COD", label: "Cash on Delivery", sub: "Pay when you receive the item" },
                      { id: "GCASH", label: "GCASH", sub: "Pay via GCash" },
                      { id: "Pickup", label: "Store Pickup", sub: "Pay and pick up at our store" },
                    ].map((option) => (
                      <label key={option.id} htmlFor={`payment-${option.id}`}
                        className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition select-none
                          ${paymentMethod === option.id ? "border-yellow-400 bg-yellow-50 shadow-sm" : "border-gray-200 hover:bg-gray-50"}`}>
                        <input id={`payment-${option.id}`} type="radio" name="paymentMethod"
                          value={option.id} checked={paymentMethod === option.id}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-5 h-5 flex-shrink-0 accent-yellow-500" />
                        <div>
                          <p className="font-semibold text-gray-900">{option.label}</p>
                          <p className="text-sm text-gray-600">{option.sub}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end pt-3">
                    <button onClick={() => setIsEditingPayment(false)}
                      className="px-8 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition">
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <p className="font-medium text-gray-800 text-lg">
                    {paymentMethod === "COD" ? "Cash on Delivery" : paymentMethod === "Pickup" ? "Store Pickup" : "GCASH"}
                  </p>
                </div>
              )}
            </section>

            {/* Promo */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M17 17h.01M3 12h18M7 17h.01M17 7h.01" />
                  </svg>
                  Promotions
                </h2>
                <button onClick={() => setShowPromoModal(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium transition">
                  {selectedPromo ? "Change" : "Select"}
                </button>
              </div>
              <div className="p-5">
                {selectedPromo ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedPromo.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{selectedPromo.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded-lg">
                        -₱{promoDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                      <button onClick={() => setSelectedPromo(null)} className="text-gray-400 hover:text-red-500 transition text-lg leading-none">×</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowPromoModal(true)}
                    className="w-full flex items-center justify-between px-4 py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-400 hover:text-yellow-600 transition">
                    <span className="text-sm">Click to select a promotion</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </section>

            <MessagesSection currentUser={currentUser} orderItems={orderItems} />
          </div>

          {/* ── RIGHT COLUMN — Order Summary ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Order Summary</h2>
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm text-gray-500">
                    <span className="truncate max-w-[170px]">{item.title} × {item.quantity}</span>
                    <span className="font-medium text-gray-700 ml-2 flex-shrink-0">
                      ₱{(item.price * item.quantity).toLocaleString("en-PH")}
                    </span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Merchandise Subtotal</span>
                  <span>₱{merchandiseSubtotal.toLocaleString("en-PH")}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping Fee</span>
                  <span>
                    {paymentMethod === "Pickup"
                      ? <span className="text-green-600 font-semibold">Free</span>
                      : `₱${SHIPPING_FEE.toLocaleString("en-PH")}`}
                  </span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Promotion Discount</span>
                    <span>-₱{promoDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between pt-4 border-t font-bold text-lg">
                  <span className="text-gray-900">Total Payment</span>
                  <span className="text-2xl text-gray-900">₱{totalPayment.toLocaleString("en-PH")}</span>
                </div>
                {promoDiscount > 0 && (
                  <p className="text-xs text-green-600 text-center font-medium bg-green-50 rounded-lg py-2">
                    You're saving ₱{promoDiscount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} on this order!
                  </p>
                )}
              </div>
              <button onClick={handleSubmit} disabled={!canSubmit || !isVerified}
                className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all ${canSubmit && isVerified
                  ? "bg-yellow-400 hover:bg-yellow-500 text-black shadow-md hover:shadow-lg active:scale-[0.98]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}>
                {isSubmitting ? "Placing Order…" : `Place Order (${orderItems.length} item${orderItems.length !== 1 ? "s" : ""})`}
              </button>
              {!isVerified && isAuthenticated && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-center text-sm flex flex-col gap-2">
                  <p className="font-bold">Email Verification Required</p>
                  <p>You must verify your email before you can place an order.</p>
                  <button
                    onClick={() => window.location.href = '/customer-settings'}
                    className="text-black underline font-bold"
                  >
                    Go to Settings to verify
                  </button>
                </div>
              )}
              {submitError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center text-sm">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-center text-sm">
                  ✓ Order placed successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCheckout;
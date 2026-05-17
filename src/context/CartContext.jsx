import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from '../context/CustomerAuthContext';

const GUEST_KEY = "cart:guest";
const userKey = (uid) => `cart:${uid}`;

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const isFirstMount = useRef(true);

  const getKey = () =>
    currentUser?.id ? userKey(currentUser.id) : GUEST_KEY;

  // Load correct cart on first mount
  const [cartItems, setCartItems] = useState(() => {
    try {
      const uid = currentUser?.id;
      const key = uid ? userKey(uid) : GUEST_KEY;
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Re-load (and merge guest cart) whenever the logged-in user changes
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    try {
      const key = getKey();
      const stored = sessionStorage.getItem(key);
      const userCart = stored ? JSON.parse(stored) : [];

      if (currentUser?.id) {
        const guestStored = sessionStorage.getItem(GUEST_KEY);
        const guestItems = guestStored ? JSON.parse(guestStored) : [];

        if (guestItems.length > 0) {
          const merged = [...userCart];
          guestItems.forEach((guestItem) => {
            const existingIdx = merged.findIndex(
              (i) =>
                i.productId === guestItem.productId &&
                i.size === guestItem.size &&
                i.type === guestItem.type
            );
            if (existingIdx !== -1) {
              merged[existingIdx] = {
                ...merged[existingIdx],
                quantity: merged[existingIdx].quantity + guestItem.quantity,
              };
            } else {
              merged.push({
                ...guestItem,
                cartId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              });
            }
          });
          sessionStorage.removeItem(GUEST_KEY);
          setCartItems(merged);
          return;
        }
      }
      setCartItems(userCart);
    } catch {
      setCartItems([]);
    }
  }, [currentUser?.id]);

  // Persist — skip the first render after a key switch to avoid overwriting
  const prevKeyRef = useRef(getKey());
  useEffect(() => {
    const currentKey = getKey();
    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;
      return;
    }
    sessionStorage.setItem(currentKey, JSON.stringify(cartItems));
  }, [cartItems, currentUser?.id]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addItem = (item) => {
    if (!item.productId || item.price === undefined) {
      console.warn("addItem: missing required fields", item);
      return;
    }
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.size === item.size &&
          i.type === item.type
      );
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + (Number(item.quantity) || 1),
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId:     item.productId,
          title:         item.title        || "Product",
          price:         Number(item.price) || 0,
          originalPrice: item.originalPrice || null,
          promotion_id:  item.promotion_id  || null,
          promoApplied:  item.promoApplied  || null,
          discountType:  item.discountType  || null,
          image:         item.image         || null,
          quantity:      Number(item.quantity) || 1,
          size:          item.size          || null,
          pieces:        Number(item.pieces) || 0,
          type:          item.type          || "",
          category:      item.category      || "",
          designImage:   item.designImage   || null,
          cartId:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      ];
    });
  };

  const removeItem = (cartId) =>
    setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));

  const updateQuantity = (cartId, quantity) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((i) => (i.cartId === cartId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      sessionStorage.removeItem(getKey());
    } catch (err) {
      console.error("Failed to clear cart storage:", err);
    }
  };

  const totalItems = cartItems.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0),
    0
  );
  const subtotal = cartItems.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};
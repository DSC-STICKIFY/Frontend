import React, { createContext, useContext, useState } from "react";

const UIContext = createContext(undefined);

const CHECKOUT_STORAGE_KEY = "stickify_checkout_data";

const loadCheckoutFromStorage = () => {
  try {
    const stored = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveCheckoutToStorage = (data) => {
  try {
    if (data) {
      const serialisable = { ...data };
      if (serialisable.designImage instanceof File) {
        delete serialisable.designImage;
      }
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(serialisable));
    } else {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    }
  } catch {
  }
};


export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};

export const UIProvider = ({ children }) => {
  const [checkoutData, setCheckoutDataState] = useState(loadCheckoutFromStorage);

  const [toast, setToast] = useState(null);

  const setCheckoutData = (updater) => {
    setCheckoutDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveCheckoutToStorage(next);
      return next;
    });
  };

  const prepareCheckout = (data) => {
    console.log("[UIContext] Preparing checkout with data:", data);
    setCheckoutData(data);
  };

  const clearCheckoutData = () => {
    setCheckoutData(null);
  };

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const value = {
    checkoutData,
    setCheckoutData,
    prepareCheckout,
    clearCheckoutData,

    toast,
    showToast,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

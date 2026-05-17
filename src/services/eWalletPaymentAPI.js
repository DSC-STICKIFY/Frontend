import api from "./api";

export const handleGcashPayment = async (orderId) => {
  try {
    const response = await api.post("/pay-via-gcash", { order_id: orderId });

    const checkoutUrl = response?.data?.checkout_url;

    if (!checkoutUrl) {
      throw new Error("No checkout URL returned from PayMongo.");
    }

    window.location.href = checkoutUrl;
  } catch (err) {
    console.error("GCash Error Detail:", err.response?.data || err.message);
    throw err;
  }
};
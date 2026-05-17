import api from "./api";

const PromoApi = {
  // Product promos only — for listings, TopProducts, product page
  getProductPromos: () =>
    api.get("/promotions/active?display_type=product")
      .then((res) => res.data?.data || []),

  // Checkout vouchers only — for checkout page
  getCheckoutPromos: () =>
    api.get("/promotions/active?display_type=checkout")
      .then((res) => res.data?.data || []),

  // All active (no filter)
  getActive: () =>
    api.get("/promotions/active")
      .then((res) => res.data?.data || []),

  getByProduct: (productId) =>
    api.get(`/promotions/product/${productId}`)
      .then((res) => res.data?.data || []),

  getAll: () =>
    api.get("/promotions")
      .then((res) => res.data?.data || res.data || []),

  getById: (id) =>
    api.get(`/promotions/${id}`)
      .then((res) => res.data?.data || null),

  create: (payload) =>
    api.post("/promotions", payload)
      .then((res) => res.data?.data || res.data),

  update: (id, payload) =>
    api.patch(`/promotions/${id}`, payload)
      .then((res) => res.data?.data || res.data),

  remove: (id) =>
    api.delete(`/promotions/${id}`)
      .then((res) => res.data),
  
  notify: (id) =>
    api.post(`/promotions/${id}/notify`)
      .then((res) => res.data),
};

export default PromoApi;
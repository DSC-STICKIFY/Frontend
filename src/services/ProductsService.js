import api from "./api";

// Display all products for landing page
export const fetchProductList = async () => {
  try {
    const response = await api.get("/all_products");
    return response.data;
  } catch (error) {
    console.error(
      "Failed to fetch products from /all_products:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

//Display all products for admin page
export const fetchAllProducts = async () => {
  try {
    const response = await api.get("/all_products");
    return response.data;
  } catch (error) {
    console.error(
      "Failed to fetch products:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const viewProductDetails = async (product_id) => {
  try {
    const response = await api.get(`/getProducts/product/${product_id}`);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to fetch product ${product_id}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const addProduct = async (productData) => {
  try {
    const response = await api.post("/add_product", productData);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to add product:",
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const updateProduct = async (product_id, updatedData) => {
  try {
    const isFormData = updatedData instanceof FormData;
    const method = isFormData ? "post" : "patch";

    const response = await api[method](
      `/update_product/${product_id}`,
      updatedData,
    );
    return response.data;
  } catch (error) {
    console.error(
      `Failed to update product ${product_id}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const deleteProduct = async (product_id) => {
  try {
    const response = await api.delete(`/delete_product/${product_id}`);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to delete product ${product_id}:`,
      error.response?.data || error.message,
    );
    throw error;
  }
};

/* ================= CATEGORY FETCH FUNCTIONS ================= */

/**
 * Generic fetch helper for category endpoints
 */
const fetchCategory = async (path) => {
  try {
    const res = await api.get(path);
    return res.data;
  } catch (err) {
    console.error(
      `Failed to fetch ${path}:`,
      err.response?.data || err.message,
    );
    throw err;
  }
};

//Explicitly exporting these so Signage.jsx and others don't crash
export const fetchDecals = async () => fetchCategory("/productDecals");
export const fetchStickers = async () => fetchCategory("/productStickers");
export const fetchWrap = async () => fetchCategory("/productWrap");
export const fetchSignages = async () => fetchCategory("/productSignages");
export const fetchGraphicServices = async () =>
  fetchCategory("/productGraphicServices");
export const fetchGiveaways = async () => fetchCategory("/productGiveaways");

/* ================= VARIATION FUNCTIONS ================= */

export const addDesign = async (productId, formData) => {
  try {
    const response = await api.post(`/products/${productId}/designs`, formData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeDesign = async (designId) => {
  try {
    const response = await api.delete(`/products/designs/${designId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addQuality = async (productId, data) => {
  try {
    const response = await api.post(`/products/${productId}/qualities`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeQuality = async (qualityId) => {
  try {
    const response = await api.delete(`/products/qualities/${qualityId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const addSize = async (productId, data) => {
  try {
    const response = await api.post(`/products/${productId}/sizes`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const removeSize = async (sizeId) => {
  try {
    const response = await api.delete(`/products/sizes/${sizeId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default {
  fetchProductList,
  fetchAllProducts,
  viewProductDetails,
  addProduct,
  updateProduct,
  deleteProduct,
  addDesign,
  removeDesign,
  addQuality,
  removeQuality,
  addSize,
  removeSize,
};

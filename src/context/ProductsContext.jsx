import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import { fetchAllProducts } from "../services/ProductsService";
import { getImageUrl } from "../services/api";
import api from "../services/api";
import { getBestPromo, getDiscountedPrice } from "../components/PromoTag";

const ProductsContext = createContext();

const toArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.products)) return payload.products;
  return [];
};

const normalizeProduct = (item) => ({
  ...item,
  id: item.product_id,
  name: item.product_name || "Unnamed Product",
  description: item.product_description || "",
  price: parseFloat(String(item.product_price || 0).replace(/[^0-9.]/g, "")) || 0,
  image: getImageUrl(item.product_image),
  product_image: getImageUrl(item.product_image), // Keep original key as URL too for compatibility
  price_map_image: getImageUrl(item.price_map_image),
  category: item.product_category || "General",
  type: item.product_type || "Uncategorized",
  created_at: item.created_at,
});

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be inside ProductsProvider");
  return ctx;
};

export const ProductsProvider = ({ children }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [popularityMap, setPopularityMap] = useState({});
  const [loading, setLoading] = useState(true);

  // ✅ Fetch active promos once
  const fetchPromos = useCallback(async () => {
    try {
      // Only load product-type promos for the cards context.
      // The server filters by active status, dates, global usage limit,
      // and per-user exhaustion when a Sanctum token is present.
      const res = await api.get("/promotions/active", {
        params: { display_type: "product" },
      });
      setPromos(res.data?.data || []);
    } catch {
      setPromos([]);
    }
  }, []);



  const fetchProducts = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await fetchAllProducts();
      const flat = toArray(res);
      const normalized = flat.map(normalizeProduct);
      const unique = Array.from(new Map(normalized.map(p => [p.id, p])).values());
      setAllProducts(unique);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // ✅ Attach promo data to each product
  const allProductsWithPromos = useMemo(() => {
    console.log("🔄 Recalculating allProductsWithPromos. Active promos count:", promos.length);
    return allProducts.map(product => {
      const promo = getBestPromo(product, promos);
      const discounted = getDiscountedPrice(product.price, promo);

      const isActuallyDiscounted = discounted !== null && discounted < product.price;

      if (promo) {
        console.log(`🏷️ Product: ${product.name} | Original: ${product.price} | Discounted: ${discounted} | Promo: ${promo.name}`);
      }

      return {
        ...product,
        applied_promo: promo || null,
        discounted_price: isActuallyDiscounted ? discounted : null,
      };
    });
  }, [allProducts, promos]);

  useEffect(() => {
    const handleProductAdded = (event) => {
      const normalized = normalizeProduct(event.detail);
      setAllProducts(prev => {
        const exists = prev.find(p => p.id === normalized.id);
        if (exists) return prev.map(p => p.id === normalized.id ? normalized : p);
        return [normalized, ...prev];
      });
    };
    const handleProductUpdated = (event) => {
      const normalized = normalizeProduct(event.detail);
      setAllProducts(prev => prev.map(p => p.id === normalized.id ? normalized : p));
    };
    const handleProductDeleted = (event) => {
      const id = event.detail.product_id || event.detail.id;
      setAllProducts(prev => prev.filter(p => p.id !== id));
    };

    window.addEventListener("product:added",   handleProductAdded);
    window.addEventListener("product:updated", handleProductUpdated);
    window.addEventListener("product:deleted", handleProductDeleted);

    // ✅ Re-fetch when auth status changes (login/logout)
    const handleAuthChange = () => {
      console.log("🔐 Auth status changed, refreshing promos...");
      fetchPromos();
    };
    window.addEventListener("auth:status-changed", handleAuthChange);

    return () => {
      window.removeEventListener("product:added",   handleProductAdded);
      window.removeEventListener("product:updated", handleProductUpdated);
      window.removeEventListener("product:deleted", handleProductDeleted);
      window.removeEventListener("auth:status-changed", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchPromos();
  }, []);

  const groupedProducts = useMemo(() => {
    const map = {};
    allProductsWithPromos.forEach(p => {
      if (!map[p.category]) map[p.category] = {};
      if (!map[p.category][p.type]) map[p.category][p.type] = [];
      map[p.category][p.type].push(p);
    });
    return Object.entries(map).map(([category, types]) => ({
      category,
      subcategories: Object.entries(types).map(([type, items]) => ({ type, items }))
    }));
  }, [allProductsWithPromos]);

  const value = useMemo(() => ({
    allProducts: allProductsWithPromos,
    groupedProducts,
    popularityMap,
    loading,
    refreshProducts: () => {
      fetchProducts(true);
      fetchPromos();
    }
  }), [allProductsWithPromos, groupedProducts, popularityMap, loading]);

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};
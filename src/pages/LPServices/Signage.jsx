import React, { useState, useMemo, useEffect, useRef } from "react";
import cart from "../../assets/servicesImgIcon/stickers/cart.svg";
import ModalSignage from "../../components/ModalSignage.jsx";
import StoreLocation from "../../components/StoreLocation.jsx";
import { useProducts } from "../../context/ProductsContext";
import { fetchCurrentUser } from "../../services/authService";
import { getImageUrl } from "../../services/api";
import PromoTag from "../../components/PromoTag";
import bgCustomer from "../../assets/servicesImgIcon/signage/signageBG.png";

// ── Skeleton Card (exactly as Sticker) ────────────────────────────────────────
const SkeletonCard = ({ tall = false }) => (
  <div className="w-full animate-pulse">
    <div className={`rounded-2xl bg-gray-200 ${tall ? 'h-64' : 'h-48'}`} />
    <div className="pt-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-5 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// ── Section Component (identical to Sticker's grouping) ───────────────────────
const SignageSection = ({ title, items, onSelect, loading, filterDropdown }) => (
  <div className="my-6">
    <div className="flex justify-between items-center mb-6 px-4">
      <h2 className="font-bold text-3xl">{title}</h2>
      {filterDropdown}
    </div>
    {loading ? (
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    ) : items.length === 0 ? (
      <p className="text-gray-400 text-sm mt-5">No {title?.toLowerCase() ?? 'products'} available at the moment.</p>
    ) : (
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <SignageItem key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Signage = () => {
  const { allProducts, loading, refreshProducts } = useProducts();
  const [selectedSignage, setSelectedSignage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [productNatureFilter, setProductNatureFilter] = useState("All");
  const scrollPositionRef = useRef(null);
  const isRefreshingRef = useRef(false);

  // Auto-refresh every 60s, preserve scroll
  useEffect(() => {
    const interval = setInterval(() => {
      scrollPositionRef.current = window.scrollY;
      isRefreshingRef.current = true;
      refreshProducts();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshProducts]);

  useEffect(() => {
    if (isRefreshingRef.current && scrollPositionRef.current !== null) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
        isRefreshingRef.current = false;
      });
    }
  }, [allProducts]);

  // Fetch current user (for address in modal)
  useEffect(() => {
    const load = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setUserLoading(false);
        return;
      }
      try {
        const res = await fetchCurrentUser();
        setCurrentUser(res.data);
      } catch (err) {
        console.error("Failed to load user info:", err);
      } finally {
        setUserLoading(false);
      }
    };
    load();
  }, []);

  // Categorise products (Acrylic, Panaflex, Neon) – using product fields directly
  const { acrylicList, panaflexList, neonList } = useMemo(() => {
    let signageProducts = allProducts.filter(
      (p) => p.category?.toLowerCase() === "signage"
    );

    const hasAnyAcrylic = signageProducts.some(p => {
      const type = (p.type || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return type.includes('acrylic') || name.includes('acrylic') || name.includes('buildup') || (!type.includes('panaflex') && !name.includes('panaflex') && !name.includes('pana') && !type.includes('neon') && !name.includes('neon'));
    });
    const hasAnyPanaflex = signageProducts.some(p => {
      const type = (p.type || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return type.includes('panaflex') || name.includes('panaflex') || name.includes('pana');
    });
    const hasAnyNeon = signageProducts.some(p => {
      const type = (p.type || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return type.includes('neon') || name.includes('neon');
    });

    if (productNatureFilter === "Customizable") {
      signageProducts = signageProducts.filter(p => p.is_customizable !== 0 && p.is_customizable !== false && p.is_customizable !== "0");
    } else if (productNatureFilter === "Ready Made") {
      signageProducts = signageProducts.filter(p => p.is_customizable === 0 || p.is_customizable === false || p.is_customizable === "0");
    }

    const acrylic = [];
    const panaflex = [];
    const neon = [];

    signageProducts.forEach((product) => {
      const name = (product.name || product.product_name || "").toLowerCase();
      const type = (product.type || product.product_type || "").toLowerCase();

      // Build item exactly like Sticker does
      const item = {
        ...product,
        id: product.id,
        image: product.image || product.product_image,
        title: product.name || product.product_name,
        price: parseFloat(product.price || product.product_price || 0),
        discounted_price: product.discounted_price ?? null,
        applied_promo: product.applied_promo ?? null,
        description: product.description || product.product_description || "",
        type: product.type || product.product_type || "",
        category: product.category,
        modalType: "signageModal",
        // Extra fields for Signage (optional)
        colors: "Multi",
        product_id: product.id,
        product_name: product.name || product.product_name,
        product_price: product.discounted_price || product.price || product.product_price,
        product_description: product.description || product.product_description,
        product_image: product.image || product.product_image,
      };

      if (
        type.includes("acrylic") ||
        name.includes("acrylic") ||
        name.includes("buildup")
      ) {
        item.categoryDisplay = "Acrylic Signage";
        acrylic.push(item);
      } else if (
        type.includes("panaflex") ||
        name.includes("panaflex") ||
        name.includes("pana")
      ) {
        item.categoryDisplay = "Panaflex Signage";
        panaflex.push(item);
      } else if (type.includes("neon") || name.includes("neon")) {
        item.categoryDisplay = "Neon Lights";
        item.colors = product.quantity || "1";
        neon.push(item);
      } else {
        // fallback
        item.categoryDisplay = "Acrylic Signage";
        acrylic.push(item);
      }
    });

    return { acrylicList: acrylic, panaflexList: panaflex, neonList: neon, hasAnyAcrylic, hasAnyPanaflex, hasAnyNeon };
  }, [allProducts, productNatureFilter]);

  const handleSelect = (item) =>
    setSelectedSignage({
      ...item,
      userAddress: currentUser?.address || "No address saved",
    });

  // Combined loading state
  const isLoading = loading || userLoading;

  return (
    <>
      {/* Banner */}
      <div className="relative w-full overflow-hidden rounded-2xl mb-8">
        <img
          src={bgCustomer}
          className="w-full h-90 object-cover object-center"
          alt="Signage Banner"
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-5 text-white text-[17px] italic font-medium w-full text-center">
          Signage That Makes Your Brand Seen.
        </div>
      </div>

      {/* Sections */}
      <SignageSection
        title="Acrylic Signage"
        items={acrylicList}
        onSelect={handleSelect}
        loading={isLoading}
        filterDropdown={
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                {['All', 'Ready Made', 'Customizable'].map((opt) => (
                    <button
                        key={opt}
                        onClick={() => setProductNatureFilter(opt)}
                        className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                            productNatureFilter === opt 
                                ? 'bg-black text-white shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        }
      />
      <SignageSection
        title="Panaflex Signage"
        items={panaflexList}
        onSelect={handleSelect}
        loading={isLoading}
      />
      <SignageSection
        title="Neon Lights"
        items={neonList}
        onSelect={handleSelect}
        loading={isLoading}
      />

      {/* Empty state (if all sections empty and not loading) */}
      {!isLoading &&
        acrylicList.length === 0 &&
        panaflexList.length === 0 &&
        neonList.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No signage products available yet.</p>
            <p className="text-gray-400 mt-2">
              Products added by admin will appear here automatically!
            </p>
          </div>
        )}

      {/* Neon CTA */}
      <div className="flex flex-col md:flex-row gap-5 my-20 justify-center items-center w-full px-8">
        <p className="text-lg font-semibold text-center md:text-left">
          Want more colors for your neon lights signage?
        </p>
        <button className="bg-black text-white px-8 py-3 rounded-xl hover:bg-gray-800 transition font-semibold">
          Message to Customize
        </button>
      </div>

      {/* Store */}
      <div>
        <h2 className="font-semibold">Visit our physical store for retail purchases</h2>
        <StoreLocation />
      </div>

      {/* Modal */}
      {selectedSignage?.modalType === "signageModal" && (
        <ModalSignage
          signage={selectedSignage}
          onClose={() => setSelectedSignage(null)}
        />
      )}
    </>
  );
};

// ── Signage Card (inline price display, same as Sticker) ───────────────────────
const SignageItem = ({ item, onSelect }) => {
  const original = item.price;
  const discounted = item.discounted_price;
  const hasDiscount = discounted !== null && discounted !== undefined && discounted < original;

  return (
    <div className="group">
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm group-hover:shadow-md transition-shadow duration-200"
        onClick={() => onSelect(item)}
      >
        <PromoTag promo={item.applied_promo} />
        <img
          src={getImageUrl(item.image)}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          alt={item.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "";
          }}
        />
      </div>
      <div className="font-semibold mt-3">
        <p className="text-base font-bold text-gray-900 truncate">{item.title}</p>
        {item.type && (
          <p className="text-blue-500 font-semibold text-xs mt-0.5 truncate">
            {item.type}
          </p>
        )}
        {item.applied_promo && (
          <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide mt-0.5">
            🏷 {item.applied_promo.name}
          </p>
        )}
        <div className="flex justify-between items-center mt-1 gap-2">
          {/* Price display – inline (no external component) */}
          <div className="flex flex-col gap-0.5">
            {hasDiscount ? (
              <>
                <span className="text-gray-400 line-through text-sm">
                  ₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
                <span className="font-black text-red-500 text-lg">
                  ₱{discounted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </>
            ) : (
              <span className="font-bold text-gray-900 text-lg">
                ₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            )}
            {item.applied_promo?.discount_type === "free_shipping" && (
              <span className="text-green-600 font-bold text-[10px] uppercase">
                + Free Shipping
              </span>
            )}
          </div>
          <button
            className="flex-shrink-0 rounded-xl border border-gray-300 p-2 w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition"
            onClick={() => onSelect(item)}
          >
            <img src={cart} alt="Add to cart" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signage;
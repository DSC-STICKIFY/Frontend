import React, { useState, useMemo, useEffect } from 'react';
import CustDBProductsLayout from '../../../layouts/CustDBProductsLayout.jsx';
import bg from '../../../assets/servicesImgIcon/signage/signageBG.png';
import cart from '../../../assets/servicesImgIcon/stickers/cart.svg';
import ModalSignage from '../../../components/productmodal/ModalSignage.jsx';
import { useProducts } from '../../../context/ProductsContext';
import { fetchCurrentUser } from '../../../services/authService';
import { getImageUrl } from '../../../services/api';
import PromoTag from '../../../components/PromoTag';
import defaultImg from '../../../assets/servicesImgIcon/signage/ac1.png';

// ── Enhanced PriceDisplay (mirrors Sticker component) ───────────────────────
const PriceDisplay = ({ price, discountedPrice, promo, className = "text-lg" }) => {
  const original = parseFloat(price) || 0;
  const discounted = parseFloat(discountedPrice) || 0;
  const hasDiscount =
    discountedPrice !== null &&
    discountedPrice !== undefined &&
    discounted < original;

  if (hasDiscount) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className={`${className} font-black text-red-500`}>
            ₱{discounted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-gray-400 line-through">
            ₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed") && (
          <span className="text-[10px] text-red-600 font-bold text-left block">
            {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : `₱${promo.discount_value} OFF`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`${className} font-bold text-gray-900`}>
        ₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
      </span>
      {promo?.discount_type === "free_shipping" && (
        <span className="text-green-600 font-bold text-[10px] uppercase">
          + Free Shipping
        </span>
      )}
    </div>
  );
};

// ── Skeleton Card (consistent with Sticker) ──────────────────────────────────
const SkeletonCard = ({ tall = false }) => (
  <div className="w-full animate-pulse">
    <div className={`rounded-2xl bg-gray-200 ${tall ? 'h-64' : 'h-48'}`} />
    <div className="pt-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-5 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const Signage = () => {
  const { allProducts, loading, refreshProducts } = useProducts();
  const [selectedSignage, setSelectedSignage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [productNatureFilter, setProductNatureFilter] = useState("All");

  // Refresh every 60 seconds (same as Sticker)
  useEffect(() => {
    const interval = setInterval(() => refreshProducts(), 60000);
    return () => clearInterval(interval);
  }, [refreshProducts]);

  // Fetch current user (for address in modal if needed)
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

  // Categorise products into acrylic, panaflex, neon
  const { acrylicList, panaflexList, neonList, hasAnyAcrylic, hasAnyPanaflex, hasAnyNeon } = useMemo(() => {
    let signageProducts = allProducts.filter(
      (p) => p.category?.toLowerCase() === 'signage'
    );

    const hasAnyAcrylic = signageProducts.some(p => {
      const type = (p.type || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return type.includes('acrylic') || name.includes('acrylic') || name.includes('buildup') || (!type.includes('panaflex') && !name.includes('panaflex') && !type.includes('neon') && !name.includes('neon'));
    });
    const hasAnyPanaflex = signageProducts.some(p => {
      const type = (p.type || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      return type.includes('panaflex') || name.includes('panaflex');
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
      const name = (product.name || "").toLowerCase();
      const type = (product.type || "").toLowerCase();

      // Build item with proper fields (mirrors Sticker mapping)
      const item = {
        ...product,
        id: product.id,
        image: product.image || product.product_image,
        title: product.name || product.product_name,
        price: parseFloat(product.price || product.product_price || 0),
        discounted_price: product.discounted_price ?? null,
        applied_promo: product.applied_promo ?? null,
        description: product.description || product.product_description || '',
        type: product.type || product.product_type || '',
        category: product.category,
        modalType: "signageModal",
        // Extra fields for Signage specifics
        colors: "Multi",
        product_id: product.id,
        product_name: product.name || product.product_name,
        product_price: product.discounted_price || product.price || product.product_price,
        product_description: product.description || product.product_description,
        product_image: product.image || product.product_image,
      };

      if (type.includes('acrylic') || name.includes('acrylic') || name.includes('buildup')) {
        item.categoryDisplay = "Acrylic Signage";
        acrylic.push(item);
      } else if (type.includes('panaflex') || name.includes('panaflex')) {
        item.categoryDisplay = "Panaflex Signage";
        panaflex.push(item);
      } else if (type.includes('neon') || name.includes('neon')) {
        item.categoryDisplay = "Neon Lights";
        item.colors = product.quantity || "1";
        neon.push(item);
      } else {
        // fallback
        item.categoryDisplay = "Signage";
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

  // Loading state (skeletons + userLoading)
  if (loading || userLoading) {
    return (
      <CustDBProductsLayout categoryName="Signage">
        <div className="w-full h-90 bg-gray-200 animate-pulse rounded-2xl mb-8" />
        <div className="my-6">
          <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </CustDBProductsLayout>
    );
  }

  // Render function for each product card (identical layout style as Sticker)
  const renderCard = (item) => (
    <div key={item.id} className="group">
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm group-hover:shadow-md transition-shadow duration-200"
        onClick={() => handleSelect(item)}
      >
        <PromoTag promo={item.applied_promo} />
                                            {(item.is_customizable !== 0 && item.is_customizable !== false && item.is_customizable !== "0" && item.is_customizable !== undefined) ? (
                        <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#FDE31E] text-black border border-yellow-400/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:bg-[#ffe838] select-none pointer-events-none">
                          Customizable
                        </span>
                      ) : (
                        <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#0B132A] text-white border border-slate-700/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:bg-[#152244] select-none pointer-events-none">
                          Ready Made
                        </span>
                      )}



        <img
          src={getImageUrl(item.image) || defaultImg}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          alt={item.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultImg;
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
        {item.description && (
          <p className="text-gray-500 text-[11px] line-clamp-2 leading-relaxed mt-1">
            {item.description}
          </p>
        )}
        
        <div className="flex justify-between items-center mt-1 gap-2">
          <PriceDisplay
            price={item.price}
            discountedPrice={item.discounted_price}
            promo={item.applied_promo}
            className="text-lg"
          />
          <button
            className="flex-shrink-0 rounded-xl border border-gray-300 p-2 w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition"
            onClick={() => handleSelect(item)}
          >
            <img src={cart} alt="Add to cart" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <CustDBProductsLayout categoryName="Signage">
      {/* Banner */}
      <div className="relative w-full overflow-hidden rounded-2xl mb-8">
        <img
          src={bg}
          className="w-full h-90 object-cover object-center"
          alt="Signage Banner"
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-5 text-white text-[17px] italic font-medium w-full text-center">
          Signage That Makes Your Brand Seen.
        </div>
      </div>

      {/* Acrylic Signage */}
      {hasAnyAcrylic && (
        <div className="my-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-3xl">Acrylic Signage</h2>
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
          </div>
          {acrylicList.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {acrylicList.map(renderCard)}
            </div>
          ) : (
            <p className="text-gray-500 italic py-4">No products match the selected filter.</p>
          )}
        </div>
      )}

      {/* Panaflex Signage */}
      {hasAnyPanaflex && (
        <div className="my-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-3xl">Panaflex Signage</h2>
            {(!hasAnyAcrylic || (acrylicList.length === 0 && !hasAnyAcrylic)) && (
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
            )}
          </div>
          {panaflexList.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {panaflexList.map(renderCard)}
            </div>
          ) : (
            <p className="text-gray-500 italic py-4">No products match the selected filter.</p>
          )}
        </div>
      )}

      {/* Neon Lights */}
      {hasAnyNeon && (
        <div className="my-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-3xl">Neon Lights Signage</h2>
            {((!hasAnyAcrylic && !hasAnyPanaflex) || (acrylicList.length === 0 && panaflexList.length === 0 && !hasAnyAcrylic && !hasAnyPanaflex)) && (
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
            )}
          </div>
          {neonList.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {neonList.map(renderCard)}
            </div>
          ) : (
            <p className="text-gray-500 italic py-4">No products match the selected filter.</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {acrylicList.length === 0 &&
        panaflexList.length === 0 &&
        neonList.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No signage products available yet.</p>
            <p className="text-gray-400 mt-2">
              Products added by admin will appear here automatically!
            </p>
          </div>
        )}

      {selectedSignage && (
        <ModalSignage
          signage={selectedSignage}
          onClose={() => setSelectedSignage(null)}
        />
      )}
    </CustDBProductsLayout>
  );
};

export default Signage;
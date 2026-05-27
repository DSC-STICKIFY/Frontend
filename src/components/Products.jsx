import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl, PLACEHOLDER_IMAGE } from "../services/api";
import PromoTag from "../components/PromoTag";
import CartToast from "./CartToast";

const CATEGORY_ORDER = [
  "Stickers", "Decals & Wrap", "Signage",
  "Giveaways", "Graphic Services", "Printing",
];

const CATEGORY_URL_MAP = {
  "Stickers": "/services/sticker",
  "Decals & Wrap": "/services/decal-wrap",
  "Signage": "/services/signage",
  "Giveaways": "/services/giveaways",
  "Graphic Services": "/services/graphic-services",
  "Printing": "/services/printing",
};

const Products = ({ onProductClick, onOrderNowClick, onAddToCartClick = () => {}, products = [], cartItems = [] }) => {
  const navigate = useNavigate();
  const [activeToastId, setActiveToastId] = useState(null);

  useEffect(() => {
    if (activeToastId !== null) {
      const timer = setTimeout(() => setActiveToastId(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [activeToastId]);

  const getCartCount = (item) =>
    cartItems
      .filter((c) => c.productId === (item.id || item.product_id))
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);

  const handleViewAll = (category) => {
    const url = CATEGORY_URL_MAP[category];
    if (url) {
      navigate(url);
      window.scrollTo(0, 0);
    }
  };

  const groupedProducts = useMemo(() => {
    const groups = {};
    if (!Array.isArray(products)) return {};
    products.forEach((product) => {
      const category = product.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(product);
    });
    return groups;
  }, [products]);

  const sortedCategoryKeys = useMemo(() => {
    return Object.keys(groupedProducts).sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [groupedProducts]);

  if (sortedCategoryKeys.length === 0) {
    return (
      <div className="w-full text-center py-20 text-gray-500 text-lg">
        No products found matching your search.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sortedCategoryKeys.map((category) => {
        const items = groupedProducts[category];

        return (
          <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[#E1E1E1] py-4 px-6 font-bold items-start sm:items-center">
              <h2 className="text-lg text-gray-800 uppercase tracking-wide">{category}</h2>
              <span 
                className="text-blue-600 text-sm cursor-pointer hover:underline mt-2 sm:mt-0"
                onClick={() => handleViewAll(category)}
              >
                View all {category}
              </span>
            </div>

            <div className="flex overflow-x-auto p-6 gap-6 custom-scroll">
              {items.map((item) => {
                const promo           = item.applied_promo || null;
                const originalPrice   = parseFloat(item.price || 0);
                const discountedPrice = item.discounted_price ?? null;

                // Only treat as discounted if discounted price is strictly less than original
                const hasDiscount =
                  discountedPrice !== null && discountedPrice < originalPrice;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl w-[300px] min-w-[300px] flex-shrink-0 border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-300 flex flex-col group"
                    onClick={() => onProductClick(item)}
                  >
                    {/* Image + Badge */}
                    <div className="relative h-[250px] w-full rounded-t-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <PromoTag promo={promo} />
                      {!((item.category || item.product_category || '').toLowerCase().includes('decal') || (item.category || item.product_category || '').toLowerCase().includes('wrap')) && (
                        (item.is_customizable !== 0 && item.is_customizable !== false && item.is_customizable !== "0" && item.is_customizable !== undefined) ? (
                          <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#FDE31E] text-black border border-yellow-400/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:bg-[#ffe838] select-none pointer-events-none">
                            Customizable
                          </span>
                        ) : (
                          <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#0B132A] text-white border border-slate-700/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:bg-[#152244] select-none pointer-events-none">
                            Ready Made
                          </span>
                        )
                      )}

                      <img
                        src={getImageUrl(item.image || item.product_image)}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    </div>

                    {/* Card body */}
                    <div className="px-4 py-4 flex flex-col flex-1">
                      <div className="flex flex-col gap-1 mb-4">
                        <h3 className="font-bold text-gray-900 text-lg truncate">
                          {item.name}
                        </h3>
                        {item.type && (
                          <p className="text-blue-600 font-semibold text-xs truncate">
                            {item.type}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-gray-500 text-[13px] line-clamp-2 leading-relaxed mt-1 h-8">
                            {item.description}
                          </p>
                        )}
                        
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-center gap-2 mb-3">
                          {(item.category || item.product_category || "").toLowerCase().includes("decal") ? (
                            <span className="text-sm font-bold text-gray-400 italic">Service Inquiry Only</span>
                          ) : hasDiscount ? (
                            <>
                              <span className="text-gray-400 text-sm line-through">
                                ₱{originalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-red-500 font-black text-sm">
                                ₱{discountedPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-900 font-bold text-sm">
                              ₱{originalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                              {promo?.discount_type === "free_shipping" && (
                                <span className="ml-2 text-green-600 font-bold text-[10px] uppercase">
                                  + Free Shipping
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="flex-1 bg-[#FDE31E] text-black font-bold py-2.5 rounded-lg hover:bg-yellow-400 transition shadow-sm active:scale-[0.98]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOrderNowClick(item);
                            }}
                          >
                            {(item.category || item.product_category || "").toLowerCase().includes("decal") ? "Inquire now" : "Order Now"}
                          </button>
                          {!((item.category || item.product_category || "").toLowerCase().includes("decal") || (item.category || item.product_category || "").toLowerCase().includes("wrap")) && (() => {
                            const count = getCartCount(item);
                            return (
                              <div className="relative">
                                <button
                                  type="button"
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-2.5 rounded-lg transition active:scale-[0.98] flex items-center justify-center relative"
                                  title="Add to Cart"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCartClick(item, e);
                                    setActiveToastId(item.id || item.product_id);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                                  </svg>
                                  {count > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#FDE31E] text-black text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm leading-none">
                                      {count > 99 ? "99+" : count}
                                    </span>
                                  )}
                                </button>
                                {activeToastId === (item.id || item.product_id) && (
                                  <div className="absolute bottom-full right-0 mb-2 z-[100] pointer-events-auto">
                                    <CartToast
                                      onViewCart={() => {
                                        setActiveToastId(null);
                                        navigate(window.location.pathname.includes("customer") ? "/customer-cart" : "/cart");
                                      }}
                                      onClose={() => setActiveToastId(null)}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Products;
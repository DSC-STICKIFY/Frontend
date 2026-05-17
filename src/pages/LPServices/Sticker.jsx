import React, { useState, useMemo, useEffect } from 'react';
import { useProducts } from '../../context/ProductsContext';
import PromoTag from '../../components/PromoTag';
import ModalAssortedHologram from '../../components/ModalAssortedHologram.jsx';
import ModalMoreStickers from '../../components/ModalMoreStickers.jsx';
import StoreLocation from '../../components/StoreLocation.jsx';
import { getImageUrl } from '../../services/api';
import { fetchCurrentUser } from '../../services/authService';

import bg from '../../assets/LPStickers.png';
import cart from '../../assets/servicesImgIcon/stickers/cart.svg';
import defaultImg from '../../assets/servicesImgIcon/stickers/glossy.png';

// ── Price Display (identical to first component) ─────────────────────────────
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
        <span className={`${className} text-gray-400 line-through`}>
          ₱{original.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
        <span className={`${className} font-black text-red-500`}>
          ₱{discounted.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </span>
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

// ── Skeleton Card ─────────────────────────────────────────────────────────────
const SkeletonCard = ({ tall = false }) => (
  <div className="w-full animate-pulse">
    <div className={`rounded-2xl bg-gray-200 ${tall ? 'h-64' : 'h-48'}`} />
    <div className="pt-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-5 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// ── Helper: matches first component's isAssortedType ─────────────────────────
const isAssortedType = (p) => {
  const type = (p.type || p.product_type || '').toLowerCase();
  const name = (p.name || p.product_name || '').toLowerCase();
  return type.includes('assorted') || name.includes('set');
};

// ── Main Component ───────────────────────────────────────────────────────────
const Sticker = () => {
  const { allProducts, loading, refreshProducts } = useProducts();
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => refreshProducts(), 60000);
    return () => clearInterval(interval);
  }, [refreshProducts]);

  // Fetch current user for address
  useEffect(() => {
    const loadUser = async () => {
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
    loadUser();
  }, []);

  // Filter products
  const { assortedList, moreStickersList } = useMemo(() => {
    const stickersProducts = allProducts.filter(p =>
      p.category?.toLowerCase() === 'stickers'
    );

    const assorted = stickersProducts.filter(p => isAssortedType(p));
    const more = stickersProducts.filter(p => !isAssortedType(p));

    const mapItem = (p, modalType) => ({
      id: p.id,
      image: p.image || p.product_image || defaultImg,
      title: p.name || p.product_name,
      price: parseFloat(p.price || p.product_price || 0),
      discounted_price: p.discounted_price ?? null,
      applied_promo: p.applied_promo ?? null,
      description: p.description || p.product_description || '',
      type: p.type || p.product_type || '',
      category: p.category,
      modalType,
      product_id: p.id,
      product_name: p.name || p.product_name,
      product_price: p.discounted_price || p.price || p.product_price,
      product_quantity: p.quantity || p.product_quantity,
      product_description: p.description || p.product_description || '',
      product_image: p.image || p.product_image,
      qty: (p.quantity || p.product_quantity) ? `${p.quantity || p.product_quantity} pcs` : '',
    });

    return {
      assortedList: assorted.map(p => mapItem(p, 'assorted')),
      moreStickersList: more.map(p => mapItem(p, 'more')),
    };
  }, [allProducts]);

  const handleSelect = (item) => {
    setSelectedSticker({
      ...item,
      userAddress: currentUser?.address || "No address saved",
    });
  };

  const isLoading = loading || userLoading;

  return (
    <>
      {/* Banner – FIXED: No overlapping, responsive, no duplicate text */}
      <div className="relative w-full overflow-hidden rounded-2xl mb-8">
        <img 
          src={bg} 
          className="w-full h-auto min-h-[300px] md:min-h-[400px] object-cover" 
          alt="Stickers Banner" 
        />

      </div>

      {/* Assorted Hologram Stickers */}
      {assortedList.length > 0 && (
        <div className="my-6">
          <h2 className="font-bold text-3xl">Assorted Hologram Stickers</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assortedList.map(item => (
              <div className="w-full group" key={item.id}>
                <div
                  className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm group-hover:shadow-md transition-shadow duration-200"
                  onClick={() => handleSelect(item)}
                >
                  <PromoTag promo={item.applied_promo} />
                  <img
                    src={getImageUrl(item.image)}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                    alt={item.title}
                    onError={(e) => { e.target.onerror = null; }}
                  />
                  {item.qty && (
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
                      <p className="text-[11px] font-bold text-black">{item.qty}</p>
                    </div>
                  )}
                </div>
                <div className="font-semibold mt-3">
                  <p className="text-base font-bold text-gray-900 truncate">{item.title}</p>
                  {item.type && (
                    <p className="text-blue-500 font-semibold text-xs mt-0.5 truncate">{item.type}</p>
                  )}
                  {item.applied_promo && (
                    <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide mt-0.5">
                      🏷 {item.applied_promo.name}
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
            ))}
          </div>
        </div>
      )}

      {/* More Stickers */}
      {moreStickersList.length > 0 && (
        <div className="my-6">
          <h2 className="font-bold text-3xl">More Stickers</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {moreStickersList.map(item => (
              <div key={item.id} className="group">
                <div
                  className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm group-hover:shadow-md transition-shadow duration-200"
                  onClick={() => handleSelect(item)}
                >
                  <PromoTag promo={item.applied_promo} />
                  <img
                    src={getImageUrl(item.image)}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                    alt={item.title}
                    onError={(e) => { e.target.onerror = null; }}
                  />
                </div>
                <div className="font-semibold mt-3">
                  <p className="text-base font-bold text-gray-900 truncate">{item.title}</p>
                  {item.type && (
                    <p className="text-blue-500 font-semibold text-xs mt-0.5 truncate">{item.type}</p>
                  )}
                  {item.applied_promo && (
                    <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide mt-0.5">
                      🏷 {item.applied_promo.name}
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
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assortedList.length === 0 && moreStickersList.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <p className="text-gray-500 text-xl">No sticker products available yet.</p>
          <p className="text-gray-400 mt-2">Products added by admin will appear here automatically!</p>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <>
          <div className="my-6">
            <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mb-5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} tall />)}
            </div>
          </div>
          <div className="my-6">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </>
      )}

      <StoreLocation />

      {/* Modals */}
      {selectedSticker?.modalType === "assorted" && (
        <ModalAssortedHologram sticker={selectedSticker} onClose={() => setSelectedSticker(null)} />
      )}
      {selectedSticker?.modalType === "more" && (
        <ModalMoreStickers sticker={selectedSticker} onClose={() => setSelectedSticker(null)} />
      )}
    </>
  );
};

export default Sticker;
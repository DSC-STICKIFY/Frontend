import React, { useState, useMemo, useEffect, useRef } from 'react';
import CustDBProductsLayout from '../../../layouts/CustDBProductsLayout.jsx';
import { fetchCurrentUser } from '../../../services/authService';
import { useProducts } from '../../../context/ProductsContext';
import PromoTag from '../../../components/PromoTag';

import cart from '../../../assets/servicesImgIcon/stickers/cart.svg';
import ModalPrinting from '../../../components/ModalPrinting.jsx';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../../../services/api';
import bgPrinting from "../../../assets/LPGraphicServices.png"; 

// ── Price Display ─────────────────────────────────────────────────────────────
const PriceDisplay = ({ price, discountedPrice, promo, className = "text-lg" }) => {
  const original   = parseFloat(price) || 0;
  const discounted = parseFloat(discountedPrice) || 0;
  const hasDiscount = discountedPrice !== null && discountedPrice !== undefined && discounted < original;

  if (hasDiscount) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className={`${className} text-gray-400 line-through text-sm`}>
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
const SkeletonCard = () => (
  <div className="w-full animate-pulse">
    <div className={`rounded-2xl bg-gray-200 h-48`} />
    <div className="pt-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-5 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

// ── Section Component ─────────────────────────────────────────────────────────
const PrintingSection = ({ title, items, onSelect, loading, filterDropdown }) => (
  <div className="my-10 px-2">
    <div className="flex justify-between items-center mb-8">
        <h2 className="font-bold text-3xl">{title}</h2>
        {filterDropdown}
    </div>
    {loading ? (
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    ) : items.length === 0 ? (
      <p className="text-gray-400 text-sm mt-5 italic">No {title.toLowerCase()} available at the moment.</p>
    ) : (
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    )}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Printing = () => {
  const { allProducts, loading, refreshProducts } = useProducts();
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentUser, setCurrentUser]   = useState(null);
  const [userLoading, setUserLoading]   = useState(true);
  const [productNatureFilter, setProductNatureFilter] = useState("All");

  useEffect(() => {
    const interval = setInterval(() => refreshProducts(), 60000);
    return () => clearInterval(interval);
  }, [refreshProducts]);

  useEffect(() => {
    const load = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) { setUserLoading(false); return; }
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

  const { promoMaterials, businessEssentials, largeFormat } = useMemo(() => {
    let printingProducts = allProducts.filter(p =>
        (p.category || p.product_category || "").toLowerCase() === 'printing'
    );

    if (productNatureFilter === "Customizable") {
      printingProducts = printingProducts.filter(p => p.is_customizable !== 0 && p.is_customizable !== false && p.is_customizable !== "0");
    } else if (productNatureFilter === "Ready Made") {
      printingProducts = printingProducts.filter(p => p.is_customizable === 0 || p.is_customizable === false || p.is_customizable === "0");
    }

    const promo = [];
    const business = [];
    const large = [];

    printingProducts.forEach(product => {
      const name = (product.name || product.product_name || "").toLowerCase();
      const type = (product.type || product.product_type || "").toLowerCase();

      const item = {
        ...product,
        id: product.id || product._id,
        image: product.image || product.product_image,
        title: product.name || product.product_name,
        price: parseFloat(product.price || product.product_price || 0),
        discounted_price: product.discounted_price ?? null,
        applied_promo: product.applied_promo ?? null,
        description: product.description || product.product_description || "",
        type: product.type || product.product_type || "",
        category: "Printing",
      };

      if (name.includes("flyer") || name.includes("brochure") || name.includes("poster") || type.includes("promo")) {
        promo.push(item);
      } else if (name.includes("card") || name.includes("letter") || name.includes("folder") || type.includes("business")) {
        business.push(item);
      } else if (name.includes("banner") || name.includes("tarp") || name.includes("large") || type.includes("format")) {
        large.push(item);
      } else {
        promo.push(item);
      }
    });

    return { promoMaterials: promo, businessEssentials: business, largeFormat: large };
  }, [allProducts, productNatureFilter]);

  const handleSelect = (item) =>
    setSelectedItem({ ...item, userAddress: currentUser?.address || "No address saved" });

  const isLoading = loading || userLoading;

  return (
    <CustDBProductsLayout>
      {/* Banner */}
      <div className="relative w-full overflow-hidden rounded-2xl mb-10">
        <img
          src={bgPrinting}
          alt="Printing Banner"
          className="w-full h-72 object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-[17px] italic font-medium w-full text-center px-4">
            Your Vision, Printed to Perfection.
        </div>
      </div>

      <PrintingSection 
        title="Promotional Materials" 
        items={promoMaterials} 
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
      <PrintingSection title="Business Essentials" items={businessEssentials} onSelect={handleSelect} loading={isLoading} />
      <PrintingSection title="Large Format Printing" items={largeFormat} onSelect={handleSelect} loading={isLoading} />

      {!isLoading && promoMaterials.length === 0 && businessEssentials.length === 0 && largeFormat.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <p className="text-gray-400 font-bold text-lg uppercase tracking-widest italic">No printing products available yet.</p>
        </div>
      )}

      {selectedItem && (
        <ModalPrinting product={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </CustDBProductsLayout>
  );
};

const ProductCard = ({ item, onSelect }) => (
    <div className="group">
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 h-48 bg-gray-50 border border-gray-100"
        onClick={() => onSelect(item)}
      >
        <PromoTag promo={item.applied_promo} />
        <img
          src={getImageUrl(item.image)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          alt={item.title}
          onError={(e) => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMAGE; }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
      </div>
      <div className="font-semibold mt-3 px-1 text-left">
        <p className="text-base font-bold text-gray-900 truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
            {item.type && (
                <span className="text-blue-500 font-semibold text-xs truncate">{item.type}</span>
            )}
            {item.applied_promo && (
                <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wide">🏷 {item.applied_promo.name}</span>
            )}
        </div>
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
            onClick={() => onSelect(item)}
          >
            <img src={cart} alt="Add to cart" />
          </button>
        </div>
      </div>
    </div>
);

export default Printing;

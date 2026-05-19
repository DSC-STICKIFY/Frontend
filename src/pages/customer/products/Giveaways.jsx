import React, { useState, useMemo, useEffect } from 'react';
import CustDBProductsLayout from '../../../layouts/CustDBProductsLayout.jsx';
import cart from '../../../assets/servicesImgIcon/graphicservices/cart.svg';
import { useProducts } from '../../../context/ProductsContext';
import PromoTag from '../../../components/PromoTag'; 

// Components
import ModalMoreStickers from '../../../components/productmodal/ModalMoreStickers.jsx';

import defaultImage from '../../../assets/servicesImgIcon/giveaways/standee.png';


const Giveaways = () => { 
    const [selectedGiveaways, setSelectedGiveaways] = useState(null);
    const [productNatureFilter, setProductNatureFilter] = useState("All");
    const { allProducts, loading, refreshProducts } = useProducts();


    useEffect(() => {
        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing Giveaways (Customer)...');
            refreshProducts();
        }, 5000);
        return () => clearInterval(interval);
    }, [refreshProducts]);

    const getModalType = (product) => {
        const type = product.type?.toLowerCase() || "";
        const name = product.name?.toLowerCase() || "";
        const desc = product.description?.toLowerCase() || "";

        if (type.includes('sintra board') || type.includes('sintraboard')) {
            const identifier = name || desc;
            if (identifier.includes('standee')) {
                return "standee-tarpulinModal";
            } else if (identifier.includes('calling card')) {
                return "callingcardModal";
            }
        }

        if (type.includes('standee') || type.includes('tarpulin')) {
            return "standee-tarpulinModal";
        } else if (type.includes('calling card')) {
            return "callingcardModal";
        } else if (type.includes('mug') || type.includes('shirt')) {
            return "mug-shirtModal";
        } else {
            return "moreModal";
        }
    };

    // Filter and process products using useMemo for performance
    const { bestSellers, moreProducts, hasAnyBest, hasAnyMore } = useMemo(() => {
        let giveawayProducts = allProducts.filter(p =>
            p.category?.toLowerCase() === 'giveaways'
        );

        const bestSellerTypes = ['Standee', 'Tarpulin', 'Magic Mug', 'DriFit T-Shirt', 'Sublimation'];
        const hasAnyBest = giveawayProducts.some(p => bestSellerTypes.some(t => p.type?.includes(t)));
        const hasAnyMore = giveawayProducts.some(p => !bestSellerTypes.some(t => p.type?.includes(t)));

        if (productNatureFilter === "Customizable") {
            giveawayProducts = giveawayProducts.filter(p => p.is_customizable !== 0 && p.is_customizable !== false && p.is_customizable !== "0");
        } else if (productNatureFilter === "Ready Made") {
            giveawayProducts = giveawayProducts.filter(p => p.is_customizable === 0 || p.is_customizable === false || p.is_customizable === "0");
        }

        const best = [];
        const more = [];

        giveawayProducts.forEach(product => {

            const bestPromo = product.applied_promo || null;
            const discountedPrice = product.discounted_price ?? null;
            
            const mappedProduct = {
                ...product,
                product_id: product.id,
                product_name: product.name,
                product_description: product.description,
                product_price: product.discounted_price || product.price,
                product_image: product.image,
                product_quantity: product.quantity || 1,
                type: product.type,
                category: product.category,
                modalType: getModalType(product),
                
                promo: bestPromo,
                originalPrice: product.price,
                discountedPrice: discountedPrice,
            };

            const isBestSeller = bestSellerTypes.some(type => product.type?.includes(type));
            if (isBestSeller) {
                best.push(mappedProduct);
            } else {
                more.push(mappedProduct);
            }
        });

        return { bestSellers: best, moreProducts: more, hasAnyBest, hasAnyMore };
    }, [allProducts, productNatureFilter]);

    // Helper to render price with discount if applicable
    const renderPrice = (product) => {
        const hasDiscount = product.discountedPrice !== null && product.discountedPrice < product.originalPrice;
        if (hasDiscount) {
            const promo = product.promo || product.applied_promo;
            return (
                <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl font-bold text-red-600">
                            ₱{product.discountedPrice.toLocaleString("en-PH")}
                        </span>
                        <span className="text-gray-400 line-through text-xs">
                            ₱{product.originalPrice.toLocaleString("en-PH")}
                        </span>
                    </div>
                    {promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed") && (
                        <span className="text-[10px] text-red-600 font-bold text-left block mt-0.5">
                            {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : `₱${promo.discount_value} OFF`}
                        </span>
                    )}
                </div>
            );
        }
        return (
            <span className="text-xl font-semibold">
                ₱{product.product_price.toLocaleString("en-PH")}
            </span>
        );
    };

    return (
        <CustDBProductsLayout categoryName="Giveaways">

            <div className="flex flex-col md:flex-row justify-between items-end w-full max-w-7xl mx-auto px-4 mt-10 mb-10">
                <div className="text-left">
                    <h1 className='text-[35px] font-bold italic'>
                        Everything You Need, Fully Customized
                    </h1>
                    <p className='text-sm mt-1 tracking-widest'>
                        Wide range of personalized products including apparel, accessories, marketing materials, and display boards.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    <p className="ml-4 text-lg text-gray-600">Loading products...</p>
                </div>
            ) : (
                <>
                    {/* Best Seller Section */}
                    {hasAnyBest && (
                        <div className='my-6'>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className='font-bold text-3xl'>Best Seller</h2>
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
                            {bestSellers.length > 0 ? (
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
                                    {bestSellers.map((item) => (
                                    <div key={item.product_id} className="relative w-full group">
                                        <div className='mt-4 h-fit rounded-[16px]'>
                                            {/*  */}
                                            <div className="relative">
                                                <img
                                                    src={item.product_image || defaultImage}
                                                    alt={item.product_name}
                                                    className='rounded-2xl w-full h-[250px] object-cover'
                                                    onError={(e) => { e.target.src = defaultImage; }}
                                                />
                                                <PromoTag promo={item.promo} />


                                            </div>
                                            <div className="flex flex-col justify-between font-semibold mt-2">
                                                <div>
                                                    <p className="text-sm">{item.product_name}</p>
                                                    <p className="text-[14px] min-h-5 text-gray-600">
                                                        {item.type}
                                                        {item.product_quantity > 1 && ` • ${item.product_quantity} pcs`}
                                                    </p>
                                                    {item.product_description && (
                                                        <p className="text-gray-500 text-[11px] line-clamp-2 leading-relaxed mt-1">
                                                            {item.product_description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    {renderPrice(item)}
                                                    <div
                                                        className="rounded-full border-2 p-2 border-[#5A5A5A] cursor-pointer hover:bg-gray-100"
                                                        onClick={() => setSelectedGiveaways(item)}
                                                    >
                                                        <img src={cart} alt="Add to cart" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic py-4">No products match the selected filter.</p>
                            )}
                        </div>
                    )}

                    {/* More Products Section */}
                    {hasAnyMore && (
                        <div className='my-6'>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className='font-bold text-3xl'>More</h2>
                                {(!hasAnyBest || bestSellers.length === 0 && !hasAnyBest) && (
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
                            {moreProducts.length > 0 ? (
                                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
                                    {moreProducts.map((item) => (
                                    <div key={item.product_id} className="relative w-full group">
                                        <div className='mt-4 h-fit rounded-[16px]'>
                                            <div className="relative">
                                                <img
                                                    src={item.product_image || defaultImage}
                                                    alt={item.product_name}
                                                    className='rounded-2xl w-full h-[250px] object-cover'
                                                    onError={(e) => { e.target.src = defaultImage; }}
                                                />
                                                <PromoTag promo={item.promo} />
                                            {(item.is_customizable !== 0 && item.is_customizable !== false && item.is_customizable !== "0" && item.is_customizable !== undefined) ? (
                        <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#FDE31E] text-black border border-yellow-400/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:bg-[#ffe838] select-none pointer-events-none">
                          Customizable
                        </span>
                      ) : (
                        <span className="absolute top-3 left-3 z-10 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#0B132A] text-white border border-slate-700/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:bg-[#152244] select-none pointer-events-none">
                          Ready Made
                        </span>
                      )}
                                            </div>
                                            <div className="flex flex-col justify-between font-semibold mt-2">
                                                <div>
                                                    <p className="text-sm">{item.product_name}</p>
                                                    <p className="text-[15px] text-gray-600">
                                                        {item.type} • {item.product_quantity} pcs
                                                    </p>
                                                    {item.product_description && (
                                                        <p className="text-gray-500 text-[11px] line-clamp-2 leading-relaxed mt-1">
                                                            {item.product_description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-end mt-2">
                                                    {renderPrice(item)}
                                                    <div
                                                        className="rounded-full border-2 p-2 border-[#5A5A5A] cursor-pointer hover:bg-gray-100"
                                                        onClick={() => setSelectedGiveaways(item)}
                                                    >
                                                        <img src={cart} alt="Add to cart" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 italic py-4">No products match the selected filter.</p>
                            )}
                        </div>
                    )}

                    {bestSellers.length === 0 && moreProducts.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-gray-500 text-xl">No giveaway products available yet.</p>
                            <p className="text-gray-400 mt-2">Products added by admin will appear here automatically!</p>
                        </div>
                    )}
                </>
            )}

            {selectedGiveaways && (
                <ModalMoreStickers
                    sticker={selectedGiveaways}
                    onClose={() => setSelectedGiveaways(null)}
                />
            )}

        </CustDBProductsLayout>
    );
};

export default Giveaways;
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProducts } from '../../context/ProductsContext';
import cart from '../../assets/servicesImgIcon/graphicservices/cart.svg';
import ModalMoreStickers from '../../components/productmodal/ModalMoreStickers.jsx';
import StoreLocation from '../../components/StoreLocation.jsx';
import defaultImg from '../../assets/servicesImgIcon/giveaways/standee.png';
import { getImageUrl } from '../../services/api';
import PromoTag from '../../components/PromoTag';

const Giveaways = () => {
    const { allProducts, loading, refreshProducts } = useProducts();
    const [selectedGiveaways, setSelectedGiveaways] = useState(null);
    const [productNatureFilter, setProductNatureFilter] = useState("All");
    const scrollPositionRef = useRef(null);
    const isRefreshingRef = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            scrollPositionRef.current = window.scrollY;
            isRefreshingRef.current = true;

            console.log('🔄 Auto-refreshing Giveaways...');
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

    const getModalType = (type, name) => {
        const str = `${type} ${name}`.toLowerCase();
        if (str.includes('mug') || str.includes('shirt')) return "mug-shirtModal";
        if (str.includes('standee') || str.includes('tarpulin')) return "standee-tarpulinModal";
        if (str.includes('calling card')) return "callingcardModal";
        return "moreModal";
    };

    const { bestSellers, moreProducts, hasAnyBest, hasAnyMore } = useMemo(() => {
        let giveawayProducts = allProducts.filter(item => item.category === 'Giveaways');

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
            const mappedItem = {
                ...product,
                id: product.id,
                image: product.image || defaultImg,
                category: product.category,
                type: product.type,
                pcs: product.quantity || '1',
                price: product.price,
                discounted_price: product.discounted_price ?? null,
                originalPrice: product.price,
                promo: product.applied_promo ?? null,
                modalType: getModalType(product.type, product.name),
                title: product.name,
                spec: product.description || product.type
            };

            const isBestSeller = bestSellerTypes.some(kw =>
                product.name?.includes(kw) || (product.type && product.type.includes(kw))
            );

            isBestSeller ? best.push(mappedItem) : more.push(mappedItem);
        });

        return { bestSellers: best, moreProducts: more, hasAnyBest, hasAnyMore };
    }, [allProducts, productNatureFilter]);

    // ✅ Only show loading screen on initial load, not on background refresh
    const isInitialLoad = loading && allProducts.length === 0;
    if (isInitialLoad) return <div className="text-center py-20 font-bold">Loading Giveaways...</div>;

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-end w-full max-w-7xl mx-auto px-4 mt-32 mb-10">
                <div className="text-left">
                    <h1 className='text-[35px] font-bold italic'>
                        Everything You Need, Fully Customized
                    </h1>
                    <p className='text-sm mt-1 tracking-widest'>
                        Wide range of personalized products including apparel, accessories, marketing materials, and display boards.
                    </p>
                </div>
            </div>

            {hasAnyBest && (
                <div className='my-15'>
                    <div className="flex justify-between items-center mb-6 px-4">
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
                        <div className='mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-4'>
                            {bestSellers.map(item => (
                                <GiveawayCard key={item.id} item={item} onSelect={setSelectedGiveaways} isBest={true} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic py-4 px-4">No products match the selected filter.</p>
                    )}
                </div>
            )}

            {hasAnyMore && (
                <div className='my-15'>
                    <div className="flex justify-between items-center mb-6 px-4">
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
                        <div className='mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-4'>
                            {moreProducts.map(item => (
                                <GiveawayCard key={item.id} item={item} onSelect={setSelectedGiveaways} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic py-4 px-4">No products match the selected filter.</p>
                    )}
                </div>
            )}

            <StoreLocation />

            {selectedGiveaways && (
                <ModalMoreStickers
                    sticker={selectedGiveaways}
                    onClose={() => setSelectedGiveaways(null)}
                />
            )}
        </div>
    );
};

const GiveawayCard = ({ item, onSelect }) => {
    const hasDiscount = item.discounted_price !== null && item.discounted_price < item.originalPrice;

    return (
        <div className="relative w-full group">
            <div className='mt-4 h-fit rounded-[16px]'>
                <div className="relative">
                    <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        onError={(e) => console.log('❌ Image failed:', e.target.src)} // ✅ add this temporarily
                        className='rounded-2xl w-full h-[250px] object-cover'
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
                        <p className="text-sm">{item.title}</p>
                        <p className="text-[14px] min-h-5 text-gray-600">
                            {item.type}
                            {item.pcs > 1 && ` • ${item.pcs} pcs`}
                        </p>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <div>
                            {hasDiscount ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-400 line-through text-sm">
                                        ₱{item.originalPrice.toLocaleString("en-PH")}
                                    </span>
                                    <span className="text-xl font-bold text-red-600">
                                        ₱{item.discounted_price.toLocaleString("en-PH")}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xl font-semibold">
                                    ₱{item.price.toLocaleString("en-PH")}
                                </span>
                            )}
                        </div>
                        <div
                            className="rounded-full border-2 p-2 border-[#5A5A5A] cursor-pointer hover:bg-gray-100"
                            onClick={() => onSelect(item)}
                        >
                            <img src={cart} alt="cart" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Giveaways;
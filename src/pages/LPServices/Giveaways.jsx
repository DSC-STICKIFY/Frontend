import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProducts } from '../../context/ProductsContext';
import cart from '../../assets/servicesImgIcon/graphicservices/cart.svg';
import ModalGiveawaysMugnShirt from '../../components/ModalGiveawaysMugnShirt.jsx';
import ModalGiveawaysStandeenTarpulin from '../../components/ModalGiveawaysStandeenTarpulin.jsx'
import ModalGiveawayMore from '../../components/ModalGiveawayMore.jsx';
import ModalGiveawayCallingCard from '../../components/ModalGiveawayCallingCard.jsx';
import StoreLocation from '../../components/StoreLocation.jsx';
import defaultImg from '../../assets/servicesImgIcon/giveaways/standee.png';
import { getImageUrl } from '../../services/api';
import PromoTag from '../../components/PromoTag';

const Giveaways = () => {
    const { allProducts, loading, refreshProducts } = useProducts();
    const [selectedGiveaways, setSelectedGiveaways] = useState(null);
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

    const { bestSellers, moreProducts } = useMemo(() => {
        const giveawaysData = allProducts.filter(item => item.category === 'Giveaways');
        const bestSellerKeywords = ['Standee', 'Tarpulin', 'Magic Mug', 'DriFit', 'Shirt'];

        const best = [];
        const more = [];

        giveawaysData.forEach(product => {
            const mappedItem = {
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

            const isBest = bestSellerKeywords.some(kw =>
                product.name.includes(kw) || (product.type && product.type.includes(kw))
            );

            isBest ? best.push(mappedItem) : more.push(mappedItem);
        });

        return { bestSellers: best, moreProducts: more };
    }, [allProducts]);

    // ✅ Only show loading screen on initial load, not on background refresh
    const isInitialLoad = loading && allProducts.length === 0;
    if (isInitialLoad) return <div className="text-center py-20 font-bold">Loading Giveaways...</div>;

    return (
        <div>
            <h1 className='mt-32 text-center text-[35px] font-bold italic'>
                Everything You Need, Fully Customized
            </h1>
            <p className='text-center text-sm mt-1 mb-10 tracking-widest px-4'>
                Wide range of personalized products including apparel, accessories, marketing materials, and display boards.
            </p>

            {bestSellers.length > 0 && (
                <div className='my-15'>
                    <h2 className='font-bold text-3xl mb-6'>Best Seller</h2>
                    <div className='mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
                        {bestSellers.map(item => (
                            <GiveawayCard key={item.id} item={item} onSelect={setSelectedGiveaways} isBest={true} />
                        ))}
                    </div>
                </div>
            )}

            {moreProducts.length > 0 && (
                <div className='my-15'>
                    <h2 className='font-bold text-3xl mb-6'>More</h2>
                    <div className='mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full'>
                        {moreProducts.map(item => (
                            <GiveawayCard key={item.id} item={item} onSelect={setSelectedGiveaways} />
                        ))}
                    </div>
                </div>
            )}

            <StoreLocation />

            {selectedGiveaways && (
                <>
                    {selectedGiveaways.modalType === "standee-tarpulinModal" && (
                        <ModalGiveawaysStandeenTarpulin giveaways={selectedGiveaways} onClose={() => setSelectedGiveaways(null)} />
                    )}
                    {selectedGiveaways.modalType === "mug-shirtModal" && (
                        <ModalGiveawaysMugnShirt giveaways={selectedGiveaways} onClose={() => setSelectedGiveaways(null)} />
                    )}
                    {selectedGiveaways.modalType === "moreModal" && (
                        <ModalGiveawayMore giveaways={selectedGiveaways} allMore={moreProducts} onClose={() => setSelectedGiveaways(null)} />
                    )}
                    {selectedGiveaways.modalType === "callingcardModal" && (
                        <ModalGiveawayCallingCard giveaways={selectedGiveaways} onClose={() => setSelectedGiveaways(null)} />
                    )}
                </>
            )}
        </div>
    );
};

const GiveawayCard = ({ item, onSelect, isBest }) => {
    const hasDiscount = item.discounted_price !== null && item.discounted_price < item.originalPrice;

    return (
        <div className="relative w-full">
            <div className='mt-4 h-fit rounded-[16px]'>
                <div className="relative">
                    <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        onError={(e) => console.log('❌ Image failed:', e.target.src)} // ✅ add this temporarily
                        className='rounded-2xl w-full h-[250px] object-cover'
                    />
                    <PromoTag promo={item.promo} />
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
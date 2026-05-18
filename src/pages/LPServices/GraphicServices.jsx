import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProducts } from '../../context/ProductsContext';
import cart from '../../assets/servicesImgIcon/graphicservices/cart.svg';
import ModalGraphicServices from '../../components/ModalGraphicServices.jsx';
import StoreLocation from '../../components/StoreLocation.jsx';
import { getImageUrl } from '../../services/api.js';
import PromoTag from '../../components/PromoTag'; 
import bgCustomer from '../../assets/servicesImgIcon/graphicservices/gsBG.png';

const GraphicServices = () => {
    const { allProducts, loading, refreshProducts } = useProducts();
    const [selectedItem, setSelectedItem] = useState(null);
    const [productNatureFilter, setProductNatureFilter] = useState("All");
    const scrollPositionRef = useRef(null);
    const isRefreshingRef = useRef(false);

    // Auto-refresh every 60 seconds (preserve scroll)
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

    // Package details fallback (when description doesn't contain structured data)
    const getPackageDetails = (tierName, subType = "") => {
        const name = (tierName || "").toLowerCase();
        const type = (subType || "").toLowerCase();

        let inclusions = [
            "35pcs 2x2 Stickers",
            "FB & Youtube Cover Design",
            "Profile Design",
            ".JPG & .PNG",
        ];
        let timeline = ["7 Days Process"];
        let payment = [
            "50% Down payment before we proceed for editing",
            "50% Full payment upon approval and before i send the design",
        ];

        if (name.includes("basic")) {
            const stickerCount = type.includes("moto") || type.includes("vlog") ? "45pcs" : "35pcs";
            inclusions = [
                `${stickerCount} 2x2 Stickers`,
                "FB & Youtube Cover Design",
                "Profile Design",
                ".JPG & .PNG",
            ];
            timeline = ["7-10 Days Process"];
        } else if (name.includes("standard")) {
            inclusions = [
                "60pcs 2x2 Stickers",
                "FB & Youtube Cover Design",
                "Profile Design",
                ".JPG & .PNG",
            ];
            timeline = ["7-10 Days Process"];
        } else if (name.includes("premium")) {
            inclusions = [
                "70pcs 2x2 Stickers",
                "FB & Youtube Cover Design",
                "Profile Design",
                ".JPG & .PNG",
            ];
            timeline = ["7-10 Days Process"];
        } else if (name.includes("starter") && (type.includes("moto") || type.includes("vlog"))) {
            timeline = ["7-10 Days Process"];
        }

        return { inclusions, timeline, payment };
    };

    const parsePackageDetails = (description, tierName, subType = "") => {
        const fallback = getPackageDetails(tierName, subType);
        if (!description || description.trim() === "" || !description.includes('|')) {
            return fallback;
        }

        const sections = description.split('|').map(s => s.trim());
        const details = {};
        sections.forEach(section => {
            if (section.toLowerCase().includes('inclusion')) {
                const items = section.split(':')[1]?.split(',').map(i => i.trim()) || [];
                details.packageInclusions = items;
            } else if (section.toLowerCase().includes('timeline')) {
                const timelineStr = section.split(':')[1]?.trim() || '';
                details.timeline = [timelineStr];
            } else if (section.toLowerCase().includes('payment')) {
                const payments = section.split(':')[1]?.split(',').map(p => p.trim()) || [];
                details.payment = payments;
            }
        });

        return {
            packageInclusions: details.packageInclusions || fallback.inclusions,
            timeline: details.timeline || fallback.timeline,
            payment: details.payment || fallback.payment
        };
    };

    const { businessLogo, motoVlog } = useMemo(() => {
        let graphicProducts = allProducts.filter(p => p.category === 'Graphic Services');
        
        if (productNatureFilter === "Customizable") {
            graphicProducts = graphicProducts.filter(p => p.is_customizable !== 0 && p.is_customizable !== false && p.is_customizable !== "0");
        } else if (productNatureFilter === "Ready Made") {
            graphicProducts = graphicProducts.filter(p => p.is_customizable === 0 || p.is_customizable === false || p.is_customizable === "0");
        }
        
        const business = [];
        const moto = [];

        graphicProducts.forEach(p => {
            // ✅ Use product's own applied_promo and discounted_price (no hardcoded promos)
            const originalPrice = parseFloat(p.price) || 0;
            const discountedPrice = p.discounted_price !== null && p.discounted_price !== undefined
                ? parseFloat(p.discounted_price)
                : null;
            const appliedPromo = p.applied_promo || null;

            const packageDetails = parsePackageDetails(p.description, p.name, p.type);
            const mappedItem = {
                ...p,
                id: p.id,
                image: p.image,
                category: p.name,
                type: p.type || 'Custom Design',
                price: originalPrice,
                discounted_price: discountedPrice,
                originalPrice: originalPrice,
                promo: appliedPromo,
                modal: 'gsModal',
                tier: p.name || 'Starter',
                packageInclusions: packageDetails?.packageInclusions || ['Custom design package'],
                timeline: packageDetails?.timeline || ['7-10 Days Process'],
                payment: packageDetails?.payment || ['50% Down payment', '50% Full payment upon approval']
            };

            const typeLower = (p.type || "").toLowerCase();
            const nameLower = (p.name || "").toLowerCase();

            if (typeLower.includes('moto') || nameLower.includes('vlog')) {
                moto.push(mappedItem);
            } else if (typeLower.includes('business') || nameLower.includes('logo')) {
                business.push(mappedItem);
            } else {
                business.push(mappedItem);
            }
        });

        const TIER_ORDER = ['starter', 'basic', 'standard', 'premium'];
        const sortByTier = (a, b) => {
            const ai = TIER_ORDER.findIndex(t => a.tier?.toLowerCase().includes(t));
            const bi = TIER_ORDER.findIndex(t => b.tier?.toLowerCase().includes(t));
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        };

        return { businessLogo: business.sort(sortByTier), motoVlog: moto.sort(sortByTier) };
    }, [allProducts, productNatureFilter]);

    if (loading) return <div className="text-center py-20 font-bold">Loading Graphic Services...</div>;

    return (
        <>
            {/* Banner */}
            <div className="relative w-full overflow-hidden rounded-2xl mt-24 md:mt-32 mb-10">
                <img
                    src={bgCustomer}
                    className="w-full h-90 object-cover object-center"
                    alt="Graphic Services Banner"
                />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-5 text-white text-[17px] italic font-medium">
                    Graphic Services for Your Brand
                </div>
            </div>

            {/* Business Logo Section */}
            {businessLogo.length > 0 && (
                <div className='my-12 px-2'>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className='font-bold text-3xl'>Business Logo</h2>
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
                    <div className='mt-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full'>
                        {businessLogo.map((item) => (
                            <ServiceCard key={item.id} item={item} onSelect={setSelectedItem} />
                        ))}
                    </div>
                </div>
            )}

            {/* Moto Vlog Section */}
            {motoVlog.length > 0 && (
                <div className='my-12 px-2'>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className='font-bold text-3xl'>Moto Vlog</h2>
                        {businessLogo.length === 0 && (
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
                    <div className='mt-8 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full'>
                        {motoVlog.map((item) => (
                            <ServiceCard key={item.id} item={item} onSelect={setSelectedItem} isMoto={true} />
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Design CTA */}
            <div className='flex gap-3 my-15 justify-center items-center w-full'>
                <p className='font-semibold'>Got other design in your mind?</p>
                <button className='bg-black text-white text-[13px] font-semibold px-4 py-2 rounded-sm cursor-pointer hover:bg-gray-800'>
                    Message to Customize
                </button>
            </div>

            <StoreLocation />

            {/* Modal */}
            {selectedItem && (
                <ModalGraphicServices
                    onClose={() => setSelectedItem(null)}
                    product={{
                        ...selectedItem,
                        category: selectedItem.category,
                        price: selectedItem.discounted_price ?? selectedItem.price,
                        originalPrice: selectedItem.originalPrice,
                        tier: selectedItem.tier,
                        type: selectedItem.type,
                        packageInclusions: selectedItem.packageInclusions,
                        timeline: selectedItem.timeline,
                        payment: selectedItem.payment,
                    }}
                />
            )}
        </>
    );
};

// ✅ ServiceCard – now uses product's own promo and discounted_price (no hardcoded logic)
const ServiceCard = ({ item, onSelect, isMoto }) => {
    const hasDiscount = item.discounted_price !== null && item.discounted_price < item.originalPrice;
    
    return (
        <div className='w-full cursor-pointer' onClick={() => onSelect(item)}>
            <div className='rounded-2xl overflow-hidden h-[160px] sm:h-[250px] relative bg-gray-50'>
                <img 
                    src={getImageUrl(item.image)} 
                    alt={item.tier} 
                    className='w-full h-full object-contain transition hover:scale-110' 
                />
                <PromoTag promo={item.promo} />
            </div>
            <div className='font-semibold mt-2'>
                <p className='text-md'>{item.tier}</p>
                <div className='flex justify-between items-end mt-2'>
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
                        className='rounded-full border-2 p-2 border-[#5A5A5A] cursor-pointer hover:bg-gray-100 transition' 
                        onClick={(e) => { e.stopPropagation(); onSelect(item); }}
                    >
                        <img src={cart} alt="cart" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GraphicServices;
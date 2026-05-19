import React, { useMemo, useState, useEffect } from 'react';
import { fetchAllProducts } from '../../services/ProductsService';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../../services/api';
import ModalCarServiceInquiry from '../../components/ModalCarServiceInquiry.jsx';
import ModalMotorServiceInquiry from '../../components/modals/ModalMotorServiceInquiry.jsx';
import StoreLocation from '../../components/StoreLocation.jsx';

import bg from '../../assets/servicesImgIcon/decalsnwrap/decalnwrapBG.png';
import pickupPrc from '../../assets/servicesImgIcon/decalsnwrap/pickupPrc.png';
import hatchbackPrc from '../../assets/servicesImgIcon/decalsnwrap/hatchbackPrc.png';
import sedanPrc from '../../assets/servicesImgIcon/decalsnwrap/sedanPrc.png';
import suvPrc from '../../assets/servicesImgIcon/decalsnwrap/suvPrc.png';
import dechromingPrc from '../../assets/servicesImgIcon/decalsnwrap/dechromingPrc.png';
import pickup from '../../assets/servicesImgIcon/decalsnwrap/pickup.png';
import hatchback from '../../assets/servicesImgIcon/decalsnwrap/hatchback.png';
import sedan from '../../assets/servicesImgIcon/decalsnwrap/sedan.png';
import suv from '../../assets/servicesImgIcon/decalsnwrap/suv.png';
import dechroming from '../../assets/servicesImgIcon/decalsnwrap/dechroming.png';

/* ─── Price row ───────────────────────────────────────────────────────── */
const PriceRow = ({ label, price, isHeader = false }) => {
    if (!price && !isHeader) return null;
    return (
        <div className={`flex justify-between items-center ${isHeader ? 'mt-4 border-t border-gray-100 pt-4' : 'py-1'}`}>
            <span className={`uppercase italic tracking-tighter ${isHeader ? 'text-xs font-black text-gray-400' : 'text-lg font-black text-gray-900'}`}>
                {label}
            </span>
            {!isHeader && (
                <span className="text-xl font-black text-gray-900 italic tracking-tighter">
                    ₱{parseFloat(price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
            )}
        </div>
    );
};

/* ─── Skeleton ────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
    <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-60 bg-gray-100 rounded-3xl mb-6" />
        <div className="h-8 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="space-y-3">
            <div className="h-6 bg-gray-50 rounded w-full" />
            <div className="h-6 bg-gray-50 rounded w-full" />
        </div>
    </div>
);

/* ─── Section heading ─────────────────────────────────────────────────── */
const SectionHeading = ({ children, sub, filterDropdown }) => (
    <div className="mb-16">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
            <div className="flex items-end gap-6">
                <h2 className="font-black text-5xl md:text-6xl tracking-tighter italic uppercase text-gray-900 leading-none">
                    {children}
                </h2>
                {sub && <span className="text-sm font-black text-gray-400 uppercase tracking-[0.25em] mb-2 pb-1">{sub}</span>}
            </div>
            {filterDropdown && <div className="mb-2">{filterDropdown}</div>}
        </div>
        <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-32 bg-[#FDE31E] rounded-full" />
        </div>
    </div>
);

/* ─── Car service card ────────────────────────────────────────────────── */
const CarCard = ({ item, idx, onInquire }) => {
    const isEven = idx % 2 === 0;
    return (
        <div className={`
            group/car flex flex-col lg:flex-row items-center gap-12 lg:gap-20
            bg-white rounded-[56px] border border-gray-100 shadow-sm
            hover:shadow-2xl transition-all duration-700 overflow-hidden
            ${isEven ? '' : 'lg:flex-row-reverse'}
        `}>
            {/* Price map panel */}
            <div className="w-full lg:w-[48%] self-stretch relative overflow-hidden bg-gray-50 flex-shrink-0">
                <img
                    src={item.is_fixed ? item.price_map_image : getImageUrl(item.price_map_image)}
                    alt="price map"
                    className="w-full h-full object-cover group-hover/car:scale-[1.04] transition-transform duration-700"
                    onError={e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMAGE; }}
                />
                <div className={`absolute inset-y-0 w-24 from-white to-transparent pointer-events-none ${isEven ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'}`} />
            </div>

            {/* Info panel */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12 px-10">
                <div className="self-start inline-flex items-center gap-2 bg-gray-900 text-white text-[9px] font-black uppercase tracking-[0.25em] px-4 py-2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FDE31E]" />
                    Car Service
                </div>

                <h3 className="self-start text-4xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
                    {item.product_name || item.name}
                </h3>

                <div className="w-full flex justify-center px-4">
                    <img
                        src={item.is_fixed ? item.product_image : getImageUrl(item.product_image)}
                        alt="car"
                        className="w-full max-w-lg object-contain drop-shadow-[0_40px_40px_rgba(0,0,0,0.12)] group-hover/car:drop-shadow-[0_55px_55px_rgba(0,0,0,0.22)] group-hover/car:scale-105 group-hover/car:-translate-y-2 transition-all duration-700"
                        onError={e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMAGE; }}
                    />
                </div>

                <button
                    onClick={() => onInquire(item)}
                    className="
                        relative overflow-hidden w-full max-w-xs py-5 rounded-[24px]
                        bg-[#FDE31E] hover:bg-yellow-400 text-black
                        font-black uppercase italic tracking-[0.15em] text-sm
                        transition-all shadow-xl shadow-yellow-200/60
                        active:scale-[0.97] group-hover/car:-translate-y-1
                    "
                >
                    <span className="relative z-10">Inquire Now →</span>
                    <span className="absolute inset-0 bg-black/5 opacity-0 hover:opacity-100 transition-opacity" />
                </button>
            </div>
        </div>
    );
};

/* ─── Motor card ──────────────────────────────────────────────────────── */
const MotorCard = ({ bike, onInquire }) => (
    <div
        className="bg-white rounded-[44px] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col overflow-hidden border border-gray-100 group cursor-pointer"
        onClick={() => onInquire(bike)}
    >
        <div className="relative bg-gray-50 rounded-[40px] m-3 h-72 flex items-center justify-center overflow-hidden">
            <img
                src={getImageUrl(bike.product_image)}
                alt={bike.product_name}
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 drop-shadow-2xl p-8"
                onError={e => { e.target.onerror = null; e.target.src = PLACEHOLDER_IMAGE; }}
            />
            <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/5 transition-colors duration-500 rounded-[40px]" />
        </div>

        <div className="px-8 pt-6 pb-8 flex flex-col flex-1">
            <h3 className="font-black text-2xl text-gray-900 mb-6 italic uppercase tracking-tighter leading-none">
                {bike.product_name}
            </h3>

            <div className="space-y-1 flex-1">
                <PriceRow label="Wrap" price={bike.wrap_price} />
                <PriceRow label="Decals" isHeader />
                <PriceRow label="Glossy" price={bike.glossy_price} />
                <PriceRow label="Hologram" price={bike.hologram_price} />
            </div>

            <div className="mt-8 pt-5 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover:text-[#FDE31E] transition-colors duration-300">
                    Tap to Inquire
                </span>
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#FDE31E] rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
);

/* ─── Main page ───────────────────────────────────────────────────────── */
const DecalnWrap = () => {
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCarModal, setShowCarModal] = useState(false);
    const [showMotorModal, setShowMotorModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [carNatureFilter, setCarNatureFilter] = useState("All");
    const [motorNatureFilter, setMotorNatureFilter] = useState("All");

    const openCarInquiry = (p) => { setSelectedProduct(p); setShowCarModal(true); };
    const openMotorInquiry = (p) => { setSelectedProduct(p); setShowMotorModal(true); };

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const res = await fetchAllProducts();
                setAllProducts(res?.data?.data || res?.data || []);
            } catch (err) {
                console.error("Failed to load decals:", err);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    const { carServices, motorServices } = useMemo(() => {
        const relevant = allProducts.filter(p =>
            (p.category || p.product_category || '').toLowerCase() === 'decals & wrap'
        );

        const cars = [], motors = [];

        relevant.forEach(p => {
            if (p.is_car_service) {
                cars.push(p);
            } else if (p.is_motor_service) {
                motors.push(p);
            } else {
                const type = (p.type || p.product_type || '').toLowerCase();
                const name = (p.name || p.product_name || '').toLowerCase();

                if (type.includes('motorbike') || name.includes('motorbike') || name.includes('mio') || name.includes('yamaha')) {
                    const existing = motors.find(m => m.product_name === p.product_name);
                    if (existing) {
                        if (type.includes('wrap')) existing.wrap_price = p.product_price;
                        if (type.includes('glossy')) existing.glossy_price = p.product_price;
                        if (type.includes('hologram')) existing.hologram_price = p.product_price;
                    } else {
                        motors.push({
                            ...p,
                            wrap_price: type.includes('wrap') ? p.product_price : null,
                            glossy_price: type.includes('glossy') ? p.product_price : null,
                            hologram_price: type.includes('hologram') ? p.product_price : null,
                        });
                    }
                } else {
                    const keywords = ['pickup', 'hatchback', 'sedan', 'suv', 'dechroming'];
                    const matched = keywords.find(k => name.includes(k) || type.includes(k));
                    if (matched && !cars.find(c => c.legacy_key === matched)) {
                        cars.push({ ...p, legacy_key: matched, is_legacy_car: true });
                    }
                }
            }
        });

        const legacyMap = {
            pickup: { title: 'SUV / Pickup', priceImg: pickupPrc, carImage: pickup },
            hatchback: { title: 'Hatchback', priceImg: hatchbackPrc, carImage: hatchback },
            sedan: { title: 'Sedan', priceImg: sedanPrc, carImage: sedan },
            suv: { title: 'SUV Full Wrap', priceImg: suvPrc, carImage: suv },
            dechroming: { title: 'Dechroming', priceImg: dechromingPrc, carImage: dechroming },
        };

        let finalCars = cars.map(c => {
            if (c.is_legacy_car && legacyMap[c.legacy_key]) {
                const m = legacyMap[c.legacy_key];
                return { id: c.product_id, name: m.title, price_map_image: m.priceImg, product_image: m.carImage, is_fixed: true, is_customizable: c.is_customizable };
            }
            return c;
        });

        // Filter cars based on carNatureFilter
        if (carNatureFilter === "Customizable") {
            finalCars = finalCars.filter(p => p.is_customizable !== 0 && p.is_customizable !== false && p.is_customizable !== "0");
        } else if (carNatureFilter === "Ready Made") {
            finalCars = finalCars.filter(p => p.is_customizable === 0 || p.is_customizable === false || p.is_customizable === "0");
        }

        // Filter motors based on motorNatureFilter
        let finalMotors = motors;
        if (motorNatureFilter === "Customizable") {
            finalMotors = finalMotors.filter(p => p.is_customizable !== 0 && p.is_customizable !== false && p.is_customizable !== "0");
        } else if (motorNatureFilter === "Ready Made") {
            finalMotors = finalMotors.filter(p => p.is_customizable === 0 || p.is_customizable === false || p.is_customizable === "0");
        }

        return { carServices: finalCars, motorServices: finalMotors };
    }, [allProducts, carNatureFilter, motorNatureFilter]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="w-full h-96 bg-gray-100 animate-pulse rounded-[40px] mb-12" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    <SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* HERO BANNER */}
            <div className="relative w-full h-[560px] overflow-hidden bg-gray-900 rounded-[52px] mb-28 group shadow-2xl">
                <img
                    src={bg}
                    className="w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-110 opacity-50"
                    alt="Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-14 md:px-20">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-[2px] bg-[#FDE31E]" />
                        <span className="text-[#FDE31E] text-[10px] font-black uppercase tracking-[0.4em]">Davao's Premium Auto Studio</span>
                    </div>
                    <h1 className="font-black text-white text-6xl md:text-8xl leading-none uppercase italic tracking-tighter max-w-2xl">
                        Elevate<br />
                        <span className="text-[#FDE31E]">Your Ride.</span>
                    </h1>
                    <p className="text-white/60 font-bold uppercase tracking-[0.3em] text-xs mt-8 max-w-sm leading-relaxed">
                        Premium Decals, Full Wraps &<br />Dechroming — Built to Turn Heads
                    </p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FDE31E] via-yellow-300 to-transparent" />
            </div>

            {/* CAR SERVICES */}
            <div className="mb-32">
                <SectionHeading 
                    sub="Cars & SUVs"
                    filterDropdown={
                        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                            {['All', 'Ready Made', 'Customizable'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setCarNatureFilter(opt)}
                                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                                        carNatureFilter === opt 
                                            ? 'bg-black text-white shadow-md' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    }
                >Car Services</SectionHeading>
                <div className="flex flex-col gap-8">
                    {carServices.map((item, idx) => (
                        <CarCard key={item.id || idx} item={item} idx={idx} onInquire={openCarInquiry} />
                    ))}
                </div>
            </div>

            {/* MOTORBIKE SECTION */}
            <div className="mb-32">
                <SectionHeading 
                    sub="Bikes & Scooters"
                    filterDropdown={
                        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                            {['All', 'Ready Made', 'Customizable'].map((opt) => (
                                <button
                                    key={opt}
                                    onClick={() => setMotorNatureFilter(opt)}
                                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
                                        motorNatureFilter === opt 
                                            ? 'bg-black text-white shadow-md' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    }
                >Motorbike Wrap & Decals</SectionHeading>
                {motorServices.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-16 text-center shadow-sm">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No motorbike services available at the moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {motorServices.map((bike, idx) => (
                            <MotorCard key={bike.id || idx} bike={bike} onInquire={openMotorInquiry} />
                        ))}
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showCarModal && (
                <ModalCarServiceInquiry onClose={() => setShowCarModal(false)} product={selectedProduct} />
            )}
            {showMotorModal && (
                <ModalMotorServiceInquiry onClose={() => setShowMotorModal(false)} product={selectedProduct} />
            )}

            {/* STORE LOCATION */}
            <div className="mt-32">
                <StoreLocation />
            </div>
        </div>
    );
};

export default DecalnWrap;

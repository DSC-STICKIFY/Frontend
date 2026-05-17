import React, { useState, useCallback, useMemo } from "react";
import SearchBar from "../components/SearchBar";
import GallerySection from "../components/GallerySection";
import TopProducts from "../components/TopProducts";
import Products from "../components/Products";
import Testimonials from "../components/Testimonials";
import { useDebounce } from "react-use";
import "../App.css";
import { useProducts } from "../context/ProductsContext";
import { useCart } from "../context/CartContext";
import { getImageUrl, PLACEHOLDER_IMAGE } from "../services/api";
import LoadingSkeleton from "../components/LoadingSkeleton";

// All modals
import ModalAssortedHologram from "../components/ModalAssortedHologram.jsx";
import ModalMoreStickers from "../components/ModalMoreStickers.jsx";
import ModalGraphicServices from "../components/ModalGraphicServices.jsx";
import ModalGiveawaysMugnShirt from "../components/ModalGiveawaysMugnShirt.jsx";
import ModalGiveawaysStandeenTarpulin from "../components/ModalGiveawaysStandeenTarpulin.jsx";
import ModalGiveawayMore from "../components/ModalGiveawayMore.jsx";
import ModalGiveawayCallingCard from "../components/ModalGiveawayCallingCard.jsx";
import ModalSignage from "../components/ModalSignage.jsx";
import ModalPrinting from "../components/ModalPrinting.jsx";
import ModalCarServiceInquiry from "../components/ModalCarServiceInquiry.jsx";
import ModalMotorServiceInquiry from "../components/modals/ModalMotorServiceInquiry.jsx";
import { buildProductPrintHTML, handleBrowserPrint, getLogoBase64 } from '../services/PrintingService.jsx';

const detectServiceInfo = (product) => {
    const cat = (product.category || product.product_category || "PRODUCT DETAILS").toUpperCase();
    return { title: cat };
};

const getModalType = (type, name = "") => {
    const t = (type || "").toLowerCase();
    const n = (name || "").toLowerCase();
    if (t.includes("standee") || t.includes("tarpulin") || n.includes("standee")) {
        return "standee-tarpulinModal";
    } else if (t.includes("mug") || t.includes("shirt") || n.includes("mug") || n.includes("shirt")) {
        return "mug-shirtModal";
    } else if (t.includes("calling card") || n.includes("calling card")) {
        return "callingcardModal";
    } else {
        return "moreModal";
    }
};

function LandingPage() {
    const { allProducts, loading } = useProducts();
    const { addItem } = useCart();

    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [selectedServiceOption, setSelectedServiceOption] = useState("");
    const [currentOptions, setCurrentOptions] = useState([]);
    const [displayCategoryName, setDisplayCategoryName] = useState("");

    // Modal states
    const [selectedSticker, setSelectedSticker] = useState(null);
    const [selectedGraphicItem, setSelectedGraphicItem] = useState(null);
    const [selectedGiveaway, setSelectedGiveaway] = useState(null);
    const [selectedSignage, setSelectedSignage] = useState(null);
    const [selectedPrintingItem, setSelectedPrintingItem] = useState(null);
    const [selectedCarService, setSelectedCarService] = useState(null);
    const [selectedMotorService, setSelectedMotorService] = useState(null);

    useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

    const filteredProducts = useMemo(() => {
        if (!debouncedSearchText.trim() || !allProducts) return allProducts || [];
        const searchLower = debouncedSearchText.toLowerCase();
        return allProducts.filter((product) => {
            const name = (product.name || product.product_name || "").toLowerCase();
            const desc = (product.description || product.product_description || "").toLowerCase();
            const cat = (product.category || product.product_category || "").toLowerCase();
            const type = (product.type || product.product_type || "").toLowerCase();
            return (
                name.includes(searchLower) ||
                desc.includes(searchLower) ||
                cat.includes(searchLower) ||
                type.includes(searchLower)
            );
        });
    }, [allProducts, debouncedSearchText]);

    const handleProductSelection = useCallback((product) => {
        if (!product) return;
        const serviceInfo = detectServiceInfo(product);
        setSelectedProduct(product);
        setDisplayCategoryName(serviceInfo.title);
        setTimeout(() => {
            window.scrollTo({ top: 400, behavior: "smooth" });
        }, 100);
    }, []);

    const handleOrderNow = useCallback((product) => {
        if (!product) return;
        const category = (product.category || product.product_category || "").toLowerCase().trim();

        if (category === "stickers" || category === "sticker") {
            const typeLower = (product.type || product.product_type || "").toLowerCase();
            const nameLower = (product.name || product.product_name || "").toLowerCase();
            const isAssorted = typeLower.includes("assorted") || nameLower.includes("assorted");
            const modalType = isAssorted ? "assorted" : "more";
            setSelectedSticker({
                ...product,
                modalType,
                title: product.name || product.product_name || "Sticker",
                image: product.image || product.product_image,
                price: `₱${parseFloat(product.product_price || product.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                description: product.description || product.product_description || "",
                qty: product.quantity ? `${product.quantity} pcs` : product.product_quantity ? `${product.product_quantity} pcs` : undefined,
                quantity: product.quantity || product.product_quantity,
                userAddress: "No address saved",
            });
        }
        else if (category === "graphic services" || category.includes("graphic") || category.includes("logo")) {
            setSelectedGraphicItem(product);
        }
        else if (category === "giveaways" || category.includes("giveaway")) {
            const modalType = getModalType(product.type || product.product_type, product.name || product.product_name);
            setSelectedGiveaway({ ...product, modalType, giveaways: product });
        }
        else if (category === "signage" || category.includes("sign")) {
            setSelectedSignage({
                modalType: "signageModal",
                signage: {
                    id: product.id || product._id,
                    title: product.product_name || product.name || "Signage Product",
                    category: product.category || product.product_type || "Signage",
                    sqft: product.sqft || product.product_sqft || null,
                    price: product.product_price || product.price || 0,
                    description: product.description || product.product_description || "",
                    neonColors: product.neon_colors || null,
                    image: product.image || product.product_image,
                },
            });
        }
        else if (category === "printing" || category.includes("print")) {
            setSelectedPrintingItem(product);
        }
        else if (category === "decals & wrap" || category.includes("decal") || category.includes("wrap")) {
            const name = (product.name || product.product_name || "").toLowerCase();
            const type = (product.type || product.product_type || "").toLowerCase();

            if (product.is_car_service || ["pickup", "hatchback", "sedan", "suv", "dechroming"].some(k => name.includes(k) || type.includes(k))) {
                setSelectedCarService(product);
            } else if (product.is_motor_service || ["motorbike", "mio", "yamaha", "honda", "bike", "scooter"].some(k => name.includes(k) || type.includes(k))) {
                setSelectedMotorService(product);
            } else {
                // Fallback to car service if neither is clearly matched
                setSelectedCarService(product);
            }
        }
    }, []);

    const handleAddToCart = useCallback((product) => {
        if (!product) return;
        addItem({
            productId: product.id || product._id || product.product_id || "unknown",
            title: product.name || product.product_name || "Product",
            price: parseFloat(product.product_price || product.price || 0),
            image: product.image || product.product_image || null,
            quantity: 1,
            category: product.category || product.product_category || "",
            type: product.type || product.product_type || "",
        });
    }, [addItem]);

    const handleBackToGallery = useCallback(() => {
        setSelectedProduct(null);
        setSearchText("");
        setDebouncedSearchText("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

    const handlePrintInfo = async () => {
        const logo = await getLogoBase64();
        const html = buildProductPrintHTML(selectedProduct, logo);
        handleBrowserPrint(html);
    };

    return (
        <div className="min-h-screen w-full text-black bg-[#F1F3F7]">
            <header className="text-center mt-[160px]">
                <h1 style={{ fontFamily: "Holtwood One SC, serif" }} className="tracking-wider text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                    Welcome to <span className="text-[#FDE31E]">DSC</span>
                </h1>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300 }} className="text-gray-700 pt-2 text-base sm:text-lg md:text-[20px] leading-relaxed">
                    Your trusted shop for high-quality printed stickers! <br />
                    Customize stylish designs for cars, laptops, bottles, and more.
                </p>
            </header>

            {!selectedProduct && (
                <SearchBar searchText={searchText} setSearchText={setSearchText} />
            )}

            {selectedProduct ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 animate-fade-in">
                    <button onClick={handleBackToGallery} className="mb-4 text-gray-500 hover:text-black font-medium text-sm flex items-center gap-2 transition-colors">
                        ← Back to Gallery
                    </button>

                    <div className="bg-white rounded-[30px] shadow-sm p-6 md:p-8">
                        <div className="flex items-center grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="w-full h-[400px] md:h-[500px] bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
                                <img
                                    src={getImageUrl(selectedProduct.image || selectedProduct.product_image)}
                                    alt={selectedProduct.name || selectedProduct.product_name}
                                    className="w-full h-full object-cover rounded-2xl"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = PLACEHOLDER_IMAGE;
                                    }}
                                />
                            </div>

                            <div className="flex flex-col justify-center">
                                <h1 className="text-2xl md:text-3xl font-bold text-[#0B132A] leading-tight">
                                    {selectedProduct.name || selectedProduct.product_name}
                                </h1>
                                <h2 className="text-[#FDE31E] font-extrabold text-sm tracking-widest uppercase mt-4 mb-4 border-l-4 border-[#FDE31E] pl-3">
                                    {displayCategoryName || selectedProduct.category || selectedProduct.product_category || "PRODUCT DETAILS"}
                                </h2>
                                {(selectedProduct.type || selectedProduct.product_type) && (
                                    <p className="text-blue-600 font-semibold text-sm mb-2">
                                        Type: {selectedProduct.type || selectedProduct.product_type}
                                    </p>
                                )}
                                <p className="text-gray-500 text-lg leading-relaxed mb-8">
                                    {selectedProduct.description || selectedProduct.product_description || "No description available."}
                                </p>


                                {(selectedProduct.category || selectedProduct.product_category || "").toLowerCase().includes("decal") ? (
                                    <div className="mb-8">
                                        <span className="text-xl font-bold text-gray-400 italic">
                                            Service Inquiry Only
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mb-8">
                                        <span className="text-3xl md:text-4xl font-bold text-[#0B132A]">
                                            ₱ {parseFloat(selectedProduct.product_price || selectedProduct.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                <div className="flex flex-col gap-4 mt-auto">
                                    <button
                                        onClick={() => handleOrderNow(selectedProduct)}
                                        className="w-full bg-[#FDE31E] text-black font-bold py-4 rounded-xl hover:bg-yellow-400 shadow-sm text-lg"
                                    >
                                        {(selectedProduct.category || selectedProduct.product_category || "").toLowerCase().includes("decal") ? "Inquire Now" : "Order Now"}
                                    </button>
                                </div>

                                {(() => {
                                    const cat = (selectedProduct.category || selectedProduct.product_category || "").toLowerCase();
                                    const isInquiry = cat.includes("decal") || cat.includes("wrap") || selectedProduct.is_car_service || selectedProduct.is_motor_service;
                                    return !isInquiry ? (
                                        <div className="flex flex-col gap-4 mt-4">
                                            <button
                                                onClick={() => handleAddToCart(selectedProduct)}
                                                className="w-full bg-[#ececec] text-black font-bold py-4 rounded-xl hover:bg-gray-200 shadow-sm text-lg flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h11M10 19a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                                </svg>
                                                Add to Cart
                                            </button>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {!debouncedSearchText && <GallerySection />}
                    {!loading && (
                        <TopProducts
                            products={filteredProducts}
                            onProductClick={handleProductSelection}
                            onOrderNowClick={handleOrderNow}
                            onViewAll={() => document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' })}
                        />
                    )}
                    {loading ? (
                        <LoadingSkeleton rows={2} cardsPerRow={4} />
                    ) : (
                        <div id="all-products">
                            <Products onProductClick={handleProductSelection} onOrderNowClick={handleOrderNow} products={filteredProducts} />
                        </div>
                    )}
                    {!debouncedSearchText && <Testimonials />}
                </>
            )}

            {/* Modals */}
            {selectedSticker?.modalType === "assorted" && <ModalAssortedHologram sticker={selectedSticker} onClose={() => setSelectedSticker(null)} />}
            {selectedSticker?.modalType === "more" && <ModalMoreStickers sticker={selectedSticker} onClose={() => setSelectedSticker(null)} />}
            {selectedGraphicItem && <ModalGraphicServices onClose={() => setSelectedGraphicItem(null)} product={selectedGraphicItem} />}
            {selectedGiveaway?.modalType === "standee-tarpulinModal" && <ModalGiveawaysStandeenTarpulin giveaways={selectedGiveaway.giveaways} onClose={() => setSelectedGiveaway(null)} />}
            {selectedGiveaway?.modalType === "mug-shirtModal" && <ModalGiveawaysMugnShirt giveaways={selectedGiveaway} onClose={() => setSelectedGiveaway(null)} />}
            {selectedGiveaway?.modalType === "callingcardModal" && <ModalGiveawayCallingCard giveaways={selectedGiveaway} onClose={() => setSelectedGiveaway(null)} />}
            {selectedGiveaway?.modalType === "moreModal" && <ModalGiveawayMore giveaways={selectedGiveaway} onClose={() => setSelectedGiveaway(null)} />}
            {selectedSignage?.modalType === "signageModal" && <ModalSignage signage={selectedSignage.signage} onClose={() => setSelectedSignage(null)} />}
            {selectedPrintingItem && <ModalPrinting product={selectedPrintingItem} onClose={() => setSelectedPrintingItem(null)} />}
            {selectedCarService && <ModalCarServiceInquiry product={selectedCarService} onClose={() => setSelectedCarService(null)} />}
            {selectedMotorService && <ModalMotorServiceInquiry product={selectedMotorService} onClose={() => setSelectedMotorService(null)} />}
        </div>
    );
}

export default LandingPage;
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import PromoApi from "../services/PromoApi";
import PromoTag, { getDiscountedPrice } from "../components/PromoTag";
import CartToast from "../components/CartToast";

// All modals
import ModalAssortedHologram from "../components/productmodal/ModalAssortedHologram.jsx";
import ModalMoreStickers from "../components/productmodal/ModalMoreStickers.jsx";
import ModalGraphicServices from "../components/productmodal/ModalGraphicServices.jsx";
import ModalGiveawaysMugnShirt from "../components/productmodal/ModalGiveawaysMugnShirt.jsx";
import ModalGiveawaysStandeenTarpulin from "../components/productmodal/ModalGiveawaysStandeenTarpulin.jsx";
import ModalGiveawayMore from "../components/productmodal/ModalGiveawayMore.jsx";
import ModalGiveawayCallingCard from "../components/productmodal/ModalGiveawayCallingCard.jsx";
import ModalSignage from "../components/productmodal/ModalSignage.jsx";
import ModalPrinting from "../components/productmodal/ModalPrinting.jsx";
import ModalCarServiceInquiry from "../components/productmodal/ModalCarServiceInquiry.jsx";
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
    const { addItem, cartItems } = useCart();
    const navigate = useNavigate();


    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const productUuidParam = searchParams.get("product");
    const searchParamQuery = searchParams.get("search");

    useEffect(() => {
        if (searchParamQuery) {
            setSearchText(searchParamQuery);
        }
    }, [searchParamQuery]);

    useEffect(() => {
        if (allProducts && allProducts.length > 0 && productUuidParam) {
            const found = allProducts.find(p => p.uuid === productUuidParam);
            if (found) {
                const serviceInfo = detectServiceInfo(found);
                setSelectedProduct(found);
                setDisplayCategoryName(serviceInfo.title);
            } else {
                setSelectedProduct(null);
            }
        } else if (!productUuidParam) {
            setSelectedProduct(null);
        }
    }, [allProducts, productUuidParam]);

    const [productPromotions, setProductPromotions] = useState([]);

    useEffect(() => {
        if (selectedProduct) {
            const productId = selectedProduct.id || selectedProduct.product_id;
            if (productId) {
                PromoApi.getByProduct(productId)
                    .then((promos) => {
                        setProductPromotions(promos);
                    })
                    .catch((err) => {
                        console.error("Failed to load product promotions:", err);
                        setProductPromotions([]);
                    });
            } else {
                setProductPromotions([]);
            }
        } else {
            setProductPromotions([]);
        }
    }, [selectedProduct]);

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

    const groupedRelatedProducts = useMemo(() => {
        if (!selectedProduct || !allProducts) return [];
        const currentId = selectedProduct.id || selectedProduct.product_id;
        const currentCategory = (selectedProduct.category || selectedProduct.product_category || "").toLowerCase().trim();

        const groups = {};

        allProducts.forEach((product) => {
            const prodId = product.id || product.product_id;
            if (prodId === currentId) return;

            const cat = (product.category || product.product_category || "Products").trim();
            const catKey = cat.toLowerCase();

            if (!groups[catKey]) {
                groups[catKey] = {
                    title: `More ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
                    products: [],
                    isCurrentCategory: catKey === currentCategory
                };
            }
            groups[catKey].products.push(product);
        });

        // Convert to array and sort so the current category's products are shown first!
        return Object.values(groups).sort((a, b) => {
            if (a.isCurrentCategory) return -1;
            if (b.isCurrentCategory) return 1;
            return 0;
        });
    }, [selectedProduct, allProducts]);

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
        setSearchParams({ product: product.uuid });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [setSearchParams]);

    const handleOrderNow = useCallback((product) => {
        if (!product) return;
        const category = (product.category || product.product_category || "").toLowerCase().trim();

        if (category.includes("decal") || category.includes("wrap")) {
            const name = (product.name || product.product_name || "").toLowerCase();
            const type = (product.type || product.product_type || "").toLowerCase();

            if (product.is_car_service || ["pickup", "hatchback", "sedan", "suv", "dechroming"].some(k => name.includes(k) || type.includes(k))) {
                setSelectedCarService(product);
            } else if (product.is_motor_service || ["motorbike", "mio", "yamaha", "honda", "bike", "scooter"].some(k => name.includes(k) || type.includes(k))) {
                setSelectedMotorService(product);
            } else {
                setSelectedCarService(product);
            }
        } else {
            const typeLower = (product.type || product.product_type || "").toLowerCase();
            const nameLower = (product.name || product.product_name || "").toLowerCase();
            const isAssorted = typeLower.includes("assorted") || nameLower.includes("assorted");
            const modalType = isAssorted ? "assorted" : "more";
            setSelectedSticker({
                ...product,
                modalType,
                title: product.name || product.product_name || "Product",
                image: product.image || product.product_image,
                price: parseFloat(product.product_price || product.price || 0),
                description: product.description || product.product_description || "",
                qty: product.quantity ? `${product.quantity} pcs` : product.product_quantity ? `${product.product_quantity} pcs` : undefined,
                quantity: product.quantity || product.product_quantity,
                userAddress: "No address saved",
            });
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
        setSearchParams({});
        setSearchText("");
        setDebouncedSearchText("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [setSearchParams]);

    const handlePrintInfo = async () => {
        const logo = await getLogoBase64();
        const html = buildProductPrintHTML(selectedProduct, logo);
        handleBrowserPrint(html);
    };

    const activePromo = productPromotions && productPromotions.length > 0 ? productPromotions[0] : null;
    const originalPrice = selectedProduct ? parseFloat(selectedProduct.product_price || selectedProduct.price || 0) : 0;
    const discountedPrice = selectedProduct && activePromo ? getDiscountedPrice(originalPrice, activePromo) : originalPrice;
    const hasDiscount = activePromo && (activePromo.discount_type === "percentage" || activePromo.discount_type === "fixed") && discountedPrice < originalPrice;

    return (
        <div className="min-h-screen w-full text-black bg-[#F1F3F7] relative">
            {!selectedProduct && (
                <header className="text-center mt-[140px]">
                    <h1 style={{ fontFamily: "Holtwood One SC, serif" }} className="tracking-wider text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                        Welcome to <span className="text-[#FDE31E]">DSC</span>
                    </h1>
                    <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300 }} className="text-gray-700 pt-2 text-base sm:text-lg md:text-[20px] leading-relaxed">
                        Your trusted shop for high-quality printed stickers! <br />
                        Customize stylish designs for cars, laptops, bottles, and more.
                    </p>
                </header>
            )}

            {!selectedProduct && (
                <SearchBar searchText={searchText} setSearchText={setSearchText} />
            )}

            {selectedProduct ? (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[120px] pb-10 animate-fade-in">
                    <button onClick={handleBackToGallery} className="mb-4 text-gray-500 hover:text-black font-medium text-sm flex items-center gap-2 transition-colors">
                        ← Back to Gallery
                    </button>

                    <div className="bg-white rounded-[30px] shadow-sm p-6 md:p-8">
                        <div className="flex items-center grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="relative w-full h-[400px] md:h-[500px] bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden">
                                {activePromo && (
                                    <PromoTag promo={activePromo} />
                                )}
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
                                        {hasDiscount ? (
                                            <div className="flex items-baseline gap-3 flex-wrap">
                                                <span className="text-3xl md:text-4xl font-bold text-red-600">
                                                    ₱ {discountedPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xl text-gray-400 line-through">
                                                    ₱ {originalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-3xl md:text-4xl font-bold text-[#0B132A]">
                                                ₱ {originalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
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
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                                                </svg>
                                                Add to Cart
                                            </button>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    </div>

                    {groupedRelatedProducts && groupedRelatedProducts.length > 0 && (
                        <div className="mt-16 space-y-12">
                            {groupedRelatedProducts.map((group) => (
                                <div key={group.title} className="animate-fade-in">
                                    <h3 className="text-xl md:text-2xl font-black text-[#0B132A] mb-6 relative after:content-[''] after:block after:w-12 after:h-1 after:bg-[#FDE31E] after:mt-2">
                                        {group.title}
                                    </h3>
                                    <div className="flex overflow-x-auto gap-6 pb-6 pt-2 scroll-smooth custom-scroll select-none">
                                        {group.products.map((product) => {
                                            const promo = product.applied_promo || null;
                                            const originalPrice = parseFloat(product.product_price || product.price || 0);
                                            const discountedPrice = promo ? getDiscountedPrice(originalPrice, promo) : originalPrice;
                                            const hasDiscount = promo && (promo.discount_type === "percentage" || promo.discount_type === "fixed") && discountedPrice < originalPrice;

                                            return (
                                                <div 
                                                    key={product.id || product.product_id}
                                                    onClick={() => handleProductSelection(product)}
                                                    className="flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px] bg-white rounded-2xl hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 pb-4 flex flex-col group overflow-hidden"
                                                >
                                                    <div className="relative h-[200px] w-full bg-gray-50 overflow-hidden">
                                                        {promo && <PromoTag promo={promo} />}
                                                        
                                                        {/* Ready Made or Customizable label */}
                                                        {!((product.category || product.product_category || '').toLowerCase().includes('decal') || (product.category || product.product_category || '').toLowerCase().includes('wrap')) && (
                                                          (product.is_customizable !== 0 && product.is_customizable !== false && product.is_customizable !== "0" && product.is_customizable !== undefined) ? (
                                                            <span className="absolute top-3 left-3 z-10 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md bg-[#FDE31E] text-black border border-yellow-400/50">
                                                              Customizable
                                                            </span>
                                                          ) : (
                                                            <span className="absolute top-3 left-3 z-10 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-md bg-[#0B132A] text-white border border-slate-700/50">
                                                              Ready Made
                                                            </span>
                                                          )
                                                        )}

                                                        <img
                                                            src={getImageUrl(product.image || product.product_image)}
                                                            alt={product.name || product.product_name}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = PLACEHOLDER_IMAGE;
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="px-4 pt-3 flex flex-col flex-1">
                                                        <p className="font-bold text-gray-900 text-sm truncate mb-0.5 group-hover:text-yellow-600 transition-colors">
                                                            {product.name || product.product_name || "Unnamed Product"}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
                                                            {product.category || product.product_category || "General"}
                                                        </p>
                                                        <div className="mt-auto flex items-center justify-between">
                                                            {(product.category || product.product_category || "").toLowerCase().includes("decal") ? (
                                                              <span className="text-xs font-bold text-gray-400 italic">Inquiry Only</span>
                                                            ) : hasDiscount ? (
                                                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                                                <span className="text-red-500 font-black text-sm">
                                                                  ₱{discountedPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                </span>
                                                                <span className="text-gray-400 text-[10px] line-through">
                                                                  ₱{originalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                </span>
                                                              </div>
                                                            ) : (
                                                              <span className="text-gray-900 font-extrabold text-sm">
                                                                ₱{originalPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                              </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {!debouncedSearchText && <GallerySection />}
                    {!loading && (
                        <TopProducts
                            products={filteredProducts}
                            onProductClick={handleProductSelection}
                            onOrderNowClick={handleOrderNow}
                            onAddToCartClick={(item, e) => handleAddToCart(item, e)}
                            onViewAll={() => {
                                navigate('/services/sticker');
                                window.scrollTo(0, 0);
                            }}
                            cartItems={cartItems}
                        />
                    )}
                    {loading ? (
                        <LoadingSkeleton rows={2} cardsPerRow={4} />
                    ) : (
                        <div id="all-products">
                            <Products onProductClick={handleProductSelection} onOrderNowClick={handleOrderNow} onAddToCartClick={(item, e) => handleAddToCart(item, e)} products={filteredProducts} cartItems={cartItems} />
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

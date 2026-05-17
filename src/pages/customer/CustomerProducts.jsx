import { Outlet } from "react-router-dom";
import { useProducts } from "../../context/ProductsContext";
import { IMAGE_BASE_URL } from "../../services/api";
import PromoTag, { getBestPromo, getDiscountedPrice } from "../../components/PromoTag";
import { useState, useCallback } from "react";
import ModalPrinting from "../../components/ModalPrinting";
import ModalMoreStickers from "../../components/ModalMoreStickers";
import ModalGraphicServices from "../../components/ModalGraphicServices";
import ModalGiveawaysStandeenTarpulin from "../../components/ModalGiveawaysStandeenTarpulin";
import ModalGiveawaysMugnShirt from "../../components/ModalGiveawaysMugnShirt";
import ModalGiveawayMore from "../../components/ModalGiveawayMore";
import ModalSignage from "../../components/ModalSignage";
import { buildReceiptHTML, buildProductPrintHTML, handleBrowserPrint, getLogoBase64, PrintIcon } from '../../services/PrintingService.jsx';
import noImage from "../../assets/no_image.png";
import ModalCarServiceInquiry from "../../components/ModalCarServiceInquiry";
import ModalMotorServiceInquiry from "../../components/modals/ModalMotorServiceInquiry";
// HMR Trigger 1
// HMR Trigger 2


const CustomerProducts = () => {
    const { allProducts, loading } = useProducts();
    const promos = []; // No longer needed as promos are pre-applied in context

    // Modal states
    const [selectedSticker, setSelectedSticker] = useState(null);
    const [selectedGraphicItem, setSelectedGraphicItem] = useState(null);
    const [selectedGiveaway, setSelectedGiveaway] = useState(null);
    const [selectedSignage, setSelectedSignage] = useState(null);
    const [selectedPrintingItem, setSelectedPrintingItem] = useState(null);
    const [selectedCarInquiry, setSelectedCarInquiry] = useState(null);
    const [selectedMotorInquiry, setSelectedMotorInquiry] = useState(null);

    const getModalType = (type, name) => {
        const t = (type || "").toLowerCase();
        const n = (name || "").toLowerCase();
        if (t.includes("standee") || t.includes("tarpulin") || n.includes("standee")) {
            return "standee-tarpulinModal";
        } else if (t.includes("mug") || t.includes("shirt") || n.includes("mug") || n.includes("shirt")) {
            return "mug-shirtModal";
        } else {
            return "moreModal";
        }
    };

    const handleViewProduct = useCallback((product) => {
        const category = (product.category || product.product_category || "").toLowerCase().trim();

        if (category === "stickers" || category === "sticker") {
            setSelectedSticker({
                ...product,
                modalType: "more",
                title: product.name || product.product_name || "Sticker",
                image: product.image || product.product_image,
                price: `₱${parseFloat(product.price || 0).toLocaleString("en-PH")}`,
                description: product.description || product.product_description || "",
            });
        }
        else if (category.includes("graphic") || category.includes("logo")) {
            setSelectedGraphicItem(product);
        }
        else if (category.includes("giveaway")) {
            const modalType = getModalType(product.type, product.name);
            setSelectedGiveaway({ ...product, modalType, giveaways: product });
        }
        else if (category.includes("sign")) {
            setSelectedSignage({
                modalType: "signageModal",
                signage: { ...product, title: product.name || product.product_name }
            });
        }
        else if (category === "printing" || category.includes("print")) {
            setSelectedPrintingItem(product);
        }
        else if (category.includes("decal") || category.includes("wrap")) {
            const name = (product.name || product.product_name || "").toLowerCase();
            const type = (product.type || product.product_type || "").toLowerCase();
            if (name.includes("motor") || name.includes("bike") || name.includes("mio") || name.includes("yamaha") || name.includes("honda") || name.includes("scooter") || type.includes("motor")) {
                setSelectedMotorInquiry(product);
            } else {
                setSelectedCarInquiry(product);
            }
        }
    }, []);

    const handlePrintProduct = async (e, product) => {
        e.stopPropagation();
        const logo = await getLogoBase64();
        const html = buildProductPrintHTML(product, logo);
        handleBrowserPrint(html);
    };


    const CATEGORY_LIST = [
        "Stickers",
        "Decals & Wrap",
        "Signage",
        "Giveaways",
        "Printing",
        "Graphic Services"
    ];

    const groupedByCategory = CATEGORY_LIST.reduce((acc, category) => {
        acc[category] = allProducts.filter(p => {
            const productCategory = (p.category || p.product_category || "").toLowerCase();
            return productCategory === category.toLowerCase();
        });
        return acc;
    }, {});

    const getImageUrl = (product) => {
        const imagePath = product.image || product.product_image;
        if (!imagePath) return noImage;
        if (imagePath.startsWith('http')) return imagePath;
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `${IMAGE_BASE_URL}${cleanPath}`;
    };

    const renderPrice = (product, promo, discountedPrice) => {
        const hasDiscount = discountedPrice !== null && discountedPrice < product.price;
        if (hasDiscount) {
            return (
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 line-through text-sm">
                        ₱{product.price.toLocaleString("en-PH")}
                    </span>
                    <span className="text-xl font-bold text-red-600">
                        ₱{discountedPrice.toLocaleString("en-PH")}
                    </span>
                </div>
            );
        }
        return (
            <span className="text-xl font-semibold">
                ₱{product.price.toLocaleString("en-PH")}
            </span>
        );
    };

    const ProductCard = ({ product }) => {
        const bestPromo = product.applied_promo || null;
        const discountedPrice = product.discounted_price ?? null;
        const imageUrl = getImageUrl(product);
        const productName = product.name || product.product_name || "Unnamed Product";
        const productDesc = product.description || product.product_description || "No description available";

        return (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer">
                <div className="relative overflow-hidden h-48 bg-gray-100">
                    <img
                        src={imageUrl}
                        alt={productName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                            e.target.src = noImage;
                        }}
                    />
                    <PromoTag promo={bestPromo} />
                    {product.featured && (
                        <span className="absolute top-3 right-3 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                            Featured
                        </span>
                    )}
                </div>
                <div className="p-5">
                    <h4 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">
                        {productName}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[40px]">
                        {productDesc}
                    </p>
                    <div className="flex items-center justify-between">
                        {renderPrice(product, bestPromo, discountedPrice)}
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => handlePrintProduct(e, product)}
                                className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:text-black hover:bg-gray-200 transition"
                                title="Print product info"
                            >
                                <PrintIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleViewProduct(product)}
                                className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold text-sm transition"
                            >
                                View
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    const MobileProductCard = ({ product }) => {
        const bestPromo = product.applied_promo || null;
        const discountedPrice = product.discounted_price ?? null;
        const imageUrl = getImageUrl(product);
        const productName = product.name || product.product_name || "Unnamed Product";
        const productDesc = product.description || product.product_description || "No description";

        return (
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 hover:shadow-md transition">
                <div className="relative w-24 h-24 flex-shrink-0">
                    <img
                        src={imageUrl}
                        alt={productName}
                        className="w-full h-full object-cover rounded-lg bg-gray-100"
                        onError={(e) => {
                            e.target.src = noImage;
                        }}
                    />
                    <PromoTag promo={bestPromo} />
                </div>
                <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                        <h4 className="font-semibold text-base text-gray-900 line-clamp-1">
                            {productName}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {productDesc}
                        </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        {renderPrice(product, bestPromo, discountedPrice)}
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => handlePrintProduct(e, product)}
                                className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:text-black transition"
                            >
                                <PrintIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleViewProduct(product)}
                                className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1.5 rounded-lg font-semibold text-xs transition"
                            >
                                View
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    return (
        <>
            {/* Desktop / Large screens */}
            <div className="hidden lg:block p-8 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8 text-gray-900">Our Products</h2>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-600">Loading products...</p>
                        </div>
                    ) : (
                        Object.entries(groupedByCategory).map(([category, products]) => (
                            <div key={category} className="mb-12">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-2xl font-semibold text-gray-800">{category}</h3>
                                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                        {products.length} {products.length === 1 ? 'product' : 'products'}
                                    </span>
                                </div>

                                {products.length === 0 ? (
                                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="text-gray-500 font-medium">
                                            No {category.toLowerCase()} products available yet
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">Check back later!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {products.map(product => (
                                            <ProductCard key={product.id || product.product_id} product={product} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    <Outlet />
                </div>
            </div>

            {/* Mobile / Small screens */}
            <div className="lg:hidden min-h-screen bg-gray-50">
                <div className="h-20" aria-hidden="true"></div>

                <div className="px-5 pb-10">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900">Our Products</h2>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
                            <p className="mt-3 text-gray-600 text-sm">Loading...</p>
                        </div>
                    ) : (
                        Object.entries(groupedByCategory).map(([category, products]) => (
                            <div key={category} className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-800">{category}</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {products.length}
                                    </span>
                                </div>

                                {products.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="text-gray-500 text-sm">
                                            No {category.toLowerCase()} available
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {products.map(product => (
                                            <MobileProductCard key={product.id || product.product_id} product={product} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    <Outlet />
                </div>
            </div>

            {/* Modals */}
            {selectedSticker && <ModalMoreStickers sticker={selectedSticker} onClose={() => setSelectedSticker(null)} />}
            {selectedGraphicItem && <ModalGraphicServices product={selectedGraphicItem} onClose={() => setSelectedGraphicItem(null)} />}
            {selectedGiveaway?.modalType === "standee-tarpulinModal" && <ModalGiveawaysStandeenTarpulin giveaways={selectedGiveaway.giveaways} onClose={() => setSelectedGiveaway(null)} />}
            {selectedGiveaway?.modalType === "mug-shirtModal" && <ModalGiveawaysMugnShirt giveaways={selectedGiveaway} onClose={() => setSelectedGiveaway(null)} />}
            {selectedGiveaway?.modalType === "moreModal" && <ModalGiveawayMore giveaways={selectedGiveaway} onClose={() => setSelectedGiveaway(null)} />}
            {selectedSignage && <ModalSignage signage={selectedSignage.signage} onClose={() => setSelectedSignage(null)} />}
            {selectedPrintingItem && <ModalPrinting product={selectedPrintingItem} onClose={() => setSelectedPrintingItem(null)} />}
            {selectedCarInquiry && (
                <ModalCarServiceInquiry
                    product={selectedCarInquiry}
                    onClose={() => setSelectedCarInquiry(null)}
                />
            )}
            {selectedMotorInquiry && (
                <ModalMotorServiceInquiry
                    product={selectedMotorInquiry}
                    onClose={() => setSelectedMotorInquiry(null)}
                />
            )}
        </>
    );
};

export default CustomerProducts;
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import newItem from "../../assets/newItem.svg";
import searchB from "../../assets/search.svg";
import TopProducts from "../../components/TopProducts";
import cImg1 from "../../assets/cImg1.png";
import noImage from "../../assets/no_image.png";
import { fetchUserOrders } from "../../services/OrdersAPI";
import { useProducts } from "../../context/ProductsContext";
import PromoApi from "../../services/PromoApi";
import { IMAGE_BASE_URL } from "../../services/api";
import CustomerOrders from "./CustomerOrders.jsx";

// Sticker modals
import ModalAssortedHologram from "../../components/ModalAssortedHologram.jsx";
import ModalMoreStickers from "../../components/ModalMoreStickers.jsx";
// Signage modal
import ModalSignage from "../../components/ModalSignage.jsx";
// Graphic Services modal
import ModalGraphicServices from "../../components/ModalGraphicServices.jsx";
// Vehicle Inquiry modals
import ModalCarServiceInquiry from "../../components/ModalCarServiceInquiry.jsx";
import ModalMotorServiceInquiry from "../../components/modals/ModalMotorServiceInquiry.jsx";
// Giveaway modals
import ModalGiveawaysMugnShirt from "../../components/ModalGiveawaysMugnShirt.jsx";
import ModalGiveawaysStandeenTarpulin from "../../components/ModalGiveawaysStandeenTarpulin.jsx";
import ModalGiveawayMore from "../../components/ModalGiveawayMore.jsx";
import ModalGiveawayCallingCard from "../../components/ModalGiveawayCallingCard.jsx";
// Printing modal
import ModalPrinting from "../../components/ModalPrinting.jsx";

// ────────────── PROMO CAROUSEL HELPERS (added) ──────────────────────────────
const PROMO_GRADIENTS = [
  { bg: "from-yellow-400 to-orange-400", textColor: "text-black" },
  { bg: "from-purple-500 to-indigo-600", textColor: "text-white" },
  { bg: "from-green-400 to-teal-500", textColor: "text-black" },
  { bg: "from-rose-500 to-pink-600", textColor: "text-white" },
  { bg: "from-sky-400 to-blue-600", textColor: "text-white" },
];

const formatDiscount = (type, value) => {
  if (!value) return null;
  return type === "percentage" ? `${value}% OFF` : `₱${Number(value).toLocaleString("en-PH")} OFF`;
};

const getPromoImage = (promo) => {
  const img = promo.promo_image;
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `${IMAGE_BASE_URL}${img.startsWith("/") ? img.slice(1) : img}`;
};
// ────────────────────────────────────────────────────────────────────────────

// Shopee-style status colors
const statusColor = (status) => {
  switch (status) {
    case "Pending":
    case "To Process":
      return "text-orange-600";
    case "To Ship":
      return "text-purple-600";
    case "To Receive":
      return "text-indigo-600";
    case "Completed":
      return "text-green-600";
    case "Cancelled":
    case "Return/Refund":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const formatPeso = (v) =>
  "Php " + Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const ProductImg = ({ src, alt, className = "w-10 h-10 rounded-lg object-cover border border-gray-100" }) => {
  const [err, setErr] = useState(false);
  const getUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const clean = path.startsWith("/") ? path.slice(1) : path;
    return `${IMAGE_BASE_URL}${clean}`;
  };
  const url = getUrl(src);
  if (!url || err) {
    return (
      <div className={`${className} bg-gray-50 flex items-center justify-center flex-shrink-0`}>
        <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5a1.5 1.5 0 001.5 1.5z" />
        </svg>
      </div>
    );
  }
  return (
    <img src={url} alt={alt} className={`${className} flex-shrink-0`} onError={() => setErr(true)} />
  );
};

// ── Normalize a product item into the shape each modal expects ────────────────
const buildStickerPayload = (item) => {
  console.log("🛠️ Dashboard - Building Sticker Payload from:", item);
  const typeLower = (item.type || item.product_type || "").toLowerCase();
  const nameLower = (item.name || item.product_name || "").toLowerCase();

  const isAssorted =
    typeLower.includes("assorted") ||
    typeLower.includes("set") ||
    nameLower.includes("assorted") ||
    nameLower.includes("set");

  const payload = {
    ...item,
    modalType: isAssorted ? "assorted" : "more",
    title: item.name || item.product_name || "Sticker Product",
    image: item.image || item.product_image,
    price: parseFloat(item.price || item.product_price || 0),
    description: item.description || item.product_description || "",
    qty: item.quantity ? `${item.quantity} pcs` : item.product_quantity ? `${item.product_quantity} pcs` : undefined,
    quantity: item.quantity || item.product_quantity,
    userAddress: "No address saved",
  };
  console.log("📦 Dashboard - Final Sticker Payload:", payload);
  return payload;
};

const buildSignagePayload = (item) => ({
  ...item,
  title: item.name || item.product_name || "Signage Product",
  image: item.image || item.product_image,
  sqft: item.sqft || item.product_sqft || null,
  price: item.price || item.product_price || 0,
  category: item.category || item.product_category || "Signage",
  type: item.type || item.product_type || "Signage",
  description: item.description || item.product_description || "",
});

const buildGraphicPayload = (item) => {
  console.log("🛠️ Dashboard - Building Graphic Payload from:", item);
  const payload = {
    ...item,
    product_name: item.name || item.product_name || "Graphic Service",
    category: item.category || item.product_category || "Graphic Services",
    price: parseFloat(item.price || item.product_price || 0),
    packageInclusions: item.packageInclusions || ["Custom design", "Multiple revisions", "High-resolution files"],
    timeline: item.timeline || ["7-14 Days"],
    Payment: item.payment || ["50% Downpayment", "50% Upon Completion"],
  };
  console.log("📦 Dashboard - Final Graphic Payload:", payload);
  return payload;
};

const buildGiveawayPayload = (item) => {
  console.log("🛠️ Dashboard - Building Giveaway Payload from:", item);
  const type = (item.type || item.product_type || "").toLowerCase();
  const name = (item.name || item.product_name || "").toLowerCase();
  const desc = (item.description || item.product_description || "").toLowerCase();

  let modalType = "moreModal";
  if (type.includes('sintra board') || type.includes('sintraboard') || type.includes('standee') || type.includes('tarpulin')) {
    const identifier = name || desc || type;
    if (identifier.includes('standee') || identifier.includes('tarpulin')) modalType = "standee-tarpulinModal";
  } else if (type.includes('calling card')) {
    modalType = "callingcardModal";
  } else if (type.includes('mug') || type.includes('shirt')) {
    modalType = "mug-shirtModal";
  }

  const payload = {
    ...item,
    modalType,
    product_id: item.id || item.product_id,
    product_name: item.name || item.product_name,
    product_description: item.description || item.product_description,
    product_price: item.price || item.product_price,
    product_image: item.image || item.product_image,
    product_quantity: item.quantity || 1,
    type: item.type || item.product_type,
    category: "Giveaways",
  };
  console.log("📦 Dashboard - Final Giveaway Payload:", payload);
  return payload;
};

const buildPrintingPayload = (item) => {
  console.log("🛠️ Dashboard - Building Printing Payload from:", item);
  const payload = {
    ...item,
    id: item.id || item.product_id,
    title: item.name || item.product_name,
    price: parseFloat(item.price || item.product_price || 0),
    image: item.image || item.product_image,
    description: item.description || item.product_description || "",
    category: "Printing",
  };
  console.log("📦 Dashboard - Final Printing Payload:", payload);
  return payload;
};

// ── Determine which modal to open based on product category ──────────────────
const getModalType = (item) => {
  const category = (item.category || item.product_category || "").toLowerCase().trim();
  const type = (item.type || item.product_type || "").toLowerCase().trim();
  const name = (item.name || item.product_name || "").toLowerCase().trim();

  if (
    category === "stickers" ||
    category === "sticker" ||
    type.includes("sticker") ||
    name.includes("sticker")
  ) return "sticker";

  if (
    category === "signage" ||
    category === "logoflat" ||
    category.includes("signage") ||
    category.includes("neon") ||
    category.includes("sign") ||
    type.includes("signage") ||
    type.includes("logoflat") ||
    name.includes("logoflat") ||
    name.includes("signage")
  ) return "signage";

  if (
    category === "graphic services" ||
    category.includes("graphic") ||
    type.includes("graphic")
  ) return "graphic";

  if (
    category.includes("decal") ||
    category.includes("wrap") ||
    type.includes("decal") ||
    type.includes("wrap")
  ) {
    if (name.includes("motor") || name.includes("bike") || name.includes("mio") || name.includes("yamaha") || name.includes("honda") || name.includes("scooter") || type.includes("motor")) {
      return "motor-decal";
    }
    return "car-decal";
  }

  if (category.includes("giveaway")) return "giveaway";
  if (category.includes("printing")) return "printing";

  return null;
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { allProducts, loading: productsLoading } = useProducts();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // ── Promo states (added) ──
  const [promos, setPromos] = useState([]);
  const [promoCurrent, setPromoCurrent] = useState(0);

  // Modal states
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [selectedSignage, setSelectedSignage] = useState(null);
  const [selectedGraphicItem, setSelectedGraphicItem] = useState(null);
  const [selectedCarInquiry, setSelectedCarInquiry] = useState(null);
  const [selectedMotorInquiry, setSelectedMotorInquiry] = useState(null);
  const [selectedGiveaway, setSelectedGiveaway] = useState(null);
  const [selectedPrinting, setSelectedPrinting] = useState(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  const cImgs = Array(6).fill({ src: cImg1, alt: "cImg1" });
  const [current, setCurrent] = useState(0);
  const length = cImgs.length;

  // Carousel auto-slide (static images)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === length - 1 ? 0 : prev + 1));
    }, 2500);
    return () => clearInterval(timer);
  }, [length]);

  // ── Fetch active product promos for the carousel ──
  useEffect(() => {
    const loadPromos = async () => {
      try {
        // Use product promos only — checkout vouchers belong in the checkout page, not the carousel.
        // Server also filters out exhausted (global + per-user) promos.
        const data = await PromoApi.getProductPromos();
        setPromos(data);
      } catch (err) {
        console.error("Failed to load promos:", err);
        setPromos([]);
      }
    };
    loadPromos();
  }, []);

  // ── Auto-slide for promo carousel ──
  useEffect(() => {
    if (promos.length <= 1) return;
    const timer = setInterval(() => {
      setPromoCurrent((prev) => (prev === promos.length - 1 ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [promos.length]);

  // Fetch orders
  useEffect(() => {
    const getOrders = async () => {
      try {
        const result = await fetchUserOrders();
        console.log("📦 Dashboard orders:", result);

        let ordersData = [];
        if (Array.isArray(result)) {
          ordersData = result;
        } else if (result?.data) {
          ordersData = Array.isArray(result.data) ? result.data : [];
        } else if (result?.orders) {
          ordersData = Array.isArray(result.orders) ? result.orders : [];
        }

        const formattedOrders = ordersData.map((order) => {
          const firstItem = order.order_details?.[0] || order.items?.[0] || {};
          const product = firstItem.product || {};

          const imagePath =
            firstItem.order_image ||
            firstItem.product_image ||
            product.product_image ||
            firstItem.image;

          let productImg = noImage;
          if (imagePath) {
            if (imagePath.startsWith("http")) {
              productImg = imagePath;
            } else {
              const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
              productImg = `${IMAGE_BASE_URL}${cleanPath}`;
            }
          }

          return {
            id: order.order_id,
            product_name: firstItem.product_name || product.product_name || "Product",
            address: order.address || "No address",
            amount: `₱${(order.total_price || 0).toLocaleString("en-PH")}`,
            date: new Date(order.order_date).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            }),
            status: order.status || "Pending",
            productImg,
            itemsCount: order.order_details?.length || order.items?.length || 1,
          };
        });

        setOrders(formattedOrders.slice(0, 5));
      } catch (err) {
        console.error("❌ Failed to fetch orders:", err);
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    getOrders();
  }, []);

  // Unified handler for product clicks
  const handleOpenModal = (item) => {
    console.log("🛠️ Dashboard - Opening Modal for:", item);
    const modalType = getModalType(item);
    if (modalType === "sticker") { setSelectedSticker(buildStickerPayload(item)); return; }
    if (modalType === "signage") { setSelectedSignage(buildSignagePayload(item)); return; }
    if (modalType === "graphic") { setSelectedGraphicItem(buildGraphicPayload(item)); return; }
    if (modalType === "car-decal") { setSelectedCarInquiry(item); return; }
    if (modalType === "motor-decal") { setSelectedMotorInquiry(item); return; }
    if (modalType === "giveaway") { setSelectedGiveaway(buildGiveawayPayload(item)); return; }
    if (modalType === "printing") { setSelectedPrinting(buildPrintingPayload(item)); return; }

    console.warn("Unknown product category, defaulting to MoreStickers:", item);
    setSelectedSticker(buildStickerPayload(item));
  };

  const loading = productsLoading || loadingOrders;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-yellow-400 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F1F3F7] min-h-screen">
      {/* ── DESKTOP ──────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col p-3 bg-white rounded-3xl shadow-md min-h-[calc(100vh-2.5rem)] w-full">
        <div className="flex gap-3 flex-col md:flex-row">
          {/* Promo Carousel — Desktop (REPLACED) */}
          <div className="relative w-full md:w-[500px] rounded-[16px] overflow-hidden flex-shrink-0" style={{ minHeight: "220px" }}>
            {promos.length === 0 ? (
              <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-yellow-400 to-orange-400 rounded-[16px] flex items-center justify-center">
                <p className="text-black font-bold text-lg opacity-50">No active promotions</p>
              </div>
            ) : (
              <>
                <div
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${promoCurrent * 100}%)` }}
                >
                  {promos.map((promo, i) => {
                    const { bg, textColor } = PROMO_GRADIENTS[i % PROMO_GRADIENTS.length];
                    const discount = formatDiscount(promo.discount_type, promo.discount_value);
                    const promoImg = getPromoImage(promo);
                    return (
                      <div
                        key={promo.promotion_id}
                        className="min-w-full relative flex justify-between rounded-[16px] overflow-hidden"
                        style={{ minHeight: "220px" }}
                      >
                        {/* Background */}
                        {promoImg ? (
                          <>
                            <img src={promoImg} alt={promo.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
                        )}

                        {/* Text side */}
                        <div className={`flex flex-col justify-between p-6 flex-1 relative z-10 w-full md:w-2/3 ${promoImg ? 'text-white' : textColor}`}>
                          {discount && (
                            <span className={`text-[10px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded-full w-fit opacity-90 shadow-sm ${promoImg ? 'border-white/50 bg-black/30' : 'border-current'}`}>
                              {discount}
                            </span>
                          )}
                          <div>
                            <p className="font-black text-[22px] leading-tight drop-shadow-md">{promo.name}</p>
                            {promo.description && (
                              <p className="text-[12px] mt-1 opacity-90 line-clamp-2 drop-shadow-sm">{promo.description}</p>
                            )}
                            {promo.end_date && (
                              <p className="text-[10px] mt-2 opacity-80 tracking-wider font-semibold drop-shadow-sm">
                                VALID UNTIL {new Date(promo.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                              </p>
                            )}
                            <button 
                              onClick={() => navigate("/products")}
                              className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-bold w-fit transition shadow-md
                                ${promoImg ? "bg-[#FDE31E] text-black hover:bg-yellow-400" : (textColor === "text-white" ? "bg-white text-black hover:bg-gray-100" : "bg-black text-white hover:bg-gray-800")}`}>
                              Shop Now <img src={newItem} alt="" className="h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Dots */}
                {promos.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {promos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPromoCurrent(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${i === promoCurrent ? "bg-black w-4 opacity-80" : "bg-black w-2 opacity-30"}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Orders */}
          <div className="border border-[#DCDCDC] rounded-[12px] flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex border-b border-[#DCDCDC] items-center justify-between p-3 bg-white">
              <h4 className="font-semibold text-[17px]">Recent orders</h4>
              <button
                onClick={() => setShowOrdersModal(true)}
                className="text-[14px] text-blue-600 font-semibold bg-[#F4F4F4] border border-[#DCDCDC] p-1 px-2 rounded-[6px] cursor-pointer hover:bg-gray-200 transition"
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto flex-1 p-2">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 border-b border-gray-50">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Product</th>
                    <th className="py-2 px-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Shipping Address</th>
                    <th className="py-2 px-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Amount</th>
                    <th className="py-2 px-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Date</th>
                    <th className="py-2 px-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!orders || orders.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">No orders yet</td>
                    </tr>
                  ) : (
                    orders.slice(0, 10).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-3">
                            <ProductImg src={o.productImg} alt={o.product_name} className="w-8 h-8 rounded-md object-cover border border-gray-100" />
                            <div>
                              <p className="font-bold text-gray-900 text-xs">{o.product_name}</p>
                              {o.itemsCount > 1 && (
                                <p className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full w-fit mt-0.5">
                                  +{o.itemsCount - 1} more
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3">
                          <p className="text-gray-500 truncate max-w-[150px] text-xs" title={o.address}>
                            {o.address || "—"}
                          </p>
                        </td>
                        <td className="px-3 font-bold text-gray-900 text-xs">{o.amount}</td>
                        <td className="px-3 text-gray-500 text-xs">{o.date}</td>
                        <td className="px-3">
                          <span className={`${statusColor(o.status)} font-bold text-xs`}>{o.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Static Carousel (cImg1 images) */}
        <div className="relative overflow-hidden rounded-[16px] h-60 mt-5">
          <div
            className="flex transition-transform ease-in-out duration-700"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {cImgs.map((item, index) => (
              <div key={index} className="min-w-full h-[350px] flex items-center justify-center bg-gray-200">
                <img src={item.src} alt={item.alt} loading="lazy" className="object-cover w-full h-full rounded-[16px]" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center mt-3 gap-1">
          {cImgs.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`w-2 h-2 rounded-full transition ${index === current ? "bg-black" : "bg-gray-500"}`}
            />
          ))}
        </div>

        {/* Top Products */}
        <div className="rounded-xl mt-6 ">
          <TopProducts
            products={allProducts}
            onProductClick={handleOpenModal}
            onOrderNowClick={handleOpenModal}
            onViewAll={() => navigate("/products")}
          />
        </div>
      </div>

      {/* ── MOBILE ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden min-h-screen bg-gray-50">
        <div className="h-20" aria-hidden="true"></div>
        <div className="px-5 pb-10 space-y-8">
          {/* Promo Banner Carousel — Mobile (REPLACED) */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ minHeight: "256px" }}>
            {promos.length === 0 ? (
              <div className="w-full h-64 bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
                <p className="text-black font-bold opacity-50">No active promotions</p>
              </div>
            ) : (
              <>
                <div
                  className="flex transition-transform duration-700 ease-in-out"
                  style={{ transform: `translateX(-${promoCurrent * 100}%)` }}
                >
                  {promos.map((promo, i) => {
                    const { bg, textColor } = PROMO_GRADIENTS[i % PROMO_GRADIENTS.length];
                    const discount = formatDiscount(promo.discount_type, promo.discount_value);
                    const promoImg = getPromoImage(promo);
                    return (
                      <div
                        key={promo.promotion_id}
                        className="min-w-full h-64 relative flex justify-between overflow-hidden"
                      >
                        {/* Background */}
                        {promoImg ? (
                          <>
                            <img src={promoImg} alt={promo.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                          </>
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />
                        )}

                        {/* Text side */}
                        <div className={`flex flex-col justify-end p-6 flex-1 relative z-10 w-full ${promoImg ? 'text-white' : textColor}`}>
                          <div className="mb-auto">
                            {discount && (
                              <span className={`text-[10px] font-bold tracking-widest uppercase border px-2 py-0.5 rounded-full w-fit opacity-90 shadow-sm ${promoImg ? 'border-white/50 bg-black/30' : 'border-current'}`}>
                                {discount}
                              </span>
                            )}
                          </div>
                          <div>
                            <h1 className="text-2xl font-black leading-tight drop-shadow-md">{promo.name}</h1>
                            {promo.description && (
                              <p className="text-xs mt-1 opacity-90 line-clamp-2 drop-shadow-sm">{promo.description}</p>
                            )}
                            {promo.end_date && (
                              <p className="text-[10px] mt-2 opacity-80 tracking-wider font-semibold drop-shadow-sm">
                                VALID UNTIL {new Date(promo.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
                              </p>
                            )}
                            <button 
                              onClick={() => navigate("/products")}
                              className={`mt-4 px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 w-fit shadow-md
                                ${promoImg ? "bg-[#FDE31E] text-black hover:bg-yellow-400" : (textColor === "text-white" ? "bg-white text-black" : "bg-black text-white")}`}>
                              Shop Now <img src={newItem} alt="" className="h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {promos.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {promos.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i === promoCurrent ? "bg-white w-4" : "bg-white/50 w-2"}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#DCDCDC] flex flex-col min-h-0 overflow-hidden">
            <div className="flex border-b border-[#DCDCDC] items-center justify-between p-5">
              <h3 className="font-bold text-lg">Recent Orders</h3>
              <button
                onClick={() => setShowOrdersModal(true)}
                className="text-[14px] text-blue-600 font-semibold bg-[#F4F4F4] border border-[#DCDCDC] p-1.5 px-3 rounded-lg hover:bg-gray-200 transition"
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto flex-1 p-2">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10">
                  <tr className="border-b border-gray-50">
                    <th className="py-3 px-4 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Product</th>
                    <th className="py-3 px-4 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Shipping Address</th>
                    <th className="py-3 px-4 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Amount</th>
                    <th className="py-3 px-4 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Date</th>
                    <th className="py-3 px-4 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {!orders || orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">No orders yet.</td>
                    </tr>
                  ) : orders.slice(0, 5).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProductImg src={o.productImg} alt={o.product_name} />
                          <div>
                            <p className="font-bold text-gray-900">{o.product_name}</p>
                            {o.itemsCount > 1 && (
                              <p className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full w-fit mt-0.5">
                                +{o.itemsCount - 1} more items
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-500 truncate max-w-[200px]" title={o.address}>
                          {o.address || "—"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900">{o.amount}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-500">{o.date}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${statusColor(o.status)}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center bg-white border border-gray-300 rounded-xl px-5 py-4 shadow-sm">
            <input 
              type="text" 
              placeholder="Search your style..." 
              className="flex-1 outline-none text-gray-700" 
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate("/products");
              }}
            />
            <img src={searchB} alt="search" className="w-5 h-5 cursor-pointer" onClick={() => navigate("/products")} />
          </div>

          {/* Static Carousel (mobile) */}
          <div className="relative rounded-2xl overflow-hidden h-64 shadow-lg">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {cImgs.map((item, index) => (
                <img key={index} src={item.src} alt={item.alt} loading="lazy" className="min-w-full h-64 object-cover" />
              ))}
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {cImgs.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition ${i === current ? "bg-white" : "bg-white/50"}`} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <TopProducts
              products={allProducts}
              onProductClick={handleOpenModal}
              onOrderNowClick={handleOpenModal}
              onViewAll={() => navigate("/products")}
            />
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {selectedSticker?.modalType === "assorted" && (
        <ModalAssortedHologram
          sticker={selectedSticker}
          onClose={() => setSelectedSticker(null)}
        />
      )}
      {selectedSticker?.modalType === "more" && (
        <ModalMoreStickers
          sticker={selectedSticker}
          onClose={() => setSelectedSticker(null)}
        />
      )}
      {selectedSignage && (
        <ModalSignage
          signage={selectedSignage}
          onClose={() => setSelectedSignage(null)}
        />
      )}
      {selectedGraphicItem && (
        <ModalGraphicServices
          product={selectedGraphicItem}
          onClose={() => setSelectedGraphicItem(null)}
        />
      )}
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
      {selectedGiveaway && selectedGiveaway.modalType === "standee-tarpulinModal" && (
        <ModalGiveawaysStandeenTarpulin
          giveaways={selectedGiveaway}
          onClose={() => setSelectedGiveaway(null)}
        />
      )}
      {selectedGiveaway && selectedGiveaway.modalType === "mug-shirtModal" && (
        <ModalGiveawaysMugnShirt
          giveaways={selectedGiveaway}
          onClose={() => setSelectedGiveaway(null)}
        />
      )}
      {selectedGiveaway && selectedGiveaway.modalType === "callingcardModal" && (
        <ModalGiveawayCallingCard
          giveaways={selectedGiveaway}
          onClose={() => setSelectedGiveaway(null)}
        />
      )}
      {selectedGiveaway && selectedGiveaway.modalType === "moreModal" && (
        <ModalGiveawayMore
          giveaways={selectedGiveaway}
          onClose={() => setSelectedGiveaway(null)}
        />
      )}
      {selectedPrinting && (
        <ModalPrinting
          product={selectedPrinting}
          onClose={() => setSelectedPrinting(null)}
        />
      )}
      {showOrdersModal && (
        <CustomerOrders
          isModal={true}
          onClose={() => setShowOrdersModal(false)}
        />
      )}
    </div>
  );
};

export default CustomerDashboard;
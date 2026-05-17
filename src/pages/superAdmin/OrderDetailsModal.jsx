import React from "react";
import { IMAGE_BASE_URL } from "../../services/api";
import noImage from "../../assets/no_image.png";

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  // ── Resolve items — same broad detection as transformOrder ────────────────
  const items =
    (Array.isArray(order.order_details) && order.order_details.length > 0 ? order.order_details : null) ||
    (Array.isArray(order.items) && order.items.length > 0 ? order.items : null) ||
    (Array.isArray(order.order_items) && order.order_items.length > 0 ? order.order_items : null) ||
    [];

  const getImageUrl = (item) => {
    const imagePath =
      item?.order_image || item?.product_image || item?.product?.product_image || item?.image;
    if (!imagePath) return noImage;
    if (imagePath.startsWith("http")) return imagePath;
    const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
    return `${IMAGE_BASE_URL}${cleanPath}`;
  };

  const parseVal = (v) => {
    if (typeof v === "number") return v;
    if (!v) return 0;
    return parseFloat(String(v).replace(/[^0-9.-]+/g, "")) || 0;
  };

  const getItemPrice = (item) =>
    parseVal(item.item_price || item.price || item.items_price || item.product_price || item.product?.product_price || item.product?.price);

  const getItemSubtotal = (item) => {
    let s = parseVal(item.subtotal);
    if (s === 0) s = (Number(item.quantity) || 1) * getItemPrice(item);
    return s;
  };

  const statusStyle = {
    Pending: "bg-orange-100 text-orange-700",
    "To Process": "bg-blue-100 text-blue-700",
    "To Ship": "bg-purple-100 text-purple-700",
    "To Receive": "bg-indigo-100 text-indigo-700",
    "Shipment Approved": "bg-indigo-100 text-indigo-700",
    Shipped: "bg-indigo-100 text-indigo-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
    "Return/Refund": "bg-gray-100 text-gray-700",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DCDCDC] flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order {order.order_number || `#${order.order_id}`}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Placed on{" "}
              {new Date(order.order_date).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* Customer Info + Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-[#DCDCDC]">
              <h3 className="font-bold text-gray-800 text-xs mb-3 uppercase tracking-wider">Customer Information</h3>
              <div className="space-y-2 text-sm">
                {[
                  ["Name", order.user ? `${order.user.first_name} ${order.user.last_name}` : order.name || "Customer"],
                  ["Email", order.email || order.user?.email || "—"],
                  ["Contact", order.contact_number || order.user?.contact_no || order.user?.phone || "—"],
                  ["Address", order.address || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-gray-400 w-16 flex-shrink-0">{label}:</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-[#DCDCDC]">
              <h3 className="font-bold text-gray-800 text-xs mb-3 uppercase tracking-wider">Order Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 w-16 flex-shrink-0">Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${statusStyle[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status === "Shipment Approved" || order.status === "To Receive" || order.status === "Shipped" ? "Out for Delivery" : order.status}
                  </span>
                </div>
                {[
                  ["Tracking", order.tracking_number || "—"],
                  ["Payment", order.payment_method || "COD"],
                  ["Courier", order.courier || "J&T"],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-gray-400 w-16 flex-shrink-0">{label}:</span>
                    <span className="font-semibold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Design Proof Preview if available */}
          {order.final_design_url && (
            <div className="mb-6 p-6 rounded-2xl border border-emerald-200 bg-emerald-50/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2.5 h-full bg-emerald-500"></div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">🎨 Artist Uploaded Design Proof</span>
                <a
                  href={`${IMAGE_BASE_URL}${order.final_design_url.startsWith('/') ? order.final_design_url.slice(1) : order.final_design_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-black uppercase text-emerald-700 hover:text-emerald-900 transition"
                >
                  Open Full Resolution ↗
                </a>
              </div>
              <div className="w-full max-h-[300px] rounded-xl bg-white border border-gray-100 flex items-center justify-center p-4 overflow-hidden shadow-inner">
                <img
                  src={`${IMAGE_BASE_URL}${order.final_design_url.startsWith('/') ? order.final_design_url.slice(1) : order.final_design_url}`}
                  className="max-h-[268px] object-contain hover:scale-[1.01] transition-transform duration-300"
                  alt="Artist design proof"
                />
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                Order Items
              </h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${items.length > 0 ? "bg-gray-200 text-gray-700" : "bg-red-100 text-red-600"}`}>
                {items.length} item{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No item details available for this order.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <div key={index} className="p-5 hover:bg-gray-50 transition">
                    <div className="flex gap-4">
                      {/* Image */}
                      <img
                        src={getImageUrl(item)}
                        alt={item.product_name || item.name || "Product"}
                        className="w-20 h-20 object-cover rounded-xl border border-[#DCDCDC] flex-shrink-0"
                        onError={(e) => { e.target.src = noImage; }}
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">
                              {item.product_name || item.name || item.title || "Product"}
                            </h4>
                            {/* ── FIX: Show product_id prominently ── */}
                            {(item.product_id || item.id) && (
                              <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-tighter">
                                ID: <span className="font-mono text-gray-600">#{item.product_id || item.id}</span>
                              </p>
                            )}
                          </div>
                          <p className="font-bold text-gray-900 text-xl ml-4 flex-shrink-0">
                            ₱{getItemSubtotal(item).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Specs grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Qty</span>
                            <p className="font-semibold text-gray-900">{item.quantity || 1}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Unit Price</span>
                            <p className="font-semibold text-gray-900">
                              ₱{getItemPrice(item).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          {item.size && (
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Size</span>
                              <p className="font-semibold text-gray-900 capitalize">{item.size}</p>
                            </div>
                          )}
                          {item.pieces && item.pieces !== "0" && (
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Pieces</span>
                              <p className="font-semibold text-gray-900">{item.pieces}</p>
                            </div>
                          )}
                          {(item.tier || item.category || item.product?.category) && (
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Category</span>
                              <p className="font-semibold text-gray-900 capitalize">
                                {item.tier || item.category || item.product?.category}
                              </p>
                            </div>
                          )}
                          {item.type && (
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Type</span>
                              <p className="font-semibold text-gray-900 capitalize">{item.type}</p>
                            </div>
                          )}

                          {/* Dynamic extra fields */}
                          {Object.entries(item)
                            .filter(([key, value]) => {
                              const skip = [
                                "product_id", "order_image", "product_image", "image", "subtotal",
                                "item_price", "quantity", "product_name", "comments", "id", "user_id",
                                "order_id", "created_at", "updated_at", "product", "category",
                                "productName", "name", "title", "product_type", "type",
                                "size", "pieces", "tier", "items_price", "price", "product_price",
                              ];
                              return !skip.includes(key) && value && value !== "None" && value !== "null" && value !== "0";
                            })
                            .map(([key, value]) => (
                              <div key={key}>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <p className="font-semibold text-gray-900 capitalize">{String(value)}</p>
                              </div>
                            ))}
                        </div>

                        {item.comments && item.comments !== "None" && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Note:</p>
                            <p className="text-sm text-gray-700 italic">"{item.comments}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="mt-5 bg-gray-50 rounded-xl p-5 border border-[#DCDCDC]">
            <h3 className="font-bold text-xs text-gray-400 mb-3 uppercase tracking-widest">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Items Subtotal</span>
                <span className="font-bold text-gray-800">
                  ₱{items.reduce((sum, itm) => sum + getItemSubtotal(itm), 0)
                    .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span className="font-bold text-gray-800">
                  {order.payment_method === "Pickup" ? "₱0.00 (Pickup)" : "₱100.00"}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#DCDCDC] font-black text-lg">
                <span className="text-gray-900 uppercase text-xs tracking-tighter">Total Amount</span>
                <span className="text-[#FDE31E] drop-shadow-sm" style={{ WebkitTextStroke: "1px #000" }}>
                  ₱{(Number(order.total_price) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-[#DCDCDC] flex justify-end">
          <button onClick={onClose}
            className="px-6 py-2.5 bg-[#FDE31E] hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition shadow-sm active:scale-95">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
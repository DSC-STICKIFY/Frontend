import React, { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Assets
import totalOrders from "../../assets/totalOrders.svg";
import pendingOrders from "../../assets/pendingOrders.svg";
import delivered from "../../assets/delivered.svg";
import returns from "../../assets/returns.svg";
import addNote from "../../assets/addNote.svg";

// API
import { fetchAllOrders } from "../../services/OrdersAPI";
import { getImageUrl } from "../../services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

const formatPeso = (v) =>
  "Php " + Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const statusColor = (status) =>
  ({
    Pending:           "text-yellow-500",
    "Pending Payment": "text-gray-400 font-bold italic",
    "To Process":      "text-blue-500",
    "To Ship":         "text-purple-500",
    "To Receive":      "text-indigo-500",
    Shipped:           "text-indigo-600 font-bold",
    "Item Ready":      "text-blue-600 font-bold",
    Completed:         "text-green-500",
    Cancelled:         "text-red-500",
    Canceled:          "text-red-500",
    "Return/Refund":   "text-gray-500",
    Refunded:          "text-rose-600 font-bold",
  }[status] || "text-gray-500");

const getCustomerName = (order) => {
  if (order.name && order.name !== "Customer") return order.name;
  if (order.user?.first_name || order.user?.last_name)
    return `${order.user.first_name || ""} ${order.user.last_name || ""}`.trim();
  return order.customer_name || "Customer";
};

// ✅ NEW: Deduct income for any status that is NOT a valid sale
const isOrderEffectivelyRefunded = (order) => {
  const status = (order.status || "").toLowerCase().trim();

  // ✅ Keep income — valid sales OR still-in-progress return (not yet approved)
  const keepIncomeFor = [
    "pending", "to process", "to ship", "to receive",
    "completed", "shipped", "installed",
    "return/refund",   // still in progress — refund NOT yet confirmed
  ];
  if (keepIncomeFor.includes(status)) return false;

  // ❌ Deduct income — refund confirmed (approved) or cancelled
  // Covers: "approved", "return/refund approved", "cancelled", "canceled", "refunded", etc.
  return true;
};

// ─────────────────────────────────────────────────────────────────────────────
// Build chart data – income excludes effectively refunded orders
// ─────────────────────────────────────────────────────────────────────────────
const buildChartData = (orders, filter) => {
  const now = new Date();
  const buckets = {};

  const getKey = (d) => {
    if (filter === "Last 7 days" || filter === "Last 30 days" || filter === "This month")
      return `${d.toLocaleString("en-US", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`;
    return d.toLocaleString("en-US", { month: "short" });
  };

  const days = filter === "Last 7 days" ? 7 : filter === "Last 30 days" ? 30 : 0;
  if (days) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      buckets[getKey(d)] = { orders: 0, income: 0 };
    }
  } else if (filter === "This month") {
    const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= dim; day++) {
      const dt = new Date(now.getFullYear(), now.getMonth(), day);
      buckets[getKey(dt)] = { orders: 0, income: 0 };
    }
  } else {
    for (let m = 0; m < 12; m++)
      buckets[new Date(0, m).toLocaleString("en-US", { month: "short" })] = { orders: 0, income: 0 };
  }

  orders.forEach((o) => {
    if (!o.order_date) return;
    const d = new Date(o.order_date);
    if (isNaN(d)) return;
    const msAgo = now - d;
    if (filter === "Last 7 days"  && msAgo > 7  * 86400000) return;
    if (filter === "Last 30 days" && msAgo > 30 * 86400000) return;
    if (filter === "This month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return;
    if (filter === "This year"  && d.getFullYear() !== now.getFullYear()) return;
    const key = getKey(d);
    if (buckets[key] !== undefined) {
      buckets[key].orders++;  // count all orders

      // Only add income if order is NOT effectively refunded
      if (!isOrderEffectivelyRefunded(o)) {
        buckets[key].income += Number(o.total_price || 0);
      }
    }
  });

  return {
    labels: Object.keys(buckets),
    orders: Object.values(buckets).map((b) => b.orders),
    income: Object.values(buckets).map((b) => b.income),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Product image with fallback
// ─────────────────────────────────────────────────────────────────────────────
const ProductImg = ({ src, alt, className = "w-10 h-10 rounded-lg object-cover" }) => {
  const [err, setErr] = useState(false);
  const url = getImageUrl(src);
  if (!url || err) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center flex-shrink-0`}>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// ─────────────────────────────────────────────────────────────────────────────
// Chart component
// ─────────────────────────────────────────────────────────────────────────────
const DashboardChart = ({ chartData }) => {
  if (!chartData) return null;
  const data = {
    labels: chartData.labels,
    datasets: [
      { label: "Orders",        data: chartData.orders, backgroundColor: "#00B731" },
      { label: "Income Growth", data: chartData.income, backgroundColor: "#00681C" },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 20000, callback: (v) => (v >= 1000 ? v / 1000 + "k" : v) },
      },
      x: { grid: { display: false } },
    },
  };
  return <Bar data={data} options={options} height={250} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon, bg }) => (
  <div className={`flex justify-between px-3 py-2 rounded-lg ${bg}`}>
    <div>
      <p className="text-[15px] font-medium">{title}</p>
      <p className="text-[15px] font-bold">{value}</p>
    </div>
    <div className="flex h-6">
      <img src={icon} alt={title} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// All Orders Modal
// ─────────────────────────────────────────────────────────────────────────────
const AllOrdersModal = ({ orders, onClose }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = [
    "All",
    "Pending",
    "Pending Payment",
    "To Process",
    "To Ship",
    "To Receive",
    "Completed",
    "Cancelled",
    "Return/Refund",
  ];

  const filtered = orders.filter((o) => {
    const firstItem = o.order_details?.[0] || o.items?.[0] || {};
    const productName =
      firstItem.product_name ||
      firstItem.product?.product_name ||
      o.product_name ||
      "Product";
    const customer = getCustomerName(o).toLowerCase();
    const email = (o.email || o.user?.email || "").toLowerCase();
    const contact = (o.contact_number || o.user?.contact_number || "").toLowerCase();
    const orderNo = (o.order_number || String(o.order_id) || "").toLowerCase();
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      productName.toLowerCase().includes(q) ||
      customer.includes(q) ||
      email.includes(q) ||
      contact.includes(q) ||
      orderNo.includes(q);

    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "Return/Refund"
        ? o.status === "Return/Refund" || o.status === "Refunded"
        : o.status === statusFilter);
    return matchSearch && matchStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCDCDC]">
          <div>
            <h2 className="font-semibold text-lg">All Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {orders.length} orders</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none font-bold">×</button>
        </div>
        {/* Filters */}
        <div className="px-5 py-3 border-b border-[#DCDCDC] flex flex-wrap gap-3 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search product, customer, order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-8 py-1.5 border border-[#DCDCDC] rounded-lg text-sm w-64 focus:outline-none focus:border-yellow-400"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#DCDCDC] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
          >
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-[#DCDCDC]">
                <th className="py-2 px-4 font-semibold text-gray-600">#</th>
                <th className="py-2 px-4 font-semibold text-gray-600">Product</th>
                <th className="py-2 px-4 font-semibold text-gray-600">Customer</th>
                <th className="py-2 px-4 font-semibold text-gray-600">Shipping Address</th>
                <th className="py-2 px-4 font-semibold text-gray-600">Amount</th>
                <th className="py-2 px-4 font-semibold text-gray-600">Date</th>
                <th className="py-2 px-4 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">No orders found.</td></tr>
              ) : filtered.map((o) => {
                const firstItem   = o.order_details?.[0] || o.items?.[0] || {};
                const imgSrc      = firstItem.product_image || o.product_image || null;
                const productName = firstItem.product_name || firstItem.product?.product_name || o.product_name || "Product";
                return (
                  <tr key={o.order_id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-2 px-4 text-gray-400 text-xs font-mono">
                      {o.order_number ? o.order_number.replace('ORD-', '#') : `#${o.order_id}`}
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <ProductImg src={imgSrc} alt={productName} className="w-8 h-8 rounded-lg object-cover" />
                        <span className="font-medium truncate max-w-[130px]">{productName}</span>
                        {(o.order_details?.length || o.items?.length || 0) > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                            +{(o.order_details?.length || o.items?.length) - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4 font-medium">{getCustomerName(o)}</td>
                    <td className="py-2 px-4 text-gray-500 max-w-[180px] truncate">
                      {o.address || o.delivery_address || o.user?.address || "—"}
                    </td>
                    <td className="py-2 px-4 font-semibold">{formatPeso(o.total_price)}</td>
                    <td className="py-2 px-4 text-gray-500">{formatDateShort(o.order_date)}</td>
                    <td className={`py-2 px-4 font-medium ${statusColor(o.status)}`}>{o.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#DCDCDC] bg-gray-50 flex items-center justify-between rounded-b-2xl">
          <p className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          <button onClick={onClose} className="text-sm font-semibold text-gray-600 bg-white border border-[#DCDCDC] px-4 py-1.5 rounded-lg hover:bg-gray-50 transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Recent Orders
// ─────────────────────────────────────────────────────────────────────────────
const RecentOrders = ({ orders, onViewAll }) => {
  const recent = orders.slice(0, 8);
  return (
    <div className="border border-[#DCDCDC] rounded-[12px] p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex border-b border-[#DCDCDC] items-center justify-between mb-2 p-3">
        <h4 className="font-semibold text-[17px]">Recent Orders</h4>
        <button onClick={onViewAll} className="text-[14px] text-blue-600 font-semibold bg-[#F4F4F4] border border-[#DCDCDC] p-1 px-2 rounded-[6px] hover:bg-gray-200 transition">
          View all
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              <th className="py-2 px-3 font-semibold">Product</th>
              <th className="py-2 px-3 font-semibold">Shipping Address</th>
              <th className="py-2 px-3 font-semibold">Amount</th>
              <th className="py-2 px-3 font-semibold">Date</th>
              <th className="py-2 px-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">No orders yet.</td>
              </tr>
            ) : recent.map((o) => {
              const firstItem   = o.order_details?.[0] || o.items?.[0] || {};
              const imgSrc      = firstItem.product_image || o.product_image || null;
              const productName = firstItem.product_name || firstItem.product?.product_name || o.product_name || "Product";
              const address     = o.address || o.delivery_address || o.user?.address || "—";
              return (
                <tr key={o.order_id}>
                  <td className="py-1 flex items-center gap-3 px-3">
                    <ProductImg src={imgSrc} alt={productName} className="w-10 h-10 rounded-lg object-cover" />
                    <span className="font-medium">{productName}</span>
                  </td>
                  <td className="truncate max-w-[200px] px-3">{address}</td>
                  <td className="px-3">{formatPeso(o.total_price)}</td>
                  <td className="px-3">{formatDateShort(o.order_date)}</td>
                  <td className={`${statusColor(o.status)} px-3 font-medium`}>{o.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Top List
// ─────────────────────────────────────────────────────────────────────────────
const TopList = ({ title, items, type = "product" }) => (
  <div className="border rounded-lg p-3 border-[#DCDCDC] flex-1 flex flex-col min-h-0">
    <p className="font-semibold mb-3">{title}</p>
    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pr-1">
      {items.length > 0 ? (
        items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.img ? (
                <ProductImg src={item.img} alt={item.name} className="rounded w-10 h-10 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 font-bold text-sm">
                    {item.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                </div>
              )}
              <p className="truncate max-w-[150px]">{item.name}</p>
            </div>
            <div className="border border-[#DCDCDC] py-1 px-2 rounded-lg">
              <p className="text-[13px] font-semibold">{item.count} orders</p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-400">No items available</p>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Notes
// ─────────────────────────────────────────────────────────────────────────────
const Notes = ({ notesList, setNotesList, isModalOpen, setIsModalOpen, note, setNote, handleAddNote }) => (
  <div className="border rounded-lg p-3 flex flex-col bg-[#FFFCE2] border-[#DCDCDC] flex-1 min-h-0 overflow-y-auto">
    <div className="flex justify-between items-center mb-2">
      <p className="font-semibold">Notes</p>
      <img src={addNote} alt="Add Note" className="w-6 h-6 cursor-pointer" onClick={() => setIsModalOpen(true)} />
    </div>
    <div className="flex-1 overflow-y-auto">
      {notesList.length === 0 ? (
        <p className="flex justify-center mt-20 text-gray-400 text-sm">No notes yet.</p>
      ) : (
        notesList.map((n, i) => (
          <div
            key={i}
            onClick={() => setNotesList(notesList.filter((_, idx) => idx !== i))}
            className="p-1 rounded text-sm cursor-pointer hover:bg-yellow-100 transition"
            title="Click to remove"
          >
            • {n}
          </div>
        ))
      )}
    </div>
    {isModalOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-5 rounded-lg w-96 shadow-lg">
          <h2 className="font-semibold text-lg mb-3">Add Note</h2>
          <textarea
            className="border border-gray-300 rounded-md p-2 mb-3 w-full h-28 resize-none focus:outline-none"
            placeholder="Write your note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="px-6 py-2.5 rounded-lg bg-[#FDE31E] font-bold text-sm hover:bg-yellow-400 transition" onClick={handleAddNote}>
              Save
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const SuperAdminDashboard = () => {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("Last 7 days");
  const [notesList,     setNotesList]     = useState([]);
  const [note,          setNote]          = useState("");
  const [isModalOpen,   setIsModalOpen]   = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAllOrders();
      setOrders(Array.isArray(result) ? result : []);
    } catch (e) {
      console.error("Dashboard: failed to load orders", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Stats
  const totalCount     = orders.length;
  const pendingCount   = orders.filter((o) => o.status === "Pending").length;
  const deliveredCount = orders.filter((o) => o.status === "Completed").length;
  const returnsCount   = orders.filter((o) => {
    const s = o.status || "";
    return s === "Return/Refund" || s === "Cancelled" || s.toLowerCase().includes("approved");
  }).length;

  const chartData = React.useMemo(() => buildChartData(orders, filter), [orders, filter]);

  // Top products
  const topProducts = React.useMemo(() => {
    const acc = {};
    orders.forEach((o) => {
      const items = o.order_details?.length ? o.order_details : o.items?.length ? o.items : [];
      if (items.length > 0) {
        items.forEach((item) => {
          const name = item.product_name || item.name || "Product";
          const img  = item.product_image || item.image || null;
          acc[name] = acc[name]
            ? { ...acc[name], count: acc[name].count + (item.quantity || 1) }
            : { name, img, count: item.quantity || 1 };
        });
      } else {
        const name = o.product_name || "Product";
        const img  = o.product_image || null;
        acc[name] = acc[name]
          ? { ...acc[name], count: acc[name].count + 1 }
          : { name, img, count: 1 };
      }
    });
    return Object.values(acc).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  // Top customers
  const topCustomers = React.useMemo(() => {
    const acc = {};
    orders.forEach((o) => {
      const name = getCustomerName(o);
      const key  = o.user_id ? `u-${o.user_id}` : `g-${name}`;
      acc[key] = acc[key]
        ? { ...acc[key], count: acc[key].count + 1 }
        : { name, img: null, count: 1 };
    });
    return Object.values(acc).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  // Sorted newest first
  const recentOrders = React.useMemo(
    () => [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date)),
    [orders]
  );

  const handleAddNote = () => {
    if (!note.trim()) return;
    setNotesList([note, ...notesList]);
    setNote("");
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="p-3 bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white rounded-3xl shadow-md my-5 mr-5 ml-1 h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Dashboard</h1>
      {showAllOrders && (
        <AllOrdersModal orders={recentOrders} onClose={() => setShowAllOrders(false)} />
      )}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">

        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="Total Orders"   value={totalCount}     icon={totalOrders}   bg="bg-[#ECF5E9]" />
            <StatCard title="Pending Orders" value={pendingCount}   icon={pendingOrders} bg="bg-[#FFE0E0]" />
            <StatCard title="Delivered"      value={deliveredCount} icon={delivered}     bg="bg-[#E9F0FE]" />
            <StatCard title="Returns"        value={returnsCount}   icon={returns}       bg="bg-[#F5ECED]" />
          </div>

          {/* Chart */}
          <div className="bg-white border border-[#DCDCDC] rounded-lg p-3 w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Summary</h2>
              <select
                className="border border-gray-300 rounded px-3 py-1 text-sm text-gray-700"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>This month</option>
                <option>This year</option>
              </select>
            </div>
            <div className="h-64 w-full">
              <DashboardChart chartData={chartData} />
            </div>
          </div>

          {/* Recent Orders */}
          <RecentOrders orders={recentOrders} onViewAll={() => setShowAllOrders(true)} />
        </div>

        {/* Right Column */}
        <div className="flex flex-col w-full lg:w-96 flex-shrink-0 gap-3 min-h-0">
          <TopList title="Most Selling Products" items={topProducts}  type="product"  />
          <TopList title="Top Customers"         items={topCustomers} type="customer" />
          <Notes
            notesList={notesList}
            setNotesList={setNotesList}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            note={note}
            setNote={setNote}
            handleAddNote={handleAddNote}
          />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
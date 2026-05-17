import React, { useState, useEffect } from "react";
import hologram from "../../assets/hologram.png";
import decal from "../../assets/decal.png";
import mug from "../../assets/mug.png";
import signageProd from "../../assets/signageProd.png";
import { Bar } from "react-chartjs-2";
import totalOrders from "../../assets/totalOrders.svg";
import pendingOrders from "../../assets/pendingOrders.svg";
import delivered from "../../assets/delivered.svg";
import returns from "../../assets/returns.svg";
import addNote from "../../assets/addNote.svg";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Customer images
import colet from "../../assets/customersImg/colet.png";
import gwen from "../../assets/customersImg/gwen.png";
import jhoanna from "../../assets/customersImg/jhoanna.png";
import sheena from "../../assets/customersImg/sheena.png";

const customerImages = {
    Colet: colet,
    Gwen: gwen,
    Sheena: sheena,
    Jhoanna: jhoanna
};

// Sample orders data
// Replace with API fetch when backend is ready
const sampleOrders = [
    { id: 1, productName: "Hologram Sticker", productImg: hologram, customerName: "Aiah", address: "R. Castillo St., Brgy. Ubalde, Ag...", amount: "Php 600.00", date: "8 Nov 2025", status: "Pending" },
    { id: 2, productName: "Decal", productImg: decal, customerName: "Colet", address: "R. Castillo St., Brgy. Ubalde, Ag...", amount: "Php 600.00", date: "27 May 2025", status: "Canceled" },
    { id: 3, productName: "Mug", productImg: mug, customerName: "Maloi", address: "R. Castillo St., Brgy. Ubalde, Ag...", amount: "Php 600.00", date: "13 Jul 2025", status: "Shipped" },
    { id: 4, productName: "Signage", productImg: signageProd, customerName: "Gwen", address: "R. Castillo St., Brgy. Ubalde, Ag...", amount: "Php 600.00", date: "27 Jan 2025", status: "Installed" },
    { id: 5, productName: "Signage", productImg: signageProd, customerName: "Stacey", address: "R. Castillo St., Brgy. Ubalde, Ag...", amount: "Php 600.00", date: "27 Jan 2025", status: "Installed" },
    { id: 6, productName: "Signage", productImg: signageProd, customerName: "Mikha", address: "R. Castillo St., Brgy. Ubalde, Ag...", amount: "Php 600.00", date: "27 Jan 2025", status: "Installed" },
];

// Status color mapping
const statusColor = (status) => {
    switch (status) {
        case "Pending": return "text-[#FDE31E] font-black uppercase text-[10px]";
        case "Canceled": return "text-red-500 font-black uppercase text-[10px]";
        case "Shipped": return "text-green-500 font-black uppercase text-[10px]";
        case "Installed": return "text-green-600 font-black uppercase text-[10px]";
        default: return "text-gray-400 font-black uppercase text-[10px]";
    }
};

// Dashboard Chart Component
const DashboardChart = ({ chartData }) => {
    if (!chartData) return null;

    const data = {
        labels: chartData.labels,
        datasets: [
            { label: "Orders", data: chartData.orders, backgroundColor: "#00B731" },
            { label: "Income Growth", data: chartData.income, backgroundColor: "#00681C" }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: {
            y: {
                beginAtZero: true,
                max: 100000,
                ticks: { stepSize: 20000, callback: value => value / 1000 + "k" }
            }
        }
    };

    return <Bar data={data} options={options} height={250} />;
};

// Generate sample chart data
const generateChartData = (filter) => {
    const now = new Date();
    let labels = [], ordersCount = [], incomeValues = [];

    if (filter === "Last 7 days" || filter === "Last 30 days") {
        const days = filter === "Last 7 days" ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            labels.push(`${d.toLocaleString("en-US", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`);
            ordersCount.push(Math.floor(Math.random() * 10) + 1);
            incomeValues.push(Math.floor(Math.random() * 1000) + 100);
        }
    } else if (filter === "This month") {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            labels.push(`${now.toLocaleString("en-US", { month: "short" })} ${String(d).padStart(2, "0")}`);
            ordersCount.push(Math.floor(Math.random() * 10) + 1);
            incomeValues.push(Math.floor(Math.random() * 1000) + 100);
        }
    } else if (filter === "This year") {
        for (let i = 0; i < 12; i++) {
            const monthName = new Date(0, i).toLocaleString("en-US", { month: "short" });
            labels.push(monthName);
            ordersCount.push(Math.floor(Math.random() * 50) + 10);
            incomeValues.push(Math.floor(Math.random() * 5000) + 1000);
        }
    }

    return { labels, orders: ordersCount, income: incomeValues };
};

const CustomerServiceDashboard = () => {
    const [chartData, setChartData] = useState(generateChartData("Last 7 days"));
    const [filter, setFilter] = useState("Last 7 days");

    const [note, setNote] = useState("");
    const [notesList, setNotesList] = useState([]);
    const [orders, setOrders] = useState(sampleOrders); // ✅ replace with API call
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddNote = () => {
        if (!note.trim()) return;
        setNotesList([note, ...notesList]);
        setNote("");
        setIsModalOpen(false);
        // TODO: POST note to backend
    };

    // Fetch chart data from API
    useEffect(() => {
        const fetchChartData = async () => {
            try {
                const res = await fetch(`/api/dashboard?filter=${filter}`);
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setChartData(data);
            } catch (err) {
                console.error(err);
                setChartData(generateChartData(filter)); // fallback
            }
        };
        fetchChartData();
    }, [filter]);

    return (
        <div className="p-8 bg-white rounded-[40px] border border-[#DCDCDC] min-h-[calc(100vh-2.5rem)] shadow-sm my-5 mr-5 ml-1 flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Dashboard Overview</h1>
            <div className="flex flex-col h-full lg:flex-row gap-3">
                <div className="flex-1 flex flex-col gap-3 min-w-0">
                    {/* Orders summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                        <div className="flex justify-between px-6 py-5 rounded-[24px] bg-gray-50 border border-[#DCDCDC] shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total orders</p>
                                <p className="text-2xl font-black text-gray-900">100,000</p>
                                <p className="text-[10px] font-bold text-green-600 uppercase mt-1">Overall</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCDCDC] flex items-center justify-center p-2.5 shadow-sm">
                                <img src={totalOrders} alt="totalOrders" className="w-full h-full opacity-70" />
                            </div>
                        </div>
                        <div className="flex justify-between px-6 py-5 rounded-[24px] bg-gray-50 border border-[#DCDCDC] shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Pending orders</p>
                                <p className="text-2xl font-black text-gray-900">10</p>
                                <p className="text-[10px] font-bold text-yellow-600 uppercase mt-1">Oct 1 - 31</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCDCDC] flex items-center justify-center p-2.5 shadow-sm">
                                <img src={pendingOrders} alt="pendingOrders" className="w-full h-full opacity-70" />
                            </div>
                        </div>
                        <div className="flex justify-between px-6 py-5 rounded-[24px] bg-gray-50 border border-[#DCDCDC] shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Delivered</p>
                                <p className="text-2xl font-black text-gray-900">30</p>
                                <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Oct 1 - 31</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCDCDC] flex items-center justify-center p-2.5 shadow-sm">
                                <img src={delivered} alt="delivered" className="w-full h-full opacity-70" />
                            </div>
                        </div>
                        <div className="flex justify-between px-6 py-5 rounded-[24px] bg-gray-50 border border-[#DCDCDC] shadow-sm">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Returns</p>
                                <p className="text-2xl font-black text-gray-900">5</p>
                                <p className="text-[10px] font-bold text-red-600 uppercase mt-1">Oct 1 - 31</p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white border border-[#DCDCDC] flex items-center justify-center p-2.5 shadow-sm">
                                <img src={returns} alt="returns" className="w-full h-full opacity-70" />
                            </div>
                        </div>

                    </div>


                    <div className="bg-white border border-[#DCDCDC] rounded-[32px] p-6 w-full shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-black text-gray-900 uppercase">Detailed Summary</h2>
                            <select
                                className="bg-gray-50 border border-[#DCDCDC] rounded-xl px-4 py-2 text-xs font-black uppercase text-gray-500 hover:bg-white transition-all outline-none cursor-pointer"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            >
                                <option>Last 7 days</option>
                                <option>Last 30 days</option>
                                <option>This month</option>
                                <option>This year</option>
                            </select>
                        </div>
                        <div className="h-64 w-full px-2">
                            {chartData ? <DashboardChart chartData={chartData} /> : <div className="flex items-center justify-center h-full text-gray-300 font-black uppercase text-[10px]">No data available</div>}
                        </div>
                    </div>


                    <div className="bg-white border border-[#DCDCDC] rounded-[32px] flex-1 min-w-0 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-50">
                            <h4 className="font-black text-lg text-gray-900 uppercase">Recent orders</h4>
                            <button className="text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-all">
                                View all
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[300px]">
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
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-all border-b border-gray-50 last:border-0">
                                            <td className="py-4 flex items-center gap-4 px-6">
                                                <img src={order.productImg} alt={order.productName} className="w-12 h-12 rounded-xl object-cover border border-[#DCDCDC] shadow-sm" />
                                                <span className="font-black text-sm text-gray-900 uppercase">{order.productName}</span>
                                            </td>
                                            <td className="truncate max-w-[200px] px-6 text-sm font-bold text-gray-400 uppercase">{order.address}</td>
                                            <td className="px-6 font-black text-sm text-gray-900">{order.amount}</td>
                                            <td className="px-6 text-xs font-bold text-gray-400">{order.date}</td>
                                            <td className="px-6">
                                                <span className={`${statusColor(order.status)}`}>{order.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>


                <div className="flex flex-col w-full lg:w-96 flex-shrink-0 gap-3">

                    <div className="border rounded-lg p-3 border-[#DCDCDC] h-60 flex flex-col">
                        <p className="font-semibold mb-3">Most selling products</p>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            {orders.length > 0 ? (() => {
                                const productCountMap = {};
                                orders.forEach(o => productCountMap[o.productName] = productCountMap[o.productName] ? { ...productCountMap[o.productName], count: productCountMap[o.productName].count + 1 } : { name: o.productName, img: o.productImg, count: 1 });
                                return Object.values(productCountMap).sort((a, b) => b.count - a.count).slice(0, 5).map((p, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <img src={p.img} alt={p.name} className="rounded w-10 h-10 object-cover" />
                                            <p>{p.name}</p>
                                        </div>
                                        <div className="border border-[#DCDCDC] py-1 px-2 rounded-lg">
                                            <p className="text-[13px] font-semibold">{p.count} orders</p>
                                        </div>
                                    </div>
                                ));
                            })() : <p className="text-gray-400">No products available</p>}
                        </div>
                    </div>


                    <div className="border rounded-lg p-3 border-[#DCDCDC] h-60 flex flex-col">
                        <p className="font-semibold mb-3">Top Customers</p>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                            {orders.length > 0 ? (() => {
                                const customerCountMap = {};
                                orders.forEach(o => customerCountMap[o.customerName] = customerCountMap[o.customerName] ? { ...customerCountMap[o.customerName], count: customerCountMap[o.customerName].count + 1 } : { name: o.customerName, count: 1, img: customerImages[o.customerName] || o.productImg });
                                return Object.values(customerCountMap).sort((a, b) => b.count - a.count).slice(0, 5).map((c, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <img src={c.img} alt={c.name} className="rounded w-10 h-10 object-cover" />
                                            <p className="truncate max-w-[150px]">{c.name}</p>
                                        </div>
                                        <div className="border border-[#DCDCDC] py-1 px-2 rounded-lg">
                                            <p className="text-[13px] font-semibold">{c.count} orders</p>
                                        </div>
                                    </div>
                                ));
                            })() : <p className="text-gray-400">No customers available</p>}
                        </div>
                    </div>

                    {/* note */}
                    <div className="bg-[#FDE31E]/5 border border-[#DCDCDC] rounded-[32px] p-8 flex flex-col h-full overflow-hidden shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <p className="font-black text-lg text-gray-900 uppercase">Team Notes</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="w-10 h-10 rounded-xl bg-[#FDE31E] flex items-center justify-center shadow-md  hover:scale-110 active:scale-95 transition-all"
                            >
                                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {notesList.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4 opacity-50 border border-[#DCDCDC]">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <p className="text-[10px] font-black text-gray-300 uppercase">Your team's internal<br />notes will appear here</p>
                                </div>
                            ) : (
                                notesList.map((n, i) => (
                                    <div key={i} onClick={() => setNotesList(notesList.filter((_, idx) => idx !== i))} className="group relative p-5 rounded-2xl bg-white border border-[#DCDCDC] text-sm font-bold text-gray-700 shadow-sm hover:shadow-md hover:border-[#FDE31E] transition-all cursor-pointer">
                                        <div className="absolute top-4 left-0 w-1 h-4 bg-[#FDE31E] rounded-r-full group-hover:h-8 transition-all duration-300"></div>
                                        {n}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>


                    {/* Note Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
                            <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl border border-[#DCDCDC] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <h2 className="text-xl font-black text-gray-900 uppercase mb-6">Create Note</h2>
                                <textarea
                                    className="w-full h-40 bg-gray-50 border border-[#DCDCDC] rounded-3xl p-5 mb-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#FDE31E]/10 focus:bg-white focus:border-[#FDE31E] transition-all resize-none"
                                    placeholder="Write something important for the team..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                                <div className="flex items-center gap-3">
                                    <button className="flex-1 py-4 border border-[#DCDCDC] text-gray-500 font-black text-xs uppercase rounded-[20px] hover:bg-gray-50 transition-all active:scale-95" onClick={() => setIsModalOpen(false)}>Discard</button>
                                    <button className="flex-1 py-4 bg-[#FDE31E] hover:bg-yellow-400 text-black font-black text-xs uppercase rounded-[20px] shadow-md  transition-all active:scale-95" onClick={handleAddNote}>Save Note</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerServiceDashboard;

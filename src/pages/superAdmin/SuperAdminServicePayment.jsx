import React, { useEffect, useState } from "react";
// Assets
import editIcon from "../../assets/edit.svg";
import removeIcon from "../../assets/delete.svg";
import hologram from "../../assets/hologram.png";
import decal from "../../assets/decal.png";
import signage from "../../assets/signageProd.png";
import graphicDesign from "../../assets/hologram.png";

// ServicePayment functions
import {
    fetchAllServicePayments,
    createServicePayment,
    updateServicePayment,
    deleteServicePayment,
} from "../../services/ServicePayment";

// Service & Product & Employee imports
import { fetchAllServices } from "../../services/Service";
import { fetchAllEmployees } from "../../services/Employees";
import { fetchAllProducts } from "../../services/ProductsService";

// --- Utility Functions ---

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
};

const getServiceImage = (name) => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("hologram")) return hologram;
    if (lower.includes("wrap") || lower.includes("decal")) return decal;
    if (lower.includes("signage") || lower.includes("led")) return signage;
    if (lower.includes("design") || lower.includes("graphic"))
        return graphicDesign;
    return hologram; // Default
};

const SuperAdminServicePayment = () => {
    // States
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [servicesList, setServicesList] = useState([]);
    const [productsList, setProductsList] = useState([]);
    const [employeesList, setEmployeesList] = useState([]);

    // Form State
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        service_id: "",
        employee_id: "",
        product_id: "",
        payment_amount: "",
        payment_date: new Date().toISOString().substring(0, 10),
        quantity: "",
        customer_name: "",
        invoice: "",
    });

    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([
            loadServices(),
            loadProducts(),
            loadEmployees(),
            loadPayments(),
        ]).catch((err) => {
            console.error("Error during initial data load:", err);
        });
        setLoading(false);
    };

    // Services
    const loadServices = async () => {
        try {
            const data = await fetchAllServices();
            if (!Array.isArray(data)) {
                console.error("Services response not array", data);
                const potential = data?.data || data?.services || [];
                if (Array.isArray(potential)) {
                    return mapAndSetServices(potential);
                }
                setServicesList([]);
                return;
            }
            mapAndSetServices(data);
        } catch (err) {
            console.error("Error loading services:", err);
        }
    };

    const mapAndSetServices = (data) => {
        const mapped = data
            .map((item, index) => ({
                id: item.services_id || item.id || index,
                name: item.name || item.service_name || `Service ${index + 1}`,
            }))
            .filter((item) => item.id && item.name);
        setServicesList(mapped);
    };

    // Products
    const loadProducts = async () => {
        try {
            const data = await fetchAllProducts();

            let productArray = Array.isArray(data)
                ? data
                : Array.isArray(data?.products)
                  ? data.products
                  : data?.data || [];

            const mapped = productArray
                .map((item, index) => ({
                    id: item.id || item.product_id || null,
                    name:
                        item.name ||
                        item.product_name ||
                        `Product ${index + 1}`,
                }))
                .filter((p) => p.id && p.name);

            setProductsList(mapped);
        } catch (err) {
            console.error("Failed to load products:", err);
            setProductsList([]);
        }
    };

    // Employees
    const loadEmployees = async () => {
        try {
            const data = await fetchAllEmployees();
            let arr = Array.isArray(data) ? data : data?.data || [];
            const mapped = arr
                .map((item, idx) => ({
                    id: item.id || item.user_id || item.employee_id || null,
                    name:
                        item.name ||
                        `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                        `Emp ${idx + 1}`,
                }))
                .filter((emp) => emp.id && emp.name);
            setEmployeesList(mapped);
        } catch (err) {
            console.error("Failed to load employees:", err);
            setEmployeesList([]);
        }
    };

    // Payments
    const loadPayments = async () => {
        try {
            const res = await fetchAllServicePayments();
            let rawData = Array.isArray(res)
                ? res
                : res?.data?.data || res?.data || [];

            const mappedData = rawData.map((item) => {
                const serviceName =
                    item.service?.name ||
                    item.service?.service_name ||
                    item.service_product ||
                    "";
                const rawServiceId =
                    item.service?.id ||
                    item.service?.services_id ||
                    item.service_id ||
                    "";

                const rawEmployeeId = item.employee?.employee_id || item.employee_id || "";
                const rawProductId = item.product?.product_id || item.product_id || "";

                return {
                    id: item.payment_id,
                    service_product: serviceName,
                    raw_service_id: String(rawServiceId),
                    raw_employee_id: String(rawEmployeeId),
                    raw_product_id: String(rawProductId),
                    employee_handled:
                        item.employee_handled || item.employee?.name || item.employee_id || "",
                    product_sold: 
                        item.product_sold || item.product?.name || item.product_id || "",
                    quantity: item.quantity || 1,
                    price: item.price || item.payment_amount || 0,
                    customer_name: item.customer || "",
                    payment_date:
                        item.created_at ||
                        item.payment_date ||
                        new Date().toISOString(),
                    invoice: item.invoice || "",
                    image: getServiceImage(serviceName),
                };
            });

            setPayments(mappedData);
        } catch (err) {
            console.error("Error loading payments:", err);
        }
    };

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            service_id: "",
            employee_id: "",
            product_id: "",
            payment_amount: "",
            payment_date: new Date().toISOString().substring(0, 10),
            quantity: "",
            customer_name: "",
            invoice: "",
        });
        setEditingId(null);
    };

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();

        if (
            !formData.service_id ||
            !formData.employee_id ||
            !formData.product_id ||
            !formData.payment_amount ||
            !formData.payment_date
        ) {
            alert(
                "Please fill in Service, Employee, Product, Amount, and Date."
            );
            return;
        }

        const payload = {
            service_id: Number(formData.service_id),
            employee_id: formData.employee_id,
            product_id: formData.product_id,
            payment_amount: Number(formData.payment_amount),
            payment_date: formData.payment_date,
            invoice: formData.invoice,
            customer: formData.customer_name,
            quantity: formData.quantity === "" ? 1 : Number(formData.quantity),
        };

        try {
            const serviceName =
                servicesList.find((s) => Number(s.id) === payload.service_id)
                    ?.name || `ID ${payload.service_id}`;

            const employeeName =
                employeesList.find((e) => String(e.id) === String(payload.employee_id))
                    ?.name || payload.employee_id;

            const productName =
                productsList.find((p) => String(p.id) === String(payload.product_id))
                    ?.name || payload.product_id;

            if (editingId) {
                await updateServicePayment(editingId, payload);
                setPayments((prev) =>
                    prev.map((p) =>
                        p.id === editingId
                            ? {
                                  ...p,
                                  ...payload,
                                  raw_service_id: payload.service_id,
                                  raw_employee_id: payload.employee_id,
                                  raw_product_id: payload.product_id,
                                  customer_name: payload.customer,
                                  price: payload.payment_amount,
                                  service_product: serviceName,
                                  employee_handled: employeeName,
                                  product_sold: productName,
                                  quantity: payload.quantity,
                                  image: getServiceImage(serviceName),
                              }
                            : p
                    )
                );
                setShowUpdateSuccessModal(true);
            } else {
                const res = await createServicePayment(payload);
                const createdItem = res.data || res;
                const newEntry = {
                    id: createdItem.payment_id || Date.now(),
                    raw_service_id: payload.service_id,
                    raw_employee_id: payload.employee_id,
                    raw_product_id: payload.product_id,
                    service_product: serviceName,
                    employee_handled: employeeName,
                    product_sold: productName,
                    price: payload.payment_amount,
                    payment_date: payload.payment_date,
                    quantity: payload.quantity,
                    customer_name: formData.customer_name,
                    image: getServiceImage(serviceName),
                };
                setPayments((prev) => [newEntry, ...prev]);
                setShowSuccessModal(true);
            }
            resetForm();
        } catch (err) {
            console.error("Error saving payment:", err);
            const validationErrors = err.response?.data?.errors;
            let errorMessage =
                "Failed to save. Please check the IDs and required fields.";
            if (validationErrors) {
                if (validationErrors.service_id)
                    errorMessage = `Service ID: ${validationErrors.service_id.join(" ")}`;
                else if (validationErrors.employee_id)
                    errorMessage = `Employee ID: ${validationErrors.employee_id.join(" ")}`;
                else if (validationErrors.product_id)
                    errorMessage = `Product ID: ${validationErrors.product_id.join(" ")}`;
                else if (err.response?.data?.message)
                    errorMessage = err.response.data.message;
            }
            alert(`Error: ${errorMessage}`);
        }
    };

    const handleEditClick = (payment) => {
        setEditingId(payment.id);

        const serviceIdToEdit = payment.raw_service_id
            ? payment.raw_service_id
            : servicesList.find((s) => s.name === payment.service_product)
                  ?.id || payment.service_product;

        setFormData({
            service_id: String(serviceIdToEdit || ""),
            employee_id: String(payment.raw_employee_id || ""),
            product_id: String(payment.raw_product_id || ""),
            payment_amount: payment.price || "",
            payment_date: (payment.payment_date || "").substring(0, 10),
            quantity: payment.quantity !== undefined ? String(payment.quantity) : "1",
            customer_name: payment.customer_name || "",
            invoice: payment.invoice || "",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?"))
            return;
        try {
            await deleteServicePayment(id);
            setPayments((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error("Error deleting:", err);
            alert("Failed to delete record.");
        }
    };

    const filteredPayments = payments.filter((p) => {
        const term = searchTerm.toLowerCase();
        return (
            p.id?.toString().includes(term) ||
            p.service_product?.toLowerCase().includes(term) ||
            p.customer_name?.toLowerCase().includes(term) ||
            p.employee_handled?.toLowerCase().includes(term) ||
            p.product_sold?.toLowerCase().includes(term)
        );
    });

    return (
        <>
            <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Service Payments</h1>

                {/* FORM */}
                <form
                    onSubmit={handleAddOrUpdate}
                    className="border border-gray-300 rounded-xl p-4 bg-gray-50 mb-4 shadow-sm"
                >
                    <div className="flex gap-4 flex-wrap items-end">
                        {/* SERVICE */}
                        <div className="flex-1 min-w-[200px]">
                            <p className="text-xs font-bold text-gray-600 mb-1 uppercase">
                                Service ID*
                            </p>
                            <select
                                name="service_id"
                                value={formData.service_id}
                                onChange={handleInput}
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500 bg-white"
                                disabled={loading}
                                required
                            >
                                <option value=""> Select Service </option>
                                {loading ? (
                                    <option disabled>Loading...</option>
                                ) : servicesList.length === 0 ? (
                                    <option disabled>No services</option>
                                ) : (
                                    servicesList.map((s, i) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* EMPLOYEE */}
                        <div className="flex-1 min-w-[150px]">
                            <p className="text-xs text-gray-600 font-bold mb-1 uppercase">
                                Employee Name*
                            </p>
                            <select
                                name="employee_id"
                                value={formData.employee_id}
                                onChange={handleInput}
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500 bg-white"
                                disabled={loading}
                                required
                            >
                                <option value=""> Select Employee </option>
                                {loading ? (
                                    <option disabled>Loading...</option>
                                ) : employeesList.length === 0 ? (
                                    <option disabled>No employees</option>
                                ) : (
                                    employeesList.map((emp, i) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* PRODUCT */}
                        <div className="flex-1 min-w-[200px]">
                            <p className="text-xs font-bold text-gray-600 mb-1 uppercase">
                                Product Name*
                            </p>
                            <select
                                name="product_id"
                                value={formData.product_id}
                                onChange={handleInput}
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500 bg-white"
                                disabled={loading}
                                required
                            >
                                <option value=""> Select Product </option>
                                {loading ? (
                                    <option disabled>Loading...</option>
                                ) : productsList.length === 0 ? (
                                    <option disabled>No products</option>
                                ) : (
                                    productsList.map((p, i) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="w-24">
                            <p className="text-xs font-bold text-gray-600 mb-1 uppercase">
                                Qty
                            </p>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleInput}
                                placeholder="1"
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500 text-center"
                            />
                        </div>

                        <div className="w-32">
                            <p className="text-xs font-bold text-gray-600 mb-1 uppercase">
                                Amount (Php)*
                            </p>
                            <input
                                type="number"
                                name="payment_amount"
                                value={formData.payment_amount}
                                onChange={handleInput}
                                placeholder="0.00"
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="w-32">
                            <p className="text-xs font-bold text-gray-600 mb-1 uppercase">
                                Date*
                            </p>
                            <input
                                type="date"
                                name="payment_date"
                                value={formData.payment_date}
                                onChange={handleInput}
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <p className="text-xs font-bold text-gray-600 mb-1 uppercase">
                                Customer Name
                            </p>
                            <input
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleInput}
                                placeholder="Client Name"
                                className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="flex gap-2 h-10">
                            <button
                                type="submit"
                                className={`h-full px-4 rounded text-sm font-semibold transition ${
                                    editingId
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : "bg-[#FDE31E] hover:bg-yellow-400"
                                }`}
                                disabled={loading}
                            >
                                {editingId ? "Update" : "Add New"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="h-full px-4 rounded text-sm font-semibold text-gray-600 bg-gray-200 hover:bg-gray-300 transition"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                {/* Search & Total */}
                <div className="flex justify-between items-center mb-3 px-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border border-gray-300 rounded-lg pl-3 pr-8 py-2 w-80 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                        Total: {filteredPayments.length} records
                    </div>
                </div>

                {/* Table */}
                <div className="flex flex-col w-full overflow-hidden flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase">
                            {loading && payments.length === 0 ? "Syncing records..." : `${filteredPayments.length} record${filteredPayments.length !== 1 ? "s" : ""} found`}
                        </p>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full table-auto border-collapse">
                            <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">ID</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Product / Service</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Employee</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Product ID</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Qty</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Price</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Customer</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Date</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading && payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
                                                <p className="text-xs font-bold text-gray-400 uppercase">Loading records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredPayments.length > 0 ? (
                                    filteredPayments.map((payment) => (
                                        <tr
                                            key={payment.id}
                                            className="hover:bg-gray-50/50 transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg font-black text-[10px] bg-gray-50 text-gray-400 border border-gray-100 font-mono">
                                                    #{String(payment.id).padStart(4, "0")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 flex-shrink-0">
                                                        <img
                                                            src={payment.image}
                                                            alt=""
                                                            className="w-10 h-10 rounded-xl object-cover border border-gray-100 bg-gray-50"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900">{payment.service_product}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-gray-600">
                                                    {payment.employee_handled || <span className="text-gray-300 italic">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500 font-mono">
                                                    {payment.product_sold || <span className="text-gray-300 italic">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg font-black text-xs bg-gray-50 text-gray-600 border border-gray-100">
                                                    {payment.quantity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-black text-yellow-700 text-sm">
                                                    Php {Number(payment.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-gray-900">{payment.customer_name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-gray-500">{formatDate(payment.payment_date)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditClick(payment)}
                                                        className="p-2 bg-gray-50 border border-gray-100 hover:bg-yellow-50 hover:border-yellow-200 rounded-xl transition-all shadow-sm"
                                                        title="Edit"
                                                    >
                                                        <img src={editIcon} alt="Edit" className="w-4 h-4 opacity-70" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteClick(payment.id)}
                                                        className="p-2 bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all shadow-sm"
                                                        title="Delete"
                                                    >
                                                        <img src={removeIcon} alt="Delete" className="w-4 h-4 opacity-70" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center py-20">
                                            <p className="font-bold text-gray-400 uppercase">No service payments found.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Success Modal - Add */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-green-100 mb-4">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                                Payment Added Successfully
                            </h3>

                            <p className="text-sm text-gray-500 mt-2">
                                The new service payment has been recorded.
                            </p>

                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="mt-6 px-6 py-2.5 rounded-lg bg-[#FDE31E] text-sm font-bold hover:bg-yellow-400 transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal - Update */}
            {showUpdateSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-green-100 mb-4">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                                Payment Updated Successfully
                            </h3>

                            <p className="text-sm text-gray-500 mt-2">
                                The payment record has been updated.
                            </p>

                            <button
                                onClick={() => setShowUpdateSuccessModal(false)}
                                className="mt-6 px-6 py-2.5 rounded-lg bg-[#FDE31E] text-sm font-bold hover:bg-yellow-400 transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SuperAdminServicePayment;
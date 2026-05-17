import React, { useState, useEffect } from "react";
import add from "../../assets/add.svg";
import editIcon from "../../assets/edit.svg";
import removeIcon from "../../assets/delete.svg";

import {
    fetchAllServices,
    addService,
    updateService,
    deleteService
} from "../../services/Service";

const SuperAdminServices = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingServiceId, setEditingServiceId] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);

    const [formData, setFormData] = useState({
        service_name: "",
        service_description: "",
        service_category: "Stickers",
        service_price: "0",
    });

    const service_categoryOptions = [
        "Stickers", "Decals & Wrap", "Signage", "Giveaways", "Printing", "Graphic Services"
    ];

    // --- MODAL STATES ---
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
    const [showAddErrorModal, setShowAddErrorModal] = useState(false);
    const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
    const [showUpdateErrorModal, setShowUpdateErrorModal] = useState(false);
    const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);

    // --- FETCH DATA ---
    const loadServices = async () => {
        setLoading(true);
        try {
            const result = await fetchAllServices();
            const data = result.data || result.services || result;

            if (Array.isArray(data)) {
                setServices(data);
            } else {
                setServices([]);
            }
        } catch (error) {
            console.error("Error loading services:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadServices();
    }, []);

    // --- ADD SERVICE ---
    const handleAddService = async () => {
        const { service_name, service_description, service_category, service_price } = formData;

        if (!service_name.trim()) {
            setShowValidationErrorModal(true);
            return;
        }

        const payload = {
            service_name: service_name.trim(),
            service_description: service_description.trim(),
            services_category: service_category,
            service_price: Number(service_price) || 0,
        };

        try {
            await addService(payload);
            await loadServices();

            setFormData({
                service_name: "",
                service_description: "",
                service_category: "Stickers",
                service_price: "0",
            });

            setShowAddForm(false);
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Add Service Error:", error);
            setShowAddErrorModal(true);
        }
    };

    // --- LOCAL EDIT ---
    const handleLocalEditChange = (id, key, value) => {
        setServices(prev =>
            prev.map(s => (s.services_id === id ? { ...s, [key]: value } : s))
        );
    };

    // --- SAVE EDIT ---
    const handleSaveEdit = async (id) => {
        const serviceToUpdate = services.find(s => s.services_id === id);
        if (!serviceToUpdate) return;

        try {
            await updateService(id, {
                service_name: serviceToUpdate.service_name,
                service_description: serviceToUpdate.service_description,
                services_category: serviceToUpdate.service_category,
                service_price: Number(serviceToUpdate.service_price) || 0,
            });

            setEditingServiceId(null);
            setShowUpdateSuccessModal(true);
            loadServices();
        } catch (error) {
            console.error("Update Error:", error);
            setShowUpdateErrorModal(true);
        }
    };

    // --- DELETE ---
    const handleDeleteClick = (service) => {
        setServiceToDelete(service);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;

        try {
            await deleteService(serviceToDelete.services_id);
            setServices(prev => prev.filter(s => s.services_id !== serviceToDelete.services_id));
            setShowDeleteModal(false);
            setServiceToDelete(null);
        } catch (error) {
            console.error(error);
            setShowDeleteModal(false);
            setShowDeleteErrorModal(true);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setServiceToDelete(null);
    };

    return (
        <>
            <div className="p-3 bg-white rounded-3xl min-h-[calc(100vh-2.5rem)] shadow-md my-5 mr-5 ml-1 flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 mb-5 mt-1">Services</h1>

                <div className="flex justify-end mb-6">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#FDE31E] hover:bg-yellow-400 transition font-bold"
                    >
                        <img src={add} alt="add" className="w-4 h-4" />
                        <span className="text-[13px] font-semibold">Add Service</span>
                    </button>
                </div>

                {/* ADD FORM */}
                {showAddForm && (
                    <div className="border border-[#DCDCDC] rounded-xl p-6 bg-gray-50 mb-6">
                        <h3 className="text-lg font-bold mb-6">Add New Service</h3>

                        <div className="flex gap-4 flex-wrap items-end mb-4">
                            <div className="flex-1 min-w-[250px]">
                                <p className="text-xs font-bold text-gray-600 mb-1 uppercase">Service Name*</p>
                                <input
                                    type="text"
                                    value={formData.service_name}
                                    onChange={e => setFormData({ ...formData, service_name: e.target.value })}
                                    placeholder="e.g. Customize Hologram"
                                    className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                <p className="text-xs font-bold text-gray-600 mb-1 uppercase">Category*</p>
                                <select
                                    value={formData.service_category}
                                    onChange={e => setFormData({ ...formData, service_category: e.target.value })}
                                    className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500 bg-white"
                                >
                                    {service_categoryOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 min-w-[300px]">
                                <p className="text-xs font-bold text-gray-600 mb-1 uppercase">Description</p>
                                <input
                                    type="text"
                                    value={formData.service_description}
                                    onChange={e => setFormData({ ...formData, service_description: e.target.value })}
                                    placeholder="Short description of the service"
                                    className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="w-32">
                                <p className="text-xs font-bold text-gray-600 mb-1 uppercase">Price (Php)*</p>
                                <input
                                    type="number"
                                    value={formData.service_price}
                                    onChange={e => setFormData({ ...formData, service_price: e.target.value })}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="border border-gray-300 rounded px-2 text-sm w-full h-10 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleAddService}
                                className="px-6 py-2.5 rounded text-sm font-semibold text-black bg-[#FDE31E] hover:bg-yellow-400 transition shadow-md"
                            >
                                Add Service
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({
                                        service_name: "",
                                        service_description: "",
                                        service_category: "Stickers",
                                        service_price: "0"
                                    });
                                }}
                                className="px-6 py-2.5 rounded text-sm font-semibold text-gray-600 bg-gray-200 hover:bg-gray-300 transition shadow-md"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* TABLE */}
                <div className="flex flex-col w-full overflow-hidden flex-1 rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase">
                            {loading ? "Loading..." : `${services.length} service${services.length !== 1 ? "s" : ""} available`}
                        </p>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full table-auto border-collapse">
                            <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">ID</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Service</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Category</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase">Description</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-gray-200 border-t-yellow-500 rounded-full animate-spin" />
                                                <p className="text-xs font-bold text-gray-400 uppercase">Loading services...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : services.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-20">
                                            <p className="font-bold text-gray-400 uppercase">No services found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    services.map((service) => {
                                        const isEditing = editingServiceId === service.services_id;
                                        return (
                                            <tr key={service.services_id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg font-black text-[10px] bg-gray-50 text-gray-400 border border-gray-100 font-mono">
                                                        #{String(service.services_id).padStart(4, '0')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isEditing ? (
                                                        <input
                                                            value={service.service_name}
                                                            onChange={e => handleLocalEditChange(service.services_id, "service_name", e.target.value)}
                                                            className="border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold w-full max-w-[200px] focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 bg-gray-50"
                                                        />
                                                    ) : (
                                                        <span className="font-bold text-gray-900 text-sm">{service.service_name}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isEditing ? (
                                                        <select
                                                            value={service.services_category}
                                                            onChange={e => handleLocalEditChange(service.services_id, "service_category", e.target.value)}
                                                            className="border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:border-yellow-400"
                                                        >
                                                            {service_categoryOptions.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-gray-50 text-gray-500 border border-gray-100">
                                                            {service.services_category}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 max-w-[300px]">
                                                    {isEditing ? (
                                                        <input
                                                            value={service.service_description || ""}
                                                            onChange={e => handleLocalEditChange(service.services_id, "service_description", e.target.value)}
                                                            className="border border-gray-100 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10 bg-gray-50"
                                                        />
                                                    ) : (
                                                        <p className="text-sm text-gray-500 truncate font-medium">
                                                            {service.service_description || <span className="italic text-gray-300">No description</span>}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => isEditing ? handleSaveEdit(service.services_id) : setEditingServiceId(service.services_id)}
                                                            className={`p-2 rounded-xl border transition-all shadow-sm ${isEditing ? 'bg-green-50 border-green-100 hover:bg-green-500 hover:text-white' : 'bg-gray-50 border-gray-100 hover:bg-yellow-50 hover:border-yellow-200'}`}
                                                        >
                                                            <img src={isEditing ? add : editIcon} alt="Save/Edit" className="w-4 h-4 opacity-70" />
                                                        </button>
                                                        {isEditing && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingServiceId(null)}
                                                                className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:bg-gray-100 font-bold transition-all text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteClick(service)}
                                                            className="p-2 bg-gray-50 border border-gray-100 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all shadow-sm"
                                                        >
                                                            <img src={removeIcon} alt="Delete" className="w-4 h-4 opacity-70" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-50 mb-5">
                            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Success</h3>
                        <p className="text-gray-500 text-sm mb-6">Service added successfully.</p>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full px-6 py-2.5 bg-[#FDE31E] text-sm font-bold rounded-lg hover:bg-yellow-400 transition"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* VALIDATION ERROR MODAL */}
            {showValidationErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-50 mb-5">
                            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Input Required</h3>
                        <p className="text-gray-500 text-sm mb-6">Please enter a service name.</p>
                        <button
                            onClick={() => setShowValidationErrorModal(false)}
                            className="w-full py-2.5 bg-gray-100 text-sm font-bold rounded-lg hover:bg-gray-200 transition"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* ADD ERROR MODAL */}
            {showAddErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100 mb-4">
                                <svg
                                    className="w-8 h-8 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                                Failed to Add Service
                            </h3>

                            <p className="text-sm text-gray-500 mt-2">
                                An error occurred while adding the service. Please try again.
                            </p>

                            <button
                                onClick={() => setShowAddErrorModal(false)}
                                className="mt-6 px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPDATE SUCCESS MODAL */}
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
                                Service Updated Successfully
                            </h3>

                            <p className="text-sm text-gray-500 mt-2">
                                The service has been updated with the new information.
                            </p>

                            <button
                                onClick={() => setShowUpdateSuccessModal(false)}
                                className="mt-6 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPDATE ERROR MODAL */}
            {showUpdateErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100 mb-4">
                                <svg
                                    className="w-8 h-8 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                                Failed to Update Service
                            </h3>

                            <p className="text-sm text-gray-500 mt-2">
                                An error occurred while updating the service. Please try again.
                            </p>

                            <button
                                onClick={() => setShowUpdateErrorModal(false)}
                                className="mt-6 px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && serviceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-50 mb-5">
                            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Service</h3>
                        <p className="text-gray-500 text-sm mb-6 px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-800">{serviceToDelete.service_name}</span>?
                        </p>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={cancelDelete}
                                className="flex-1 py-2.5 bg-gray-100 text-sm font-bold rounded-lg hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE ERROR MODAL */}
            {showDeleteErrorModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scaleIn">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100 mb-4">
                                <svg
                                    className="w-8 h-8 text-red-600"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                                Failed to Delete Service
                            </h3>

                            <p className="text-sm text-gray-500 mt-2">
                                An error occurred while trying to delete the service. Please try again.
                            </p>

                            <button
                                onClick={() => setShowDeleteErrorModal(false)}
                                className="mt-6 px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SuperAdminServices;
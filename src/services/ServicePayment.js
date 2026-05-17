// src/services/ServicePayment.js
import api from "./api";

/**
 * Fetch all service payments
 */
export const fetchAllServicePayments = async () => {
    try {
        const response = await api.get("/index_service_payment");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch service payments:", error.message);
        throw error;
    }
};

/**
 * View service payment details by ID (Unchanged)
 */
export const viewServicePayment = async (id) => {
    try {
        const response = await api.get(`/show_service_payment/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch service payment ${id}:`, error.message);
        throw error;
    }
};

/**
 * Create a new service payment (Unchanged payload logic)
 */
export const createServicePayment = async (paymentData) => {
    try {
        // Ang paymentData ay mayroon nang 'service_id'
        const response = await api.post("/store_service_payment", paymentData);
        return response.data;
    } catch (error) {
        console.error(
            "Failed to create service payment:",
            error.response?.data || error.message
        );
        throw error;
    }
};

/**
 * Update service payment (PATCH) (Unchanged)
 */
export const updateServicePayment = async (id, updatedData) => {
    try {
        const response = await api.put(
            `/update_service_payment/${id}`,
            updatedData
        );
        return response.data;
    } catch (error) {
        console.error(
            `Failed to update service payment ${id}:`,
            error.response?.data || error.message
        );
        throw error;
    }
};

/**
 * Delete service payment (Unchanged)
 */
export const deleteServicePayment = async (id) => {
    try {
        const response = await api.delete(`/delete_service_payment/${id}`);
        return response.data;
    } catch (error) {
        console.error(
            `Failed to delete service payment ${id}:`,
            error.response?.data || error.message
        );
        throw error;
    }
};

// --- 🆕 NEW FUNCTION: Fetch all Services from Database ---
/**
 * Fetch all available services list (ID and Name)
 */
export const fetchAllServices = async () => {
    try {
        // ✅ Tiyakin na ito ang tamang endpoint sa Laravel
        const response = await api.get("/all_services");

        // Ipagpalagay na ang response.data ay isang Array ng services
        return response.data;
    } catch (error) {
        console.error("Failed to fetch services list:", error.message);
        // Ibalik ang empty array kung may error
        return [];
    }
};

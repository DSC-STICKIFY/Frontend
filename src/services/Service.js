import api from "./api";

// Fetch all services
export const fetchAllServices = async () => {
    try {
        const response = await api.get("/services_index");
        return response.data;
    } catch (error) {
        console.error("Failed to fetch services:", error.message);
        throw error;
    }
};

// View service details
export const viewServiceDetails = async (id) => {
    try {
        const response = await api.get(`/showServices/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch service ${id}:`, error.message);
        throw error;
    }
};

// Add new service
export const addService = async (serviceData) => {
    try {
        const response = await api.post("/services_add", serviceData);
        return response.data;
    } catch (error) {
        console.error(
            "Failed to add service:",
            error.response?.data || error.message
        );
        throw error;
    }
};

// Update service
export const updateService = async (id, updatedData) => {
    try {
        const response = await api.patch(`/services_update/${id}`, updatedData);
        return response.data;
    } catch (error) {
        console.error(
            `Failed to update service ${id}:`,
            error.response?.data || error.message
        );
        throw error;
    }
};

// Delete service
export const deleteService = async (id) => {
    try {
        const response = await api.delete(`/services_delete/${id}`);
        return response.data;
    } catch (error) {
        console.error(
            `Failed to delete service ${id}:`,
            error.response?.data || error.message
        );
        throw error;
    }
};

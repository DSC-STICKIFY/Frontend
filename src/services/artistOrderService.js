import api, { getAuthHeaders } from "./api";

export const fetchArtistOrders = () => 
    api.get("/orders", { headers: getAuthHeaders("artist") });

export const markOrderInProgress = (id, timelineData = {}) => 
    api.post(`/artist/orders/${id}/mark-in-progress`, timelineData, { headers: getAuthHeaders("artist") });

export const uploadFinalDesign = (id, formData) => 
    api.post(`/artist/orders/${id}/upload-design`, formData, { 
        headers: { 
            ...getAuthHeaders("artist"),
            'Content-Type': 'multipart/form-data'
        } 
    });

export const requestShipmentApproval = (id, note) => 
    api.post(`/artist/orders/${id}/request-shipment`, { note }, { headers: getAuthHeaders("artist") });

export const assignArtistToOrder = (orderId, artistId) => 
    api.post(`/orders/${orderId}/assign-artist`, { artist_id: artistId }, { headers: getAuthHeaders() });

export const approveShipmentRequest = (orderId) => 
    api.post(`/orders/${orderId}/approve-shipment-request`, {}, { headers: getAuthHeaders() });

export const rejectShipmentRequest = (orderId, reason) => 
    api.post(`/orders/${orderId}/reject-shipment-request`, { reason }, { headers: getAuthHeaders() });

export const markOutForDelivery = (orderId, orderDetailsId = null, trackingNumber = null) => {
    const payload = {};
    if (orderDetailsId) payload.order_details_id = orderDetailsId;
    if (trackingNumber) payload.tracking_number = trackingNumber;
    return api.post(`/out_for_delivery/${orderId}`, payload, { headers: getAuthHeaders() });
};

export const fetchAllArtists = () => 
    api.get("/all_artists", { headers: getAuthHeaders() }).then(res => {
        return Array.isArray(res.data) ? res.data : res.data?.employees || [];
    });


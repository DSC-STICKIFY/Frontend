import api from "./api";
import { getAuthHeaders } from "./authService";

// -------------------- Employees CRUD Operations --------------------

// Add new user
export const addUser = (userData, userType = 'Employees') => {
    let endpoint = "/add_employee"; // Default for Employees
    
    if (userType === 'SubAdmins') {
        endpoint = "/sub_admin_account_registration";
    }

    return api.post(endpoint, userData, {
        headers: getAuthHeaders(),
    });
};

// Update user
// Update user — dynamic based on userType
export const updateUser = (id, userData, userType = 'employee') => {
    let endpoint;

    if (userType === 'SubAdmins') {
        endpoint = `/update_sub_admin/${id}`;
    } else if (userType === 'Users') {
        endpoint = `/update_customer/${id}`;
    } else {
        endpoint = `/update_employee/${id}`;
    }

    return api.put(endpoint, userData, {
        headers: getAuthHeaders(),
    });
};

// Delete user
export const deleteUser = (id, userType = 'Employees') => {
    let endpoint = `/delete_employee/${id}`;

    if (userType === 'SubAdmins') {
        endpoint = `/delete_sub_admin/${id}`;
    } else if (userType === 'Users') {
        endpoint = `/delete_account/${id}`; // Adjust if needed
    }

    return api.delete(endpoint, {
        headers: getAuthHeaders(),
    });
};

// Fetch all users
export const fetchAllUsers = () => {
    return api.get("/all_users", {
        headers: getAuthHeaders(),
    });
};

// Fetch all employees
export const fetchAllEmployees = () => {
    return api.get("/all_employees", {
        headers: getAuthHeaders(),
    });
};

// Fetch all sub-admins
export const fetchAllSubAdmins = () => {
    return api.get("/all_sub_admins", {
        headers: getAuthHeaders(),
    });
};

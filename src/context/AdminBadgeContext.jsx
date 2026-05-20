import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import echo from "../echo";
import { useAdminAuth } from './AdminAuthContext';

const AdminBadgeContext = createContext(null);

export const AdminBadgeProvider = ({ children }) => {
    const { currentUser } = useAdminAuth();
    const [badges, setBadges] = useState({
        orders: 0,
        returns: 0,
        inquiries: 0,
        artists: 0,
        inbox: 0,
    });

    const fetchBadges = useCallback(async () => {
        try {
            let token = null;
            if (currentUser && currentUser.role) {
                token = sessionStorage.getItem(`token_${currentUser.role}`);
            }
            if (!token) {
                token = localStorage.getItem('token') || sessionStorage.getItem('token');
            }
            if (!token) return;

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/badge-counts`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.data?.success) {
                setBadges(res.data.counts);
            }
        } catch (error) {
            console.error("Failed to fetch admin badges:", error);
        }
    }, []);

    useEffect(() => {
        if (!currentUser) return;

        fetchBadges();

        if (echo) {
            const channel = echo.channel('admin-sidebar');
            channel.listen('.SidebarUpdated', (e) => {
                fetchBadges();
            });

            return () => {
                echo.leaveChannel('admin-sidebar');
            };
        }
    }, [fetchBadges, currentUser]);

    return (
        <AdminBadgeContext.Provider value={{ badges, fetchBadges }}>
            {children}
        </AdminBadgeContext.Provider>
    );
};

export const useAdminBadges = () => {
    const ctx = useContext(AdminBadgeContext);
    if (!ctx) throw new Error('useAdminBadges must be used inside <AdminBadgeProvider>');
    return ctx;
};

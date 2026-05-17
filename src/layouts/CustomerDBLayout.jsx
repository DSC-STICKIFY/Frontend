import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { InboxProvider } from '../context/inboxcontext';
import VerificationBanner from "../components/VerificationBanner";
import { useAuth } from '../context/CustomerAuthContext';
import { fetchUserOrders } from '../services/OrdersAPI';

import dashboardIcn from '../assets/sidebarCustIcons/dashboard.svg';
import inboxIcn from '../assets/sidebarCustIcons/inbox.svg';
import cartIcn from '../assets/sidebarCustIcons/cart.svg';
import ordersIcn from '../assets/sidebarCustIcons/orders.svg';
import settingsIcn from '../assets/sidebarCustIcons/settings.svg';
import inquiriesIcn from '../assets/sidebarAdminsIcons/inbox.svg';

export default function CustomerDBLayout() {
    const [expanded, setExpanded] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const { currentUser, logout } = useAuth();

    const navPages = [
        { label: 'Dashboard',        icon: dashboardIcn, path: '/customer-dashboard' },
        { label: 'Inbox',            icon: inboxIcn,     path: '/customer-inbox' },
        { label: 'Artist Inbox',     icon: inquiriesIcn, path: '/customer-artist-inbox' },
        { label: 'Cart',             icon: cartIcn,      path: '/customer-cart' },
        { label: 'Orders',           icon: ordersIcn,    path: '/customer-orders' },
        { label: 'My Inquiries',     icon: inquiriesIcn, path: '/customer-inquiries' },
        { label: 'Account Settings', icon: settingsIcn,  path: '/customer-settings' },
    ];

    const productCategories = [
        { label: 'Sticker',           path: '/products/sticker' },
        { label: 'Decal & Wrap',      path: '/products/decal-wrap' },
        { label: 'Signage',           path: '/products/signage' },
        { label: 'Graphic Services',  path: '/products/graphic-services' },
        { label: 'Giveaways',         path: '/products/giveaways' },
        { label: 'Printing',          path: '/products/printing' },
    ];

    return (
        <InboxProvider>
            <div className="flex flex-col h-screen overflow-hidden">
                <VerificationBanner />
                <div className="flex flex-1 overflow-hidden bg-[#F1F3F7]">
                    <Sidebar
                        expanded={expanded}
                        setExpanded={setExpanded}
                        navPages={navPages}
                        productCategories={productCategories}
                        roleTitle="Customer"
                        setSelectedCategory={setSelectedCategory}
                        currentUser={currentUser}
                        logout={logout}
                        logoutRole="user"
                    />
                    <main className="flex-1 overflow-y-auto transition-all duration-300">
                        <Outlet context={{ selectedCategory }} />
                    </main>
                </div>
            </div>
        </InboxProvider>
    );
}
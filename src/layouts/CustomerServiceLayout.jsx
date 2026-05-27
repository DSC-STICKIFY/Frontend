import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { InboxProvider } from "../context/inboxcontext";
import { AdminBadgeProvider, useAdminBadges } from "../context/AdminBadgeContext";

import dashboardIcn from '../assets/sidebarAdminsIcons/dashboard.svg';
import inbox from '../assets/sidebarAdminsIcons/inbox.svg';
import offers from '../assets/sidebarAdminsIcons/offers.svg';

function CustomerServiceLayoutContent({ expanded, setExpanded, setSelectedCategory, selectedCategory }) {
    const { badges } = useAdminBadges();

    const navPages = [
        { label: 'Dashboard', icon: dashboardIcn, path: '/customer-service-dashboard' },
        { label: 'Inbox', icon: inbox, path: '/customer-service-inbox', badge: badges.inbox },
        { label: 'Artist Inbox', icon: inbox, path: '/customer-service-artist-inbox' },
        { label: 'Decal/Wrap Inquiries', icon: inbox, path: '/customer-service-inquiries', badge: badges.inquiries },
        { label: 'Offers', icon: offers, path: '/customer-service-offers' },
    ];

    return (
        <div className="flex bg-[#F1F3F7] h-screen overflow-hidden">
            <Sidebar
                expanded={expanded}
                setExpanded={setExpanded}
                navPages={navPages}
                roleTitle="Customer Service"
                setSelectedCategory={setSelectedCategory}
                unreadCount={badges.inbox}
            />

            <main className="flex-1 overflow-y-auto transition-all duration-300 ">
                <Outlet context={{ selectedCategory }} />
            </main>
        </div>
    );
}

export default function CustomerServiceLayout() {
    const [expanded, setExpanded] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    return (
        <InboxProvider>
            <AdminBadgeProvider>
                <CustomerServiceLayoutContent
                    expanded={expanded}
                    setExpanded={setExpanded}
                    setSelectedCategory={setSelectedCategory}
                    selectedCategory={selectedCategory}
                />
            </AdminBadgeProvider>
        </InboxProvider>
    );
}

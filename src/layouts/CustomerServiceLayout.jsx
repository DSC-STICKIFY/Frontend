import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { InboxProvider } from "../context/inboxcontext";

import dashboardIcn from '../assets/sidebarAdminsIcons/dashboard.svg';
import inbox from '../assets/sidebarAdminsIcons/inbox.svg';
import offers from '../assets/sidebarAdminsIcons/offers.svg';

export default function CustomerServiceLayout() {
    const [expanded, setExpanded] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const navPages = [
        { label: 'Dashboard', icon: dashboardIcn, path: '/customer-service-dashboard' },
        { label: 'Inbox', icon: inbox, path: '/customer-service-inbox' },
        { label: 'Offers', icon: offers, path: '/customer-service-offers' },
    ];

    return (
        <InboxProvider>
            <div className="flex bg-[#F1F3F7] h-screen overflow-hidden">
                <Sidebar
                    expanded={expanded}
                    setExpanded={setExpanded}
                    navPages={navPages}
                    roleTitle="Customer Service"
                    setSelectedCategory={setSelectedCategory}
                />

                <main className="flex-1 overflow-y-auto transition-all duration-300 ">
                    <Outlet context={{ selectedCategory }} />
                </main>
            </div>
        </InboxProvider>
    );
}

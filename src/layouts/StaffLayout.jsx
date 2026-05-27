import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { InboxProvider } from "../context/inboxcontext";
import { AdminBadgeProvider, useAdminBadges } from "../context/AdminBadgeContext";

import dashboardIcn from '../assets/sidebarAdminsIcons/dashboard.svg';
import ordersIcon from '../assets/sidebarAdminsIcons/orders.svg';
import settingIcn from '../assets/sidebarCustIcons/settings.svg';
import inboxIcon from '../assets/sidebarAdminsIcons/inbox.svg';
import { fetchAllOrders } from "../services/OrdersAPI";

function StaffLayoutContent({ expanded, setExpanded, setSelectedCategory, selectedCategory, shipmentCount }) {
    const { badges } = useAdminBadges();

    const navPages = [
        { label: 'Dashboard',            icon: dashboardIcn, path: '/staff/dashboard' },
        { label: 'Artist Inbox',         icon: inboxIcon,    path: '/staff/inbox' },
        { label: 'Decal/Wrap Inquiries', icon: inboxIcon,    path: '/staff/inquiries', badge: badges.inquiries },
        { label: 'Feasibility Check',    icon: ordersIcon,   path: '/staff/validation-queue' },
        { label: 'Orders to Ship',       icon: ordersIcon,   path: '/staff/orders', badge: shipmentCount },
        { label: 'Settings',             icon: settingIcn,   path: '/staff/settings' },
    ];

    return (
        <div className="flex bg-[#F1F3F7] h-screen overflow-hidden">
            <Sidebar
                expanded={expanded}
                setExpanded={setExpanded}
                navPages={navPages}
                roleTitle="Staff"
                setSelectedCategory={setSelectedCategory}
            />

            <main className="flex-1 overflow-y-auto transition-all duration-300">
                <Outlet context={{ selectedCategory }} />
            </main>
        </div>
    );
}

export default function StaffLayout() {
    const [expanded, setExpanded] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [shipmentCount, setShipmentCount] = useState(0);

    // Fetch the number of items ready to ship
    React.useEffect(() => {
        const fetchShipmentCount = async () => {
            try {
                const result = await fetchAllOrders();
                if (Array.isArray(result)) {
                    let itemsToShip = 0;
                    const seenItems = new Set();
                    result.forEach(order => {
                        const details = order.order_details || order.items || [];
                        details.forEach(detail => {
                            if (detail.status === "To Ship" || detail.status === "To Shipping" || detail.status === "Approved for Shipping" || order.status === "To Ship" || order.status === "To Shipping" || order.status === "Approved for Shipping") {
                                if (!seenItems.has(detail.order_details_id)) {
                                    seenItems.add(detail.order_details_id);
                                    itemsToShip++;
                                }
                            }
                        });
                    });
                    setShipmentCount(itemsToShip);
                }
            } catch (err) {
                console.error("Failed to fetch staff shipments:", err);
            }
        };
        fetchShipmentCount();
        
        // Refresh every 10 seconds to keep notification up to date
        const interval = setInterval(fetchShipmentCount, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <InboxProvider>
            <AdminBadgeProvider>
                <StaffLayoutContent 
                    expanded={expanded}
                    setExpanded={setExpanded}
                    setSelectedCategory={setSelectedCategory}
                    selectedCategory={selectedCategory}
                    shipmentCount={shipmentCount}
                />
            </AdminBadgeProvider>
        </InboxProvider>
    );
}

import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { InboxProvider, useInbox } from "../context/inboxcontext";
import { useAdminAuth } from "../context/AdminAuthContext";

import dashboardIcn from '../assets/sidebarAdminsIcons/dashboard.svg';
import offers from '../assets/sidebarAdminsIcons/offers.svg';
import orders from '../assets/sidebarAdminsIcons/orders.svg';
import products from '../assets/sidebarAdminsIcons/products.svg';
import salesIn from '../assets/sidebarAdminsIcons/salesIn.svg';
import users from '../assets/sidebarAdminsIcons/users.svg';
import inbox from '../assets/sidebarAdminsIcons/inbox.svg';

const SuperAdminLayoutContent = ({ expanded, setExpanded, setSelectedCategory }) => {
    const { currentUser } = useAdminAuth();
    const { unreadCount } = useInbox();
    
    // Determine if the user is a super admin (is_admin is not in auth response, use role only)
    const isSuperAdmin = currentUser?.role === 'admin';
    const roleTitle = isSuperAdmin ? 'Super Admin' : 'Sub Admin';

    // Different pages depending on exact role
    const navPages = isSuperAdmin ? [
        { label: 'Dashboard',        icon: dashboardIcn, path: '/super-admin-dashboard' },
        { label: 'Offers',           icon: offers,       path: '/super-admin-offers' },
        { label: 'Orders',           icon: orders,       path: '/super-admin-orders' },
        { label: 'Products',         icon: products,     path: '/super-admin-products' },
        { label: 'Services',         icon: products,     path: '/super-admin-services' },
        { label: 'Sales Invoices',   icon: salesIn,      path: '/super-admin-sales-invoices' },
        { label: 'Users',            icon: users,        path: '/super-admin-users' },
        { label: 'Artists',          icon: users,        path: '/super-admin-artists' }, 
        { label: 'Service Payment',  icon: users,        path: '/super-admin-service-payment' },
        { label: 'Return/Refund',    icon: orders,       path: '/super-admin-return-refund' },
        { label: 'Inquiries',       icon: inbox,        path: '/super-admin-inquiries' },
        { label: 'Inbox',            icon: inbox,        path: '/sub-admin-inbox', badge: unreadCount },
        { label: 'Account Settings', icon: users,        path: '/sub-admin-account-settings' },
    ] : [
        { label: 'Dashboard',        icon: dashboardIcn, path: '/sub-admin-dashboard' },
        { label: 'Offers',           icon: offers,       path: '/super-admin-offers' },
        { label: 'Orders',           icon: orders,       path: '/super-admin-orders' },
        { label: 'Products',         icon: products,     path: '/super-admin-products' },
        { label: 'Services',         icon: products,     path: '/super-admin-services' },
        { label: 'Artists',          icon: users,        path: '/super-admin-artists' },
        { label: 'Sales Invoices',   icon: salesIn,      path: '/super-admin-sales-invoices' },
        { label: 'Service Payment',  icon: users,        path: '/super-admin-service-payment' },
        { label: 'Return/Refund',    icon: orders,       path: '/super-admin-return-refund' },
        { label: 'Inquiries',        icon: inbox,        path: '/super-admin-inquiries' },
        { label: 'Inbox',            icon: inbox,        path: '/sub-admin-inbox', badge: unreadCount },
        { label: 'Account Settings', icon: users,        path: '/sub-admin-account-settings' },
    ];

  return (
        <Sidebar
            expanded={expanded}
            setExpanded={setExpanded}
            navPages={navPages}
            roleTitle={roleTitle}
            unreadCount={unreadCount}
            setSelectedCategory={setSelectedCategory}
        />
    );
};

export default function SuperAdminDBLayout() {
    const [expanded, setExpanded] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
 
    return (
        <InboxProvider>
            <div className="flex bg-[#F1F3F7] h-screen overflow-hidden">
                <SuperAdminLayoutContent
                    expanded={expanded}
                    setExpanded={setExpanded}
                    setSelectedCategory={setSelectedCategory}
                />
                <main className="flex-1 overflow-y-auto transition-all duration-300">
                    <Outlet context={{ selectedCategory }} />
                </main>
            </div>
        </InboxProvider>
    );
}
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

import dashboardIcn from '../assets/sidebarAdminsIcons/dashboard.svg';
import inbox from '../assets/sidebarAdminsIcons/inbox.svg';
import settingIcn from '../assets/sidebarCustIcons/settings.svg';

import { InboxProvider } from "../context/inboxcontext";

export default function ArtistLayout() {
    const [expanded, setExpanded] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const navPages = [
        { label: 'Dashboard', icon: dashboardIcn, path: '/artist/dashboard' },
        { label: 'Artist Inbox', icon: inbox, path: '/artist/inbox' },
        { label: 'Settings', icon: settingIcn, path: '/artist/settings' },
    ];

    return (
        <InboxProvider>
            <div className="flex bg-[#F1F3F7] h-screen overflow-hidden">
                <Sidebar
                    expanded={expanded}
                    setExpanded={setExpanded}
                    navPages={navPages}
                    roleTitle="Artist"
                    setSelectedCategory={setSelectedCategory}
                />

                <main className="flex-1 overflow-y-auto transition-all duration-300 ">
                    <Outlet context={{ selectedCategory }} />
                </main>
            </div>
        </InboxProvider>
    );
}

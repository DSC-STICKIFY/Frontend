import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import VerificationBanner from "../components/VerificationBanner";
import { InboxProvider } from "../context/inboxcontext"; // ← import context provider

export default function LandingLayout({ children }) {
    return (
        <InboxProvider>   {/* ← Wrap with InboxProvider */}
            <>
                <VerificationBanner />
                <Navbar />
                <main className="mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-15 max-w-screen-2xl">
                    {children || <Outlet />}
                </main>
                <Footer />
            </>
        </InboxProvider>
    );
}
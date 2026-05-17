import React from "react";
import { Outlet } from "react-router-dom";
import LoginNavbar from "../components/LoginNavBar.jsx"; 

const LoginLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <LoginNavbar />

            <div className="flex-grow flex justify-center items-center">
                <Outlet />
            </div>
        </div>
    );
};

export default LoginLayout;

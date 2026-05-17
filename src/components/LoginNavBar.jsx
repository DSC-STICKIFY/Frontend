import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import navLogo from "../assets/dscLogo.png";

const LoginNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
        <nav className="fixed top-0 left-0 w-full z-50 h-[95px] border-b border-[#5A5A5A] bg-white/90 backdrop-blur-md">
            <div className="mx-auto h-full px-6 sm:px-10 md:px-[95px] flex items-center justify-between">
                <div className="flex items-center space-x-6 sm:space-x-10 md:space-x-[58px]">
                <a href="/" className="cursor-pointer">
                    <img
                    src={navLogo}
                    alt="Logo"
                    className="h-[50px] sm:h-[58px] md:h-[63px] w-auto"
                    />
                </a>
                </div>

                <div>
                {isLoginPage ? (
                    <div className="flex items-center">
                        <p className="pr-5">Not yet a member?</p>
                        <button onClick={() => navigate("/register")} 
                            className="font-bold bg-black text-white px-5 py-3 rounded-[8.93px] cursor-pointer">
                            Register
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center">
                        <p className="pr-5">Already a member?</p>
                        <button onClick={() => navigate("/login")} 
                            className="font-bold bg-black text-white px-5 py-3 rounded-[8.93px] cursor-pointer">
                            Login
                        </button>
                    </div>
                )}
                </div>
            </div>
        </nav>
    );
};

export default LoginNavBar;

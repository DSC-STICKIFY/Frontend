import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import navLogo from "../assets/dscLogo.png";
import sCart from '../assets/cart.svg';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/CustomerAuthContext';
import { useInbox } from "../context/inboxcontext";
import LogoutConfirmationModal from "./modals/LogoutConfirmationModal";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems } = useCart();
    const { currentUser, logout } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // ✅ Only treat user as "logged in" for this navbar if they're a customer
    const isCustomer = currentUser?.role === 'user';
    const navUser = isCustomer ? currentUser : null;

    const { unreadCount: rawUnreadCount } = useInbox();
    const unreadCount = isCustomer ? rawUnreadCount : 0;

    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const navLinks = [
        { label: 'Home', path: '/' },
        { label: 'Services', hasPlus: true },
        { label: 'About Us', path: '/about-us' },
    ];

    const services = [
        { label: 'Sticker', path: '/services/sticker' },
        { label: 'Decal Wrap', path: '/services/decal-wrap' },
        { label: 'Signage', path: '/services/signage' },
        { label: 'Graphic Services', path: '/services/graphic-services' },
        { label: 'Giveaways', path: '/services/giveaways' },
        { label: 'Printing', path: '/services/printing' },
    ];

    const currentService = services.find(service => location.pathname.includes(service.path));

    const getInitials = (user) => {
        if (!user) return '?';
        const first = user.first_name || user.name || '';
        const last = user.last_name || '';
        if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
        if (first) return first[0].toUpperCase();
        if (user.email) return user.email[0].toUpperCase();
        return '?';
    };

    const getDisplayName = (user) => {
        if (!user) return '';
        if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
        if (user.first_name) return user.first_name;
        if (user.name) return user.name;
        return user.email || 'User';
    };

    // ✅ Customer navbar — always navigates home on logout, never touches admin session
    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = () => {
        logout();
        setProfileOpen(false);
        setIsOpen(false);
        setShowLogoutModal(false);
        navigate('/');
    };

    // ✅ Dashboard is always customer dashboard on this navbar
    const dashboardPath = '/customer-dashboard';

    return (
        <nav className="fixed top-0 left-0 w-full z-50 h-[70px] md:h-[95px] border-b border-[#5A5A5A] bg-white/40 backdrop-blur-md">
            <div className="mx-auto h-full px-6 sm:px-10 md:px-15 flex items-center justify-between">

                <a href="/" className="cursor-pointer">
                    <img src={navLogo} alt="Logo" className="h-[50px] sm:h-[58px] md:h-[63px] w-auto" />
                </a>

                <div className="hidden md:flex flex-1 ml-14 justify-start space-x-[55px] font-bold">
                    {navLinks.map(({ label, path, hasPlus }) => {
                        const isServices = label === 'Services';
                        const isActive = isServices
                            ? location.pathname.startsWith('/services')
                            : location.pathname === path;

                        return (
                            <div key={label} className="relative group">
                                <button
                                    onClick={() => !isServices && navigate(path)}
                                    className={`relative transition-colors ${isActive ? 'text-black' : 'text-black hover:text-yellow-400 cursor-pointer'}`}
                                >
                                    <span className="relative">
                                        {isServices ? (currentService ? currentService.label : label) : label}
                                        <span className={`absolute left-0 -bottom-1 h-[2px] bg-black transition-all duration-300 ease-in-out ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                                    </span>
                                    {hasPlus && <span className="text-yellow-400 ml-1">+</span>}
                                </button>

                                {isServices && (
                                    <div className="absolute top-full left-0 hidden group-hover:block min-w-[180px] bg-white/90 rounded-4xl py-3 rounded-tl-none shadow-lg z-50">
                                        {services.map((item) => (
                                            <button
                                                key={item.label}
                                                onClick={() => navigate(item.path)}
                                                className="w-full rounded-4xl text-left px-5 py-1 text-black cursor-pointer hover:bg-white/50"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Desktop right side */}
                <div className="hidden md:flex items-center space-x-[39px]">
                    {/* Cart */}
                    <button
                        onClick={() => navigate('/cart')}
                        className="relative cursor-pointer group"
                        aria-label="Cart"
                    >
                        <div className="relative p-2 rounded-full hover:bg-gray-50 transition-colors">
                            <img src={sCart} alt="ShoppingCart" className="h-[34px] w-auto group-hover:scale-110 transition-transform" />
                            {totalItems > 0 && (
                                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-[#FFE100] text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow border-2 border-white">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </div>
                    </button>

                    {/* ✅ navUser instead of currentUser — admin won't appear here */}
                    {navUser ? (
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <div className="relative">
                                    <div className="w-9 h-9 rounded-full bg-[#FFE100] flex items-center justify-center text-gray-900 font-bold text-sm shadow-sm group-hover:bg-yellow-400 transition-colors">
                                        {getInitials(navUser)}
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 shadow">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </div>
                                <span className="font-bold text-sm text-gray-900 max-w-[120px] truncate">
                                    {getDisplayName(navUser).split(' ')[0]}
                                </span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {profileOpen && (
                                <div
                                    className="absolute right-0 top-full mt-3 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
                                    style={{ animation: 'dropIn 0.15s ease both' }}
                                >
                                    <style>{`
                                        @keyframes dropIn {
                                            from { opacity: 0; transform: translateY(-6px); }
                                            to   { opacity: 1; transform: translateY(0); }
                                        }
                                    `}</style>
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="font-bold text-gray-900 text-sm truncate">{getDisplayName(navUser)}</p>
                                        <p className="text-xs text-gray-400 truncate">{navUser.email}</p>
                                    </div>

                                    <button
                                        onClick={() => { navigate(dashboardPath); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Dashboard
                                    </button>

                                    {/* My Orders */}
                                    <button
                                        onClick={() => { navigate('/customer-orders'); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        My Orders
                                    </button>

                                    {/* Inbox */}
                                    <button
                                        onClick={() => { navigate('/customer-inbox'); setProfileOpen(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                        <span className="flex-1 text-left">Inbox</span>
                                        {unreadCount > 0 && (
                                            <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    <div className="border-t border-gray-100 mt-1 pt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="font-bold bg-black text-white px-5 py-3 rounded-[8.93px] cursor-pointer"
                        >
                            Login
                        </button>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden flex flex-col justify-center items-center space-y-1.5 relative w-10 h-10 rounded-xl bg-gray-100/50"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className={`w-6 h-0.5 bg-black transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`w-6 h-0.5 bg-black transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`w-6 h-0.5 bg-black transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                    {/* Mobile inbox indicator only for customers */}
                    {navUser && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                    )}
                    {/* Mobile cart indicator */}
                    {!isOpen && totalItems > 0 && (
                        <span className="absolute -top-1 -left-1 w-3 h-3 bg-[#FFE100] rounded-full border-2 border-white" />
                    )}
                </button>
            </div>

            {/* Mobile menu - Slide in from right */}
            <div
                className={`fixed inset-0 z-40 md:hidden bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            >
                <div
                    className={`absolute right-0 top-0 h-full w-[280px] bg-white shadow-2xl transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <img src={navLogo} alt="Logo" className="h-[40px] w-auto" />
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-black transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
                        <div className="flex flex-col space-y-6 font-bold text-lg">
                            {navLinks.map(({ label, path, hasPlus }) => {
                                const isServices = label === 'Services';
                                const isActive = isServices
                                    ? location.pathname.startsWith('/services')
                                    : location.pathname === path;

                                return (
                                    <div key={label} className="w-full">
                                        {isServices ? (
                                            <>
                                                <button
                                                    onClick={() => setServicesOpen(!servicesOpen)}
                                                    className={`flex justify-between w-full transition-colors ${isActive ? 'text-black' : 'text-gray-500'} active:bg-gray-50 rounded-lg py-1 px-2 -ml-2`}
                                                >
                                                    <span>Services</span>
                                                    <svg className={`w-5 h-5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                {servicesOpen && (
                                                    <div className="ml-4 mt-4 flex flex-col space-y-4 border-l-2 border-yellow-400 pl-4">
                                                        {services.map((item) => (
                                                            <button
                                                                key={item.label}
                                                                onClick={() => { navigate(item.path); setIsOpen(false); setServicesOpen(false); }}
                                                                className={`text-left text-base ${location.pathname === item.path ? 'font-bold text-black' : 'text-gray-500'}`}
                                                            >
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => { navigate(path); setIsOpen(false); }}
                                                className={`w-full text-left transition-colors ${isActive ? 'text-black' : 'text-gray-500'} active:bg-gray-50 rounded-lg py-1 px-2 -ml-2`}
                                            >
                                                {label}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Inbox in mobile menu – only for customers */}
                            {navUser && (
                                <button
                                    onClick={() => { navigate('/customer-inbox'); setIsOpen(false); }}
                                    className="flex items-center justify-between w-full text-gray-500 font-bold"
                                >
                                    <span>Inbox</span>
                                    {unreadCount > 0 && (
                                        <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                    </button>
                                )}

                                {/* Cart in mobile menu */}
                                <button
                                    onClick={() => { navigate('/cart'); setIsOpen(false); }}
                                    className="flex items-center justify-between w-full text-gray-500 font-bold"
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={sCart} alt="Cart" className="w-6 h-6 opacity-60" />
                                        <span>My Cart</span>
                                    </div>
                                    {totalItems > 0 && (
                                        <span className="min-w-[20px] h-5 bg-[#FFE100] text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                            {totalItems > 99 ? '99+' : totalItems}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                    {/* ✅ navUser instead of currentUser in mobile bottom section */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                        {navUser ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-[#FFE100] flex items-center justify-center text-gray-900 font-black text-lg shadow-sm">
                                        {getInitials(navUser)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate">
                                            {getDisplayName(navUser)}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">{navUser.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => { navigate(dashboardPath); setIsOpen(false); }}
                                        className="text-xs font-black bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl shadow-sm active:scale-95 transition"
                                    >
                                        DASHBOARD
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="text-xs font-black bg-red-50 text-red-500 px-4 py-3 rounded-xl active:scale-95 transition"
                                    >
                                        LOGOUT
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => { navigate('/login'); setIsOpen(false); }}
                                className="w-full font-black bg-black text-white px-6 py-4 rounded-2xl shadow-lg active:scale-95 transition tracking-widest"
                            >
                                LOGIN
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {showLogoutModal && (
                <LogoutConfirmationModal
                    onConfirm={confirmLogout}
                    onCancel={() => setShowLogoutModal(false)}
                />
            )}
        </nav>
    );
};

export default Navbar;
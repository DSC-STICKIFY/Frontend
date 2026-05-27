import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import down from '../assets/down.svg';
import up from '../assets/up.svg';
import dscLogo from '../assets/dscLogo.png';
import dashboardIcn from '../assets/sidebarCustIcons/dashboard.svg';
import inbox from '../assets/sidebarCustIcons/inbox.svg';
import cart from '../assets/sidebarCustIcons/cart.svg';
import orders from '../assets/sidebarCustIcons/orders.svg';
import logoutIcon from '../assets/sidebarCustIcons/logout.svg';
import products from '../assets/sidebarCustIcons/products.svg';
import shrink from '../assets/sidebarExpand/shrink.svg';
import expand from '../assets/sidebarExpand/expand.svg';
import users from '../assets/sidebarAdminsIcons/users.svg';
import { logoutUser } from '../services/authService';
import { useAuth } from '../context/CustomerAuthContext';
import { useCart } from '../context/CartContext';
import LogoutConfirmationModal from './modals/LogoutConfirmationModal';

const SidebarCustomer = ({ expanded, setExpanded, setSelectedCategory }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, logout } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const { totalItems } = useCart();

    const isCustomer = currentUser?.role === 'user';
    const navUser = isCustomer ? currentUser : null;

    const [productsOpen, setProductsOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    const dropdownRef = useRef(null);

    // Reset imgError whenever profile_image changes (e.g. after user updates it)
    useEffect(() => {
        setImgError(false);
    }, [currentUser?.profile_image]);

    const navPages = [
        { label: 'Dashboard', icon: dashboardIcn, path: '/customer-dashboard' },
        { label: 'Inbox', icon: inbox, path: '/customer-inbox' },
        { label: 'Cart', icon: cart, path: '/customer-cart' },
        { label: 'Orders', icon: orders, path: '/customer-orders' },
        { label: 'My Inquiries', icon: inbox, path: '/customer-inquiries' },
        { label: 'Account Settings', icon: users, path: '/customer-settings' },
    ];

    const productCategories = [
        { label: 'Sticker', path: '/products/sticker' },
        { label: 'Decal & Wrap', path: '/products/decal-wrap' },
        { label: 'Signage', path: '/products/signage' },
        { label: 'Graphic Services', path: '/products/graphic-services' },
        { label: 'Giveaways', path: '/products/giveaways' },
        { label: 'Printing', path: '/products/printing' },
    ];

    // ── Profile picture helpers ───────────────────────────────────────────────
    const profileImageUrl = navUser?.profile_image
        ? `${import.meta.env.VITE_API_URL}/storage/${navUser.profile_image}`
        : null;

    const fullName =
        [navUser?.first_name, navUser?.last_name].filter(Boolean).join(' ') || 'Customer';

    const initials = fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // ── Avatar component (shared between desktop & mobile) ───────────────────
    const Avatar = ({ size = 'md' }) => {
        const sizeClass = size === 'lg' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-sm';
        return profileImageUrl && !imgError ? (
            <div className={`${sizeClass} rounded-full flex-shrink-0 ring-[3px] ring-[#FDE31E] ring-offset-2 ring-offset-[#F1F3F7]`}>
                <img
                    src={profileImageUrl}
                    alt={fullName}
                    onError={() => setImgError(true)}
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
        ) : (
            <div className={`${sizeClass} rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center font-black text-black flex-shrink-0 ring-[3px] ring-[#FDE31E] ring-offset-2 ring-offset-[#F1F3F7]`}>
                {initials}
            </div>
        );
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLogout = () => setShowLogoutModal(true);

    const confirmLogout = async () => {
        try {
            await logoutUser('user');
            logout();
            setShowLogoutModal(false);
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
            logout();
            setShowLogoutModal(false);
            navigate('/');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProductsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMobileNav = (path, categoryLabel = null) => {
        if (categoryLabel && setSelectedCategory) setSelectedCategory(categoryLabel);
        setMobileMenuOpen(false);
        setProductsOpen(false);
        setTimeout(() => navigate(path), 100);
    };

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <aside className={`hidden lg:flex flex-col h-screen bg-[#F1F3F7] p-2 transition-all duration-300 sticky top-0 z-40 ${expanded ? 'w-64' : 'w-20'}`}>

                {/* Toggle */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`mt-5 w-full flex ${expanded ? 'justify-start pl-5' : 'justify-center'}`}
                >
                    <img className="w-5 h-5" src={expanded ? shrink : expand} alt="Toggle sidebar" />
                </button>

                {/* Logo */}
                <div className={`flex items-center justify-center mt-4 ${expanded ? 'pb-6' : 'p-3'}`}>
                    <img
                        src={dscLogo}
                        alt="DSC Logo"
                        className={`${expanded ? 'h-[60px]' : 'h-[35px]'} object-contain`}
                    />
                </div>

                {/* Navigation & User Info (Scrollable area) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                    <nav className="py-3">
                        {navPages.map(({ label, icon, path }) => (
                        <button
                            key={label}
                            onClick={() => navigate(path)}
                            className={`flex items-center gap-3 w-full p-2 rounded-md text-sm transition-all
                            ${location.pathname === path ? 'bg-[#c0d8ff] font-medium' : 'hover:bg-gray-200'}
                            ${expanded ? 'justify-start' : 'justify-center'}`}
                        >
                            <div className="relative flex-shrink-0">
                                <img src={icon} alt={label} className="w-5 h-5" />
                                {label === 'Cart' && totalItems > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {totalItems > 99 ? '99+' : totalItems}
                                    </span>
                                )}
                            </div>
                            {expanded && <span>{label}</span>}
                        </button>
                    ))}

                        {/* Products Dropdown */}
                        <div className="w-full mt-2 relative" ref={dropdownRef}>
                            <button
                                onClick={() => setProductsOpen(prev => !prev)}
                                className={`flex items-center gap-3 w-full p-2 rounded-md text-sm hover:bg-gray-200 transition-all
                                ${expanded ? 'justify-start' : 'justify-center'}`}
                            >
                                <img src={products} alt="Products" className="w-5 h-5 flex-shrink-0" />
                                {expanded && <span>Products</span>}
                                {expanded && (
                                    <img
                                        src={productsOpen ? up : down}
                                        className="ml-auto w-3 h-3 object-contain"
                                        alt="Toggle products"
                                    />
                                )}
                            </button>

                            {productsOpen && expanded && (
                                <div className="ml-4 mt-3 space-y-2 border-l-2 border-gray-300 pl-4">
                                    {productCategories.map(cat => (
                                        <button
                                            key={cat.label}
                                            onClick={() => {
                                                navigate(cat.path);
                                                if (setSelectedCategory) setSelectedCategory(cat.label);
                                                setProductsOpen(false);
                                            }}
                                            className="block w-full text-left text-sm text-gray-600 hover:text-black font-medium py-1 transition"
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* ── User Info + Logout ── */}
                    <div className="mt-40 py-3 border-t border-gray-200">
                        {/* User card */}
                        <div className={`flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-gray-100 mb-2 ${!expanded ? 'justify-center' : ''}`}>
                            <Avatar size="lg" />
                            {expanded && navUser && (
                                <div className="truncate flex-1 min-w-0">
                                    <div className="text-sm font-bold text-gray-900 truncate">
                                        {navUser.first_name} {navUser.last_name}
                                    </div>
                                    <div className="text-[11px] text-gray-400 font-medium">Customer</div>
                                </div>
                            )}
                        </div>

                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-semibold ${!expanded ? 'justify-center' : ''}`}
                        >
                            <img src={logoutIcon} alt="Logout" className="w-4 h-4 flex-shrink-0" />
                            {expanded && <span>Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Mobile Menu ── */}
            <nav className="lg:hidden fixed top-0 left-0 w-full z-50 h-16 bg-white/90 backdrop-blur-md border-b border-gray-300 flex items-center justify-between px-5">
                <img src={dscLogo} alt="Logo" className="h-10" />

                <button onClick={() => setMobileMenuOpen(prev => !prev)}>
                    <div className="space-y-1">
                        <span className="block w-6 h-0.5 bg-black" />
                        <span className="block w-6 h-0.5 bg-black" />
                        <span className="block w-6 h-0.5 bg-black" />
                    </div>
                </button>

                {mobileMenuOpen && (
                    <div className="absolute top-16 left-0 w-full bg-white shadow-lg px-5 py-6 space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto">
                        {navPages.map(({ label, path }) => (
                        <button
                            key={label}
                            onClick={() => handleMobileNav(path)}
                            className={`flex items-center justify-between w-full text-left font-medium py-3 ${location.pathname === path ? 'text-blue-600' : 'text-gray-800'}`}
                        >
                            <span>{label}</span>
                            {label === 'Cart' && totalItems > 0 && (
                                <span className="bg-red-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                                    {totalItems > 99 ? '99+' : totalItems}
                                </span>
                            )}
                        </button>
                    ))}

                        {/* Mobile Products Dropdown */}
                        <div>
                            <button
                                onClick={() => setProductsOpen(prev => !prev)}
                                className="flex justify-between items-center w-full font-medium py-3 text-gray-800"
                            >
                                Products
                                <img src={productsOpen ? up : down} className="w-4 h-4 transition-transform duration-200" alt="toggle" />
                            </button>

                            {productsOpen && (
                                <div className="ml-4 mt-2 space-y-3 border-l-2 border-gray-300 pl-4">
                                    {productCategories.map(cat => (
                                        <button
                                            key={cat.label}
                                            onClick={() => handleMobileNav(cat.path, cat.label)}
                                            className="block w-full text-left text-sm text-gray-600 hover:text-black py-1"
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Mobile User & Logout */}
                        <div className="border-t pt-6">
                            <div className="flex items-center gap-3 mb-5">
                                <Avatar size="md" />
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {navUser ? `${navUser.first_name} ${navUser.last_name}` : 'Guest'}
                                    </div>
                                    <div className="text-xs text-gray-500">Customer</div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="font-medium text-red-600 hover:underline text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {showLogoutModal && (
                <LogoutConfirmationModal
                    onConfirm={confirmLogout}
                    onCancel={() => setShowLogoutModal(false)}
                />
            )}
        </>
    );
};

export default SidebarCustomer;
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import dscLogo from '../assets/dscLogo.png';
import logoutIcon from '../assets/sidebarAdminsIcons/logout.svg';
import shrink from '../assets/sidebarExpand/shrink.svg';
import expand from '../assets/sidebarExpand/expand.svg';
import down from '../assets/down.svg';
import up from '../assets/up.svg';
import inboxIcon from '../assets/sidebarAdminsIcons/inbox.svg';
import productsIcon from '../assets/sidebarAdminsIcons/products.svg';
import { logoutUser } from '../services/authService';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useInbox } from '../context/inboxcontext';
import LogoutConfirmationModal from './modals/LogoutConfirmationModal';



const Sidebar = ({
    expanded,
    setExpanded,
    navPages = [],
    productCategories = [],
    roleTitle = 'User',
    unreadCount = 0,
    setSelectedCategory = null,
    // Optional overrides for customer use
    currentUser: currentUserProp = null,
    logout: logoutProp = null,
    logoutRole = 'admin',
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const adminAuth = useAdminAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const dropdownRef = useRef(null);

    // Use prop-injected user/logout if provided (customer), else fall back to admin auth
    const currentUser = currentUserProp ?? adminAuth.currentUser;
    const logout = logoutProp ?? adminAuth.logout;
    const navUser = currentUser ?? null;

    // Dynamically retrieve unread count for Sidebar
    const { unreadCount: ctxUnread } = useInbox();
    const [imgError, setImgError] = useState(false);

    const profileImageUrl = navUser?.profile_image
        ? `${import.meta.env.VITE_API_URL}/storage/${navUser.profile_image}`
        : null;

    const firstName = navUser?.first_name || 'Guest';
    const lastName = navUser?.last_name || '';

    const fullName = [firstName, lastName].filter(Boolean).join(' ') || roleTitle;
    const displayInitials = fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';

    const Avatar = ({ size = 'md' }) => {
        const sizeClass = size === 'lg' ? 'w-[48px] h-[48px] text-[15px]' : 'w-10 h-10 text-xs';
        return profileImageUrl && !imgError ? (
            <div className={`${sizeClass} rounded-full flex-shrink-0 ring-[2.5px] ring-yellow-400 ring-offset-2 ring-offset-white shadow-sm`}>
                <img
                    src={profileImageUrl}
                    alt={fullName}
                    onError={() => setImgError(true)}
                    className="w-full h-full rounded-full object-cover"
                />
            </div>
        ) : (
            <div className={`${sizeClass} rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center font-bold text-black flex-shrink-0 ring-[2.5px] ring-yellow-400 ring-offset-2 ring-offset-white shadow-sm`}>
                {displayInitials}
            </div>
        );
    };

    const handleLogout = () => {
        setShowLogoutModal(true);
    };

    const confirmLogout = async () => {
        try {
            await logoutUser(logoutRole);
            logout();
            setShowLogoutModal(false);
            if (logoutRole === 'user') {
                navigate('/');
            } else {
                navigate('/login');
            }
        } catch (error) {
            console.error("Logout failed:", error);
            logout();
            setShowLogoutModal(false);
            navigate(logoutRole === 'user' ? '/' : '/login');
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
        if (categoryLabel && setSelectedCategory) {
            setSelectedCategory(categoryLabel);
        }
        setMobileMenuOpen(false);
        setProductsOpen(false);
        if (path) setTimeout(() => navigate(path), 100);
    };

    return (
        <>
            <aside className={`hidden lg:flex flex-col h-screen bg-[#F1F3F7] py-2 transition-all duration-300 sticky top-0 z-40 ${expanded ? 'w-64' : 'w-20'}`}>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`mt-5 w-full flex ${expanded ? 'justify-start pl-5' : 'justify-center'}`}
                >
                    <img className="w-5 h-5" src={expanded ? shrink : expand} alt="Toggle" />
                </button>

                <div className={`flex items-center justify-center mt-4 ${expanded ? 'pb-6' : 'p-3'}`}>
                    <img src={dscLogo} alt="Logo" className={`${expanded ? 'h-[60px]' : 'h-[35px]'} object-contain`} />
                </div>

                <div className="flex-1 flex flex-col min-h-0 justify-between px-2 pb-6 overflow-hidden w-full">
                    <nav className="flex-1 overflow-y-auto py-3 w-full custom-scrollbar pr-1 space-y-0.5">
                        {navPages.filter(p => !p.bottom).map(({ label, icon, path, badge }) => {
                            const isActive = location.pathname === path;
                            // For Inbox, prioritize global context badge if > 0
                            const finalBadge = (label.toLowerCase() === 'inbox' && ctxUnread > 0) ? ctxUnread : badge;
                            const showBadge = finalBadge > 0;
                            return (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(path);
                                    }}
                                    className={`relative flex items-center gap-3 w-full p-2 rounded-md text-sm ${isActive ? 'bg-[#c0d8ff]' : 'hover:bg-gray-200'} ${expanded ? 'justify-start' : 'justify-center'}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img src={icon} alt={label} className="w-5 h-5" />
                                        {!expanded && showBadge && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                                                {finalBadge > 99 ? '99+' : finalBadge}
                                            </span>
                                        )}
                                    </div>
                                    {expanded && (
                                        <>
                                            <span className="flex-1 text-left line-clamp-1">{label}</span>
                                            {showBadge && (
                                                <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                                                    {finalBadge > 99 ? '99+' : finalBadge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}

                        {productCategories.length > 0 && (
                            <div className="w-full mt-2 relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setProductsOpen(prev => !prev);
                                    }}
                                    className={`flex items-center gap-3 w-full p-2 rounded-md text-sm hover:bg-gray-200 ${expanded ? 'justify-start' : 'justify-center'}`}
                                >
                                    <img src={productsIcon} alt="Products" className="w-5 h-5 shrink-0" />
                                    {expanded && <span className="flex-1 text-left">Products</span>}
                                    {expanded && <img src={productsOpen ? up : down} className="ml-auto w-3 h-3 object-contain shrink-0" alt="Toggle" />}
                                </button>

                                {productsOpen && expanded && (
                                    <div className="ml-4 mt-3 space-y-2 border-l-2 border-gray-300 pl-4 w-[calc(100%-1rem)]">
                                        {productCategories.map(cat => (
                                            <button
                                                type="button"
                                                key={cat.label}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigate(cat.path);
                                                    if (setSelectedCategory) setSelectedCategory(cat.label);
                                                    setProductsOpen(false);
                                                }}
                                                className="block w-full text-left text-sm text-gray-600 hover:text-black font-medium py-1 transition truncate"
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {navPages.filter(p => p.bottom).map(({ label, icon, path, badge }) => {
                            const isActive = location.pathname === path;
                            const showBadge = badge > 0;
                            return (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(path);
                                    }}
                                    className={`relative flex items-center gap-3 w-full p-2 mt-1 rounded-md text-sm ${isActive ? 'bg-[#c0d8ff]' : 'hover:bg-gray-200'} ${expanded ? 'justify-start' : 'justify-center'}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img src={icon} alt={label} className="w-5 h-5" />
                                        {!expanded && showBadge && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                                                {badge > 99 ? '99+' : badge}
                                            </span>
                                        )}
                                    </div>
                                    {expanded && (
                                        <>
                                            <span className="flex-1 text-left line-clamp-1">{label}</span>
                                            {showBadge && (
                                                <span className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                                                    {badge > 99 ? '99+' : badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="pt-4 border-t border-gray-200 w-full flex flex-shrink-0 flex-col gap-3 mb-5">
                        {expanded ? (
                            <div className="bg-white rounded-[24px] p-4 shadow-sm border border-gray-100 mx-1 flex items-center gap-4">
                                <Avatar size="lg" />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[16px] font-bold text-[#0F172A] truncate leading-tight">
                                        {firstName} {lastName}
                                    </span>
                                    <span className="text-[13px] text-gray-400 font-medium leading-tight mt-0.5">
                                        {roleTitle}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center">
                                <Avatar size="lg" />
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleLogout}
                            className={`group flex items-center gap-3 w-full px-4 py-2 rounded-xl transition-all duration-200 ${expanded ? 'justify-start hover:bg-red-50' : 'justify-center hover:bg-red-50'}`}
                        >
                            <img
                                src={logoutIcon}
                                alt="Logout"
                                className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                            />
                            {expanded && (
                                <span className="text-[15px] font-bold text-red-500 group-hover:text-red-600">
                                    Logout
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Navbar Header */}
            <nav className="lg:hidden fixed top-0 left-0 w-full z-50 h-16 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-5">
                <div className="flex items-center gap-2">
                    <img src={dscLogo} alt="Logo" className="h-9" />
                </div>

                <div className="flex items-center gap-4">
                    {(unreadCount > 0 || ctxUnread > 0) && (
                        <button
                            type="button"
                            onClick={() => navigate('/customer-inbox')}
                            className="relative p-2"
                        >
                            <img src={inboxIcon} alt="Inbox" className="w-5 h-5" />
                            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                {(unreadCount || ctxUnread) > 99 ? '99+' : (unreadCount || ctxUnread)}
                            </span>
                        </button>
                    )}
                    <button 
                        type="button" 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 -mr-2 outline-none"
                    >
                        <div className="relative w-6 h-5 flex flex-col justify-between">
                            <span className={`block w-6 h-0.5 bg-gray-900 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[9px]' : ''}`}></span>
                            <span className={`block w-6 h-0.5 bg-gray-900 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                            <span className={`block w-6 h-0.5 bg-gray-900 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`}></span>
                        </div>
                    </button>
                </div>
            </nav>

            {/* Mobile Sidebar Drawer */}
            <div className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
                
                {/* Drawer Content */}
                <div className={`absolute top-0 right-0 w-[80%] max-w-sm h-full bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                        <img src={dscLogo} alt="Logo" className="h-8" />
                        <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                        {navPages.filter(p => !p.bottom).map(({ label, icon, path, badge }) => {
                            const isActive = location.pathname === path;
                            const finalBadge = (label.toLowerCase() === 'inbox' && ctxUnread > 0) ? ctxUnread : badge;
                            return (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={() => handleMobileNav(path)}
                                    className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all ${isActive ? 'bg-yellow-400 text-black font-bold shadow-md shadow-yellow-200' : 'text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <img src={icon} alt="" className={`w-5 h-5 ${isActive ? 'brightness-0' : 'opacity-60'}`} />
                                    <span className="flex-1 text-left text-[15px]">{label}</span>
                                    {finalBadge > 0 && (
                                        <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-black ${isActive ? 'bg-black text-yellow-400' : 'bg-red-500 text-white'}`}>
                                            {finalBadge > 99 ? '99+' : finalBadge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        {productCategories.length > 0 && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setProductsOpen(!productsOpen)}
                                    className={`flex items-center gap-4 w-full p-3.5 rounded-2xl transition-all text-gray-600 hover:bg-gray-50`}
                                >
                                    <img src={productsIcon} alt="" className="w-5 h-5 opacity-60" />
                                    <span className="flex-1 text-left text-[15px]">Shop Categories</span>
                                    <img src={productsOpen ? up : down} className={`w-3 h-3 transition-transform ${productsOpen ? 'rotate-180' : ''}`} alt="" />
                                </button>

                                {productsOpen && (
                                    <div className="ml-5 mt-2 space-y-1 border-l-2 border-gray-100 pl-4">
                                        {productCategories.map(cat => (
                                            <button
                                                type="button"
                                                key={cat.label}
                                                onClick={() => handleMobileNav(cat.path, cat.label)}
                                                className="block w-full text-left py-2.5 px-3 text-[14px] text-gray-500 hover:text-black transition"
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6 mt-6 border-t border-gray-100">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] px-3 mb-3">Quick Links</p>
                            {navPages.filter(p => p.bottom).map(({ label, icon, path }) => (
                                <button
                                    key={label}
                                    onClick={() => handleMobileNav(path)}
                                    className={`flex items-center gap-4 w-full p-3.5 rounded-2xl text-gray-600 hover:bg-gray-50`}
                                >
                                    <img src={icon} alt="" className="w-5 h-5 opacity-60" />
                                    <span className="flex-1 text-left text-[15px]">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Profile Footer */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-4 mb-5">
                            <Avatar size="md" />
                            <div className="min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tighter italic">
                                    {firstName} {lastName}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {roleTitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full py-3.5 px-4 rounded-2xl bg-red-50 text-red-600 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition active:scale-[0.98]"
                        >
                            <img src={logoutIcon} alt="" className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                </div>
            </div>
            {showLogoutModal && (
                <LogoutConfirmationModal
                    onConfirm={confirmLogout}
                    onCancel={() => setShowLogoutModal(false)}
                />
            )}
        </>
    );
};

export default Sidebar;

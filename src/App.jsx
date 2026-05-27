import React, { useState, useEffect, Suspense } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";
import { useDebounce } from "react-use";

// Context Providers
import { CustomerAuthProvider, useAuth } from "./context/CustomerAuthContext.jsx";
import { AdminAuthProvider, useAdminAuth } from "./context/AdminAuthContext.jsx";
import { UIProvider } from "./context/UIContext.jsx";
import { CartProvider } from "./context/CartContext";

// Layouts (kept eager — they're small and needed for structure)
import LandingLayout from "./layouts/LandingLayout";
import CustomerDBLayout from "./layouts/CustomerDBLayout";
import SuperAdminDBLayout from "./layouts/SuperAdminDBLayout.jsx";
import LoginLayout from "./layouts/LoginLayout.jsx";
import CustomerServiceLayout from "./layouts/CustomerServiceLayout.jsx";
import CustDBProductsLayout from "./layouts/CustDBProductsLayout";

// Page-level loading fallback
import PageLoader from "./components/PageLoader.jsx";

// Components (kept eager — small, used on auth routes)
import LoginNavBar from "./components/LoginNavBar.jsx";

// ─── Lazy-loaded Pages ────────────────────────────────────────────────────────
// Public / Landing
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const StickerLP = React.lazy(() => import("./pages/LPServices/Sticker.jsx"));
const DecalnWrapLP = React.lazy(() => import("./pages/LPServices/DecalnWrap.jsx"));
const SignageLP = React.lazy(() => import("./pages/LPServices/Signage.jsx"));
const GraphicServicesLP = React.lazy(() => import("./pages/LPServices/GraphicServices.jsx"));
const GiveawaysLP = React.lazy(() => import("./pages/LPServices/Giveaways.jsx"));
const PrintingLP = React.lazy(() => import("./pages/LPServices/Printing.jsx"));
const AboutUs = React.lazy(() => import("./pages/AboutUs.jsx"));

// Artist
const ArtistLayout = React.lazy(() => import("./layouts/ArtistLayout"));
const ArtistDashboard = React.lazy(() => import("./pages/artist/ArtistDashboard"));
const ArtistInbox = React.lazy(() => import("./pages/artist/ArtistInbox"));
const ArtistAccountSettings = React.lazy(() => import("./pages/artist/ArtistAccountSettings"));

// Staff
const StaffLayout = React.lazy(() => import("./layouts/StaffLayout"));
const StaffDashboard = React.lazy(() => import("./pages/staff/StaffDashboard"));
const StaffOrders = React.lazy(() => import("./pages/staff/StaffOrders"));
const StaffAccountSettings = React.lazy(() => import("./pages/staff/StaffAccountSettings"));
const StaffValidationQueue = React.lazy(() => import("./pages/staff/StaffValidationQueue"));
const StaffInbox = React.lazy(() => import("./pages/staff/StaffInbox"));

// Cart
const CartPage = React.lazy(() => import("./pages/CartPage.jsx"));

// Auth
const Login = React.lazy(() => import("./pages/Login.jsx"));
const Register = React.lazy(() => import("./pages/Register.jsx"));
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail.jsx"));

// Customer
const CustomerDashboard = React.lazy(() => import("./pages/customer/CustomerDashboard.jsx"));
const CustomerInbox = React.lazy(() => import("./pages/customer/CustomerInbox.jsx"));
const CustomerCart = React.lazy(() => import("./pages/customer/CustomerCart.jsx"));
const CustomerOrders = React.lazy(() => import("./pages/customer/CustomerOrders.jsx"));
const CustomerCheckout = React.lazy(() => import("./pages/customer/CustomerCheckout.jsx"));
const CustomerAccountSettings = React.lazy(() => import("./pages/customer/CustomerAccountSettings.jsx"));
const CustomerInquiries = React.lazy(() => import("./pages/customer/CustomerInquiries.jsx"));
const CustomerArtistInbox = React.lazy(() => import("./pages/customer/CustomerArtistInbox.jsx"));

// Customer Product Pages
const Sticker = React.lazy(() => import("./pages/customer/products/Sticker.jsx"));
const DecalnWrap = React.lazy(() => import("./pages/customer/products/DecalnWrap.jsx"));
const Signage = React.lazy(() => import("./pages/customer/products/Signage.jsx"));
const GraphicServices = React.lazy(() => import("./pages/customer/products/GraphicServices.jsx"));
const Giveaways = React.lazy(() => import("./pages/customer/products/Giveaways.jsx"));
const Printing = React.lazy(() => import("./pages/customer/products/Printing.jsx"));

// Admin / Service
const SubAdminInbox = React.lazy(() => import("./pages/subAdmin/SubAdminInbox.jsx"));
const SubAdminAccountSettings = React.lazy(() => import("./pages/subAdmin/SubAdminAccountSettings.jsx"));
const SuperAdminDashboard = React.lazy(() => import("./pages/superAdmin/SuperAdminDashboard.jsx"));
const SuperAdminOffers = React.lazy(() => import("./pages/superAdmin/SuperAdminOffers.jsx"));
const SuperAdminOrders = React.lazy(() => import("./pages/superAdmin/SuperAdminOrders.jsx"));
const SuperAdminProducts = React.lazy(() => import("./pages/superAdmin/SuperAdminProducts.jsx"));
const SuperAdminSalesInvoice = React.lazy(() => import("./pages/superAdmin/SuperAdminSalesInvoice.jsx"));
const SuperAdminUsers = React.lazy(() => import("./pages/superAdmin/SuperAdminUsers.jsx"));
const SuperAdminServicePayment = React.lazy(() => import("./pages/superAdmin/SuperAdminServicePayment.jsx"));
const SuperAdminServices = React.lazy(() => import("./pages/superAdmin/SuperAdminServices.jsx"));
const CustomerServiceOffers = React.lazy(() => import("./pages/customerService/CustomerServiceOffers.jsx"));
const CustomerServiceInbox = React.lazy(() => import("./pages/customerService/CustomerServiceInbox.jsx"));
const CustomerServiceDashboard = React.lazy(() => import("./pages/customerService/CustomerServiceDashboard.jsx"));
const CustomerServiceArtistInbox = React.lazy(() => import("./pages/customerService/CustomerServiceArtistInbox.jsx"));
const SuperAdminArtistInbox = React.lazy(() => import("./pages/superAdmin/SuperAdminArtistInbox.jsx"));
const CustomerServiceInquiries = React.lazy(() => import("./pages/customerService/CustomerServiceInquiries.jsx"));
const ReturnRefundManagement = React.lazy(() => import("./pages/superAdmin/ReturnRefundManagement.jsx"));
const AdminInquiries = React.lazy(() => import("./pages/superAdmin/AdminInquiries.jsx"));
const SuperAdminArtists = React.lazy(() => import("./pages/superAdmin/SuperAdminArtists.jsx"));
const SuperAdminCSQueue = React.lazy(() => import("./pages/superAdmin/SuperAdminCSQueue.jsx"));

// E-Wallet
const PaymentSuccess = React.lazy(() => import("./pages/EwalletPaymentRedirectPages/PaymentSuccess.jsx").then(m => ({ default: m.PaymentSuccess })));
const PaymentFailed = React.lazy(() => import("./pages/EwalletPaymentRedirectPages/PaymentFailed.jsx").then(m => ({ default: m.PaymentFailed })));

// ─── Cart Router ──────────────────────────────────────────────────────────────
const CartRouter = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-xl font-medium text-gray-700">Loading cart...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait...</p>
                </div>
            </div>
        );
    }

    if (currentUser) {
        return <CustomerCart />;
    }

    return (
        <LandingLayout>
            <CartPage />
        </LandingLayout>
    );
};

// ─── Protected Route Component ──────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser, loading } = useAdminAuth();
    const location = useLocation();

    if (loading) return <PageLoader />;

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(currentUser.role.toLowerCase())) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// ─── App Content ──────────────────────────────────────────────────────────────
import { Toaster } from 'react-hot-toast';

const AppContent = () => {
    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const location = useLocation();

    useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

    const showLoginNavBar =
        location.pathname === "/login" || location.pathname === "/register";

    return (
        <>
            <Toaster position="top-center" reverseOrder={false} />
            {showLoginNavBar && <LoginNavBar />}

            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* ==================== PUBLIC / LANDING ==================== */}
                    <Route
                        element={
                            <CustomerAuthProvider>
                                <CartProvider>
                                    <LandingLayout />
                                </CartProvider>
                            </CustomerAuthProvider>
                        }
                    >
                        <Route
                            path="/"
                            element={
                                <LandingPage
                                    searchText={searchText}
                                    setSearchText={setSearchText}
                                    debouncedSearchText={debouncedSearchText}
                                />
                            }
                        />
                        <Route path="/services/sticker" element={<StickerLP />} />
                        <Route path="/services/decal-wrap" element={<DecalnWrapLP />} />
                        <Route path="/services/signage" element={<SignageLP />} />
                        <Route path="/services/graphic-services" element={<GraphicServicesLP />} />
                        <Route path="/services/giveaways" element={<GiveawaysLP />} />
                        <Route path="/services/printing" element={<PrintingLP />} />
                        <Route path="/about-us" element={<AboutUs />} />
                    </Route>

                    {/* ==================== AUTH ==================== */}
                    <Route element={<LoginLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Route>

                    {/* ==================== CART ==================== */}
                    {/* ✅ CartProvider is now INSIDE CustomerAuthProvider */}
                    <Route
                        path="/cart"
                        element={
                            <CustomerAuthProvider>
                                <CartProvider>
                                    <CartRouter />
                                </CartProvider>
                            </CustomerAuthProvider>
                        }
                    />

                    {/* ==================== CUSTOMER DASHBOARD ==================== */}
                    {/* ✅ CartProvider is now INSIDE CustomerAuthProvider */}
                    <Route
                        element={
                            <CustomerAuthProvider>
                                <CartProvider>
                                    <CustomerDBLayout />
                                </CartProvider>
                            </CustomerAuthProvider>
                        }
                    >
                        <Route path="/customer-dashboard" element={<CustomerDashboard />} />
                        <Route path="/customer-inbox" element={<CustomerInbox />} />
                        <Route path="/customer-cart" element={<CustomerCart />} />
                        <Route path="/customer-orders" element={<CustomerOrders />} />
                        <Route path="/customer-artist-inbox" element={<CustomerArtistInbox />} />
                        <Route path="/customer-inquiries" element={<CustomerInquiries />} />
                        <Route path="/customer-checkout" element={<CustomerCheckout />} />
                        <Route path="/customer-settings" element={<CustomerAccountSettings />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route
                            path="/products/sticker"
                            element={<CustDBProductsLayout><Sticker /></CustDBProductsLayout>}
                        />
                        <Route
                            path="/products/decal-wrap"
                            element={<CustDBProductsLayout><DecalnWrap /></CustDBProductsLayout>}
                        />
                        <Route
                            path="/products/signage"
                            element={<CustDBProductsLayout><Signage /></CustDBProductsLayout>}
                        />
                        <Route
                            path="/products/graphic-services"
                            element={<CustDBProductsLayout><GraphicServices /></CustDBProductsLayout>}
                        />
                        <Route
                            path="/products/giveaways"
                            element={<CustDBProductsLayout><Giveaways /></CustDBProductsLayout>}
                        />
                        <Route
                            path="/products/printing"
                            element={<CustDBProductsLayout><Printing /></CustDBProductsLayout>}
                        />
                    </Route>

                    {/* ==================== SUPER ADMIN ==================== */}
                    <Route
                        element={
                            <AdminAuthProvider>
                                <SuperAdminDBLayout />
                            </AdminAuthProvider>
                        }
                    >
                        <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
                        <Route path="/sub-admin-dashboard" element={<SuperAdminDashboard />} />
                        <Route path="/super-admin-offers" element={<SuperAdminOffers />} />
                        <Route path="/super-admin-cs-queue" element={<SuperAdminCSQueue />} />
                        <Route path="/super-admin-orders" element={<SuperAdminOrders />} />
                        <Route path="/super-admin-products" element={<SuperAdminProducts />} />
                        <Route path="/super-admin-services" element={<SuperAdminServices />} />
                        <Route path="/super-admin-sales-invoices" element={<SuperAdminSalesInvoice />} />
                        <Route path="/super-admin-users" element={<SuperAdminUsers />} />
                        <Route path="/super-admin-service-payment" element={<SuperAdminServicePayment />} />
                        <Route path="/sub-admin-inbox" element={<SubAdminInbox />} />
                        <Route path="/sub-admin-account-settings" element={<SubAdminAccountSettings />} />
                        <Route path="/super-admin-return-refund" element={<ReturnRefundManagement />} />
                        <Route path="/super-admin-inquiries" element={<AdminInquiries />} />
                        <Route path="/super-admin-artists" element={<SuperAdminArtists />} />
                        <Route path="/super-admin-artist-inbox" element={<SuperAdminArtistInbox />} />
                    </Route>

                    {/* ==================== CUSTOMER SERVICE ==================== */}
                    <Route
                        element={
                            <AdminAuthProvider>
                                <ProtectedRoute allowedRoles={['customer_service']}>
                                    <CustomerServiceLayout />
                                </ProtectedRoute>
                            </AdminAuthProvider>
                        }
                    >
                        <Route path="/customer-service-dashboard" element={<CustomerServiceDashboard />} />
                        <Route path="/customer-service-offers" element={<CustomerServiceOffers />} />
                        <Route path="/customer-service-inbox" element={<CustomerServiceInbox />} />
                        <Route path="/customer-service-artist-inbox" element={<CustomerServiceArtistInbox />} />
                        <Route path="/customer-service-inquiries" element={<CustomerServiceInquiries />} />
                    </Route>

                    {/* ==================== STAFF ==================== */}
                    <Route
                        element={
                            <AdminAuthProvider>
                                <ProtectedRoute allowedRoles={['staff']}>
                                    <StaffLayout />
                                </ProtectedRoute>
                            </AdminAuthProvider>
                        }
                    >
                        <Route path="/staff/dashboard"         element={<StaffDashboard />} />
                        <Route path="/staff/inbox"             element={<StaffInbox />} />
                        <Route path="/staff/validation-queue"  element={<StaffValidationQueue />} />
                        <Route path="/staff/orders"            element={<StaffOrders />} />
                        <Route path="/staff/inquiries"         element={<AdminInquiries />} />
                        <Route path="/staff/settings"          element={<StaffAccountSettings />} />
                    </Route>

                    {/* ==================== ARTIST ==================== */}
                    <Route
                        element={
                            <AdminAuthProvider>
                                <ProtectedRoute allowedRoles={['artist']}>
                                    <ArtistLayout />
                                </ProtectedRoute>
                            </AdminAuthProvider>
                        }
                    >
                        <Route path="/artist/dashboard" element={<ArtistDashboard />} />
                        <Route path="/artist/inbox" element={<ArtistInbox />} />
                        <Route path="/artist/settings" element={<ArtistAccountSettings />} />
                    </Route>

                    {/* ==================== E-WALLET REDIRECT ROUTES ==================== */}
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/failed" element={<PaymentFailed />} />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </>
    );
};

// ─── Scroll To Top ────────────────────────────────────────────────────────────
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
};

// ─── App Root ─────────────────────────────────────────────────────────────────
// ✅ CartProvider removed from here — it now lives inside CustomerAuthProvider
//    per route group so useAuth() is available when CartContext initializes.
function App() {
    return (
        <UIProvider>
            <Router>
                <ScrollToTop />
                <AppContent />
            </Router>
        </UIProvider>
    );
}

export default App;
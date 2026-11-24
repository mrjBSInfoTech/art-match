import { Suspense, lazy } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";
import RouteLoadingFallback from "../components/common/RouteLoadingFallback";

// Route Guards (lightweight auth checks)
import AdminRoute from "../middleware/AdminRoute";
import AdminPayoutRoute from "../middleware/AdminPayoutRoute";
import SellerRoute from "../middleware/SellerRoute";
import BuyerRoute from "../middleware/BuyerRoute";

// Layouts (lazy-loaded per panel so Buyer never downloads Admin/Seller/Toolpad shells)
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const SellerLayout = lazy(() => import("../layouts/SellerLayout"));
const BuyerLayout = lazy(() => import("../layouts/BuyerLayout"));
const ProfileLayout = lazy(() => import("../components/buyer/Profile/ProfileLayout"));

// Admin Pages
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminSystemSetting = lazy(() => import("../pages/admin/SystemSetting"));
const AdminMechanicals = lazy(() => import("../pages/admin/Mechanicals"));
const AdminProgram = lazy(() => import("../pages/admin/Program"));
const AdminFaqEdit = lazy(() => import("../pages/admin/FaqEdit"));
const AdminChatSupport = lazy(() => import("../pages/admin/ChatSupport"));
const AdminProfile = lazy(() => import("../pages/admin/Profile"));
const AdminSales = lazy(() => import("../pages/admin/Sales"));
const AdminPayout = lazy(() => import("../pages/admin/Payout"));
const AdminEvent = lazy(() => import("../pages/admin/Event"));
const AdminArtwork = lazy(() => import("../pages/admin/Artwork"));
const AdminSettings = lazy(() => import("../pages/admin/Settings"));
const AdminStudent = lazy(() => import("../pages/admin/Student"));
const AdminCustomer = lazy(() => import("../pages/admin/Customer"));
const AdminAccountAccess = lazy(() => import("../pages/admin/AccountAccess"));
const AdminControl = lazy(() => import("../pages/admin/Admin"));
const AdminAuditLogs = lazy(() => import("../pages/admin/AuditLogs"));
const AdminLogin = lazy(() => import("../pages/admin/Login"));

// Seller Pages
const SellerDashboard = lazy(() => import("../pages/seller/Dashboard"));
const SellerArtwork = lazy(() => import("../pages/seller/Artwork"));
const SellerSales = lazy(() => import("../pages/seller/Sales"));
const SellerMessages = lazy(() => import("../pages/seller/Messages"));
const SellerNotifications = lazy(() => import("../pages/seller/Notifications"));
const SellerOrder = lazy(() => import("../pages/seller/Order"));
const SellerOrderDetail = lazy(() => import("../components/seller/Order/OrderDetail"));
const SellerInventory = lazy(() => import("../pages/seller/Inventory"));
const SellerReviews = lazy(() => import("../pages/seller/Reviews"));
const SellerProfile = lazy(() => import("../pages/seller/Profile"));
const SellerSettings = lazy(() => import("../pages/seller/Settings"));
const SellerLogin = lazy(() => import("../pages/seller/Login"));
const SellerRegister = lazy(() => import("../pages/seller/Register"));
const SellerPayout = lazy(() => import("../pages/seller/Payout"));
const SellerVoucher = lazy(() => import("../pages/seller/Voucher"));
const SellerCertificateOfAuthenticity = lazy(
  () => import("../pages/seller/CertificateOfAuthenticity"),
);
const SellerSearchCertificate = lazy(
  () => import("../pages/seller/SearchCertificate"),
);
const SellerMarketing = lazy(() => import("../pages/seller/Marketing"));
const SellerAuditLogs = lazy(() => import("../pages/seller/AuditLogs"));

// Buyer Pages
const BuyerMain = lazy(() => import("../pages/buyer/Main"));
const BuyerAddress = lazy(() => import("../pages/buyer/Address"));
const BuyerShop = lazy(() => import("../pages/buyer/Shop"));
const BuyerGallery = lazy(() => import("../pages/buyer/Gallery"));
const BuyerFavorites = lazy(() => import("../pages/buyer/Favorites"));
const BuyerArtworkDetail = lazy(() => import("../pages/buyer/ArtworkDetail"));
const BuyerArtist = lazy(() => import("../pages/buyer/Artist"));
const BuyerSellerProfile = lazy(() => import("../pages/buyer/SellerProfile"));
const BuyerAboutUs = lazy(() => import("../pages/buyer/AboutUs"));
const BuyerHelpSupport = lazy(() => import("../pages/buyer/HelpSupport"));
const BuyerProgram = lazy(() => import("../pages/buyer/Program"));
const BuyerAcademy = lazy(() => import("../pages/buyer/Academy"));
const BuyerCart = lazy(() => import("../pages/buyer/Cart"));
const BuyerCheckout = lazy(() => import("../pages/buyer/Checkout"));
const BuyerMessage = lazy(() => import("../pages/buyer/Message"));
const BuyerProfile = lazy(() => import("../pages/buyer/Profile"));
const BuyerAccountOverview = lazy(() => import("../pages/buyer/AccountOverview"));
const BuyerPaymentMethods = lazy(() => import("../pages/buyer/PaymentMethods"));
const BuyerSettings = lazy(() => import("../pages/buyer/Settings"));
const BuyerOrder = lazy(() => import("../pages/buyer/Order"));
const BuyerOrderDetail = lazy(() => import("../pages/buyer/OrderDetail"));
const BuyerPurchases = lazy(() => import("../pages/buyer/Purchases"));
const BuyerOrderFinish = lazy(() => import("../pages/buyer/OrderFinish"));
const BuyerCertificateView = lazy(() => import("../pages/buyer/CertificateView"));
const BuyerNotifications = lazy(() => import("../pages/buyer/Notifications"));
const BuyerLogin = lazy(() => import("../pages/buyer/Login"));
const BuyerRegister = lazy(() => import("../pages/buyer/Register"));
const BuyerPrivacyPolicy = lazy(() => import("../pages/buyer/BuyerPrivacyPolicy"));
const BuyerTermsOfService = lazy(() => import("../pages/buyer/TermsOfService"));

function LegacyArtworkRedirect() {
  const { genre } = useParams();
  const { search } = useLocation();
  const destination = genre
    ? `/buyer/shop/${encodeURIComponent(genre)}${search}`
    : `/buyer/shop${search}`;

  return <Navigate to={destination} replace />;
}

export default function AppRoutes() {
  return (
    <HelmetProvider>
      <ThemeModeProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/buyer/main" replace />} />

            <Route path="/buyer">
              <Route path="login" element={<BuyerLogin />} />
              <Route path="register" element={<BuyerRegister />} />

              {/* Public buyer pages */}
              <Route element={<BuyerLayout />}>
                <Route path="certificate/verify/:token" element={<BuyerCertificateView />} />
                <Route path="main" element={<BuyerMain />} />
                <Route path="shop" element={<BuyerShop />} />
                <Route path="shop/:genre" element={<BuyerShop />} />
                <Route path="gallery" element={<BuyerGallery />} />
                <Route path="artist" element={<BuyerArtist />} />
                <Route path="seller/:id" element={<BuyerSellerProfile />} />
                <Route path="about" element={<BuyerAboutUs />} />
                <Route path="help-support" element={<BuyerHelpSupport />} />
                <Route path="privacy-policy" element={<BuyerPrivacyPolicy />} />
                <Route path="terms" element={<BuyerTermsOfService />} />
                <Route path="programs/:program" element={<BuyerProgram />} />
                <Route path="academy/:section" element={<BuyerAcademy />} />
                <Route path="artwork/view/:id" element={<BuyerArtworkDetail />} />
                <Route path="artwork" element={<LegacyArtworkRedirect />} />
                <Route
                  path="artwork/:genre"
                  element={<LegacyArtworkRedirect />}
                />
              </Route>

              {/* Protected buyer pages */}
              <Route element={<BuyerRoute />}>
                <Route element={<BuyerLayout />}>
                  <Route path="orders" element={<Navigate to="profile/orders" replace />} />
                  <Route path="orders/:id" element={<BuyerOrderDetail />} />
                  <Route path="orders/view/:id" element={<BuyerOrderDetail />} />
                  <Route path="cart" element={<BuyerCart />} />
                  <Route path="checkout" element={<BuyerCheckout />} />
                  <Route path="favorites" element={<BuyerFavorites />} />
                  <Route path="order-finish" element={<BuyerOrderFinish />} />
                  <Route path="purchases" element={<BuyerPurchases />} />
                  <Route
                    path="transactions"
                    element={<Navigate to="../purchases?tab=transactions" replace />}
                  />
                  <Route path="certificate/:orderItemId" element={<BuyerCertificateView />} />
                  <Route path="messages" element={<BuyerMessage />} />
                  <Route path="notifications" element={<BuyerNotifications />} />
                  <Route
                    path="message"
                    element={<Navigate to="../messages" replace />}
                  />

                  {/* Account Center */}
                  <Route path="profile" element={<ProfileLayout />}>
                    <Route index element={<BuyerAccountOverview />} />
                    <Route path="details" element={<BuyerProfile />} />
                    <Route path="addresses" element={<BuyerAddress />} />
                    <Route path="messages" element={<BuyerMessage embedded />} />
                    <Route path="orders" element={<BuyerOrder />} />
                    <Route path="orders/:id" element={<BuyerOrderDetail />} />
                    <Route path="orders/view/:id" element={<BuyerOrderDetail />} />
                    <Route path="purchases" element={<BuyerPurchases />} />
                    <Route
                      path="transactions"
                      element={<Navigate to="../purchases?tab=transactions" replace />}
                    />
                    <Route path="settings" element={<BuyerSettings />} />
                    <Route
                      path="payment-methods"
                      element={<BuyerPaymentMethods />}
                    />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="/admin">
              <Route path="login" element={<AdminLogin />} />

              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="chat-support" element={<AdminChatSupport />} />
                  <Route
                    path="system-setting"
                    element={<Navigate to="/admin/system-settings/about-us" replace />}
                  />
                  <Route
                    path="system-settings/promotion-slide"
                    element={
                      <Navigate to="/admin/event?tab=promotions" replace />
                    }
                  />
                  <Route
                    path="system-settings/about-us"
                    element={<AdminSystemSetting />}
                  />
                  <Route
                    path="system-settings/mechanicals"
                    element={<AdminMechanicals />}
                  />
                  <Route
                    path="system-settings/faq-edit"
                    element={<AdminFaqEdit />}
                  />
                  <Route
                    path="system-settings/program"
                    element={<AdminProgram />}
                  />
                  <Route
                    path="system-settings/exhibitions-calendar"
                    element={
                      <Navigate to="/admin/event?tab=calendar" replace />
                    }
                  />
                  <Route path="profile" element={<AdminProfile />} />
                  <Route
                    path="artwork"
                    element={<Navigate to="/admin/artwork/pending" replace />}
                  />
                  <Route path="artwork/verified" element={<AdminArtwork />} />
                  <Route path="artwork/pending" element={<AdminArtwork />} />
                  <Route path="manage/students" element={<AdminStudent />} />
                  <Route path="manage/customers" element={<AdminCustomer />} />
                  <Route path="manage/access" element={<AdminAccountAccess />} />
                  <Route path="manage/admins" element={<AdminControl />} />
                  <Route path="sales" element={<AdminSales />} />
                  <Route element={<AdminPayoutRoute />}>
                    <Route path="payouts" element={<AdminPayout />} />
                  </Route>
                  <Route path="event" element={<AdminEvent />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="audit-logs" element={<AdminAuditLogs />} />
                  <Route path="admin" element={<AdminControl />} />
                </Route>
              </Route>
            </Route>

            <Route path="/seller">
              <Route path="login" element={<SellerLogin />} />
              <Route path="register" element={<SellerRegister />} />

              <Route element={<SellerRoute />}>
                <Route element={<SellerLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SellerDashboard />} />
                  <Route path="artwork" element={<SellerArtwork />} />
                  <Route
                    path="storefront"
                    element={
                      <Navigate
                        to="/seller/marketing?tab=store-profile"
                        replace
                      />
                    }
                  />
                  <Route path="sales" element={<SellerSales />} />
                  <Route path="orders" element={<Navigate to="manage" replace />} />
                  <Route path="orders/manage" element={<SellerOrder />} />
                  <Route path="orders/manage/:id" element={<SellerOrderDetail />} />
                  <Route path="orders/view/:id" element={<SellerOrderDetail />} />
                  <Route path="orders/:id" element={<SellerOrderDetail />} />
                  <Route path="orders/inventory" element={<SellerInventory />} />
                  <Route path="orders/reviews" element={<SellerReviews />} />
                  <Route path="inventory" element={<SellerInventory />} />
                  <Route
                    path="marketing"
                    element={<SellerMarketing />}
                  />
                  <Route
                    path="marketing/store-profile"
                    element={
                      <Navigate
                        to="/seller/marketing?tab=store-profile"
                        replace
                      />
                    }
                  />
                  <Route path="settlement-payout" element={<SellerPayout />} />
                  <Route path="customer-service" element={<SellerMessages />} />
                  <Route path="messages" element={<SellerMessages />} />
                  <Route path="notifications" element={<SellerNotifications />} />
                  <Route path="voucher" element={<SellerVoucher />} />
                  <Route
                    path="vouchers/generation"
                    element={<Navigate to="/seller/voucher" replace />}
                  />
                  <Route
                    path="vouchers/discount-code"
                    element={<Navigate to="/seller/voucher" replace />}
                  />
                  <Route
                    path="authenticity/certificate"
                    element={<SellerCertificateOfAuthenticity />}
                  />
                  <Route
                    path="authenticity/check"
                    element={<SellerSearchCertificate />}
                  />
                  <Route
                    path="audit-logs"
                    element={<SellerAuditLogs />}
                  />
                  <Route path="profile" element={<SellerProfile />} />
                  <Route path="settings" element={<SellerSettings />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/buyer/main" replace />} />
          </Routes>
        </Suspense>
      </ThemeModeProvider>
    </HelmetProvider>
  );
}

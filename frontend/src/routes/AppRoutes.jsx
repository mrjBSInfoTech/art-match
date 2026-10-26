import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CssBaseline } from "@mui/material";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";

// Layouts
import AdminLayout from "../layouts/AdminLayout";
import SellerLayout from "../layouts/SellerLayout";
import BuyerLayout from "../layouts/BuyerLayout";
import ProfileLayout from "../components/buyer/Profile/ProfileLayout";

//Routes
import AdminRoute from "../middleware/AdminRoute";
import SellerRoute from "../middleware/SellerRoute";
import BuyerRoute from "../middleware/BuyerRoute";

// Admin Pages
import AdminDashboard from "../pages/admin/Dashboard";
import AdminSystemSetting from "../pages/admin/SystemSetting";
import AdminSystemSettingsPlaceholder from "../pages/admin/SystemSettingsPlaceholder";
import AdminProfile from "../pages/admin/Profile";
import AdminSales from "../pages/admin/Sales";
import AdminEvent from "../pages/admin/Event";
import AdminArtwork from "../pages/admin/Artwork";
import AdminSettings from "../pages/admin/Settings";
import AdminStudent from "../pages/admin/Student";
import AdminCustomer from "../pages/admin/Customer";
import AdminAccountAccess from "../pages/admin/AccountAccess";
import AdminControl from "../pages/admin/Admin";
import AdminAuditLogs from "../pages/admin/AuditLogs";
import AdminLogin from "../pages/admin/Login";

// Seller Pages
import SellerDashboard from "../pages/seller/Dashboard";
import SellerArtwork from "../pages/seller/Artwork";
import SellerStorefront from "../pages/seller/Storefront";
import SellerSales from "../pages/seller/Sales";
import SellerMessages from "../pages/seller/Messages";
import SellerNotifications from "../pages/seller/Notifications";
import SellerOrder from "../pages/seller/Order";
import SellerProfile from "../pages/seller/Profile";
import SellerSettings from "../pages/seller/Settings";
import SellerLogin from "../pages/seller/Login";
import SellerRegister from "../pages/seller/Register";
import SellerPlaceholder from "../pages/seller/SellerPlaceholder";
import SellerPayout from "../pages/seller/Payout";

// Buyer Pages
import BuyerMain from "../pages/buyer/Main";
import BuyerAddress from "../pages/buyer/Address";
import BuyerShop from "../pages/buyer/Shop";
import BuyerGallery from "../pages/buyer/Gallery";
import BuyerFavorites from "../pages/buyer/Favorites";
import BuyerArtworkDetail from "../pages/buyer/ArtworkDetail";
import BuyerArtist from "../pages/buyer/Artist";
import BuyerSellerProfile from "../pages/buyer/SellerProfile";
import BuyerAboutUs from "../pages/buyer/AboutUs";
import BuyerHelpSupport from "../pages/buyer/HelpSupport";
import BuyerProgram from "../pages/buyer/Program";
import BuyerAcademy from "../pages/buyer/Academy";
import BuyerCart from "../pages/buyer/Cart";
import BuyerCheckout from "../pages/buyer/Checkout";
import BuyerMessage from "../pages/buyer/Message";
import BuyerProfile from "../pages/buyer/Profile";
import BuyerAccountOverview from "../pages/buyer/AccountOverview";
import BuyerPaymentMethods from "../pages/buyer/PaymentMethods";
import BuyerSettings from "../pages/buyer/Settings";
import BuyerOrder from "../pages/buyer/Order";
import BuyerOrderFinish from "../pages/buyer/OrderFinish";
import BuyerNotifications from "../pages/buyer/Notifications";
import BuyerLogin from "../pages/buyer/Login";
import BuyerRegister from "../pages/buyer/Register";

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
        <Routes>
          <Route path="/" element={<Navigate to="/buyer/main" replace />} />

          <Route path="/buyer">
            <Route path="login" element={<BuyerLogin />} />
            <Route path="register" element={<BuyerRegister />} />

            {/* Public buyer pages */}
            <Route element={<BuyerLayout />}>
              <Route path="main" element={<BuyerMain />} />
              <Route path="shop" element={<BuyerShop />} />
              <Route path="shop/:genre" element={<BuyerShop />} />
              <Route path="gallery" element={<BuyerGallery />} />
              <Route path="artist" element={<BuyerArtist />} />
              <Route path="seller/:id" element={<BuyerSellerProfile />} />
              <Route path="about" element={<BuyerAboutUs />} />
              <Route path="help-support" element={<BuyerHelpSupport />} />
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
                <Route path="cart" element={<BuyerCart />} />
                <Route path="checkout" element={<BuyerCheckout />} />
                <Route path="favorites" element={<BuyerFavorites />} />
                <Route path="order-finish" element={<BuyerOrderFinish />} />
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
                <Route
                  path="system-setting"
                  element={<Navigate to="/admin/system-settings/about-us" replace />}
                />
                <Route
                  path="system-settings/promotion-slide"
                  element={<AdminSystemSettingsPlaceholder title="Promotion Slide" />}
                />
                <Route
                  path="system-settings/about-us"
                  element={<AdminSystemSetting />}
                />
                <Route
                  path="system-settings/mechanicals"
                  element={<AdminSystemSettingsPlaceholder title="Mechanicals" />}
                />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="artwork" element={<AdminArtwork />} />
                <Route path="manage/students" element={<AdminStudent />} />
                <Route path="manage/customers" element={<AdminCustomer />} />
                <Route path="manage/access" element={<AdminAccountAccess />} />
                <Route path="manage/admins" element={<AdminControl />} />
                <Route path="sales" element={<AdminSales />} />
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
                <Route path="storefront" element={<SellerStorefront />} />
                <Route path="sales" element={<SellerSales />} />
                <Route path="orders" element={<Navigate to="manage" replace />} />
                <Route path="orders/manage" element={<SellerOrder />} />
                <Route
                  path="orders/inventory"
                  element={<SellerPlaceholder title="Store Inventory" />}
                />
                <Route
                  path="marketing"
                  element={<SellerPlaceholder title="Marketing" />}
                />
                <Route path="settlement-payout" element={<SellerPayout />} />
                <Route path="customer-service" element={<SellerMessages />} />
                <Route path="messages" element={<SellerMessages />} />
                <Route path="notifications" element={<SellerNotifications />} />
                <Route
                  path="vouchers/generation"
                  element={<SellerPlaceholder title="Voucher Generation" />}
                />
                <Route
                  path="vouchers/discount-code"
                  element={<SellerPlaceholder title="Discount Code" />}
                />
                <Route
                  path="vouchers/promotion"
                  element={<SellerPlaceholder title="Promotion" />}
                />
                <Route
                  path="audit-logs"
                  element={<SellerPlaceholder title="Audit Logs" />}
                />
                <Route path="profile" element={<SellerProfile />} />
                <Route path="settings" element={<SellerSettings />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/buyer/main" replace />} />
        </Routes>
      </ThemeModeProvider>
    </HelmetProvider>
  );
}

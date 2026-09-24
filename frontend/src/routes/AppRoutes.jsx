import { Routes, Route, Navigate } from "react-router-dom";
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
import AdminProfile from "../pages/admin/Profile";
import AdminSales from "../pages/admin/Sales";
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
import SellerOrder from "../pages/seller/Order";
import SellerProfile from "../pages/seller/Profile";
import SellerSettings from "../pages/seller/Settings";
import SellerLogin from "../pages/seller/Login";
import SellerRegister from "../pages/seller/Register";

// Buyer Pages
import BuyerMain from "../pages/buyer/Main";
import BuyerAddress from "../pages/buyer/Address";
import BuyerArtwork from "../pages/buyer/Artwork";
import BuyerArtworkDetail from "../pages/buyer/ArtworkDetail";
import BuyerArtist from "../pages/buyer/Artist";
import BuyerAboutUs from "../pages/buyer/AboutUs";
import BuyerHelpSupport from "../pages/buyer/HelpSupport";
import BuyerProgram from "../pages/buyer/Program";
import BuyerAcademy from "../pages/buyer/Academy";
import BuyerCart from "../pages/buyer/Cart";
import BuyerCheckout from "../pages/buyer/Checkout";
import BuyerMessage from "../pages/buyer/Message";
import BuyerProfile from "../pages/buyer/Profile";
import BuyerSettings from "../pages/buyer/Settings";
import BuyerOrder from "../pages/buyer/Order";
import BuyerLogin from "../pages/buyer/Login";
import BuyerRegister from "../pages/buyer/Register";

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
              <Route path="artwork" element={<BuyerArtwork />} />
              <Route path="artist" element={<BuyerArtist />} />
              <Route path="artist/:id" element={<BuyerArtist />} />
              <Route path="about" element={<BuyerAboutUs />} />
              <Route path="help-support" element={<BuyerHelpSupport />} />
              <Route path="programs/:program" element={<BuyerProgram />} />
              <Route path="academy/:section" element={<BuyerAcademy />} />
              <Route path="artwork/view/:id" element={<BuyerArtworkDetail />} />
              <Route path="artwork/:genre" element={<BuyerArtwork />} />
            </Route>

            {/* Protected buyer pages */}
            <Route element={<BuyerRoute />}>
              <Route element={<BuyerLayout />}>
                <Route path="cart" element={<BuyerCart />} />
                <Route path="checkout" element={<BuyerCheckout />} />
                <Route path="messages" element={<BuyerMessage />} />
                <Route
                  path="message"
                  element={<Navigate to="../messages" replace />}
                />

                {/* Account Center */}
                <Route path="profile" element={<ProfileLayout />}>
                  <Route index element={<BuyerProfile />} />
                  <Route path="addresses" element={<BuyerAddress />} />
                  <Route path="orders" element={<BuyerOrder />} />
                  <Route path="settings" element={<BuyerSettings />} />
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
                <Route path="profile" element={<AdminProfile />} />
                <Route path="artwork" element={<AdminArtwork />} />
                <Route path="manage/students" element={<AdminStudent />} />
                <Route path="manage/customers" element={<AdminCustomer />} />
                <Route path="manage/access" element={<AdminAccountAccess />} />
                <Route path="manage/admins" element={<AdminControl />} />
                <Route path="sales" element={<AdminSales />} />
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
                <Route path="orders" element={<SellerOrder />} />
                <Route path="messages" element={<SellerMessages />} />
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

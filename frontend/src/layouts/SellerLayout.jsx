import * as React from "react";
import { useState, useEffect } from "react";
import { AppProvider } from "@toolpad/core";
import Backdrop from "@mui/material/Backdrop";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import {
  DashboardLayout as MuiDashboardLayout,
  DashboardSidebarPageItem,
} from "@toolpad/core";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Slide from "@mui/material/Slide";
import { clearAuthData } from "../../utils/auth";
import { recordLogout } from "../api/seller/sellerAuthenticationAPI";
import {
  fetchSellerConversations,
  fetchSellerNotifications,
  markSellerNotificationsRead,
} from "../api/seller/messageAPI";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Stack,
  useMediaQuery,
  Avatar,
  Typography,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Nexus from "../assets/Nexus.png";
import SidebarNavigationHeader from "./SidebarNavigationHeader";

//Icons
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SettingsIcon from "@mui/icons-material/Settings";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import HistoryIcon from "@mui/icons-material/History";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CloseIcon from "@mui/icons-material/Close";
import {
  ThemeModeProvider,
  useThemeMode,
} from "../theme/ThemeModeProvider";

const SELLER_SIDEBAR_PREFERENCES = {
  orders: "seller_sidebar_orders_expanded",
  vouchers: "seller_sidebar_vouchers_expanded",
  authenticity: "seller_sidebar_authenticity_expanded",
};

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

function SellerLayoutContent() {
  const { theme } = useThemeMode();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileImage, setProfileImage] = useState("");

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(
    () => localStorage.getItem(SELLER_SIDEBAR_PREFERENCES.orders) === "true",
  );
  const [vouchersExpanded, setVouchersExpanded] = useState(
    () => localStorage.getItem(SELLER_SIDEBAR_PREFERENCES.vouchers) === "true",
  );
  const [authenticityExpanded, setAuthenticityExpanded] = useState(
    () => localStorage.getItem(SELLER_SIDEBAR_PREFERENCES.authenticity) === "true",
  );
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const toggleSidebarGroup = (preferenceKey, setExpanded) => {
    setExpanded((expanded) => {
      const nextExpanded = !expanded;
      localStorage.setItem(preferenceKey, String(nextExpanded));
      return nextExpanded;
    });
  };

  useEffect(() => {
    const loadSellerProfile = () => {
      setFirstName(localStorage.getItem("seller_first_name") || "");
      setLastName(localStorage.getItem("seller_last_name") || "");
      setProfileImage(localStorage.getItem("seller_profile_image") || "");
    };

    loadSellerProfile();
    window.addEventListener("seller-profile-updated", loadSellerProfile);
    return () =>
      window.removeEventListener("seller-profile-updated", loadSellerProfile);
  }, []);

  useEffect(() => {
    const loadBadgeCounts = async () => {
      if (!localStorage.getItem("seller_token")) {
        setNotifications([]);
        setUnreadMessageCount(0);
        return;
      }

      const [conversations, accountNotifications] = await Promise.all([
        fetchSellerConversations().catch(() => null),
        fetchSellerNotifications().catch(() => null),
      ]);
      if (conversations) {
        setUnreadMessageCount(
          conversations.reduce(
            (total, conversation) => total + Number(conversation.unread_count || 0),
            0,
          ),
        );
      }
      if (accountNotifications) setNotifications(accountNotifications);
    };

    loadBadgeCounts();
    const intervalId = window.setInterval(loadBadgeCounts, 5000);
    return () => window.clearInterval(intervalId);
  }, [location.pathname]);

  // Simulated router (for Toolpad)
  const router = {
    pathname: location.pathname.replace(/^\/seller/, "") || "/",
    navigate: (path) => {
      const targetPath = path.startsWith("/seller/")
        ? path
        : `/seller/${path.replace(/^\/+/, "")}`;
      navigate(targetPath);
    },
  };

  const handleNotificationClick = async () => {
    setNotificationDrawerOpen(true);
    setProfileDrawerOpen(false);
    try {
      await markSellerNotificationsRead();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: 1 })),
      );
    } catch (error) {
      console.error("Unable to mark seller notifications read:", error);
    }
  };

  const handleProfileClick = () => {
    setNotificationDrawerOpen(false);
    setProfileDrawerOpen(true);
  };

  const handleLogout = async () => {
    setOpen(false);
    await recordLogout();
    clearAuthData("seller");

    setTimeout(() => {
      navigate("/seller/login", { replace: true });

      // Clear browser history for extra security
      window.history.pushState(null, null, window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, null, window.location.href);
      };
    }, 150);
  };

  // Sidebar menu items
  const navigation = [
    {
      kind: "header",
      title: "Navigation",
    },
    {
      segment: "dashboard",
      title: "Dashboard",
      icon: <DashboardIcon />,
      pattern: "/seller/dashboard",
    },
    {
      segment: "artwork",
      title: "Post Artwork",
      icon: <PaletteOutlinedIcon />,
      pattern: "/seller/artwork",
    },
    {
      segment: "orders",
      title: "Orders",
      icon: <ShoppingCartIcon />,
      children: [
        {
          segment: "manage",
          title: "Manage Orders",
          icon: <ShoppingCartIcon />,
          pattern: "/seller/orders/manage",
        },
        {
          segment: "inventory",
          title: "Store Inventory",
          icon: <Inventory2OutlinedIcon />,
          pattern: "/seller/orders/inventory",
        },
      ],
    },
    {
      segment: "marketing",
      title: "Marketing",
      icon: <CampaignOutlinedIcon />,
      pattern: "/seller/marketing",
    },
    {
      segment: "settlement-payout",
      title: "Settlement and Payout",
      icon: <AccountBalanceWalletOutlinedIcon />,
      pattern: "/seller/settlement-payout",
    },
    {
      segment: "messages",
      title: "Chat",
      icon: (
        <Badge
          badgeContent={unreadMessageCount}
          color="error"
          invisible={unreadMessageCount === 0}
          max={99}
        >
          <ChatBubbleOutlineIcon />
        </Badge>
      ),
      pattern: "/seller/messages",
    },
    {
      segment: "customer-service",
      title: "Customer Service",
      icon: (
        <Badge
          badgeContent={unreadMessageCount}
          color="error"
          invisible={unreadMessageCount === 0}
          max={99}
        >
          <SupportAgentOutlinedIcon />
        </Badge>
      ),
      pattern: "/seller/customer-service",
    },
    {
      segment: "vouchers",
      title: "Voucher and Promotion",
      icon: <ConfirmationNumberOutlinedIcon />,
      children: [
        {
          segment: "generation",
          title: "Voucher Generation",
          icon: <ConfirmationNumberOutlinedIcon />,
          pattern: "/seller/vouchers/generation",
        },
        {
          segment: "discount-code",
          title: "Discount Code",
          icon: <ConfirmationNumberOutlinedIcon />,
          pattern: "/seller/vouchers/discount-code",
        },
        {
          segment: "promotion",
          title: "Promotion",
          icon: <ConfirmationNumberOutlinedIcon />,
          pattern: "/seller/vouchers/promotion",
        },
      ],
    },
    {
      segment: "authenticity",
      title: "Authenticity",
      icon: <VerifiedOutlinedIcon />,
      children: [
        {
          segment: "certificate",
          title: "Certificate of Authenticity",
          icon: <VerifiedOutlinedIcon />,
          pattern: "/seller/authenticity/certificate",
        },
        {
          segment: "check",
          title: "Check Art Authenticity",
          icon: <SearchOutlinedIcon />,
          pattern: "/seller/authenticity/check",
        },
      ],
    },
    {
      segment: "audit-logs",
      title: "Audit Logs",
      icon: <HistoryIcon />,
      pattern: "/seller/audit-logs",
    },
  ];

  const branding = {
    logo: (
      <Box
        component="img"
        src={Nexus}
        alt=""
        sx={{
          width: { xs: 24, sm: 30 },
          height: { xs: 32, sm: 40 },
          objectFit: "contain",
        }}
      />
    ),
    title: (
      <Typography component="span" noWrap sx={{ color: "text.primary", fontWeight: 700, fontSize: { xs: 16, sm: 20, lg: 22 } }}>
        Red <Box component="span" sx={{ color: "#ff0000" }}>Nexus</Box>
      </Typography>
    ),
    homeUrl: "/seller/dashboard",
  };

  // Custom header matching the admin layout
  const CustomHeader = () => (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      sx={{ gap: { xs: 0.5, sm: 1 }, flexShrink: 0, minWidth: 0 }}
    >
      <IconButton
        onClick={handleNotificationClick}
        aria-label="Open notifications"
        sx={{ color: "text.secondary", width: 40, height: 40, flexShrink: 0 }}
      >
        <Badge
          badgeContent={notifications.filter((notification) => !Number(notification.is_read)).length}
          color="error"
          invisible={!notifications.some((notification) => !Number(notification.is_read))}
          max={99}
        >
          <NotificationsNoneIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ display: { xs: "none", sm: "block" }, height: 32, my: "auto" }}
      />

      <Button
        onClick={handleProfileClick}
        aria-label="Open seller profile"
        aria-haspopup="dialog"
        aria-expanded={profileDrawerOpen}
        sx={{
          minWidth: 40, height: 40, flexShrink: 0, gap: 1,
          borderRadius: 6, px: { xs: 0.5, sm: 1.5 }, py: 0.5,
          color: "text.primary", bgcolor: "action.hover",
          "&:hover": { bgcolor: "action.selected" },
        }}
      >
        <Typography variant="body2" noWrap sx={{ display: { xs: "none", sm: "block" }, fontWeight: 600, maxWidth: { sm: 96, lg: 140 } }}>
          {firstName || "Seller"}
        </Typography>
        <Avatar
          src={
            profileImage
              ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(profileImage)}`
              : "http://localhost:5000/uploads/seller/profile.jpg"
          }
          alt={firstName || "Seller"}
          sx={{ width: 32, height: 32, bgcolor: "#232b38" }}
        >
          {firstName ? firstName.charAt(0).toUpperCase() : "S"}
        </Avatar>
      </Button>
    </Stack>
  );

  return (
    <AppProvider
      navigation={navigation}
      branding={branding}
      router={router}
      session={{
        user: {
          name: `${firstName} ${lastName}`,
          position: "Seller",
        },
      }}
      theme={theme}
    >
      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        keepMounted
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>Log out</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to log out?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="text.secondary">
            Cancel
          </Button>
          <Button
            onClick={handleLogout}
            variant="contained"
            color="error"
            sx={{ color: "#fff" }}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>
      <Drawer
        anchor="right"
        variant="temporary"
        sx={{ zIndex: theme.zIndex.modal }}
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.drawer,
              backgroundImage: "none",
              color: theme.palette.text.primary,
            },
          },
        }}
      >
        <Stack sx={{ height: "100%", minHeight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Seller profile</Typography>
            <IconButton onClick={() => setProfileDrawerOpen(false)} aria-label="Close seller profile"><CloseIcon /></IconButton>
          </Stack>
          <Divider />
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ p: 2 }}
          >
            <Avatar
              src={
                profileImage
                  ? `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(profileImage)}`
                  : "http://localhost:5000/uploads/seller/profile.jpg"
              }
              alt={firstName || "Seller"}
              sx={{ width: 48, height: 48, bgcolor: "#f6f6f6" }}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : "S"}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                {firstName} {lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Seller
              </Typography>
            </Stack>
          </Stack>
          <Divider />
          <List>
            <ListItemButton
              onClick={() => {
                setProfileDrawerOpen(false);
                navigate("/seller/profile");
              }}
            >
              <ListItemIcon>
                <AccountCircleIcon />
              </ListItemIcon>
              <ListItemText primary="Profile" />
            </ListItemButton>
            <ListItemButton
              onClick={() => {
                setProfileDrawerOpen(false);
                navigate("/seller/settings");
              }}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              onClick={() => {
                setProfileDrawerOpen(false);
                handleOpen();
              }}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon sx={{ color: "inherit" }}>
                <ExitToAppIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Stack>
      </Drawer>
      <Drawer
        anchor="right"
        variant="temporary"
        sx={{ zIndex: theme.zIndex.modal }}
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.drawer,
              backgroundImage: "none",
              color: theme.palette.text.primary,
            },
          },
        }}
      >
        <Stack sx={{ height: "100%", minHeight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Notifications</Typography>
            <IconButton onClick={() => setNotificationDrawerOpen(false)} aria-label="Close notifications"><CloseIcon /></IconButton>
          </Stack>
          <Divider />
          {notifications.length ? (
            <List sx={{ overflowY: "auto", p: 0, minHeight: 0, flex: 1, overflowWrap: "anywhere" }}>
              {notifications.map((notification) => (
                <ListItemButton key={notification.notification_id}>
                  <ListItemText
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: Number(notification.is_read) ? 400 : 700,
                    }}
                    primary={notification.message}
                    secondary={[
                      notification.notification_type === "artwork_status"
                        ? "Artwork review"
                        : null,
                      new Date(notification.created_at).toLocaleString(),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1, p: 3 }}
            >
              <NotificationsNoneIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
              />
              <Typography color="text.secondary">No new notifications</Typography>
            </Stack>
          )}
          <Button sx={{ m: 2, flexShrink: 0 }} onClick={() => {
            setNotificationDrawerOpen(false);
            navigate("/seller/notifications");
          }}>View all notifications</Button>
        </Stack>
      </Drawer>
      <MuiDashboardLayout
        sidebarExpandedWidth={240}
        disableCollapsibleSidebar={!isDesktop}
        slotProps={{ header: { branding } }}
        renderPageItem={(item) => {
          if (item.segment === "orders") {
            return (
              <DashboardSidebarPageItem
                item={item}
                expanded={ordersExpanded}
                onClick={() =>
                  toggleSidebarGroup(
                    SELLER_SIDEBAR_PREFERENCES.orders,
                    setOrdersExpanded,
                  )
                }
              />
            );
          }
          if (item.segment === "vouchers") {
            return (
              <DashboardSidebarPageItem
                item={item}
                expanded={vouchersExpanded}
                onClick={() =>
                  toggleSidebarGroup(
                    SELLER_SIDEBAR_PREFERENCES.vouchers,
                    setVouchersExpanded,
                  )
                }
              />
            );
          }
          if (item.segment === "authenticity") {
            return (
              <DashboardSidebarPageItem
                item={item}
                expanded={authenticityExpanded}
                onClick={() =>
                  toggleSidebarGroup(
                    SELLER_SIDEBAR_PREFERENCES.authenticity,
                    setAuthenticityExpanded,
                  )
                }
              />
            );
          }
          return <DashboardSidebarPageItem item={item} />;
        }}
        slots={{
          header: SidebarNavigationHeader,
          toolbarActions: CustomHeader,
        }}
        sx={{
          backgroundColor: theme.palette.background.default,
          width: "100%", maxWidth: "100%", height: "100dvh", minWidth: 0,
          "& main": { minWidth: 0, minHeight: 0 },
          "& .MuiDrawer-paper": {
            backgroundColor: "#a3181f",
            color: "#ffffff",
            border: "none",
            overflow: "hidden",
          },
          "& .MuiDrawer-paper.MuiDrawer-paperAnchorLeft": {
            borderTopRightRadius: "24px !important",
            overflow: "hidden",
          },
          "& .MuiAppBar-root .MuiIconButton-root": {
            color: "#6b7280",
          },
          "& .MuiAppBar-root .MuiSvgIcon-root": {
            color: "#6b7280",
          },
          "& .MuiDrawer-paper .MuiPaper-root": {
            backgroundColor: "#a3181f",
          },
          "& .MuiDrawer-paper .MuiListSubheader-root": {
            backgroundColor: "#a3181f",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 0,
            height: 56,
            lineHeight: "56px",
            paddingLeft: "24px",
            fontFamily: "inherit",
          },
          "& .MuiDrawer-paper .Mui-selected .MuiListItemText-primary": {
            color: "#a3181f",
            fontWeight: 600,
          },
          "& .MuiDrawer-paper .Mui-selected .MuiTypography-caption": {
            color: "#a3181f",
          },
          "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
            color: "#a3181f",
          },
          "& .MuiDrawer-paper .MuiSvgIcon-root": {
            color: "#ffffff",
          },
          "& .MuiListItemButton-root:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
          },
          "& .MuiDrawer-paper .MuiListItemButton-root": {
            borderRadius: "9px",
          },
          "& .MuiDrawer-paper .Mui-selected": {
            backgroundColor: "#ffffff !important",
          },
          "& .MuiDrawer-paper .MuiListItemText-primary": {
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.25,
            fontFamily: "inherit",
          },
          // Toolpad adds caption labels only in mini mode.
          "& .MuiDrawer-paper:has(.MuiTypography-caption)": {
            "& .MuiListSubheader-root": {
              visibility: "hidden",
              paddingLeft: 0,
            },
            "& .MuiTypography-caption": {
              display: "none",
            },
            "& .MuiListItemButton-root": {
              justifyContent: "center",
              height: 52,
              minHeight: 52,
              margin: "3px 0",
            },
            "& .MuiListItemIcon-root": {
              minWidth: 0,
            },
          },
          // Header
          "& .MuiAppBar-root": {
            backgroundColor: theme.palette.background.header,
            boxShadow: "none",
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          "& .MuiAppBar-root .MuiToolbar-root": {
            borderBottom: "none",
          },

          "& .MuiListItemButton-root": {
            marginTop: "5px",
            marginBottom: "5px",
          },
        }}
      >
        <Box
          sx={{
            p: { xs: 1, sm: 2, md: 2.5, lg: 3 },
            width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", flex: 1,
            display: "flex", flexDirection: "column", gap: { xs: 1.5, sm: 2, lg: 3 },
            "& > *": { minWidth: 0, maxWidth: "100%" },
          }}
        >
          <Outlet />
        </Box>
      </MuiDashboardLayout>
    </AppProvider>
  );
}

export default function SellerLayout() {
  return (
    <ThemeModeProvider storageKey="artmatch-ui-theme-seller">
      <SellerLayoutContent />
    </ThemeModeProvider>
  );
}

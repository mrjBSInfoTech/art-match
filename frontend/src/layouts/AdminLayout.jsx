import * as React from "react";
import { useState, useEffect } from "react";
import { AppProvider } from "@toolpad/core";
import Backdrop from "@mui/material/Backdrop";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import {
  DashboardLayout as MuiDashboardLayout,
  DashboardSidebarPageItem,
} from "@toolpad/core";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Drawer from "@mui/material/Drawer";
import Slide from "@mui/material/Slide";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  Stack,
  Avatar,
  Typography,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from "@mui/material";
import Nexus from "../assets/Nexus.png";
import SidebarNavigationHeader from "./SidebarNavigationHeader";
import { clearAuthData } from "../../utils/auth";
import { recordLogout } from "../api/admin/adminAuthenticationAPI";
import PasswordWarning from "../components/admin/Dashboard/PasswordWarning";
//Icons
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PaletteIcon from "@mui/icons-material/Palette";
import SettingsIcon from "@mui/icons-material/Settings";
import SlideshowRoundedIcon from "@mui/icons-material/SlideshowRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import CloseIcon from "@mui/icons-material/Close";
import KeyIcon from "@mui/icons-material/Key";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import HistoryIcon from "@mui/icons-material/History";
import GavelIcon from "@mui/icons-material/Gavel";
import EventIcon from '@mui/icons-material/Event';
import { alpha } from "@mui/material/styles";
import {
  ThemeModeProvider,
  useThemeMode,
} from "../theme/ThemeModeProvider";

const ADMIN_SIDEBAR_PREFERENCES = {
  manageUsers: "admin_sidebar_manage_users_expanded",
  systemSettings: "admin_sidebar_system_settings_expanded",
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

function AdminLayoutContent() {
  //Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState("");
  const [canAdd, setCanAdd] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [openPasswordWarning, setOpenPasswordWarning] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [manageUsersExpanded, setManageUsersExpanded] = useState(
    () => localStorage.getItem(ADMIN_SIDEBAR_PREFERENCES.manageUsers) === "true",
  );
  const [systemSettingsExpanded, setSystemSettingsExpanded] = useState(
    () => localStorage.getItem(ADMIN_SIDEBAR_PREFERENCES.systemSettings) === "true",
  );

  const toggleSidebarGroup = (preferenceKey, setExpanded) => {
    setExpanded((expanded) => {
      const nextExpanded = !expanded;
      localStorage.setItem(preferenceKey, String(nextExpanded));
      return nextExpanded;
    });
  };

  useEffect(() => {
    const loadAdminProfile = () => {
      const storedFirstName = localStorage.getItem("admin_first_name");
      const storedLastName = localStorage.getItem("admin_last_name");
      const storedImage = localStorage.getItem("admin_image");
      const storedCanAdd = localStorage.getItem("admin_can_add");
      const storedCanEdit = localStorage.getItem("admin_can_edit");

      setFirstName(storedFirstName || "");
      setLastName(storedLastName || "");
      setImage(storedImage || "");
      setCanAdd(storedCanAdd === "1");
      setCanEdit(storedCanEdit === "1");
    };

    loadAdminProfile();
    window.addEventListener("storage", loadAdminProfile);

    return () => {
      window.removeEventListener("storage", loadAdminProfile);
    };
  }, []);

  useEffect(() => {
    const checkPasswordWarning = () => {
      const passwordChanged = localStorage.getItem("admin_password_changed");
      setOpenPasswordWarning(
        location.pathname.replace(/\/+$/, "") !== "/admin/settings" &&
          (passwordChanged === "0" || passwordChanged === "false"),
      );
    };

    checkPasswordWarning();
    window.addEventListener("storage", checkPasswordWarning);
    window.addEventListener("admin-password-changed", checkPasswordWarning);

    return () => {
      window.removeEventListener("storage", checkPasswordWarning);
      window.removeEventListener("admin-password-changed", checkPasswordWarning);
    };
  }, [location.pathname]);

  // Simulated router (for Toolpad)
  const router = {
    pathname: location.pathname.replace(/^\/admin/, "") || "/",
    navigate: (path) => {
      const targetPath = path.startsWith("/admin/")
        ? path
        : `/admin/${path.replace(/^\/+/, "")}`;
      navigate(targetPath);
    },
  };

  const handleNotificationClick = () => {
    setNotificationDrawerOpen(true);
    setProfileDrawerOpen(false);
  };

  const handleProfileClick = () => {
    setNotificationDrawerOpen(false);
    setProfileDrawerOpen(true);
  };

  const handleLogout = async () => {
    setOpen(false);
    await recordLogout();
    clearAuthData("admin");

    setTimeout(() => {
      navigate("/admin/login", { replace: true });

      // Clear browser history for extra security
      window.history.pushState(null, null, window.location.href);
      window.onpopstate = function () {
        window.history.pushState(null, null, window.location.href);
      };
    }, 150);
  };

  // Check if user has permissions to manage admins (can add or edit)
  const canManageAdmins = canAdd || canEdit;

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
    },
    {
      segment: "chat-support",
      title: "Chat Support",
      icon: <SupportAgentRoundedIcon />,
    },
    {
      segment: "system-settings",
      title: "System Settings",
      icon: <SettingsIcon />,
      children: [
        {
          segment: "promotion-slide",
          title: "Promotion Slides",
          icon: <SlideshowRoundedIcon />,
        },
        {
          segment: "about-us",
          title: "About Us",
          icon: <InfoOutlinedIcon />,
        },
        {
          segment: "mechanicals",
          title: "Mechanicals",
          icon: <ConstructionRoundedIcon />,
        },
        {
          segment: "faq-edit",
          title: "FAQ Edit",
          icon: <HelpOutlineRoundedIcon />,
        },
      ],
    },
    {
      segment: "sales",
      title: "Sales",
      icon: <TrendingUpIcon />,
    },
    {
      segment: "payouts",
      title: "Seller Payouts",
      icon: <AccountBalanceWalletOutlinedIcon />,
    },
    {
      segment: "event",
      title: "Event",
      icon: <EventIcon />,
    },
    {
      segment: "artwork",
      title: "Art Verification",
      icon: <PaletteIcon />,
    },
    {
      segment: "manage",
      title: "Manage Users",
      icon: <VerifiedRoundedIcon />,
      children: [
        ...(canManageAdmins
          ? [
              {
                segment: "admins",
                title: "Admins",
                icon: <KeyIcon />,
              },
            ]
          : []),
        {
          segment: "students",
          title: "Students",
          icon: <SchoolOutlinedIcon />,
        },
        {
          segment: "customers",
          title: "Customers",
          icon: <VerifiedUserRoundedIcon />,
        },
        {
          segment: "access",
          title: "Strikes & Bans",
          icon: <GavelIcon />,
        },
      ],
    },
    {
      segment: "audit-logs",
      title: "System Audit Logs",
      icon: <HistoryIcon />,
    },
  ];

  const branding = {
    logo: (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
          "& img": {
            width: { xs: 24, sm: 30 },
            height: { xs: 32, sm: 40 },
            objectFit: "contain",
            display: "block",
          },
        }}
      >
        <img src={Nexus} alt="Red Nexus logo" />
      </Box>
    ),
    title: (
      <Typography
        sx={{
          color: "text.primary",
          fontWeight: "bold",
          fontSize: { xs: 16, sm: 20, lg: 22 },
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        Red <span style={{ color: "#ff0000" }}>Nexus</span>
      </Typography>
    ),
    homeUrl: "/admin/dashboard",
  };

  const { theme } = useThemeMode();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const CustomHeader = () => (
    <Stack
      direction="row"
      alignItems="center"
      spacing={{ xs: 0.5, sm: 1 }}
      sx={{ minWidth: 0, flexShrink: 0 }}
    >
      <IconButton
        onClick={handleNotificationClick}
        aria-label="Open notifications"
        sx={{ color: "text.secondary", width: 40, height: 40 }}
      >
        <NotificationsNoneIcon sx={{ fontSize: 22 }} />
      </IconButton>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ display: { xs: "none", sm: "block" }, height: 32, my: "auto" }}
      />

      <Button
        onClick={handleProfileClick}
        aria-label={`Open profile menu for ${firstName || "Admin"}`}
        aria-haspopup="dialog"
        aria-expanded={profileDrawerOpen}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          minWidth: 40,
          maxWidth: { xs: 40, sm: 164, lg: 208 },
          color: "text.primary",
          backgroundColor: alpha(theme.palette.text.primary, 0.05),
          borderRadius: "24px",
          px: { xs: 0.5, sm: 1.5 },
          py: 0.5,
          transition: "background-color 0.2s",
          "&:hover": { backgroundColor: alpha(theme.palette.text.primary, 0.1) },
        }}
      >
        <Typography
          variant="body2"
          noWrap
          sx={{
            display: { xs: "none", sm: "block" },
            minWidth: 0,
            maxWidth: { sm: 96, lg: 140 },
            fontWeight: 600,
          }}
        >
          {firstName || "Admin"}
        </Typography>
        <Avatar
          src={
            image
              ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(image)}`
              : undefined
          }
          alt={firstName}
          sx={{
            width: 32,
            height: 32,
            bgcolor: "#232b38",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {firstName ? firstName.charAt(0).toUpperCase() : "A"}
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
          position: "Administrator",
        },
      }}
      theme={theme}
    >
      <PasswordWarning
        open={openPasswordWarning}
        handleClose={() => setOpenPasswordWarning(false)}
        navigate={navigate}
      />
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
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        sx={{ zIndex: theme.zIndex.modal }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-label": "Admin profile menu",
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.drawer,
              backgroundImage: "none",
              color: theme.palette.text.primary,
            },
          },
        }}
      >
        <Stack sx={{ minHeight: "100%", pt: "env(safe-area-inset-top)" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1 }}
          >
            <Typography component="h2" variant="h6">
              Profile
            </Typography>
            <IconButton
              onClick={() => setProfileDrawerOpen(false)}
              aria-label="Close profile menu"
            >
              <CloseIcon />
            </IconButton>
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
                image
                  ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(image)}`
                  : "http://localhost:5000/uploads/profile.jpg"
              }
              alt={firstName}
              sx={{ width: 48, height: 48, flexShrink: 0, bgcolor: "#f6f6f6" }}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : "A"}
            </Avatar>
            <Stack sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                {firstName} {lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administrator
              </Typography>
            </Stack>
          </Stack>
          <Divider />
          <List>
            <ListItemButton
              onClick={() => {
                setProfileDrawerOpen(false);
                navigate("/admin/profile");
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
                navigate("/admin/settings");
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
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        sx={{ zIndex: theme.zIndex.modal }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-label": "Admin notifications",
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.drawer,
              backgroundImage: "none",
              color: theme.palette.text.primary,
            },
          },
        }}
      >
        <Stack sx={{ minHeight: "100%", pt: "env(safe-area-inset-top)" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1 }}
          >
            <Typography component="h2" variant="h6">
              Notifications
            </Typography>
            <IconButton
              onClick={() => setNotificationDrawerOpen(false)}
              aria-label="Close notifications"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <Divider />
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
        </Stack>
      </Drawer>
      <MuiDashboardLayout
        sidebarExpandedWidth={240}
        disableCollapsibleSidebar={!isDesktop}
        slots={{
          header: SidebarNavigationHeader,
          toolbarActions: CustomHeader,
        }}
        slotProps={{ header: { branding } }}
        renderPageItem={(item) => {
          if (item.segment === "system-settings") {
            return (
              <DashboardSidebarPageItem
                item={item}
                expanded={systemSettingsExpanded}
                onClick={() =>
                  toggleSidebarGroup(
                    ADMIN_SIDEBAR_PREFERENCES.systemSettings,
                    setSystemSettingsExpanded,
                  )
                }
              />
            );
          }

          if (item.segment !== "manage") {
            return <DashboardSidebarPageItem item={item} />;
          }

          return (
            <DashboardSidebarPageItem
              item={item}
              expanded={manageUsersExpanded}
              onClick={() =>
                toggleSidebarGroup(
                  ADMIN_SIDEBAR_PREFERENCES.manageUsers,
                  setManageUsersExpanded,
                )
              }
            />
          );
        }}
        sx={{
          width: "100%",
          maxWidth: "100%",
          height: "100dvh",
          minHeight: 0,
          backgroundColor: theme.palette.background.default,
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
            paddingLeft: "20px",
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
          "& main": {
            minWidth: 0,
            minHeight: 0,
            overscrollBehavior: "contain",
          },

          "& .MuiListItemButton-root": {
            marginTop: "5px",
            marginBottom: "5px",
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.5, sm: 2, lg: 3 },
            p: { xs: 1, sm: 2, md: 2.5, lg: 3 },
            "& > *": { minWidth: 0, maxWidth: "100%" },
          }}
        >
          <Outlet />
        </Box>
      </MuiDashboardLayout>
    </AppProvider>
  );
}

export default function AdminLayout() {
  return (
    <ThemeModeProvider storageKey="artmatch-ui-theme-admin">
      <AdminLayoutContent />
    </ThemeModeProvider>
  );
}

import * as React from "react";
import { useState, useEffect } from "react";
import { AppProvider } from "@toolpad/core";
import Backdrop from "@mui/material/Backdrop";
import Badge from "@mui/material/Badge";
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
import Fade from "@mui/material/Fade";
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
} from "@mui/material";
import Nexus from "../assets/Nexus.png";
import { clearAuthData } from "../../utils/auth";
import { recordLogout } from "../api/admin/adminAuthenticationAPI";
//Icons
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PaletteIcon from "@mui/icons-material/Palette";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import KeyIcon from "@mui/icons-material/Key";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import HistoryIcon from "@mui/icons-material/History";
import GavelIcon from "@mui/icons-material/Gavel";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { alpha } from "@mui/material/styles";
import { useThemeMode } from "../theme/ThemeModeProvider";

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

export default function AdminLayout({ children }) {
  //Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [role, setRole] = useState("");
  const [canAdd, setCanAdd] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canPromote, setCanPromote] = useState(false);
  const [canDemote, setCanDemote] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [manageUsersExpanded, setManageUsersExpanded] = useState(true);

  useEffect(() => {
    const loadAdminProfile = () => {
      const storedUsername = localStorage.getItem("admin_username");
      const storedFirstName = localStorage.getItem("admin_first_name");
      const storedLastName = localStorage.getItem("admin_last_name");
      const storedEmail = localStorage.getItem("admin_email");
      const storedImage = localStorage.getItem("admin_image");
      const storedRole = localStorage.getItem("admin_role");
      const storedCanAdd = localStorage.getItem("admin_can_add");
      const storedCanEdit = localStorage.getItem("admin_can_edit");
      const storedCanDelete = localStorage.getItem("admin_can_delete");
      const storedCanPromote = localStorage.getItem("admin_can_promote");
      const storedCanDemote = localStorage.getItem("admin_can_demote");
      const storedPasswordChanged = localStorage.getItem(
        "admin_password_changed",
      );
      const storedCreatedAt = localStorage.getItem("admin_created_at");
      const storedUpdatedAt = localStorage.getItem("admin_updated_at");

      setFirstName(storedFirstName || "");
      setLastName(storedLastName || "");
      setUsername(storedUsername || "");
      setEmail(storedEmail || "");
      setRole(storedRole || "");
      setImage(storedImage || "");
      setPasswordChanged(storedPasswordChanged === "1");
      setCanAdd(storedCanAdd === "1");
      setCanEdit(storedCanEdit === "1");
      setCanDelete(storedCanDelete === "1");
      setCanPromote(storedCanPromote === "1");
      setCanDemote(storedCanDemote === "1");
      setCreatedAt(storedCreatedAt || "");
      setUpdatedAt(storedUpdatedAt || "");
    };

    loadAdminProfile();
    window.addEventListener("storage", loadAdminProfile);

    return () => {
      window.removeEventListener("storage", loadAdminProfile);
    };
  }, []);

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
      segment: "dashboard",
      title: "Dashboard",
      icon: <DashboardIcon />,
    },
    {
      segment: "sales",
      title: "Sales",
      icon: <TrendingUpIcon />,
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
      title: "Audit Logs",
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
        }}
      >
        <img
          src={Nexus}
          alt="logo"
          style={{ width: 30, height: 50, position: "relative", bottom: 2 }}
        />
      </Box>
    ),
    title: (
      <Typography
        sx={{
          color: "text.primary",
          fontWeight: "bold",
          fontSize: 22,
        }}
      >
        Red <span style={{ color: "#ff0000" }}>Nexus</span>
      </Typography>
    ),
    homeUrl: "/admin/dashboard",
  };

  const { theme, mode, setMode } = useThemeMode();
  const toggleTheme = () =>
    setMode((currentMode) => (currentMode === "dark" ? "light" : "dark"));

  const CustomHeader = () => (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pr: 1 }}>
      <IconButton
        onClick={toggleTheme}
        aria-label="Toggle light and dark mode"
        sx={{ color: "text.secondary" }}
      >
        {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
      </IconButton>

      <IconButton
        onClick={() => {
          setNotificationDrawerOpen(true);
          setProfileDrawerOpen(false);
        }}
        aria-label="Open notifications"
        sx={{ color: "text.secondary" }}
      >
        <Badge variant="dot" color="error">
          <NotificationsNoneIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Divider
        orientation="vertical"
        flexItem
        sx={{ mx: 0.5, height: 40, my: "auto" }}
      />

      <Box
        onClick={() => {
          setProfileDrawerOpen(true);
          setNotificationDrawerOpen(false);
        }}
        role="button"
        tabIndex={0}
        aria-label="Open profile menu"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            setProfileDrawerOpen(true);
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          backgroundColor: "#f0f2f5",
          borderRadius: "24px",
          px: 2,
          py: 0.5,
          cursor: "pointer",
          transition: "background-color 0.2s",
          "&:hover": { backgroundColor: "#e4e6ea" },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1c1e21" }}>
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
      </Box>
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
      disableCollapsibleSidebar={true}
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
          <Button onClick={handleLogout} variant="contained" color="error" sx={{ color: "#fff" }}>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
      <Drawer
        anchor="right"
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.header,
              color: theme.palette.text.primary,
            },
          },
        }}
      >
        <Stack sx={{ height: "100%", mt: 9 }}>
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
              sx={{ width: 48, height: 48, bgcolor: "#f6f6f6" }}
            >
              {firstName ? firstName.charAt(0).toUpperCase() : "A"}
            </Avatar>
            <Stack>
              <Typography sx={{ fontWeight: 700 }}>
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
        slotProps={{
          paper: {
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.header,
              color: theme.palette.text.primary,
            },
          },
        }}
      >
        <Stack sx={{ height: "100%", mt: 9 }}>
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
        slots={{
          toolbarAccount: CustomHeader,
        }}
        renderPageItem={(item) => {
          if (item.segment !== "manage") {
            return <DashboardSidebarPageItem item={item} />;
          }

          return (
            <DashboardSidebarPageItem
              item={item}
              expanded={manageUsersExpanded}
              onClick={() => setManageUsersExpanded((expanded) => !expanded)}
            />
          );
        }}
        sx={{
            backgroundColor: theme.palette.background.default,
            "& .MuiDrawer-paper": {
              backgroundColor: theme.palette.background.sidebar,
              color: theme.palette.text.sidebar,
              borderRight: "none",
              borderTopRightRadius: 50,
              overflow: "hidden",
            },
            "& .MuiDrawer-docked .MuiDrawer-paper": {
              borderRadius: "0 50px 0 0",
              overflow: "hidden",
            },
            "& .MuiAppBar-root .MuiIconButton-root": {
              color: "#6b7280",
            },
            "& .MuiAppBar-root .MuiSvgIcon-root": {
              color: "#6b7280",
            },
            "& .MuiDrawer-paper .MuiPaper-root": {
              backgroundColor: theme.palette.background.sidebar,
            },
            // Selected text
            "& .MuiDrawer-paper .Mui-selected .MuiListItemText-primary": {
              color: "#980404",
            },
            "& .MuiDrawer-paper .Mui-selected .MuiTypography-caption": {
              color: "#980404",
            },
            // Selected icon
            "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
              color: "#980404",
            },
            // Sidebar icons color
            "& .MuiDrawer-paper .MuiSvgIcon-root": {
              color: "#ffffff",
            },
            "& .MuiListItemButton-root:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },
            "& .Mui-selected": {
              backgroundColor: "rgba(255,255,255,0.25) !important",
            },
            // Header
            "& .MuiAppBar-root": {
              backgroundColor: theme.palette.background.header,
              boxShadow: "none",
              borderBottom: "none",
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
            p: "clamp(20px, 2vw, 28px)",
            zoom: { xs: 1, md: 1.15, lg: 1.18 },
          }}
        >
          <Outlet />
        </Box>
      </MuiDashboardLayout>
    </AppProvider>
  );
}

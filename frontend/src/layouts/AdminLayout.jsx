import * as React from "react";
import { useState, useEffect } from "react";
import { AppProvider } from "@toolpad/core";
import Backdrop from "@mui/material/Backdrop";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import { DashboardLayout as MuiDashboardLayout } from "@toolpad/core";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Fade from "@mui/material/Fade";
import Slide from "@mui/material/Slide";
import Modal from "@mui/material/Modal";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Stack, Avatar, Typography, Divider, IconButton } from "@mui/material";
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { lightTheme, darkTheme } from "../theme/customTheme";
import Nexus from "../assets/Nexus.png";
import { clearAuthData } from "../../utils/auth";
import { recordLogout } from "../api/admin/adminAuthenticationAPI";
//Icons
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PaletteIcon from "@mui/icons-material/Palette";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyIcon from "@mui/icons-material/Key";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import HistoryIcon from "@mui/icons-material/History";
import GavelIcon from "@mui/icons-material/Gavel";

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

  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const openMenu = Boolean(anchorEl);

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
      const storedPasswordChanged = localStorage.getItem("admin_password_changed");
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

  // Open/Close option handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Simulated router (for Toolpad)
  const router = {
    pathname: location.pathname.replace(/^\/admin/, "") || "/",
    navigate: (path) => {
      navigate(`/admin/${path.replace(/^\/+/, "")}`);
    },
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

  const isSuperAdmin = localStorage.getItem("admin_role") === "super admin";

  // Sidebar menu items
  const navigation = [
    {
      segment: "profile",
      title: "Profile",
      icon: <AccountCircleIcon />,
    },
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
        ...(isSuperAdmin
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
          icon: <HourglassBottomRoundedIcon />,
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
      segment: "verify",
      title: "Student Verification",
      icon: <VerifiedRoundedIcon />,
      children: [
        {
          segment: "pending",
          title: "Pending",
          icon: <HourglassBottomRoundedIcon />,
        },
        {
          segment: "verified",
          title: "Verified",
          icon: <VerifiedUserRoundedIcon />,
        },
      ],
    },
    // Only for Super Admin Panel
    ...(isSuperAdmin
      ? [
          {
            segment: "admin",
            title: "Admin Control",
            icon: <KeyIcon />,
          },
        ]
      : []),

    {
      segment: "audit-logs",
      title: "Audit Logs",
      icon: <HistoryIcon />,
    },
    {
      segment: "settings",
      title: "Settings",
      icon: <SettingsIcon />,
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
          style={{ width: 30, height: 30, position: "relative", bottom: 2 }}
        />
      </Box>
    ),
    title: (
      <Typography
        sx={{
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: 22,
        }}
      >
        ArtMatch
      </Typography>
    ),
    homeUrl: "/admin/dashboard",
  };

  const SidebarFooter = ({ mini }) => (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={mini ? "center" : "space-between"}
      spacing={mini ? 0 : 1.5}
      sx={{
        p: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: theme.palette.background.sidebar,
        color: theme.palette.text.sidebar,
        // Force it down if the parent allows flex growth
        mt: "auto",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={
              localStorage.getItem("admin_image")
                ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(localStorage.getItem("admin_image"))}`
                : "http://localhost:5000/uploads/profile.jpg"
            }
          alt="ArtMatch"
          sx={{ width: 40, height: 40 }}
        />
        {!mini && (
          <Stack direction="column">
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 16 }}>
              {firstName} {lastName}
            </Typography>
            <Typography variant="caption">Administrator</Typography>
          </Stack>
        )}
      </Stack>

      {!mini && (
        <IconButton size="small" onClick={handleOpen}>
          <ExitToAppIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );

  // Custom header with logout button on the right
  const CustomHeader = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        px: 1,
      }}
    ></Box>
  );

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = prefersDarkMode ? darkTheme : lightTheme;
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
            <Button onClick={handleClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleLogout} variant="contained" color="primary">
              Logout
            </Button>
          </DialogActions>
        </Dialog>
        <MuiDashboardLayout
          slots={{
            toolbarAccount: CustomHeader,
            sidebarFooter: SidebarFooter,
          }}
          sx={{
            backgroundColor: theme.palette.background.default,
            "& .MuiDrawer-paper": {
              backgroundColor: theme.palette.background.sidebar,
              color: theme.palette.text.sidebar,
              borderRight: "none",
            },
            "& .MuiAppBar-root .MuiIconButton-root": {
              color: "#ffffff",
            },
            "& .MuiAppBar-root .MuiSvgIcon-root": {
              color: "#ffffff",
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
            },

            "& .MuiListItemButton-root": {
              marginTop: "5px",
              marginBottom: "5px",
            },
          }}
        >
          <div style={{ padding: "20px" }}>
            <Outlet />
          </div>
        </MuiDashboardLayout>
      </AppProvider>
    </ThemeProvider>
  );
}

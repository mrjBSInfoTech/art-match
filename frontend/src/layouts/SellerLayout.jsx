import * as React from "react";
import { useState, useEffect } from "react";
import { AppProvider } from "@toolpad/core";
import Backdrop from "@mui/material/Backdrop";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
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
import { clearAuthData } from "../../utils/auth";
import { recordLogout } from "../api/seller/sellerAuthenticationAPI";
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
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { lightTheme, darkTheme } from "../theme/customTheme";
import Nexus from "../assets/Nexus.png";

//Icons
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LocalMallIcon from "@mui/icons-material/LocalMall";
import MessageIcon from "@mui/icons-material/Message";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PaletteIcon from "@mui/icons-material/Palette";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import CloseIcon from "@mui/icons-material/Close";

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

export default function SellerLayout({ children }) {
  //Seller's Info
  const [firstName, setFirstName] = useState();
  const [lastName, setLastName] = useState();
  const [birthdate, setBirthdate] = useState();
  const [email, setEmail] = useState();
  const [phoneNumber, setPhoneNumber] = useState();
  const [cor, setCor] = useState();
  const [yearLevel, setYearLevel] = useState();
  const [course, setCourse] = useState();
  const [studentNumber, setStudentNumber] = useState();
  const [registerStatus, setRegisterStatus] = useState();
  const [registeredDate, setRegisteredDate] = useState();
  const [approvedDate, setApprovedDate] = useState();
  const [profileImage, setProfileImage] = useState();

  const [anchorEl, setAnchorEl] = useState(null);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);

  useEffect(() => {
    const loadSellerProfile = () => {
      const storedFirstName = localStorage.getItem("seller_first_name");
      const storedLastName = localStorage.getItem("seller_last_name");
      const storedBirthdate = localStorage.getItem("seller_birthdate");
      const storedEmail = localStorage.getItem("seller_email");
      const storedPhoneNumber = localStorage.getItem("seller_phone_number");
      const storedCor = localStorage.getItem("seller_cor");
      const storedYearLevel = localStorage.getItem("seller_year_level");
      const storedCourse = localStorage.getItem("seller_course");
      const storedStudentNumber = localStorage.getItem("seller_student_number");
      const storedRegisterStatus = localStorage.getItem(
        "seller_register_status",
      );
      const storedRegisteredDate = localStorage.getItem(
        "seller_registered_date",
      );
      const storedApprovedDate = localStorage.getItem("seller_approved_date");
      const storedProfileImage = localStorage.getItem("seller_profile_image");

      setFirstName(storedFirstName || "");
      setLastName(storedLastName || "");
      setBirthdate(storedBirthdate || "");
      setEmail(storedEmail || "");
      setPhoneNumber(storedPhoneNumber || "");
      setCor(storedCor || "");
      setYearLevel(storedYearLevel || "");
      setCourse(storedCourse || "");
      setStudentNumber(storedStudentNumber || "");
      setRegisterStatus(storedRegisterStatus || "");
      setRegisteredDate(storedRegisteredDate || "");
      setApprovedDate(storedApprovedDate || "");
      setProfileImage(storedProfileImage || "");
    };

    loadSellerProfile();
    window.addEventListener("seller-profile-updated", loadSellerProfile);
    return () =>
      window.removeEventListener("seller-profile-updated", loadSellerProfile);
  }, []);

  const openMenu = Boolean(anchorEl);

  // Open/Close option handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Simulated router (for Toolpad)
  const router = {
    pathname: location.pathname.replace(/^\/seller/, "") || "/",
    navigate: (path) => {
      navigate(`/seller/${path.replace(/^\/+/, "")}`);
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
      segment: "profile",
      title: "Profile",
      icon: <AccountCircleIcon />,
      pattern: "/seller/profile",
    },
    {
      segment: "dashboard",
      title: "Dashboard",
      icon: <DashboardIcon />,
      pattern: "/seller/dashboard",
    },
    {
      segment: "artwork",
      title: "Artwork",
      icon: <PaletteIcon />,
      pattern: "/seller/artwork",
    },
    {
      segment: "sales",
      title: "Sales",
      icon: <TrendingUpIcon />,
      pattern: "/seller/sales",
    },
    {
      segment: "orders",
      title: "Orders",
      icon: <ShoppingCartIcon />,
      pattern: "/seller/orders",
    },
    {
      segment: "messages",
      title: "Messages",
      icon: <MessageIcon />,
      pattern: "/seller/messages",
    },
    {
      segment: "settings",
      title: "Settings",
      icon: <SettingsIcon />,
      pattern: "/seller/settings",
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
        Red <spam style={{ color: "#ff0000" }}>Nexus</spam>
      </Typography>
    ),
    homeUrl: "/seller/dashboard",
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
            profileImage
              ? `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(profileImage)}`
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
            <Typography variant="caption">Seller</Typography>
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

  // Custom header matching the admin layout
  const CustomHeader = () => (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      width="100%"
      spacing={1.5}
      sx={{ pr: 1 }}
    >
      <IconButton
        onClick={() => {
          setNotificationDrawerOpen(true);
          setProfileDrawerOpen(false);
        }}
        aria-label="Open notifications"
        sx={{ color: "#6b7280" }}
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
        aria-label="Open seller profile"
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
          {firstName || "Seller"}
        </Typography>
        <Avatar
          src={
            profileImage
              ? `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(profileImage)}`
              : "http://localhost:5000/uploads/profile.jpg"
          }
          alt={firstName || "Seller"}
          sx={{ width: 32, height: 32, bgcolor: "#232b38" }}
        >
          {firstName ? firstName.charAt(0).toUpperCase() : "S"}
        </Avatar>
      </Box>
    </Stack>
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
            position: "Seller",
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
        <Drawer
          anchor="right"
          open={profileDrawerOpen}
          onClose={() => setProfileDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.drawer,
              color: theme.palette.text.primary,
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
                  profileImage
                    ? `http://localhost:5000/uploads/seller/profile/${encodeURIComponent(profileImage)}`
                    : "http://localhost:5000/uploads/profile.jpg"
                }
                alt={firstName || "Seller"}
                sx={{ width: 48, height: 48, bgcolor: "#f6f6f6" }}
              >
                {firstName ? firstName.charAt(0).toUpperCase() : "S"}
              </Avatar>
              <Stack>
                <Typography sx={{ fontWeight: 700 }}>
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
          open={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "min(320px, 88vw)", sm: 340 },
              backgroundColor: theme.palette.background.drawer,
              color: theme.palette.text.primary,
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
              <Typography color="text.secondary">
                No new notifications
              </Typography>
            </Stack>
          </Stack>
        </Drawer>
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
              color: theme.palette.text.sidebar,
            },
            "& .MuiDrawer-paper .Mui-selected .MuiTypography-caption": {
              color: theme.palette.text.sidebar,
            },
            // Selected icon
            "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
              color: theme.palette.text.sidebar,
            },
            // Sidebar icons color
            "& .MuiDrawer-paper .MuiSvgIcon-root": {
              color: theme.palette.text.sidebar,
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
          <div style={{ padding: "20px" }}>
            <Outlet />
          </div>
        </MuiDashboardLayout>
      </AppProvider>
    </ThemeProvider>
  );
}

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
import { clearAuthData } from "../../utils/auth";
import { recordLogout } from "../api/seller/sellerAuthenticationAPI";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Stack, Avatar, Typography, Divider, IconButton } from "@mui/material";
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
            // Selected icon
            "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
              color: "#980404",
            },
            "& .MuiDrawer-paper .Mui-selected .MuiTypography-caption": {
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

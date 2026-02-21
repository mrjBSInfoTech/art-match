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
import { modalStyles } from "../theme/modalTheme";
import { useNavigate, useLocation } from "react-router-dom";
import { Stack, Avatar, Typography, Divider, IconButton } from "@mui/material";
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { lightTheme, darkTheme } from "../theme/customTheme";
import BarangayIcon from "../assets/BarangayIcon.png";

//Icons
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import GroupIcon from "@mui/icons-material/Group";
import HistoryIcon from "@mui/icons-material/History";
import LocalPostOfficeIcon from "@mui/icons-material/LocalPostOffice";
import PersonIcon from "@mui/icons-material/Person";
import PostAddIcon from "@mui/icons-material/PostAdd";

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

export default function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState("");
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    setUser(storedUser);
  }, []);

  // Simulated router (for Toolpad)
  const router = {
    pathname: location.pathname,
    navigate: (path) => navigate(path),
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    navigate("/", { replace: true }); // redirect to your Dashboard page

    // Clear browser history for extra security
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, null, window.location.href);
    };
  };

  // Sidebar menu items
  const navigation = [
    {
      segment: "dashboard",
      title: "Dashboard",
      icon: <DashboardIcon />,
      pattern: "/dashboard",
    },
    {
      segment: "records",
      title: "Records",
      icon: <FolderIcon />,
      children: [
        {
          segment: "resident",
          title: "Resident",
          icon: <PersonIcon />,
        },
        {
          segment: "household",
          title: "Household",
          icon: <GroupIcon />,
        },
        {
          segment: "files",
          title: "Files",
          icon: <FolderOpenIcon />,
        },
      ],
    },
    {
      segment: "announcements",
      title: "Announcements",
      icon: <PostAddIcon />,
      pattern: "/announcements",
    },
    {
      segment: "messages",
      title: "Messages",
      icon: <LocalPostOfficeIcon />,
      pattern: "/messages",
    },
    {
      segment: "officials",
      title: "Officials",
      icon: <AdminPanelSettingsIcon />,
      pattern: "/officials",
    },
    {
      segment: "citizens",
      title: "Citizens",
      icon: <AccountBoxIcon />,
      pattern: "/citizens",
    },
    {
      segment: "history",
      title: "History",
      icon: <HistoryIcon />,
      pattern: "/history",
    },
  ];

  const branding = {
    logo: (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          component="img"
          src={BarangayIcon}
          alt="Barangay Logo"
          sx={{
            height: 40,
            width: "auto",
          }}
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
        Barangay 415 Zone 42
      </Typography>
    ),
    homeUrl: "/dashboard",
  };

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
    >
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{ color: "#ffffff" }}
        title="Logout"
      >
        <ExitToAppIcon />
      </IconButton>
    </Box>
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
            name: "Rob Justin",
            email: "rob@example.com",
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
        >
          <DialogTitle>Log out</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to log out?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} color="primary">
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
          }}
          sx={{
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
              color: "#2563eb",
              fontWeight: 600,
            },

            // Selected icon
            "& .MuiDrawer-paper .Mui-selected .MuiSvgIcon-root": {
              color: "#2563eb",
            },

            // Sidebar icons color
            "& .MuiDrawer-paper .MuiSvgIcon-root": {
              color: "#ffffff",
            },

            // Sidebar text
            "& .MuiListItemButton-root": {
              color: "#ffffff",
              borderRadius: "8px",
              margin: "4px 8px",
            },

            // Sidebar icons
            "& .MuiListItemIcon-root": {
              color: "#ffffff",
              minWidth: 36,
            },

            // Hover effect
            "& .MuiListItemButton-root:hover": {
              backgroundColor: "rgba(255,255,255,0.15)",
            },

            // Active item
            "& .Mui-selected": {
              backgroundColor: "rgba(255,255,255,0.25) !important",
            },

            // Header
            "& .MuiAppBar-root": {
              backgroundColor: theme.palette.background.header,
              boxShadow: "none",
            },
          }}
        >
          <div style={{ padding: "20px" }}>{children}</div>
        </MuiDashboardLayout>
      </AppProvider>
    </ThemeProvider>
  );
}

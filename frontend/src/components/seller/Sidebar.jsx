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
import { modalStyles } from "../theme/modalTheme";
import { useNavigate, useLocation } from "react-router-dom";
import { Stack, Avatar, Typography, Divider, IconButton } from "@mui/material";
import { ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { lightTheme, darkTheme } from "../../theme/customTheme";
import BarangayIcon from "../assets/BarangayIcon.png";

//Icons
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import GroupIcon from "@mui/icons-material/Group";
import HistoryIcon from "@mui/icons-material/History";
import LocalPostOfficeIcon from "@mui/icons-material/LocalPostOffice";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonIcon from "@mui/icons-material/Person";
import PostAddIcon from "@mui/icons-material/PostAdd";
import SettingsIcon from "@mui/icons-material/Settings";

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
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState("");
  const [position, setPosition] = useState("");
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const openMenu = Boolean(anchorEl);

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedFirstName = localStorage.getItem("first_name");
    const storedLastName = localStorage.getItem("last_name");
    const storedPosition = localStorage.getItem("position");
    const storedImage = localStorage.getItem("image");

    setFirstName(storedFirstName || "");
    setLastName(storedLastName || "");
    setPosition(storedPosition || "");
    setUser(storedUser || "");
    setImage(storedImage || "");
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
    pathname: location.pathname,
    navigate: (path) => navigate(path),
  };

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("account_type");
    localStorage.removeItem("can_add");
    localStorage.removeItem("can_edit");
    localStorage.removeItem("can_delete");
    localStorage.removeItem("password_changed");
    localStorage.removeItem("first_name");
    localStorage.removeItem("last_name");
    localStorage.removeItem("position");
    localStorage.removeItem("image");

    navigate("/", { replace: true }); // redirect to your Dashboard page

    // Clear browser history for extra security
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, null, window.location.href);
    };
  };

  const isAdmin = localStorage.getItem("account_type") === "Admin";

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
      icon: <FileCopyIcon />,
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
          icon: <FolderIcon />,
        },
      ],
    },
    {
      segment: "announcements",
      title: "Announcements",
      icon: <PostAddIcon />,
      pattern: "/announcements",
    },
    // Only for Admin Panel
    ...(isAdmin
      ? [
          {
            segment: "concern",
            title: "Concerns",
            icon: <LocalPostOfficeIcon />,
            pattern: "/concern",
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
        ]
      : []), 
    {
      segment: "settings",
      title: "Settings",
      icon: <SettingsIcon />,
      pattern: "/settings",
    },
  ];

  const branding = {
    logo: (
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "50%",
          width: 40,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src={BarangayIcon}
          alt="logo"
          style={{ width: 50, height: 50, position: "relative", bottom: 2 }}
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
            image
              ? `http://localhost:5000/uploads/uploadOfficial/${encodeURIComponent(image)}`
              : `http://localhost:5000/uploads/uploadOfficial/profile.jpg`
          }
          alt="Brgy. 415"
          sx={{ width: 40, height: 40 }}
        />
        {!mini && (
          <Stack direction="column">
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 16 }}>
              {firstName} {lastName}
            </Typography>
            <Typography variant="caption">{position}</Typography>
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
            name: firstName && lastName ? `${firstName} ${lastName}` : user,
            position: position || "",
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
          <DialogTitle sx={{fontWeight:'bold'}}>Log out</DialogTitle>
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
            "& .MuiDrawer-paper .MuiBox-root": {
              display: "flex",
              flexDirection: "column",
              height: "100%",
            },

            "& .MuiDrawer-paper": {
              backgroundColor: theme.palette.background.sidebar,
              color: theme.palette.text.sidebar,
              borderRight: "none",
            },

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
              margin: "4px 2px",
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

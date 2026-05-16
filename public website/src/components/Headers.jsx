import React, { useRef, useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Backdrop,
  Slide,
  Box,
  Button,
  TextField,
  InputAdornment,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Collapse,
  Autocomplete,
  Menu,
  MenuItem,
  Popover,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import ListItemIcon from "@mui/material/ListItemIcon";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import BarangayIcon from "../assets/BarangayIcon.png";

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

function Headers({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "Home", path: "/" },
    { label: "Concerns", path: "/concerns" },
    { label: "Announcements", path: "/announcements" },
    { label: "About us", path: "/about" },
  ];

  const searchSuggestions = [
    { label: "About Us", path: "/#about", page: "Home" },
    { label: "Mission & Vision", path: "/#mission-vision", page: "Home" },
    {
      label: "Latest Announcements",
      path: "/#announcements",
      page: "Home",
    },
    { label: "Location", path: "/#location", page: "Home" },
    { label: "History", path: "/about#history", page: "About" },
    { label: "Officials", path: "/about#officials", page: "About" },
    {
      label: "Contact Information",
      path: "/concerns#contact-info",
      page: "Concerns",
    },
  ];

  const buttonRefs = useRef([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  useEffect(() => {
    const storedLoggedIn = localStorage.getItem("token");
    const storedFirstName = localStorage.getItem("first_name");
    const storedLastName = localStorage.getItem("last_name");

    setFirstName(storedFirstName || "");
    setLastName(storedLastName || "");
    setLoggedIn(!!storedLoggedIn);
  }, []);

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem("token");
    localStorage.removeItem("first_name");
    localStorage.removeItem("last_name");

    navigate("/login", { replace: true }); // redirect to your Dashboard page

    // Clear browser history for extra security
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, null, window.location.href);
    };
  };

  const open = Boolean(anchorEl);
  // Open account popover
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Close account popover
  const handleClose = () => {
    setAnchorEl(null);
  };

  const activeIndex = menuItems.findIndex(
    (item) => item.path === location.pathname,
  );

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
    setSearchOpen(false);
  };

  // Add this inside your Headers component
  useEffect(() => {
    const handleResize = () => {
      // Check if window width is greater than 1200px (lg breakpoint)
      if (window.innerWidth >= 1200) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    // Clean up listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    const button = buttonRefs.current[activeIndex];
    if (button) {
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      });
    }
  }, [activeIndex]);

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: "#1e1f87",
          padding: { xs: "4px 10px", lg: "8px 20px" },
        }}
        elevation={0}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* LEFT SIDE - Logo & Brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                backgroundColor: "white",
                borderRadius: "50%",
                width: 50,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src={BarangayIcon}
                alt="logo"
                style={{
                  width: 50,
                  height: 50,
                  position: "relative",
                  bottom: 2,
                }}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#fff",
                // Show brand name on iPad Pro and Desktop (lg breakpoint)
                display: { xs: "none", lg: "block" },
              }}
            >
              Barangay 415 Zone 42
            </Typography>
          </Box>

          {/* RIGHT SIDE - Desktop Menu (Triggered at LG for Large Tablets) */}
          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              position: "relative",
              alignItems: "center",
              backgroundColor: "#eaeaea",
              borderRadius: "8px",
              padding: "4px",
              gap: 1,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                height: "36.5px", // Adjusted for button height
                backgroundColor: "#4c7be8",
                borderRadius: "6px",
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                transition: "all 0.3s ease",
                zIndex: 0,
              }}
            />

            {menuItems.map((item, index) => (
              <Button
                key={item.path}
                ref={(el) => (buttonRefs.current[index] = el)}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  position: "relative",
                  zIndex: 1,
                  color: activeIndex === index ? "#fff" : "#333",
                  textTransform: "none",
                  padding: "6px 16px",
                }}
              >
                {item.label}
              </Button>
            ))}

            {/* DESKTOP SEARCH */}
            <Autocomplete
              size="small"
              options={searchSuggestions}
              getOptionLabel={(option) => option.label}
              sx={{ width: 200, ml: 1 }}
              onChange={(e, val) => val && handleNavigation(val.path)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search..."
                  sx={{ backgroundColor: "#fff", borderRadius: "6px" }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <InputAdornment sx={{ position: "relative", left: 25 }}>
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Box>
              <IconButton
                sx={{ color: "#2563eb", ml: 1 }}
                onClick={(e) => {
                  if (loggedIn) {
                    handleClick(e);
                  } else {
                    navigate("/login");
                  }
                }}
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                slotProps={{
                  paper: {
                    elevation: 0,
                    sx: {
                      overflow: "visible",
                      filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                      mt: 1.5,
                      "& .MuiAvatar-root": {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      "&::before": {
                        content: '""',
                        display: "block",
                        position: "absolute",
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: "background.paper",
                        transform: "translateY(-50%) rotate(45deg)",
                        zIndex: 0,
                      },
                    },
                  },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  {firstName} {lastName}
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleClose}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <MenuItem onClick={handleOpenDialog}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
            <Dialog
              open={openDialog}
              onClose={handleCloseDialog}
              TransitionComponent={Transition}
              keepMounted
              slots={{ backdrop: Backdrop }}
              slotProps={{
                backdrop: {
                  timeout: 500,
                },
              }}
            >
              <DialogTitle>Log out</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to log out?
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseDialog} color="primary">
                  Cancel
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="contained"
                  color="primary"
                >
                  Logout
                </Button>
              </DialogActions>
            </Dialog>
          </Box>

          {/* MOBILE/TABLET BUTTONS (Visible below LG breakpoint) */}
          <Box sx={{ display: { xs: "flex", lg: "none" }, gap: 1 }}>
            <IconButton
              onClick={() => setSearchOpen(!searchOpen)}
              sx={{ color: "#fff" }}
            >
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </IconButton>
            <IconButton
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ color: "#fff" }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>

        {/* SEARCH DROP-DOWN (For Mobile and Tablet) */}
        <Collapse in={searchOpen}>
          <Box
            sx={{
              p: 2,
              backgroundColor: "#1e1f87",
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Autocomplete
              fullWidth
              size="small"
              options={searchSuggestions}
              getOptionLabel={(option) => option.label}
              onChange={(e, val) => val && handleNavigation(val.path)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoFocus
                  placeholder="Search in site..."
                  sx={{ backgroundColor: "#fff", borderRadius: "6px" }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <InputAdornment position="end">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </Box>
        </Collapse>
      </AppBar>

      {/* MOBILE DRAWER (Menu only) */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <Box
          sx={{
            width: 270,
            backgroundColor: "#1e1f87",
            height: "100%",
            color: "#fff",
          }}
        >
          <List sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <IconButton
                onClick={() => setMobileOpen(false)}
                sx={{ color: "#fff" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            {menuItems.map((item, index) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    backgroundColor:
                      activeIndex === index ? "#4c7be8" : "transparent",
                    borderRadius: 2,
                    mb: 1,
                  }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          {/* Bottom Section: Account Actions */}
          <Box sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            {loggedIn ? (
              <List disablePadding>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.7, ml: 2, mb: 1, display: "block" }}
                >
                  Logged in as: {firstName} {lastName}
                </Typography>

                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleClose();
                      setMobileOpen(false);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemIcon sx={{ color: "#fff", minWidth: 40 }}>
                      <Settings fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleOpenDialog();
                      setMobileOpen(false);
                    }}
                    sx={{ borderRadius: 2, color: "white" }} // Slight red tint for logout
                  >
                    <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                      <Logout fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                  </ListItemButton>
                </ListItem>
              </List>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={() => handleNavigation("/login")}
                startIcon={<AccountCircleIcon />}
                sx={{ borderRadius: 2 }}
              >
                Login
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>

      <Box>{children}</Box>
    </>
  );
}

export default Headers;

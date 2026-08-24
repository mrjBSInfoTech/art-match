import React, { useRef, useState, useEffect } from "react";
import {
  AppBar,
  Badge,
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
  InputBase,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Container,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import ChatIcon from "@mui/icons-material/Chat";
import Settings from "@mui/icons-material/Settings";
import Logout from "@mui/icons-material/Logout";
import ListItemIcon from "@mui/material/ListItemIcon";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import logo from "../assets/Nexus.png";
import Footer from "../pages/buyer/Footer";
import { fetchCart } from "../api/buyer/cartAPI";
import { recordLogout } from "../api/buyer/buyerAuthenticationAPI";

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

function BuyerLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "Home", path: "/buyer/main" },
    { label: "Cart", path: "/buyer/cart" },
  ];

  const buttonRefs = useRef([]);

  // Buyers Info
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const [loggedIn, setLoggedIn] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  useEffect(() => {
    const storedLoggedIn = localStorage.getItem("buyer_token");
    const storedUsername = localStorage.getItem("buyer_username");
    const storedFirstName = localStorage.getItem("buyer_first_name");
    const storedLastName = localStorage.getItem("buyer_last_name");
    const storedEmail = localStorage.getItem("buyer_email");
    const storedPhoneNumber = localStorage.getItem("buyer_phone_number");

    setUsername(storedUsername || "");
    setFirstName(storedFirstName || "");
    setLastName(storedLastName || "");
    setEmail(storedEmail || "");
    setPhoneNumber(storedPhoneNumber || "");
    setLoggedIn(!!storedLoggedIn);
  }, []);

  useEffect(() => {
    const loadCartCount = async () => {
      if (!localStorage.getItem("buyer_token")) {
        setCartCount(0);
        return;
      }

      try {
        const items = await fetchCart();
        setCartCount(Array.isArray(items) ? items.length : 0);
      } catch {
        setCartCount(0);
      }
    };

    loadCartCount();
    window.addEventListener("cart-updated", loadCartCount);

    return () => window.removeEventListener("cart-updated", loadCartCount);
  }, [location.pathname]);

  const handleLogout = async () => {
    await recordLogout();
    {
      localStorage.removeItem("buyer_token");
      localStorage.removeItem("buyer_username");
      localStorage.removeItem("buyer_first_name");
      localStorage.removeItem("buyer_last_name");
      localStorage.removeItem("buyer_email");
      localStorage.removeItem("buyer_phone_number");
    }
    navigate("/buyer/login", { replace: true });

    // Clear browser history for extra security
    window.history.pushState(null, null, window.location.href);
    window.onpopstate = function () {
      window.history.pushState(null, null, window.location.href);
    };
  };

  // For search functionality
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buyer/artwork?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/buyer/artwork");
    }
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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1200) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

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

  const badgeCount = 10;

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: "#AF4F4F",
          padding: { xs: "4px 10px", lg: "8px 20px" },
        }}
        elevation={0}
      >
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 1, lg: 2 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: { xs: 42, sm: 50 },
                height: { xs: 42, sm: 50 },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                cursor: "pointer",
              }}
              onClick={() => {
                navigate("/buyer/main");
              }}
            >
              <img
                src={logo}
                alt="logo"
                style={{
                  width: "70%",
                  height: "70%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#fff",
                display: { xs: "none", lg: "block" },
              }}
            >
              ArtMatch
            </Typography>
          </Box>

          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              flexGrow: 1,
              justifyContent: "center",
              px: 2,
            }}
          >
            {/* DESKTOP SEARCH */}
            <Paper
              component="form"
              onSubmit={handleSearchSubmit}
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                width: 500,
                maxWidth: "100%",
                backgroundColor: "#eaeaea",
                borderRadius: "6px",
                px: 1.5,
              }}
            >
              <InputBase
                fullWidth
                size="small"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ py: 0.5, fontSize: "0.9rem" }}
              />
              <IconButton type="submit" size="small" sx={{ p: 1 }}>
                <SearchIcon />
              </IconButton>
            </Paper>
          </Box>

          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              flexShrink: 0,
              ml: 1,
            }}
          >
            <IconButton
              sx={{ color: "white" }}
              onClick={() => {
                navigate("/buyer/message");
              }}
            >
              <Badge badgeContent={badgeCount} color="error">
                <ChatIcon />
              </Badge>
            </IconButton>
            <IconButton
              sx={{ color: "white" }}
              onClick={() => {
                navigate("/buyer/cart");
              }}
            >
              <Badge
                badgeContent={cartCount}
                color="error"
                invisible={cartCount === 0}
              >
                <ShoppingBagIcon />
              </Badge>
            </IconButton>
            <IconButton
              sx={{ color: "white", ml: 1 }}
              onClick={(e) => {
                if (loggedIn) {
                  navigate("/buyer/profile");
                } else {
                  navigate("/buyer/login");
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
                {username}
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

          {/* MOBILE/TABLET BUTTONS (Visible below LG breakpoint) */}
          <Box
            sx={{ display: { xs: "flex", lg: "none" }, gap: 1, flexShrink: 0 }}
          >
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
            <Paper
              component="form"
              onSubmit={handleSearchSubmit}
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                width: 500,
                maxWidth: "100%",
                backgroundColor: "#eaeaea",
                borderRadius: "6px",
                px: 1.5,
              }}
            >
              <InputBase
                fullWidth
                size="small"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ py: 0.5, fontSize: "0.9rem" }}
              />
              <IconButton type="submit" size="small" sx={{ p: 1 }}>
                <SearchIcon />
              </IconButton>
            </Paper>
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
            backgroundColor: "#AF4F4F",
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
                      activeIndex === index ? "#b73636" : "transparent",
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
                  Logged in as: {username}
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
                onClick={() => handleNavigation("/buyer/login")}
                startIcon={<AccountCircleIcon />}
                sx={{ borderRadius: 2 }}
              >
                Login
              </Button>
            )}
          </Box>
        </Box>
      </Drawer>

      <Box
        sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
          }}
        >
          <Container maxWidth="lg" sx={{ width: "100%" }}>
            <Outlet />
          </Container>
        </Box>
        <Footer />
      </Box>
    </>
  );
}

export default BuyerLayout;

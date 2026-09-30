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
  Checkbox,
  FormControlLabel,
  Slider,
  Stack,
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
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { ThemeModeProvider, useThemeMode } from "../theme/ThemeModeProvider";
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

function BuyerLayoutContent({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, mode, setMode } = useThemeMode();
  const toggleTheme = () =>
    setMode((currentMode) => (currentMode === "dark" ? "light" : "dark"));

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
  const [categoriesAnchorPosition, setCategoriesAnchorPosition] =
    useState(null);
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
  const categoryGroups = [
    {
      title: "Art Type",
      options: [
        "Painting",
        "Sculpture",
        "Architecture",
        "Digital",
        "Photography",
        "Print",
        "Mixed Media",
      ],
    },
    {
      title: "Style",
      options: [
        "Modern",
        "Abstract",
        "Traditional",
        "Minimalist",
        "Pop Art",
        "Conceptual",
        "Cute",
      ],
    },
    {
      title: "Materials",
      options: ["Oil on Canvas", "Acrylic", "Watercolor", "Clay", "Metal"],
    },
  ];
  const paletteColors = [
    "#f52245",
    "#ffe3bb",
    "#1464ed",
    "#16b978",
    "#9c332b",
    "#151632",
    "#f5f1ea",
    "#1f1f1f",
  ];
  const handleCategoriesOpen = (event) => {
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const navigationRect = event.currentTarget
      .closest("nav")
      ?.getBoundingClientRect();
    setCategoriesAnchorPosition({
      top: navigationRect?.bottom ?? buttonRect.bottom,
      left: 0,
    });
  };
  const handleCategoryOption = (option) => {
    setCategoriesAnchorPosition(null);
    navigate(`/buyer/artwork?q=${encodeURIComponent(option)}`);
  };

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
        elevation={0}
      >
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            minHeight: 36,
            alignItems: "center",
            justifyContent: "space-between",
            px: { sm: 3, lg: 5 },
            backgroundColor: theme.palette.background.footer,
            color: "white",
            fontSize: 13,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "inherit", fontSize: "inherit" }}
          >
            Special Spring Exhibition: Post-Digital Sculptures by Class of 2026
            out now.
          </Typography>
          <Button
            size="small"
            onClick={() => navigate("/buyer/artwork")}
            sx={{
              color: "inherit",
              textTransform: "none",
              fontSize: "inherit",
            }}
          >
            Explore Collection{" "}
            <span aria-hidden="true" style={{ marginLeft: 10 }}>
              ›
            </span>
          </Button>
        </Box>
        <Toolbar
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 1, lg: 2 },
            minHeight: { xs: 64, lg: 68 },
            px: { xs: 2, sm: 4, lg: 6 },
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label="Red Nexus home"
            onClick={() => navigate("/buyer/main")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
              p: 0,
              border: 0,
              background: "transparent",
              color: "inherit",
              font: "inherit",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <Box
              sx={{
                width: { xs: 38, sm: 42 },
                height: { xs: 42, sm: 46 },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={logo}
                alt=""
                style={{
                  width: "34px",
                  height: "42px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: theme.palette.text.primary,
                display: { xs: "none", lg: "block" },
                letterSpacing: "-0.02em",
              }}
            >
              RED{" "}
              <Box component="span" sx={{ color: "#f52245" }}>
                NEXUS
              </Box>
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
                width: 750,
                maxWidth: "100%",
                backgroundColor: theme.palette.background.default,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "24px",
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
              onClick={toggleTheme}
              aria-label="Toggle light and dark mode"
              sx={{ color: theme.palette.text.primary }}
            >
              {mode === "dark" ? (
                <LightModeRoundedIcon />
              ) : (
                <DarkModeRoundedIcon />
              )}
            </IconButton>
            <IconButton
              sx={{ color: theme.palette.text.primary }}
              onClick={() => {
                navigate("/buyer/messages");
              }}
            >
              <Badge badgeContent={badgeCount} color="error">
                <ChatIcon />
              </Badge>
            </IconButton>
            <IconButton
              sx={{ color: theme.palette.text.primary }}
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
              sx={{ color: theme.palette.text.primary, ml: 1 }}
              onClick={
                loggedIn
                  ? () => navigate("/buyer/profile")
                  : () => navigate("/buyer/login")
              }
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
              sx={{ color: theme.palette.text.primary }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>

        <Box
          component="nav"
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 0.5, sm: 2 },
            minHeight: { xs: "auto", sm: 48 },
            px: { xs: 1, sm: 3, lg: 6 },
            py: { xs: 0.75, sm: 0 },
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: { xs: "space-between", sm: "flex-start" },
              gap: { xs: 0.5, sm: 2, md: 3 },
              width: { xs: "100%", sm: "auto" },
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={handleCategoriesOpen}
              startIcon={<MenuIcon sx={{ fontSize: 18 }} />}
              aria-haspopup="true"
              aria-expanded={Boolean(categoriesAnchorPosition)}
              sx={{
                color: "inherit",
                minWidth: 0,
                textTransform: "none",
                fontWeight: 500,
                px: { xs: 0.75, sm: 1 },
                fontSize: { xs: 12, sm: 14 },
              }}
            >
              All Categories
            </Button>
            <Button
              onClick={() => navigate("/buyer/artwork")}
              sx={{
                color: "inherit",
                textTransform: "none",
                px: { xs: 0.75, sm: 1 },
                fontSize: { xs: 12, sm: 14 },
              }}
            >
              Shop
            </Button>
            <Button
              onClick={() => navigate("/buyer/artist")}
              sx={{
                color: "inherit",
                textTransform: "none",
                px: { xs: 0.75, sm: 1 },
                fontSize: { xs: 12, sm: 14 },
              }}
            >
              Artist
            </Button>
            <Button
              onClick={() => navigate("/buyer/artwork")}
              sx={{
                color: "inherit",
                textTransform: "none",
                px: { xs: 0.75, sm: 1 },
                fontSize: { xs: 12, sm: 14 },
              }}
            >
              Gallery
            </Button>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: { xs: "space-between", sm: "flex-end" },
              gap: { xs: 0.5, sm: 2, md: 3 },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <Button
              onClick={() => navigate("/buyer/about")}
              sx={{
                color: "inherit",
                textTransform: "none",
                px: { xs: 0.75, sm: 1 },
                fontSize: { xs: 12, sm: 14 },
              }}
            >
              About Us
            </Button>
            <Button
              onClick={() => navigate("/buyer/help-support")}
              sx={{
                color: "inherit",
                textTransform: "none",
                px: { xs: 0.75, sm: 1 },
                fontSize: { xs: 12, sm: 14 },
              }}
            >
              Help Support
            </Button>
          </Box>
        </Box>

        {/* SEARCH DROP-DOWN (For Mobile and Tablet) */}
        <Collapse in={searchOpen}>
          <Box
            sx={{
              p: 2,
              backgroundColor: theme.palette.background.paper,
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
                backgroundColor: theme.palette.background.paper,
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
                sx={{
                  py: 0.5,
                  fontSize: "0.9rem",
                  color: theme.palette.text.primary,
                }}
              />
              <IconButton type="submit" size="small" sx={{ p: 1 }}>
                <SearchIcon />
              </IconButton>
            </Paper>
          </Box>
        </Collapse>
      </AppBar>

      <Popover
        open={Boolean(categoriesAnchorPosition)}
        onClose={() => setCategoriesAnchorPosition(null)}
        marginThreshold={0}
        anchorReference="anchorPosition"
        anchorPosition={categoriesAnchorPosition || { top: 0, left: 0 }}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            width: "100vw",
            maxWidth: "100vw",
            maxHeight: "calc(100vh - 150px)",
            overflowY: "auto",
            p: { xs: 2, md: 3 },
            borderRadius: "0 0 20px 20px",
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.14)",
          },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
            gap: { xs: 2, md: 3.5 },
          }}
        >
          {categoryGroups.map((group) => (
            <Box key={group.title}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: "Georgia, serif",
                  fontSize: 16,
                  fontWeight: 700,
                  mb: 1,
                }}
              >
                {group.title}
              </Typography>
              {group.options.map((option, index) => (
                <FormControlLabel
                  key={option}
                  control={
                    <Checkbox
                      size="small"
                      checked={index === 0 && group.title === "Art Type"}
                      onChange={() => handleCategoryOption(option)}
                      sx={{
                        p: 0.75,
                        color: theme.palette.divider,
                        "&.Mui-checked": { color: theme.palette.error.main },
                      }}
                    />
                  }
                  label={option}
                  sx={{
                    display: "flex",
                    m: 0,
                    minHeight: 32,
                    ".MuiFormControlLabel-label": {
                      fontSize: 14,
                      color: theme.palette.text.secondary,
                    },
                  }}
                />
              ))}
            </Box>
          ))}

          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: "Georgia, serif",
                fontSize: 16,
                fontWeight: 700,
                mb: 1.5,
              }}
            >
              Color Palette
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {paletteColors.map((color) => (
                <Box
                  key={color}
                  onClick={() => handleCategoryOption(color)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Filter by ${color}`}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: `1px solid ${theme.palette.divider}`,
                    cursor: "pointer",
                    "&:hover": { transform: "scale(1.15)" },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: "Georgia, serif",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Price Range
              </Typography>
              <Typography
                variant="body2"
                color="error.main"
                sx={{ fontWeight: 600 }}
              >
                ₱10,000+
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              ₱100
            </Typography>
            <Slider
              defaultValue={35}
              aria-label="Price range"
              sx={{ color: theme.palette.error.main, mt: 1, px: 0.5 }}
            />
          </Box>
        </Box>
      </Popover>

      {/* MOBILE DRAWER (Menu only) */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 270,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
          }}
        >
          <List sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <IconButton
                onClick={() => setMobileOpen(false)}
                sx={{ color: theme.palette.text.primary }}
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
                      activeIndex === index
                        ? theme.palette.action.selected
                        : "transparent",
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
                      navigate("/buyer/profile");
                      setMobileOpen(false);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemIcon
                      sx={{ color: theme.palette.text.primary, minWidth: 40 }}
                    >
                      <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                  </ListItemButton>
                </ListItem>

                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleOpenDialog();
                      setMobileOpen(false);
                    }}
                    sx={{ borderRadius: 2, color: theme.palette.error.main }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
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
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          p: 0,
          m: 0,
        }}
      >
        <Container
          maxWidth={false}
          disableGutters
          sx={{ width: "100%", maxWidth: "none", p: 0, m: 0 }}
        >
          <Outlet />
          <Footer />
        </Container>
      </Box>
    </>
  );
}

export default function BuyerLayout() {
  return (
    <ThemeModeProvider storageKey="artmatch-ui-theme-buyer">
      <BuyerLayoutContent />
    </ThemeModeProvider>
  );
}

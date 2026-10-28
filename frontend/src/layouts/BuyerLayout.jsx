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
  Autocomplete,
  InputBase,
  Checkbox,
  FormControlLabel,
  Slider,
  Stack,
  Avatar,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Container,
  useMediaQuery,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import ChatIcon from "@mui/icons-material/Chat";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Logout from "@mui/icons-material/Logout";
import { ThemeModeProvider, useThemeMode } from "../theme/ThemeModeProvider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import logo from "../assets/Nexus.png";
import Footer from "../pages/buyer/Footer";
import { COLOR_PALETTE } from "../utils/artworkColors";
import { PRICE_LIMIT, readPriceRange, formatPriceRange } from "../utils/artworkPrice";
import { ART_TYPES, ART_STYLES, ART_MATERIALS } from "../constants/artworkOptions";
import { fetchCart } from "../api/buyer/cartAPI";
import {
  fetchBuyerConversations,
  fetchBuyerNotifications,
} from "../api/buyer/messageAPI";
import { recordLogout } from "../api/buyer/buyerAuthenticationAPI";
import { recordRecommendationEvent } from "../api/buyer/recommendationAPI";
import { fetchPromotionHeader } from "../api/buyer/promotionSlideAPI";

const DEFAULT_PROMOTION_HEADER = {
  message: "Special Spring Exhibition: Post-Digital Sculptures by Class of 2026 out now.",
  button_label: "Explore Collection",
  button_url: "/buyer/shop",
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

function BuyerLayoutContent({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, mode } = useThemeMode();
  const inlineSearch = useMediaQuery(theme.breakpoints.up("md"));
  const searchInputRef = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (searchOpen && !inlineSearch) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen, inlineSearch]);
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
  const [profileImage, setProfileImage] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [promotionHeader, setPromotionHeader] = useState(
    DEFAULT_PROMOTION_HEADER,
  );

  const [loggedIn, setLoggedIn] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesAnchorPosition, setCategoriesAnchorPosition] =
    useState(null);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  useEffect(() => {
    let active = true;
    fetchPromotionHeader()
      .then((header) => {
        if (active) {
          setPromotionHeader({
            message: header.message || DEFAULT_PROMOTION_HEADER.message,
            button_label:
              header.button_label || DEFAULT_PROMOTION_HEADER.button_label,
            button_url:
              header.button_url || DEFAULT_PROMOTION_HEADER.button_url,
          });
        }
      })
      .catch((error) => {
        console.error("Unable to load the buyer promo header:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSearchQuery(new URLSearchParams(location.search).get("q") || "");
  }, [location.pathname, location.search]);

  useEffect(() => {
    const refreshProfile = () => {
      const storedLoggedIn = localStorage.getItem("buyer_token");
      const storedUsername = localStorage.getItem("buyer_username");
      const storedFirstName = localStorage.getItem("buyer_first_name");
      const storedLastName = localStorage.getItem("buyer_last_name");
      const storedEmail = localStorage.getItem("buyer_email");
      const storedPhoneNumber = localStorage.getItem("buyer_phone_number");
      const storedProfileImage = localStorage.getItem("buyer_profile_image");
  
      setUsername(storedUsername || "");
      setFirstName(storedFirstName || "");
      setLastName(storedLastName || "");
      setEmail(storedEmail || "");
      setPhoneNumber(storedPhoneNumber || "");
      setProfileImage(storedProfileImage || "");
      setLoggedIn(!!storedLoggedIn);
    };
    refreshProfile();
    window.addEventListener("buyer-profile-updated", refreshProfile);
    return () => window.removeEventListener("buyer-profile-updated", refreshProfile);
  }, []);

  useEffect(() => {
    let active = true;
    let controller;
    const loadCartCount = async (event) => {
      controller?.abort();
      if (!localStorage.getItem("buyer_token")) {
        setCartCount(0);
        return;
      }
      if (event?.detail?.source === "cart-page" && Number.isInteger(event.detail.count) && event.detail.count >= 0) {
        setCartCount(event.detail.count);
        return;
      }
      const request = new AbortController();
      controller = request;
      try {
        const items = await fetchCart({ signal: request.signal });
        if (active && !request.signal.aborted) setCartCount(Array.isArray(items) ? items.length : 0);
      } catch {
        // Keep the last successful count during a temporary network failure.
      }
    };
    const refreshVisibleCartCount = () => {
      if (document.visibilityState !== "hidden") loadCartCount();
    };

    loadCartCount();
    window.addEventListener("cart-updated", loadCartCount);
    const events = ["focus", "pageshow"];
    events.forEach((event) => window.addEventListener(event, refreshVisibleCartCount));
    document.addEventListener("visibilitychange", refreshVisibleCartCount);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("cart-updated", loadCartCount);
      events.forEach((event) => window.removeEventListener(event, refreshVisibleCartCount));
      document.removeEventListener("visibilitychange", refreshVisibleCartCount);
    };
  }, [location.pathname]);

  useEffect(() => {
    const loadUnreadMessageCount = async () => {
      if (!localStorage.getItem("buyer_token")) {
        setUnreadMessageCount(0);
        setUnreadNotificationCount(0);
        return;
      }

      const [conversations, notifications] = await Promise.all([
        fetchBuyerConversations().catch(() => null),
        fetchBuyerNotifications().catch(() => null),
      ]);

      if (conversations) {
        setUnreadMessageCount(
          conversations.reduce(
            (total, conversation) => total + Number(conversation.unread_count || 0),
            0,
          ),
        );
      }

      if (notifications) {
        setUnreadNotificationCount(
          notifications.filter((notification) => !Number(notification.is_read)).length,
        );
      }
    };

    loadUnreadMessageCount();
    const intervalId = window.setInterval(loadUnreadMessageCount, 5000);
    return () => window.clearInterval(intervalId);
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

    const query = searchQuery.trim();
    const params = new URLSearchParams(location.search);

    if (query) {
      void recordRecommendationEvent({
        event_type: "search",
        search_query: query,
        source_page: "buyer_layout",
      });
      params.set("q", query);
    } else {
      params.delete("q");
    }

    navigate(`/buyer/shop${params.size ? `?${params}` : ""}`);
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

  const handleAccountNavigation = (path) => {
    handleClose();
    navigate(path);
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
    const button = buttonRefs.current[activeIndex];
    if (button) {
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      });
    }
  }, [activeIndex]);

  const categoryGroups = [
    { title: "Art Type", filterType: "art_type", options: ART_TYPES },
    { title: "Style", filterType: "style", options: ART_STYLES },
    { title: "Materials", filterType: "material", options: ART_MATERIALS },
  ];
  const selectedCategories = new URLSearchParams(location.search);
  const categoryFilterTypes = [
    ...categoryGroups.map(({ filterType }) => filterType),
    "color",
  ];
  const hasSelectedCategories = categoryFilterTypes.some(
    (filterType) => selectedCategories.getAll(filterType).length > 0,
  );
  const [priceRange, setPriceRange] = useState(() => readPriceRange(new URLSearchParams(location.search)));
  useEffect(() => {
    setPriceRange(readPriceRange(new URLSearchParams(location.search)));
  }, [location.search]);

  const applyPriceRange = (range) => {
    setPriceRange(range);
    const params = new URLSearchParams(location.search);
    if (range[0] > 0) params.set("minPrice", String(range[0]));
    else params.delete("minPrice");
    if (range[1] < PRICE_LIMIT) params.set("maxPrice", String(range[1]));
    else params.delete("maxPrice");
    const pathname = location.pathname.startsWith("/buyer/shop") ? location.pathname : "/buyer/shop";
    navigate(`${pathname}${params.size ? `?${params}` : ""}`);
    void recordRecommendationEvent({
      event_type: "filter",
      filter_type: "price",
      min_price: range[0],
      max_price: range[1] === PRICE_LIMIT ? null : range[1],
      source_page: "buyer_layout",
    });
  };
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
  const handleCategoryOption = (option, filterType) => {
    void recordRecommendationEvent({
      event_type: "filter",
      filter_type: filterType,
      filter_value: option,
      source_page: "buyer_layout",
    });

    const params = new URLSearchParams(location.search);
    const currentValues = params.getAll(filterType);
    const isSelected = currentValues.some(
      (value) => value.toLowerCase() === option.toLowerCase(),
    );
    if (isSelected) {
      params.delete(filterType);
      currentValues
        .filter((value) => value.toLowerCase() !== option.toLowerCase())
        .forEach((value) => params.append(filterType, value));
    } else {
      params.append(filterType, option);
    }
    const pathname = location.pathname.startsWith("/buyer/shop")
      ? location.pathname
      : "/buyer/shop";
    navigate(`${pathname}${params.size ? `?${params}` : ""}`);
  };
  const handleColorOption = (color) => {
    handleCategoryOption(color, "color");
  };
  const clearSelectedCategories = () => {
    const params = new URLSearchParams(location.search);
    categoryFilterTypes.forEach((filterType) => params.delete(filterType));
    const pathname = location.pathname.startsWith("/buyer/shop")
      ? location.pathname
      : "/buyer/shop";
    navigate(`${pathname}${params.size ? `?${params}` : ""}`);
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
            {promotionHeader.message}
          </Typography>
          <Button
            size="small"
            onClick={() => navigate(promotionHeader.button_url)}
            sx={{
              color: "inherit",
              textTransform: "none",
              fontSize: "inherit",
            }}
          >
            {promotionHeader.button_label}{" "}
            <span aria-hidden="true" style={{ marginLeft: 10 }}>
              ›
            </span>
          </Button>
        </Box>
        <Toolbar
          sx={{
            display: { xs: "flex", md: "grid" },
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 420px) minmax(0, 1fr)",
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 1, lg: 2 },
            flexWrap: "wrap",
            py: { xs: 1, lg: 0 },
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
              justifySelf: "start",
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
              display: { xs: searchOpen ? "flex" : "none", md: "flex" },
              flexGrow: 1,
              flexBasis: { xs: "100%", md: "auto" },
              minWidth: 0,
              order: { xs: 2, md: 0 },
              justifyContent: "center",
              width: "100%",
            }}
          >
            {/* Inline on larger tablets; toggled below the header on smaller screens. */}
            <Paper
              id="buyer-header-search"
              component="form"
              role="search"
              onSubmit={handleSearchSubmit}
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                maxWidth: { xs: "100%", md: 420 },
                minWidth: 0,
                boxSizing: "border-box",
                backgroundColor: theme.palette.background.default,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: "24px",
                px: 1.5,
              }}
            >
              <InputBase
                inputRef={searchInputRef}
                fullWidth
                size="small"
                placeholder="Search art, mediums, features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                inputProps={{ "aria-label": "Search artworks" }}
                sx={{
                  py: 0.5,
                  minWidth: 0,
                  fontSize: { xs: "1rem", lg: "0.9rem" },
                }}
              />
              <IconButton
                type="submit"
                aria-label="Submit search"
                size="small"
                sx={{ p: 1, flexShrink: 0 }}
              >
                <SearchIcon />
              </IconButton>
            </Paper>
          </Box>

          <Box
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              flexShrink: 0,
              justifySelf: "end",
              ml: 1,
            }}
          >
            <IconButton
              sx={{ color: theme.palette.text.primary }}
              aria-label="Favorites"
              onClick={() => navigate("/buyer/favorites")}
            >
              <FavoriteBorderIcon />
            </IconButton>
            <IconButton
              sx={{ color: theme.palette.text.primary }}
              onClick={() => navigate("/buyer/notifications")}
              aria-label="View notifications"
            >
              <Badge
                badgeContent={unreadNotificationCount}
                color="error"
                invisible={unreadNotificationCount === 0}
                max={99}
              >
                <NotificationsNoneOutlinedIcon />
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
              aria-label="Open account menu"
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              sx={{ color: theme.palette.text.primary, ml: 1 }}
              onClick={loggedIn ? handleClick : () => navigate("/buyer/login")}
            >
              <AccountCircleIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={(event) => event.stopPropagation()}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: "visible",
                    width: "min(340px, calc(100vw - 24px))",
                    bgcolor: mode === "dark" ? "background.paper" : "#f7f4ee",
                    border: "1px solid",
                    borderColor: mode === "dark" ? "divider" : "#e9dfd1",
                    borderRadius: 3,
                    boxShadow: "0 18px 42px rgba(34, 29, 22, 0.18)",
                    mt: 1.5,
                    "& .MuiMenu-list": {
                      p: 1.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <Box
                sx={{
                  p: 2.5,
                  border: "1px solid",
                  borderColor: mode === "dark" ? "divider" : "#ead4b3",
                  borderRadius: 3,
                  bgcolor: "background.paper",
                  boxShadow: "0 5px 16px rgba(44, 36, 26, 0.10)",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={
                      profileImage
                        ? `http://localhost:5000/uploads/buyer/uploadProfile/${encodeURIComponent(profileImage)}`
                        : "http://localhost:5000/uploads/buyer/profile.jpg"
                    }
                    sx={{ width: 60, height: 60, flexShrink: 0 }}
                  >
                    {(firstName || username || "B").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700 }} noWrap>
                      {[firstName, lastName].filter(Boolean).join(" ") ||
                        username}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.25 }}
                    >
                      ArtMatch buyer
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  variant="outlined"
                  onClick={() =>
                    handleAccountNavigation("/buyer/profile/details")
                  }
                  sx={{
                    mt: 2,
                    minWidth: 164,
                    height: 48,
                    px: 2.5,
                    border: "2px solid",
                    borderColor: "text.primary",
                    borderRadius: 999,
                    color: "text.primary",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 15,
                    "&:hover": { borderWidth: 2, bgcolor: "action.hover" },
                  }}
                >
                  Edit profile
                </Button>
              </Box>
              <Box
                sx={{
                  p: 1,
                  border: "1px solid",
                  borderColor: mode === "dark" ? "divider" : "#ead4b3",
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                  boxShadow: "0 5px 16px rgba(44, 36, 26, 0.10)",
                  "& .MuiMenuItem-root": {
                    minHeight: 48,
                    px: 1.5,
                    borderRadius: 1.5,
                    fontSize: 15,
                    fontWeight: 500,
                  },
                  "& .MuiListItemIcon-root": {
                    minWidth: 38,
                    color: "text.secondary",
                  },
                }}
              >
                <MenuItem
                  onClick={() =>
                    handleAccountNavigation("/buyer/profile/orders")
                  }
                >
                  <ListItemIcon>
                    <ShoppingBagIcon fontSize="small" />
                  </ListItemIcon>
                  Orders
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    handleAccountNavigation("/buyer/profile/addresses")
                  }
                >
                  <ListItemIcon>
                    <LocationOnOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  Addresses
                </MenuItem>
                <MenuItem
                  onClick={() => handleAccountNavigation("/buyer/messages")}
                >
                  <ListItemIcon>
                    <ChatIcon fontSize="small" />
                  </ListItemIcon>
                  Messages
                  {unreadMessageCount > 0 && (
                    <Box
                      sx={{
                        ml: "auto",
                        minWidth: 30,
                        height: 26,
                        px: 1,
                        borderRadius: 99,
                        bgcolor: "rgba(211, 47, 47, 0.08)",
                        color: "error.main",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </Box>
                  )}
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    handleAccountNavigation("/buyer/profile/settings")
                  }
                >
                  <ListItemIcon>
                    <ShieldOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  Security &amp; privacy
                </MenuItem>
              </Box>
              <MenuItem
                onClick={() => {
                  handleClose();
                  handleOpenDialog();
                }}
                sx={{
                  minHeight: 48,
                  px: 1.5,
                  borderRadius: 1.5,
                  fontSize: 15,
                  fontWeight: 600,
                  "& .MuiListItemIcon-root": {
                    minWidth: 38,
                    color: "text.primary",
                  },
                }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Sign out
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
              <Button onClick={handleCloseDialog} color="text.secondary">
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

          {/* MOBILE/TABLET BUTTONS (Visible below LG breakpoint) */}
          <Box
            sx={{ display: { xs: "flex", lg: "none" }, gap: 1, flexShrink: 0, justifySelf: "end" }}
          >
            <IconButton
              onClick={() => setSearchOpen((current) => !current)}
              aria-label={searchOpen ? "Hide search" : "Show search"}
              aria-expanded={searchOpen}
              aria-controls="buyer-header-search"
              sx={{ display: { xs: "inline-flex", md: "none" }, color: theme.palette.text.primary }}
            >
              <SearchIcon />
            </IconButton>
            <IconButton
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open navigation menu"
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
              onClick={() => navigate("/buyer/shop")}
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
              onClick={() => navigate("/buyer/gallery")}
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
            maxHeight: `calc(100dvh - ${categoriesAnchorPosition?.top ?? 150}px - 12px)`,
            overflowY: "auto",
            p: { xs: 2, md: 2.5 },
            borderRadius: "0 0 20px 20px",
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: "0 12px 28px rgba(0, 0, 0, 0.14)",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Button
            size="small"
            onClick={clearSelectedCategories}
            disabled={!hasSelectedCategories}
            sx={{ textTransform: "none" }}
          >
            Clear selected categories
          </Button>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 2fr)) repeat(2, minmax(0, 1fr))",
            },
            alignItems: "start",
            gap: { xs: 2.5, md: 3 },
          }}
        >
          {categoryGroups.map((group) => (
            <Box key={group.title} sx={{ minWidth: 0 }}>
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
              <Box
                sx={{
                  display: "grid",
                  gridTemplateRows: `repeat(${Math.min(6, group.options.length)}, minmax(32px, auto))`,
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(0, 1fr)",
                  columnGap: 1,
                }}
              >
                {group.options.map((option) => (
                  <FormControlLabel
                    key={option}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedCategories
                          .getAll(group.filterType)
                          .some((value) => value.toLowerCase() === option.toLowerCase())}
                        onChange={() =>
                          handleCategoryOption(
                            option,
                            group.filterType,
                          )
                        }
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
                      minWidth: 0,
                      minHeight: 32,
                      ".MuiFormControlLabel-label": {
                        fontSize: 14,
                        color: theme.palette.text.secondary,
                      },
                    }}
                  />
                ))}
              </Box>
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
              {COLOR_PALETTE.map(({ hex: color, name }) => (
                <Box
                  key={color}
                  onClick={() => handleColorOption(name)}
                  role="checkbox"
                  tabIndex={0}
                  aria-checked={selectedCategories
                    .getAll("color")
                    .some((value) => value.toLowerCase() === name.toLowerCase())}
                  aria-label={`Filter by ${name}`}
                  title={name}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleColorOption(name);
                    }
                  }}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: selectedCategories
                      .getAll("color")
                      .some((value) => value.toLowerCase() === name.toLowerCase())
                      ? `2px solid ${theme.palette.error.main}`
                      : `1px solid ${theme.palette.divider}`,
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
            </Stack>
            <Typography variant="body2" color="error.main" sx={{ mt: 1, fontWeight: 600 }}>
              {formatPriceRange(priceRange)}
            </Typography>
            <Box sx={{ px: 1 }}>
              <Slider
                value={priceRange}
                min={0}
                max={PRICE_LIMIT}
                step={100}
                disableSwap
                getAriaLabel={(index) => index === 0 ? "Minimum price" : "Maximum price"}
                getAriaValueText={(value) => `\u20b1${value.toLocaleString("en-PH")}${value === PRICE_LIMIT ? "+" : ""}`}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `\u20b1${value.toLocaleString("en-PH")}${value === PRICE_LIMIT ? "+" : ""}`}
                onChange={(_, range) => setPriceRange(range)}
                onChangeCommitted={(_, range) => applyPriceRange(range)}
                sx={{ color: theme.palette.error.main, mt: 1 }}
              />
            </Box>
            <Button size="small" onClick={() => applyPriceRange([0, PRICE_LIMIT])} sx={{ textTransform: "none" }}>
              Clear price filter
            </Button>
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

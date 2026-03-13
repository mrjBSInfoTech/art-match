import React, { useRef, useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
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
  Divider,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import BarangayIcon from "../assets/BarangayIcon.png";

function Headers({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: "Home", path: "/main" },
    { label: "Concerns", path: "/concerns" },
    { label: "Announcements", path: "/announcements" },
    { label: "About us", path: "/about" },
  ];

  const buttonRefs = useRef([]);
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeIndex = menuItems.findIndex(
    (item) => item.path === location.pathname
  );

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
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

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: "#1e1f87",
          padding: "8px 20px",
        }}
        elevation={0}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          
          {/* LEFT SIDE - Logo & Brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <img
              src={BarangayIcon}
              alt="logo"
              style={{ width: 40, height: 40 }}
            />
            <Typography
              variant="h6"
              sx={{ 
                fontWeight: "bold", 
                color: "#fff",
                display: { xs: "none", sm: "block" }
              }}
            >
              Barangay 415 Zone 42
            </Typography>
          </Box>

          {/* RIGHT SIDE - Desktop Menu */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              position: "relative",
              alignItems: "center",
              backgroundColor: "#eaeaea",
              borderRadius: "8px",
              padding: "4px",
              gap: 1,
            }}
          >
            {/* MOVING HIGHLIGHT */}
            <Box
              sx={{
                position: "absolute",
                height: "48.5px",
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

            {/* SEARCH */}
            <TextField
              size="small"
              placeholder="Search"
              sx={{
                backgroundColor: "#fff",
                borderRadius: "6px",
                ml: 1,
                width: 180,
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* MOBILE MENU BUTTON */}
          <Box sx={{ display: { xs: "flex", md: "none" }, gap: 1 }}>
            <IconButton
              onClick={() => setSearchOpen(!searchOpen)}
              sx={{ color: "#fff" }}
            >
              <SearchIcon />
            </IconButton>
            <IconButton
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ color: "#fff" }}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* MOBILE DRAWER */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 270,
            backgroundColor: "#1e1f87",
          },
        }}
      >
        <List sx={{ p: 2 }}>
          {menuItems.map((item, index) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  backgroundColor: activeIndex === index ? "#4c7be8" : "transparent",
                  borderRadius: 2,
                  mb: 1,
                  "&:hover": {
                    backgroundColor: activeIndex === index ? "#4c7be8" : "rgba(255,255,255,0.1)",
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  sx={{
                    color: "#fff",
                    fontWeight: activeIndex === index ? "bold" : "normal",
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
        
        {/* MOBILE SEARCH */}
        {searchOpen && (
          <Box sx={{ p: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search in site"
              sx={{
                backgroundColor: "#fff",
                borderRadius: "6px",
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}
      </Drawer>

      {/* PAGE CONTENT */}
      {/* sx={{ p: { xs: 2, sm: 4 } }}  for later use*/}
      <Box>
        {children}
      </Box>
    </>
  );
}

export default Headers;
import React from "react";
import {
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
} from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import CollectionsRoundedIcon from "@mui/icons-material/CollectionsRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

const getActiveBottomTab = (pathname) => {
  if (pathname.startsWith("/buyer/artist") || pathname.startsWith("/buyer/seller")) {
    return "artist";
  }
  if (pathname.startsWith("/buyer/shop") || pathname.startsWith("/buyer/artwork")) {
    return "shop";
  }
  if (pathname.startsWith("/buyer/gallery")) {
    return "gallery";
  }
  if (
    pathname.startsWith("/buyer/profile") ||
    pathname.startsWith("/buyer/favorites") ||
    pathname.startsWith("/buyer/notifications") ||
    pathname.startsWith("/buyer/messages") ||
    pathname.startsWith("/buyer/orders") ||
    pathname.startsWith("/buyer/purchases") ||
    pathname.startsWith("/buyer/login") ||
    pathname.startsWith("/buyer/register")
  ) {
    return "profile";
  }
  if (pathname.startsWith("/buyer/main")) {
    return "home";
  }
  return false;
};

export default function MobileBottomNav({
  pathname,
  loggedIn,
  unreadAccountCount = 0,
  onNavigate,
}) {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const activeTab = getActiveBottomTab(pathname);

  const items = [
    {
      value: "home",
      label: "Home",
      path: "/buyer/main",
      icon: <HomeOutlinedIcon fontSize="small" />,
      activeIcon: <HomeRoundedIcon fontSize="small" />,
    },
    {
      value: "artist",
      label: "Artist",
      path: "/buyer/artist",
      icon: <PaletteOutlinedIcon fontSize="small" />,
      activeIcon: <PaletteRoundedIcon fontSize="small" />,
    },
    {
      value: "shop",
      label: "Shop",
      path: "/buyer/shop",
      icon: <StorefrontOutlinedIcon fontSize="small" />,
      activeIcon: <StorefrontRoundedIcon fontSize="small" />,
    },
    {
      value: "gallery",
      label: "Gallery",
      path: "/buyer/gallery",
      icon: <CollectionsOutlinedIcon fontSize="small" />,
      activeIcon: <CollectionsRoundedIcon fontSize="small" />,
    },
    {
      value: "profile",
      label: "Profile",
      path: loggedIn ? "/buyer/profile" : "/buyer/login",
      icon: (
        <Badge
          color="error"
          variant="dot"
          invisible={!loggedIn || unreadAccountCount === 0}
        >
          <PersonOutlineRoundedIcon fontSize="small" />
        </Badge>
      ),
      activeIcon: (
        <Badge
          color="error"
          variant="dot"
          invisible={!loggedIn || unreadAccountCount === 0}
        >
          <PersonRoundedIcon fontSize="small" />
        </Badge>
      ),
    },
  ];

  return (
    <Paper
      component="nav"
      aria-label="Mobile navigation"
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: darkMode
          ? "rgba(15, 23, 42, 0.96)"
          : "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(12px)",
        pb: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <BottomNavigation
        showLabels
        value={activeTab}
        onChange={(_, nextValue) => {
          const target = items.find((item) => item.value === nextValue);
          if (target) onNavigate(target.path);
        }}
        sx={{
          height: 62,
          backgroundColor: "transparent",
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            px: 0.5,
            py: 0.75,
            color: "text.secondary",
            transition: "color 150ms ease",
          },
          "& .MuiBottomNavigationAction-root.Mui-selected": {
            color: "#ef3340",
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.7rem",
            fontWeight: 600,
            mt: 0.25,
          },
          "& .MuiBottomNavigationAction-label.Mui-selected": {
            fontSize: "0.72rem",
            fontWeight: 800,
          },
        }}
      >
        {items.map((item) => {
          const isSelected = activeTab === item.value;
          return (
            <BottomNavigationAction
              key={item.value}
              value={item.value}
              label={item.label}
              icon={isSelected ? item.activeIcon : item.icon}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}


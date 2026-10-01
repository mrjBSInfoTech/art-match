import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { clearAuthData } from "../../../../utils/auth";
import { recordLogout } from "../../../api/buyer/buyerAuthenticationAPI";
import ProfileLogout from "./ProfileLogout";
// Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import LogoutIcon from "@mui/icons-material/Logout";

const NAV_ITEMS = [
  {
    label: "Orders",
    path: "/buyer/profile/orders",
    icon: <Inventory2OutlinedIcon fontSize="small" />,
  },
  {
    label: "Addresses",
    path: "/buyer/profile/addresses",
    icon: <LocationOnOutlinedIcon fontSize="small" />,
  },
  {
    label: "Messages",
    path: "/buyer/profile/messages",
    icon: <ChatBubbleOutlineIcon fontSize="small" />,
  },
  {
    label: "Security & privacy",
    path: "/buyer/profile/settings",
    icon: <ShieldOutlinedIcon fontSize="small" />,
  },
  {
    label: "Payment methods",
    path: "/buyer/profile/payment-methods",
    icon: <CreditCardOutlinedIcon fontSize="small" />,
  },
];

const getActiveItem = (pathname) => {
  return NAV_ITEMS.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
};

function AccountIdentityCard({ buyerName, username, profileImage, onEdit }) {
  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "#ead4b3",
        borderRadius: 2.5,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          src={
            profileImage
              ? `http://localhost:5000/uploads/buyer/profile/${encodeURIComponent(profileImage)}`
              : undefined
          }
          sx={{ width: 48, height: 48, flexShrink: 0 }}
        >
          {(buyerName || username || "B").charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
            {buyerName}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {username ? `@${username}` : "ArtMatch buyer"}
          </Typography>
        </Box>
      </Stack>
      <Button
        fullWidth
        variant="outlined"
        startIcon={<EditOutlinedIcon />}
        onClick={onEdit}
        sx={{
          mt: 1.5,
          height: 40,
          border: "1.5px solid",
          borderColor: "text.primary",
          borderRadius: 999,
          color: "text.primary",
          fontWeight: 700,
          textTransform: "none",
          "&:hover": { borderWidth: "1.5px", bgcolor: "action.hover" },
        }}
      >
        Edit profile
      </Button>
    </Box>
  );
}

const ProfileLayout = ({ title, showBack = false, children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const username = localStorage.getItem("buyer_username") || "";
  const buyerName =
    [
      localStorage.getItem("buyer_first_name"),
      localStorage.getItem("buyer_last_name"),
    ]
      .filter(Boolean)
      .join(" ") ||
    username ||
    "Buyer";
  const profileImage = localStorage.getItem("buyer_profile_image") || "";

  const activeItem = getActiveItem(location.pathname);
  const handleNavigate = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleLogoutOpen = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogout = async () => {
    setLogoutDialogOpen(false);
    setDrawerOpen(false);
    await recordLogout();
    clearAuthData("buyer");
    navigate("/buyer/login", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: { xs: "block", md: "none" },
          bgcolor:
            theme.palette.mode === "dark" ? "#1a2d3d" : "background.paper",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, fontSize: { xs: 24, md: 32 } }}
              >
                Account Center
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your profile, orders, and account preferences.
              </Typography>
            </Box>

            {!isDesktop && (
              <IconButton
                aria-label="Open account navigation"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  border: "1px solid",
                  borderColor: "rgba(0,0,0,0.12)",
                  borderRadius: 2,
                }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Stack>
        </Container>
      </Box>

      <Container
        maxWidth="xl"
        sx={{ py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: { xs: 0, md: 2.5 },
          }}
        >
          {isDesktop && (
            <Box
              component="aside"
              sx={{ width: 270, flexShrink: 0, position: "sticky", top: 24 }}
            >
              <Box
                sx={{
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  p: 2,
                  minHeight: "70vh",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <AccountIdentityCard
                  buyerName={buyerName}
                  username={username}
                  profileImage={profileImage}
                  onEdit={() => handleNavigate("/buyer/profile/details")}
                />

                <Box
                  sx={{
                    mt: 1.5,
                    p: 0.75,
                    border: "1px solid",
                    borderColor: "#ead4b3",
                    borderRadius: 2.5,
                  }}
                >
                  <List disablePadding>
                    {NAV_ITEMS.map((item) => {
                      const isActive = activeItem?.path === item.path;

                      return (
                        <ListItemButton
                          key={item.path}
                          selected={isActive}
                          onClick={() => handleNavigate(item.path)}
                          sx={{
                            borderRadius: 1.5,
                            minHeight: 44,
                            px: 1,
                            backgroundColor: isActive
                              ? "rgba(220, 0, 35, 0.07)"
                              : undefined,
                            "&.Mui-selected": { color: "error.main" },
                            "&.Mui-selected .MuiListItemIcon-root": {
                              color: "error.main",
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{ minWidth: 34, color: "text.secondary" }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText primary={item.label} />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Box>
                <Button
                  variant="text"
                  color="inherit"
                  fullWidth
                  onClick={handleLogoutOpen}
                  sx={{
                    mt: "auto",
                    pt: 2,
                    justifyContent: "flex-start",
                    borderRadius: 1.5,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                  startIcon={<LogoutIcon />}
                >
                  Sign out
                </Button>
              </Box>
            </Box>
          )}

          <Box component="main" sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            {!isDesktop && (
              <Box sx={{ mb: 3 }}>
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={activeItem?.path || ""}
                  onChange={(event) => handleNavigate(event.target.value)}
                  sx={{
                    borderRadius: 3,
                    bgcolor: "background.paper",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.12)",
                    },
                  }}
                  renderValue={(selected) =>
                    NAV_ITEMS.find((item) => item.path === selected)?.label ||
                    "Account navigation"
                  }
                >
                  {NAV_ITEMS.map((item) => (
                    <MenuItem key={item.path} value={item.path}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            <Stack spacing={2}>
              {!isDesktop && (
                <AccountIdentityCard
                  buyerName={buyerName}
                  username={username}
                  profileImage={profileImage}
                  onEdit={() => handleNavigate("/buyer/profile/details")}
                />
              )}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
              >
                {showBack && (
                  <IconButton
                    aria-label="Go back"
                    onClick={() => navigate(-1)}
                    sx={{
                      border: "1px solid",
                      borderColor: "rgba(0,0,0,0.12)",
                      borderRadius: 2,
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                )}
              </Stack>

              {children || <Outlet />}
            </Stack>
          </Box>
        </Box>
      </Container>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 288, p: 2, borderRadius: 0 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Typography sx={{ fontWeight: 700 }}>Account Center</Typography>
          <IconButton
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <List disablePadding>
          {NAV_ITEMS.map((item) => {
            const isActive = activeItem?.path === item.path;

            return (
              <React.Fragment key={item.path}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    backgroundColor:
                      isActive && theme.palette.mode === "dark"
                        ? "rgba(96, 165, 250, 0.22)"
                        : undefined,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>
        <Button
          variant="text"
          color="inherit"
          fullWidth
          onClick={handleLogoutOpen}
          sx={{
            mt: 2,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
          startIcon={<LogoutIcon />}
        >
          Sign out
        </Button>
      </Drawer>

      <ProfileLogout
        open={logoutDialogOpen}
        handleLogout={handleLogout}
        handleClose={() => setLogoutDialogOpen(false)}
      />
    </Box>
  );
};

export default ProfileLayout;

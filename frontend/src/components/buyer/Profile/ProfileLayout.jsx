import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
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

const NAV_ITEMS = [
  { label: "Profile", path: "/buyer/profile" },
  { label: "Addresses", path: "/buyer/profile/addresses" },
  { label: "Orders", path: "/buyer/profile/orders" },
  { label: "Settings", path: "/buyer/profile/settings" },
];

const getActiveItem = (pathname) => {
  const match = NAV_ITEMS.filter((item) => pathname.startsWith(item.path)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];
  return match || NAV_ITEMS[0];
};

const ProfileLayout = ({ title, showBack = false, children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

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
    <Box sx={{ bgcolor: "#f7f7f7", minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid rgba(0,0,0,0.08)", bgcolor: "#fff" }}>
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

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: { xs: 0, md: 4 },
          }}
        >
          {isDesktop && (
            <Box
              component="aside"
              sx={{ width: 260, flexShrink: 0, position: "sticky", top: 24 }}
            >
              <Box
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 3,
                  p: 2,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1.5,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Navigation
                </Typography>

                <List disablePadding>
                  {NAV_ITEMS.map((item) => {
                    const isActive = activeItem.path === item.path;

                    return (
                      <ListItemButton
                        key={item.path}
                        selected={isActive}
                        onClick={() => handleNavigate(item.path)}
                        sx={{ borderRadius: 2, mb: 0.5 }}
                      >
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    );
                  })}
                </List>
                <Divider sx={{ my: 1.5 }} />
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  onClick={handleLogoutOpen}
                  sx={{
                    mt: 1,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Logout
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
                  value={activeItem.path}
                  onChange={(event) => handleNavigate(event.target.value)}
                  sx={{
                    borderRadius: 3,
                    bgcolor: "#fff",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(0,0,0,0.12)",
                    },
                  }}
                >
                  {NAV_ITEMS.map((item) => (
                    <MenuItem key={item.path} value={item.path}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            <Box
              sx={{
                bgcolor: "#fff",
                borderRadius: 3,
                p: { xs: 2, md: 4 },
                boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
              }}
            >
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
            </Box>
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
            const isActive = activeItem.path === item.path;

            return (
              <React.Fragment key={item.path}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigate(item.path)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>
        <Button
          variant="contained"
          color="error"
          fullWidth
          onClick={handleLogoutOpen}
          sx={{
            mt: 2,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Logout
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

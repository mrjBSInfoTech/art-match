import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AdminInfo from "./AdminInfo";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

export default function AdminCard({
  admins,
  onEdit,
  onDelete,
  onPromote,
  onDemote,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const open = Boolean(anchorEl);

  const currentRole = localStorage.getItem("admin_role");
  const isSuperAdmin = currentRole === "super admin";
  const roleRank = {
    customize: 1,
    moderator: 2,
    admin: 3,
    "super admin": 4,
  };
  const currentRank = roleRank[currentRole] || 0;
  const hasPermission = (permission) => {
    if (isSuperAdmin) return true;
    if (currentRole === "admin")
      return ["can_edit", "can_delete"].includes(permission);
    if (currentRole === "moderator") return permission === "can_edit";
    return (
      permission === "can_edit" &&
      localStorage.getItem("admin_can_edit") === "1"
    );
  };
  const canManageTarget = (admin, permission) => {
    if (!admin) return false;
    return (
      hasPermission(permission) &&
      (roleRank[String(admin.role).toLowerCase()] || 0) < currentRank
    );
  };
  const canPromote =
    isSuperAdmin && localStorage.getItem("admin_can_promote") === "1";
  const canDemote =
    isSuperAdmin && localStorage.getItem("admin_can_demote") === "1";

  const handleMenuOpen = (event, admin) => {
    setAnchorEl(event.currentTarget);
    setSelectedAdmin(admin);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleInfoOpen = (admin) => {
    setSelectedAdmin(admin);
    setOpenInfoDialog(true);
  };

  const handleInfoClose = () => {
    setOpenInfoDialog(false);
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
        gap: 2,
        minWidth: 0,
      }}
    >
      {admins.map((admin) => (
        <Card
          key={admin.admin_id}
          sx={{
            overflow: "hidden",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2.5,
            boxShadow: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            "&:hover": {
              borderColor: "text.secondary",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            },
          }}
        >
          <Box
            sx={{
              width: "100%",
              aspectRatio: "5 / 4",
              position: "relative",
              backgroundColor: theme.palette.background.default,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CardMedia
              component="img"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
              }}
              image={
                admin.image
                  ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(admin.image)}`
                  : `http://localhost:5000/uploads/profile.jpg`
              }
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "http://localhost:5000/uploads/profile.jpg";
              }}
              alt={admin.first_name}
            />
          </Box>

          <CardContent
            sx={{
              p: 2,
              "&:last-child": { pb: 2 },
              flex: 1,
              minHeight: 150,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, lineHeight: 1.25 }}
                  noWrap
                >
                  {admin.first_name} {admin.last_name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block", mt: 0.25 }}
                  noWrap
                >
                  @{admin.username}
                </Typography>
                <Chip
                  size="small"
                  label={admin.role}
                  color={admin.role === "super admin" ? "error" : "primary"}
                  sx={{
                    mt: 0.5,
                    height: 18,
                    textTransform: "capitalize",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 1,
                    color:
                      admin.role === "super admin"
                        ? theme.palette.error.main
                        : theme.palette.success.main,
                    backgroundColor:
                      admin.role === "super admin"
                        ? theme.palette.mode === "dark"
                          ? "rgba(239, 68, 68, 0.16)"
                          : "#fef2f2"
                        : theme.palette.mode === "dark"
                          ? "rgba(34, 197, 94, 0.16)"
                          : "#dcfce7",
                  }}
                />
              </Box>

              {(canManageTarget(admin, "can_edit") ||
                canManageTarget(admin, "can_delete") ||
                canPromote ||
                canDemote) && (
                <IconButton
                  size="small"
                  onClick={(event) => handleMenuOpen(event, admin)}
                  sx={{
                    ml: "auto",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Info Button */}
            <Button
              variant="contained"
              size="small"
              fullWidth
              startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={() => handleInfoOpen(admin)}
              sx={{
                mt: "auto",
                py: 0.55,
                backgroundColor:
                  theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                color: theme.palette.text.primary,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
                fontSize: 11,
                "& .MuiButton-startIcon": { color: theme.palette.error.main },
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  borderColor: theme.palette.text.secondary,
                  boxShadow: "none",
                },
              }}
            >
              View Details
            </Button>

            {/* Options Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open && selectedAdmin?.admin_id === admin.admin_id}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              {canManageTarget(selectedAdmin, "can_edit") && (
                <MenuItem
                  onClick={() => {
                    onEdit(selectedAdmin);
                    handleMenuClose();
                  }}
                  sx={{
                    color: "success.main",
                  }}
                >
                  <EditIcon sx={{ mr: 1, fontSize: "20px" }} />
                  Edit
                </MenuItem>
              )}
              {canPromote &&
                selectedAdmin?.admin_id !==
                  Number(localStorage.getItem("admin_id")) && (
                  <MenuItem
                    onClick={() => {
                      onPromote(selectedAdmin.admin_id);
                      handleMenuClose();
                    }}
                    sx={{ color: "primary.main" }}
                  >
                    <ArrowUpwardIcon sx={{ mr: 1, fontSize: "20px" }} />
                    Promote
                  </MenuItem>
                )}
              {canDemote &&
                selectedAdmin?.admin_id !==
                  Number(localStorage.getItem("admin_id")) && (
                  <MenuItem
                    onClick={() => {
                      onDemote(selectedAdmin.admin_id);
                      handleMenuClose();
                    }}
                    sx={{ color: "warning.main" }}
                  >
                    <ArrowDownwardIcon sx={{ mr: 1, fontSize: "20px" }} />
                    Demote
                  </MenuItem>
                )}
              {canManageTarget(selectedAdmin, "can_delete") && (
                <MenuItem
                  onClick={() => {
                    onDelete(selectedAdmin.admin_id);
                    handleMenuClose();
                  }}
                  sx={{
                    color: "error.main",
                  }}
                >
                  <DeleteIcon sx={{ mr: 1, fontSize: "20px" }} />
                  Delete
                </MenuItem>
              )}
            </Menu>
          </CardContent>
        </Card>
      ))}

      {/* Admin Info Dialog */}
      <AdminInfo
        open={openInfoDialog}
        handleClose={handleInfoClose}
        selectedAdmin={selectedAdmin}
      />
    </Box>
  );
}

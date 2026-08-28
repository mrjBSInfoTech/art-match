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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AdminInfo from "./AdminInfo";

export default function AdminCard({
  admins,
  onEdit,
  onDelete,
  onPromote,
  onDemote,
}) {
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
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        },
        gap: 2,
      }}
    >
      {admins.map((admin) => (
        <Card key={admin.admin_id}>
          <Box
            sx={{
              width: "100%",
              height: 250,
              backgroundColor: "#f5f5f5",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CardMedia
              component="img"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              image={
                admin.image
                  ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(admin.image)}`
                  : `http://localhost:5000/uploads/profile.jpg`
              }
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://via.placeholder.com/250x150?text=No+Profile";
              }}
              alt={admin.first_name}
            />
          </Box>

          <CardContent sx={{ flex: 1, overflow: "auto" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {admin.first_name} {admin.last_name}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  @{admin.username}
                </Typography>
                <Chip
                  size="small"
                  label={admin.role}
                  color={admin.role === "super admin" ? "error" : "primary"}
                  sx={{ mt: 1, textTransform: "capitalize" }}
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
              variant="outlined"
              size="small"
              fullWidth
              startIcon={<InfoIcon />}
              onClick={() => handleInfoOpen(admin)}
              sx={{ mb: 2 }}
            >
              View Info
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

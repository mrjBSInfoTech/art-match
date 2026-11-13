import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AdminInfo from "./AdminInfo";

export default function AdminTable({
  admins = [],
  onEdit,
  onDelete,
  onPromote,
  onDemote,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const menuOpen = Boolean(anchorEl);

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
    if (currentRole === "admin") {
      return ["can_edit", "can_delete"].includes(permission);
    }
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

  const selfAdminId = Number(localStorage.getItem("admin_id"));

  return (
    <>
      <Paper
        component="section"
        variant="outlined"
        aria-label="Admin accounts table"
        sx={{
          borderRadius: 3.5,
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
            Admin accounts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            Manage administrator accounts, roles, and access levels.
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
          <Table
            stickyHeader
            size="small"
            aria-label="Admin accounts table"
            sx={{ minWidth: 720 }}
          >
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: "text.secondary",
                    py: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Admin</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {admins.map((admin) => {
                const fullName = `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || admin.username || "Unnamed admin";
                const imageUrl = admin.image
                  ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(admin.image)}`
                  : "http://localhost:5000/uploads/profile.jpg";
                const showMenu =
                  canManageTarget(admin, "can_edit") ||
                  canManageTarget(admin, "can_delete") ||
                  canPromote ||
                  canDemote;

                return (
                  <TableRow
                    key={admin.admin_id}
                    hover
                    sx={{
                      "& td": { py: 1.75, verticalAlign: "middle" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={{ minWidth: 230, maxWidth: 320 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={fullName}
                          onError={(event) => {
                            event.target.onerror = null;
                            event.target.src = "http://localhost:5000/uploads/profile.jpg";
                          }}
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            objectFit: "cover",
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap title={fullName}>
                            {fullName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                            @{admin.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography variant="body2" color="text.primary" sx={{ overflowWrap: "anywhere" }}>
                        {admin.email || "No email provided"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Chip
                        size="small"
                        label={admin.role}
                        sx={{
                          textTransform: "capitalize",
                          fontSize: 11,
                          fontWeight: 800,
                          borderRadius: 1.5,
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
                    </TableCell>

                    <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                        <Button
                          variant="outlined"
                          onClick={() => handleInfoOpen(admin)}
                          sx={{
                            minHeight: 40,
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: "none",
                            whiteSpace: "nowrap",
                          }}
                        >
                          View details
                        </Button>
                        {showMenu && (
                          <IconButton
                            size="small"
                            aria-label={`Manage ${fullName}`}
                            onClick={(event) => handleMenuOpen(event, admin)}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {canManageTarget(selectedAdmin, "can_edit") && (
          <MenuItem
            onClick={() => {
              onEdit?.(selectedAdmin);
              handleMenuClose();
            }}
            sx={{ color: "success.main" }}
          >
            <EditIcon sx={{ mr: 1, fontSize: 20 }} />
            Edit
          </MenuItem>
        )}
        {canPromote && selectedAdmin?.admin_id !== selfAdminId && (
          <MenuItem
            onClick={() => {
              onPromote?.(selectedAdmin.admin_id);
              handleMenuClose();
            }}
            sx={{ color: "primary.main" }}
          >
            <ArrowUpwardIcon sx={{ mr: 1, fontSize: 20 }} />
            Promote
          </MenuItem>
        )}
        {canDemote && selectedAdmin?.admin_id !== selfAdminId && (
          <MenuItem
            onClick={() => {
              onDemote?.(selectedAdmin.admin_id);
              handleMenuClose();
            }}
            sx={{ color: "warning.main" }}
          >
            <ArrowDownwardIcon sx={{ mr: 1, fontSize: 20 }} />
            Demote
          </MenuItem>
        )}
        {canManageTarget(selectedAdmin, "can_delete") && (
          <MenuItem
            onClick={() => {
              onDelete?.(selectedAdmin.admin_id);
              handleMenuClose();
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      <AdminInfo
        open={openInfoDialog}
        handleClose={() => setOpenInfoDialog(false)}
        selectedAdmin={selectedAdmin}
      />
    </>
  );
}


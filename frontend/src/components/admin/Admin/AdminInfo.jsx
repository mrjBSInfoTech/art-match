import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Slide,
  Box,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AdminInfo({ open, handleClose, selectedAdmin }) {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    if (selectedAdmin) {
      setAdmin(selectedAdmin);
    } else {
      setAdmin(null);
    }
  }, [selectedAdmin, open]);

  function capitalize(text) {
    if (!text) return "";
    return text
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const detailLabelSx = {
    display: "block",
    color: "#475569",
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
  };

  const imageUrl = admin?.image
    ? `http://localhost:5000/uploads/admin/uploadAdmin/${encodeURIComponent(admin.image)}`
    : "http://localhost:5000/uploads/profile.jpg";

  const permissionChip = (label, value) => (
    <Chip
      label={`${label}: ${value ? "Yes" : "No"}`}
      size="small"
      sx={{
        height: 21,
        color: value ? "#15803d" : "#64748b",
        backgroundColor: value ? "#dcfce7" : "#f1f5f9",
        fontSize: 10,
        fontWeight: 700,
      }}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: "#fff",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: "#0f172a",
          fontSize: 16,
          fontWeight: 700,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <AdminPanelSettingsOutlinedIcon
          sx={{ color: "#ef3340", fontSize: 20 }}
        />
        Admin Information
        <Button
          aria-label="Close admin information"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: "#64748b",
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, backgroundColor: "#fff" }}>
        {admin ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid #cbd5e1",
                backgroundColor: "#f1f5f9",
              }}
            >
              <Box
                component="img"
                src={imageUrl}
                alt={`${admin.first_name || "Admin"} profile`}
                onError={(event) => {
                  event.currentTarget.src =
                    "http://localhost:5000/uploads/profile.jpg";
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <Chip
                label={capitalize(admin.role) || "Administrator"}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: "#fff",
                  color: "#1d4ed8",
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                backgroundColor: "#f8fafc",
              }}
            >
              <Box>
                <Typography sx={detailLabelSx}>Name</Typography>
                <Typography sx={detailValueSx}>
                  {admin.first_name || "N/A"} {admin.last_name || ""}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Username</Typography>
                <Typography sx={detailValueSx}>
                  {admin.username || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Email</Typography>
                <Typography sx={detailValueSx}>
                  {admin.email || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Date Created</Typography>
                <Typography sx={detailValueSx}>
                  {formatDate(admin.created_at)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Profile Updated</Typography>
                <Typography sx={detailValueSx}>
                  {formatDate(admin.updated_at)}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Permissions</Typography>
                <Box
                  sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5 }}
                >
                  {permissionChip("Add", admin.can_add)}
                  {permissionChip("Edit", admin.can_edit)}
                  {permissionChip("Delete", admin.can_delete)}
                  {permissionChip("Promote", admin.can_promote)}
                  {permissionChip("Demote", admin.can_demote)}
                </Box>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Password Changes</Typography>
                <Typography sx={detailValueSx}>
                  {admin.password_changed ?? 0}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid #e2e8f0" }}>
        <Button
          onClick={handleClose}
          sx={{
            ml: "auto",
            backgroundColor: "#eef2f7",
            color: "#172033",
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { backgroundColor: "#e2e8f7" },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AdminInfo;

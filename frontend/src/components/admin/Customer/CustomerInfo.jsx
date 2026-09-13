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
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function CustomerInfo({ open, handleClose, selectedCustomer }) {
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    setCustomer(selectedCustomer || null);
  }, [selectedCustomer, open]);

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

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";

  const imageUrl = customer?.image
    ? `http://localhost:5000/uploads/buyer/profile/${encodeURIComponent(customer.image)}`
    : "http://localhost:5000/uploads/profile.jpg";

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
        <PersonOutlineOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Customer Information
        <Button
          aria-label="Close customer information"
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
        {customer ? (
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
                alt={`${customer.first_name || customer.username || "Customer"} profile`}
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
                label={customer.is_banned ? "BANNED" : "ACTIVE"}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: "#fff",
                  color: customer.is_banned ? "#dc2626" : "#15803d",
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
                <Typography sx={detailLabelSx}>Full Name</Typography>
                <Typography sx={detailValueSx}>
                  {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                    "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Username</Typography>
                <Typography sx={detailValueSx}>
                  {customer.username || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Email</Typography>
                <Typography sx={detailValueSx}>
                  {customer.email || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Phone Number</Typography>
                <Typography sx={detailValueSx}>
                  {customer.phone_number || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Birthday</Typography>
                <Typography sx={detailValueSx}>
                  {formatDate(customer.birthdate)}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Address</Typography>
                <Typography sx={detailValueSx}>
                  {customer.address || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography color="text.secondary">No customer selected.</Typography>
        )}
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

export default CustomerInfo;

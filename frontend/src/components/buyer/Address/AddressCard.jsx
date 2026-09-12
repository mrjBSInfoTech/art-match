import React from "react";
import {
  Box,
  Chip,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MarkunreadMailboxOutlinedIcon from "@mui/icons-material/MarkunreadMailboxOutlined";

function AddressCard({ addresses, onEdit, onDelete }) {
  const addressList = Array.isArray(addresses) ? addresses : [];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(1, 1fr)",
          md: "repeat(1, 1fr)",
          lg: "repeat(1, 1fr)",
        },
        gap: 2.5,
      }}
    >
      {addressList.map((address) => {
        const isCurrent = Boolean(address?.is_current);

        return (
          <Card
            key={address.address_id}
            variant="outlined"
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: 3,
              borderColor: "error.main",
              borderWidth: 1.5,
              backgroundColor: isCurrent ? "rgba(175, 79, 79, 0.02)" : "#fff",
              boxShadow: isCurrent
                ? "0 4px 20px -2px rgba(175, 79, 79, 0.12)"
                : "none",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-3px)",
                borderColor: "error.dark",
                backgroundColor: "rgba(175, 79, 79, 0.06)",
                boxShadow: "0 8px 24px -4px rgba(175, 79, 79, 0.24)",
              },
            }}
          >
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              {/* Header: Icon, Label, Actions */}
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      width: 44,
                      height: 44,
                      borderRadius: 2.5,
                      bgcolor: isCurrent ? "error.main" : "action.hover",
                      color: isCurrent ? "#fff" : "text.secondary",
                      transition: "0.2s ease-in-out",
                    }}
                  >
                    <HomeOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, lineHeight: 1.2 }}
                    >
                      Delivery Address
                    </Typography>
                    {isCurrent && (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                        label="Default"
                        size="small"
                        color="error"
                        sx={{
                          mt: 0.6,
                          height: 22,
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          borderRadius: 999,
                        }}
                      />
                    )}
                  </Box>
                </Stack>

                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Edit address">
                    <IconButton
                      aria-label="Edit address"
                      onClick={() => onEdit?.(address)}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          color: "primary.main",
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete address">
                    <IconButton
                      aria-label="Delete address"
                      onClick={() => onDelete?.(address)}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          color: "error.main",
                          bgcolor: "error.50",
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>

              {/* Address Details */}
              <Stack spacing={1.25} sx={{ mt: 2.5 }}>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 600, color: "text.primary" }}
                >
                  {address.street_name || "Street address unavailable"}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <LocationOnOutlinedIcon
                    sx={{
                      mt: 0.2,
                      fontSize: 18,
                      color: isCurrent ? "error.main" : "text.secondary",
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.5 }}
                  >
                    {[
                      address.barangay,
                      address.city,
                      address.province,
                      address.region,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Location unavailable"}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <MarkunreadMailboxOutlinedIcon
                    sx={{
                      fontSize: 18,
                      color: isCurrent ? "error.main" : "text.secondary",
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {address.postal_code || "Not provided"}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

export default AddressCard;
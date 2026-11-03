import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkImage from "../../common/ArtworkImage";
// Icons matching ArtworkCard.jsx
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export default function CertificateCard({
  certificates = [],
  onViewDetails,
  onCopyText,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const handleMenuOpen = (event, cert) => {
    setAnchorEl(event.currentTarget);
    setSelectedCert(cert);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCert(null);
  };

  const handleCopyIdFromMenu = () => {
    if (selectedCert?.certificateId) {
      onCopyText?.(selectedCert.certificateId, "Certificate ID");
    }
    handleMenuClose();
  };

  const handleOpenLinkFromMenu = () => {
    if (selectedCert?.verificationUrl) {
      window.open(selectedCert.verificationUrl, "_blank", "noopener,noreferrer");
    }
    handleMenuClose();
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          lg: "repeat(5, minmax(0, 1fr))",
        },
        gap: 2,
      }}
    >
      {certificates.map((cert) => {
        const artworkTitle = cert.artwork?.title || "Untitled Artwork";
        const artistName = cert.artist?.name || "Student Artist";

        return (
          <Card
            key={cert.certificateId || cert.artworkId}
            sx={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
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
            {/* Top Image Container matching ArtworkCard.jsx */}
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
              <ArtworkImage
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
                image={cert.artwork?.image}
                alt={artworkTitle}
              />

              {/* Status Badge in Top-Right matching ArtworkCard.jsx */}
              <Chip
                label="VERIFIED COA"
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  borderRadius: 2,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.success[theme.palette.mode === "dark" ? "light" : "dark"],
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
                }}
              />
            </Box>

            {/* Card Content matching ArtworkCard.jsx structure */}
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
                <Box sx={{ minWidth: 0, pr: 0.5, flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: theme.palette.text.primary,
                      fontWeight: 700,
                      lineHeight: 1.25,
                    }}
                    noWrap
                  >
                    {artworkTitle}
                  </Typography>

                  {/* Artist name & Certificate ID subtitle */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.25, fontSize: 11 }}
                    noWrap
                  >
                    By {artistName}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: 11,
                      color: "text.secondary",
                      mt: 0.25,
                    }}
                    noWrap
                  >
                    {cert.certificateId}
                  </Typography>

                  {/* Price display matching ArtworkCard.jsx */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: "#ff5a5f", fontWeight: 700 }}
                      noWrap
                    >
                      ₱{Number(cert.artwork?.price || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                <Tooltip title="Actions">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, cert)}
                    sx={{
                      ml: "auto",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* View Details Button matching ArtworkCard.jsx */}
              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => onViewDetails?.(cert)}
                sx={{
                  mt: "auto",
                  py: 0.55,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "none",
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
            </CardContent>
          </Card>
        );
      })}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 160,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
          },
        }}
      >
        <MenuItem onClick={handleCopyIdFromMenu} sx={{ fontSize: 12 }}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
          Copy Certificate ID
        </MenuItem>
        {selectedCert?.verificationUrl && (
          <MenuItem onClick={handleOpenLinkFromMenu} sx={{ fontSize: 12 }}>
            <OpenInNewIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
            Open Verification Page
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}


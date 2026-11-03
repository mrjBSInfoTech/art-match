import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Slide,
  Stack,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";

// Animation transition matching ArtworkInfo.jsx
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const formatDate = (value) => {
  if (!value) return "Not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not provided"
    : new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

export default function CertificateImage({
  open,
  handleClose,
  selectedCertificate,
  onCopyText,
}) {
  const theme = useTheme();
  const cert = selectedCertificate;
  const [blobUrl, setBlobUrl] = useState("");

  useEffect(() => {
    if (!open || !cert?.svg) {
      setBlobUrl("");
      return;
    }

    const blob = new Blob([cert.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, cert?.svg]);

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 860px)",
          maxWidth: "860px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
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
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <VerifiedUserOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Certificate Information
        <Button
          aria-label="Close certificate information"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {cert ? (
          <Box>
            {/* Certificate SVG Display Container */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: { xs: 1, sm: 1.5 },
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              }}
            >
              {blobUrl ? (
                <Box
                  component="img"
                  src={blobUrl}
                  alt={`Certificate of Authenticity - ${cert.certificateId}`}
                  sx={{
                    width: "100%",
                    height: "auto",
                    maxHeight: "55vh",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <Box sx={{ p: 6, display: "grid", placeItems: "center" }}>
                  <CircularProgress size={30} color="error" />
                </Box>
              )}

              <Chip
                label="AUTHENTIC COA"
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.success.main,
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
                }}
              />
            </Box>

            {/* Structured 2-column info grid matching ArtworkInfo.jsx */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Box>
                <Typography sx={detailLabelSx}>Certificate ID</Typography>
                <Typography
                  sx={{
                    ...detailValueSx,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#941b27",
                  }}
                >
                  {cert.certificateId}
                </Typography>
              </Box>

              <Box>
                <Typography sx={detailLabelSx}>Verification Status</Typography>
                <Typography sx={{ ...detailValueSx, color: theme.palette.success.main }}>
                  Active & Registered
                </Typography>
              </Box>

              <Box>
                <Typography sx={detailLabelSx}>Artwork Title</Typography>
                <Typography sx={detailValueSx}>
                  {cert.artwork?.title || "Untitled Artwork"}
                </Typography>
              </Box>

              <Box>
                <Typography sx={detailLabelSx}>Student Artist</Typography>
                <Typography sx={detailValueSx}>
                  {cert.artist?.name || "Student Artist"}
                </Typography>
              </Box>

              <Box>
                <Typography sx={detailLabelSx}>Artist Course / Dept</Typography>
                <Typography sx={detailValueSx}>
                  {cert.artist?.course || "Art Department"}
                </Typography>
              </Box>

              <Box>
                <Typography sx={detailLabelSx}>Issue Date</Typography>
                <Typography sx={detailValueSx}>
                  {formatDate(cert.publishedAt)}
                </Typography>
              </Box>

              {cert.artwork?.genre && (
                <Box>
                  <Typography sx={detailLabelSx}>Style / Genre</Typography>
                  <Typography sx={detailValueSx}>
                    {cert.artwork.genre}
                  </Typography>
                </Box>
              )}

              {cert.artwork?.artType && (
                <Box>
                  <Typography sx={detailLabelSx}>Art Type</Typography>
                  <Typography sx={detailValueSx}>
                    {cert.artwork.artType}
                  </Typography>
                </Box>
              )}

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Price</Typography>
                <Typography sx={{ ...detailValueSx, color: "#dc2626", fontWeight: 700 }}>
                  {cert.artwork?.price !== null && cert.artwork?.price !== undefined
                    ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(cert.artwork.price))
                    : "Not provided"}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: theme.palette.text.secondary }}>
            No certificate selected.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack direction="row" spacing={1}>
          {blobUrl && (
            <Button
              component="a"
              href={blobUrl}
              download={`Certificate-${cert?.certificateId || "Authenticity"}.svg`}
              variant="outlined"
              size="small"
              startIcon={<DownloadOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 2,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                textTransform: "none",
                "&:hover": { borderColor: theme.palette.text.secondary },
              }}
            >
              Download SVG
            </Button>
          )}

          {cert?.verificationUrl && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={() => onCopyText?.(cert.verificationUrl, "Verification Link")}
              sx={{
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 2,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                textTransform: "none",
                "&:hover": { borderColor: theme.palette.text.secondary },
              }}
            >
              Copy Link
            </Button>
          )}

          {cert?.verificationUrl && (
            <Button
              component="a"
              href={cert.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />}
              sx={{
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 2,
                color: theme.palette.primary.main,
                textTransform: "none",
              }}
            >
              Verify Public
            </Button>
          )}
        </Stack>

        <Button
          onClick={handleClose}
          sx={{
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "none",
            borderRadius: 2,
            px: 2.5,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}


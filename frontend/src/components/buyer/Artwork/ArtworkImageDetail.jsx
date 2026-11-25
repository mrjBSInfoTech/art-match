import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { API_BASE_URL } from "../../../api/apiBase.js";
import { loadArtworkImage } from "../../../utils/artworkImageLoader.js";
import {
  artworkImageProtectionProps,
  artworkImageProtectionSx,
  useArtworkBlurOnAway,
} from "../../../utils/artworkImageProtection";
import { isAuthenticated } from "../../../../utils/auth";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const getArtworkFilename = (image) => {
  const pathname = new URL(image, API_BASE_URL).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const artworkPathIndex = segments.lastIndexOf("uploadArtwork");
  const filename =
    artworkPathIndex >= 0
      ? segments[artworkPathIndex + 1]
      : segments[segments.length - 1];
  if (!filename) throw new Error("Artwork image filename is missing.");
  return decodeURIComponent(filename);
};

export default function ArtworkImageDetail({
  open,
  handleClose,
  image,
  title = "Artwork Preview",
}) {
  const theme = useTheme();
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { blurSx } = useArtworkBlurOnAway({ enabled: true });

  const imageSource = String(image || "").trim();

  useEffect(() => {
    if (!open || !imageSource) {
      setImageUrl("");
      setError("");
      setLoading(false);
      return undefined;
    }

    let active = true;
    let objectUrl = "";

    const loadImage = async () => {
      try {
        setLoading(true);
        setError("");

        if (/^(data:|blob:)/i.test(imageSource)) {
          if (active) setImageUrl(imageSource);
          return;
        }

        const filename = getArtworkFilename(imageSource);
        const token = isAuthenticated("buyer") ? "buyer" : null;
        const blob = await loadArtworkImage({
          filename,
          variant: "web",
          token,
        });

        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setImageUrl(objectUrl);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (active) {
          setError(err?.message || "Unable to load artwork image.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadImage();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, imageSource]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      aria-labelledby="artwork-image-dialog-title"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 680px)",
          maxWidth: "680px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        id="artwork-image-dialog-title"
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
        <ImageOutlinedIcon sx={{ color: "#ef3340", fontSize: 20, flexShrink: 0 }} />
        <Box
          component="span"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title || "Artwork Preview"}
        </Box>
        <Button
          aria-label="Close artwork image"
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

      <DialogContent sx={{ p: 2.5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={32} sx={{ color: "#ef3340" }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : imageUrl ? (
          <Box
            sx={{
              mt: 1,
              width: "100%",
              minHeight: 220,
              maxHeight: "65vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.default,
              p: 1,
            }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt={title || "Artwork preview"}
              {...artworkImageProtectionProps}
              sx={{
                ...artworkImageProtectionSx,
                ...blurSx,
                maxWidth: "100%",
                maxHeight: "62vh",
                objectFit: "contain",
                display: "block",
                borderRadius: 1,
              }}
            />
          </Box>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 5 }}>
            No artwork image available.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: 1,
        }}
      >
        {imageUrl && (
          <Button
            component="a"
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Open Full Image
          </Button>
        )}
        <Button
          onClick={handleClose}
          sx={{
            ml: imageUrl ? 0 : "auto",
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

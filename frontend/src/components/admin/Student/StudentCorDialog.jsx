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
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { API_BASE_URL } from "../../../api/apiBase.js";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function StudentCorDialog({
  open,
  handleClose,
  student,
  tokenKey = "admin_token",
  localFile = null,
}) {
  const theme = useTheme();
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const corFilename = String(student?.cor || "").trim();

  useEffect(() => {
    if (!open || (!localFile && !corFilename)) {
      setImageUrl("");
      setError("");
      setLoading(false);
      return undefined;
    }

    if (localFile) {
      const localUrl = URL.createObjectURL(localFile);
      setImageUrl(localUrl);
      setError("");
      setLoading(false);
      return () => URL.revokeObjectURL(localUrl);
    }

    let active = true;
    let objectUrl = "";
    const controller = new AbortController();

    const loadCor = async () => {
      try {
        setLoading(true);
        setError("");

        if (/^(https?:\/\/|data:|blob:)/i.test(corFilename)) {
          if (active) setImageUrl(corFilename);
          return;
        }

        const token = localStorage.getItem(tokenKey);
        const cleanFile = corFilename.split("/").pop();
        const accountParam = tokenKey === "seller_token" ? "?account_type=seller" : "";
        const response = await fetch(
          `${API_BASE_URL}/uploads/seller/uploadCOR/${encodeURIComponent(cleanFile)}${accountParam}`,
          {
            method: "GET",
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "COR document file could not be found."
              : "Unable to load COR document.",
          );
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (active) {
          setImageUrl(objectUrl);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        if (active) {
          setError(err?.message || "Unable to load COR document.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCor();

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, corFilename, tokenKey, localFile]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
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
        <DescriptionOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Certificate of Registration (COR)
        <Button
          aria-label="Close COR preview"
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
              alt="Certificate of Registration"
              sx={{
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
            No COR uploaded for this student.
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

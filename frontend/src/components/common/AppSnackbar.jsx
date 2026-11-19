import { Alert, Slide, Snackbar, useTheme } from "@mui/material";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

/**
 * Shared notification snackbar matching the seller Artwork.jsx Snackbar design.
 */
export default function AppSnackbar({
  open,
  message,
  severity = "success",
  onClose,
  sx,
}) {
  const theme = useTheme();

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    onClose?.(event, reason);
  };

  const getSeverityColor = (level) => {
    switch (level) {
      case "error":
        return theme.palette.error.main;
      case "warning":
        return theme.palette.warning.main;
      case "info":
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      TransitionComponent={SlideTransition}
      sx={[
        {
          "& .MuiSnackbar-root": {
            width: "auto",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <Alert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        sx={{
          width: { xs: 280, sm: 360 },
          minHeight: 48,
          borderRadius: 2,
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
          backgroundColor: getSeverityColor(severity),
          color: "#fff",
          alignItems: "center",
          "& .MuiAlert-icon": {
            color: "#fff",
            mr: 1,
          },
          "& .MuiAlert-message": {
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
          },
          "& .MuiAlert-action": {
            alignItems: "center",
            paddingLeft: 1,
            color: "#fff",
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

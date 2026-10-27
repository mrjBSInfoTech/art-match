import { Box, Button, Paper, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

export default function ConnectionErrorPanel({
  title = "Page temporarily unavailable",
  onRetry = () => window.location.reload(),
}) {
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        backgroundColor: "background.default",
        px: 2,
        py: 4,
      }}
    >
      <Paper
        role="alert"
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 480,
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          backgroundColor: "background.paper",
        }}
      >
        <InfoOutlinedIcon sx={{ color: "error.main", fontSize: 42, mb: 1 }} />
        <Typography component="h1" variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.6 }}>
          {isOffline
            ? "You appear to be offline. Check your internet connection and try again."
            : "We couldn't connect to the server. Please check your connection and try again."}
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          color="error"
          onClick={onRetry}
          sx={{ mt: 2.5, textTransform: "none", fontWeight: 700, color: "#fff" }}
        >
          Try again
        </Button>
      </Paper>
    </Box>
  );
}

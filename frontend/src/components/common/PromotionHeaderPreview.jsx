import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function PromotionHeaderPreview({
  message,
  buttonLabel,
  messageFallback = "Your announcement message will appear here.",
}) {
  const theme = useTheme();
  const displayMessage = message?.trim() || messageFallback;
  const displayButtonLabel = buttonLabel?.trim() || "Explore Collection";

  return (
    <Box
      role="img"
      aria-label={`Buyer promo header preview: ${displayMessage}`}
      sx={{
        display: "flex",
        width: "100%",
        minHeight: { xs: 40, sm: 38 },
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        px: { xs: 1.5, sm: 3, lg: 5 },
        backgroundColor: theme.palette.background.footer,
        color: "#fff",
        fontSize: { xs: 11, sm: 13 },
        overflow: "hidden",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          minWidth: 0,
          color: "inherit",
          fontSize: "inherit",
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {displayMessage}
      </Typography>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          minHeight: 40,
          alignItems: "center",
          px: { xs: 0.5, sm: 1 },
          flexShrink: 0,
          color: "inherit",
          fontSize: "inherit",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          {displayButtonLabel}
        </Box>
        <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
          Explore
        </Box>
        <Box component="span" aria-hidden="true" sx={{ ml: 0.75 }}>
          ›
        </Box>
      </Box>
    </Box>
  );
}

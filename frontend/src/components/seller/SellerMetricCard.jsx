import { createElement } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

/**
 * Renders a standardized seller summary metric card matching Artwork.jsx.
 */
export default function SellerMetricCard({ label, value, caption, icon }) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2.5,
        boxShadow: "none",
        minWidth: 0,
        overflow: "hidden",
        height: "100%",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.25 },
          "&:last-child": { pb: { xs: 2, sm: 2.25 } },
          height: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            minWidth: 0,
            height: "100%",
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                overflowWrap: "break-word",
              }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                color: theme.palette.text.primary,
                fontSize: { xs: 24, sm: 26, xl: 30 },
                fontWeight: 800,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                overflowWrap: "anywhere",
              }}
            >
              {value}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                color: theme.palette.text.secondary,
                fontSize: 12,
                overflowWrap: "break-word",
              }}
            >
              {caption}
            </Typography>
          </Box>
          <Box
            sx={{
              width: { xs: 44, sm: 50 },
              height: { xs: 44, sm: 50 },
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === "dark"
                  ? "rgba(239, 68, 68, 0.14)"
                  : "#fff5f5",
              color: theme.palette.error.main,
            }}
          >
            {createElement(icon)}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

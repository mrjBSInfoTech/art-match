import { createElement } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function AdminMetrics({ metrics = [] }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns:
          metrics.length === 4
            ? {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              }
            : {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
              },
        gap: { xs: 1.25, sm: 2 },
        mb: 2.5,
        minWidth: 0,
        ...(metrics.length === 3 && {
          "& > *:nth-of-type(3):last-child": {
            gridColumn: { xs: "1 / -1", md: "auto" },
          },
        }),
      }}
    >
      {metrics.map(({ label, value, caption, icon: MetricIcon }) => (
        <Card
          key={label}
          sx={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: { xs: 2, sm: 2.5 },
            boxShadow: "none",
            minWidth: 0,
            overflow: "hidden",
            height: "100%",
          }}
        >
          <CardContent sx={{ p: { xs: 1.5, sm: 2.25, md: 1.75, lg: 2.25 }, "&:last-child": { pb: { xs: 1.5, sm: 2.25, md: 1.75, lg: 2.25 } }, height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: { xs: 1, lg: 2 },
                minWidth: 0,
                height: "100%",
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: 10, sm: 11, md: 10, lg: 11 },
                    fontWeight: 800,
                    letterSpacing: { xs: 0.5, lg: 1 },
                    overflowWrap: "break-word",
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: theme.palette.text.primary,
                    fontSize: { xs: 18, sm: 24, md: 20, lg: 24, xl: 30 },
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
                    mt: { xs: 0.75, sm: 1 },
                    color: theme.palette.text.secondary,
                    fontSize: { xs: 11, sm: 12 },
                    overflowWrap: "break-word",
                  }}
                >
                  {caption}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: { xs: 36, sm: 48, md: 40, lg: 48 },
                  height: { xs: 36, sm: 48, md: 40, lg: 48 },
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: { xs: 1.5, sm: 2 },
                  backgroundColor:
                    theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.14)" : "#fff5f5",
                  color: theme.palette.error.main,
                  "& svg": { fontSize: { xs: 19, sm: 24, md: 20, lg: 24 } },
                }}
              >
                {MetricIcon && createElement(MetricIcon)}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

import { createElement } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function AdminMetrics({ metrics = [] }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        gap: 2,
        mb: 2.5,
      }}
    >
      {metrics.map(({ label, value, caption, icon: MetricIcon }) => (
        <Card
          key={label}
          sx={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2.5,
            boxShadow: "none",
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: theme.palette.text.primary,
                    fontSize: 30,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {value}
                </Typography>
                <Typography sx={{ mt: 1, color: theme.palette.text.secondary, fontSize: 12 }}>
                  {caption}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.14)" : "#fff5f5",
                  color: theme.palette.error.main,
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

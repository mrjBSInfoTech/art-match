import { createElement } from "react";
import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import { formatPayoutCurrency } from "./payoutDisplay";

export default function PayoutMetrics({ totals = {} }) {
  const theme = useTheme();
  const metrics = [
    ["Held", totals.held, "Delivery, return or refund hold", PauseCircleOutlineIcon],
    ["Eligible", totals.eligible, "Ready for administrator review", TaskAltIcon],
    ["Processing", totals.processing, "Awaiting provider confirmation", AutorenewIcon],
    ["Paid to seller", totals.paid, "Provider-confirmed transfers", PaidOutlinedIcon],
  ];
  return (
    <Grid container spacing={2}>
      {metrics.map(([label, value, hint, MetricIcon]) => (
        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={label} sx={{ minWidth: 0 }}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              minWidth: 0,
              overflow: "hidden",
              borderRadius: 2.5,
              backgroundColor: theme?.palette?.background?.paper || "#fff",
              borderColor: theme?.palette?.divider || "rgba(0,0,0,0.12)",
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: { xs: 1.75, sm: 2 }, "&:last-child": { pb: { xs: 1.75, sm: 2 } }, height: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: { xs: 1.25, sm: 2 },
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      color: theme?.palette?.text?.secondary || "text.secondary",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      overflowWrap: "break-word",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: theme?.palette?.text?.primary || "text.primary",
                      fontSize: { xs: 22, sm: 26, xl: 30 },
                      fontWeight: 800,
                      lineHeight: 1.1,
                      overflowWrap: "anywhere",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatPayoutCurrency(value)}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme?.palette?.text?.secondary || "text.secondary",
                      fontSize: 12,
                      overflowWrap: "break-word",
                    }}
                  >
                    {hint}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: { xs: 44, sm: 50 },
                    height: { xs: 44, sm: 50 },
                    flex: { xs: "0 0 44px", sm: "0 0 50px" },
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    backgroundColor:
                      theme?.palette?.mode === "dark"
                        ? "rgba(239, 68, 68, 0.14)"
                        : "#fff5f5",
                    color: theme?.palette?.error?.main || "#d32f2f",
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

import { createElement } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          md: "repeat(4, minmax(0, 1fr))",
        },
        gap: { xs: 1.25, sm: 2 },
        minWidth: 0,
      }}
    >
      {metrics.map(([label, value, hint, MetricIcon]) => (
        <Card
          key={label}
          variant="outlined"
          sx={{
            height: "100%",
            minWidth: 0,
            overflow: "hidden",
            borderRadius: { xs: 2, sm: 2.5 },
            backgroundColor: theme?.palette?.background?.paper || "#fff",
            borderColor: theme?.palette?.divider || "rgba(0,0,0,0.12)",
            boxShadow: "none",
          }}
        >
          <CardContent
            sx={{
              p: { xs: 1.5, sm: 2.25, md: 1.75, lg: 2.25 },
              "&:last-child": { pb: { xs: 1.5, sm: 2.25, md: 1.75, lg: 2.25 } },
              height: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: { xs: 1, lg: 1.5 },
                minWidth: 0,
                height: "100%",
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    color: theme?.palette?.text?.secondary || "text.secondary",
                    fontSize: { xs: 10, sm: 11, md: 10, lg: 11 },
                    fontWeight: 800,
                    letterSpacing: { xs: 0.5, lg: 1 },
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
                    fontSize: { xs: 17, sm: 24, md: 18, lg: 24, xl: 28 },
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
                    mt: { xs: 0.75, sm: 1 },
                    color: theme?.palette?.text?.secondary || "text.secondary",
                    fontSize: { xs: 11, sm: 12 },
                    overflowWrap: "break-word",
                  }}
                >
                  {hint}
                </Typography>
              </Box>
              <Box
                sx={{
                  width: { xs: 36, sm: 48, md: 38, lg: 48 },
                  height: { xs: 36, sm: 48, md: 38, lg: 48 },
                  flex: { xs: "0 0 36px", sm: "0 0 48px", md: "0 0 38px", lg: "0 0 48px" },
                  display: "grid",
                  placeItems: "center",
                  borderRadius: { xs: 1.5, sm: 2 },
                  backgroundColor:
                    theme?.palette?.mode === "dark"
                      ? "rgba(239, 68, 68, 0.14)"
                      : "#fff5f5",
                  color: theme?.palette?.error?.main || "#d32f2f",
                  "& svg": { fontSize: { xs: 19, sm: 24, md: 20, lg: 24 } },
                }}
              >
                {createElement(MetricIcon)}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

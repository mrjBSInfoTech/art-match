import { Card, CardContent, Grid, Typography } from "@mui/material";
import { formatPayoutCurrency } from "./payoutDisplay";

export default function PayoutMetrics({ totals = {} }) {
  const metrics = [
    ["Held", totals.held, "Delivery, return or refund hold"],
    ["Eligible", totals.eligible, "Ready for administrator review"],
    ["Processing", totals.processing, "Awaiting provider confirmation"],
    ["Paid to seller", totals.paid, "Transfer confirmed by provider"],
  ];
  return <Grid container spacing={2}>
    {metrics.map(([label, value, hint]) => <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={label}>
      <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>{label}</Typography>
          <Typography variant="h5" fontWeight={800} sx={{ my: 0.5 }}>{formatPayoutCurrency(value)}</Typography>
          <Typography variant="caption" color="text.secondary">{hint}</Typography>
        </CardContent>
      </Card>
    </Grid>)}
  </Grid>;
}

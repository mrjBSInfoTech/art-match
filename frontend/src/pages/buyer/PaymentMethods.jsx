import { Helmet } from "react-helmet-async";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import CreditCardOutlinedIcon from "@mui/icons-material/CreditCardOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";

const PAYMENT_OPTIONS = [
  { label: "GCash", icon: <CreditCardOutlinedIcon /> },
  { label: "Cash on delivery", icon: <PaymentsOutlinedIcon /> },
  { label: "Bank transfer", icon: <AccountBalanceOutlinedIcon /> },
];

export default function PaymentMethods() {
  return (
    <Box sx={{ width: "100%" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Payment methods</title>
      </Helmet>
      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 800 }}>
        Payment methods
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Choose a payment option for each order. Payment details are not stored
        in your account.
      </Typography>
      <Stack spacing={1.25}>
        {PAYMENT_OPTIONS.map((option) => (
          <Paper
            key={option.label}
            variant="outlined"
            sx={{
              p: 2,
              borderColor: "divider",
              borderRadius: 2,
              boxShadow: "none",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{ display: "flex", color: "text.secondary" }}>
                {option.icon}
              </Box>
              <Typography sx={{ flex: 1, fontWeight: 700 }}>
                {option.label}
              </Typography>
              <Chip
                label="Available at checkout"
                size="small"
                variant="outlined"
              />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import RecommendedSection from "../../components/buyer/Order/RecommendedSection";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function OrderFinish() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const orders = Array.isArray(state?.orders) ? state.orders : [];
  const deliveryMethod = state?.deliveryMethod || orders[0]?.deliveryMethod || "door_to_door";
  const isPickup = deliveryMethod === "pickup";
  const firstSellerId = orders[0]?.sellerId || orders[0]?.items?.[0]?.sellerId || null;

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Order confirmed</title>
      </Helmet>
      <Container maxWidth="sm" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 2, md: 4 } }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
        <Stack spacing={2.5} alignItems="center" textAlign="center">
          <Box sx={{ color: "success.main", display: "flex" }}>
            <CheckCircleRoundedIcon sx={{ fontSize: 56 }} />
          </Box>
          <Box>
            <Typography
              variant="overline"
              color="success.main"
              fontWeight={800}
            >
              PAYMENT CONFIRMED
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              Payment successful
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {isPickup
                ? "Your payment is confirmed and your pickup order is now with the seller."
                : "Your payment is confirmed and your order is now with the seller."}
            </Typography>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              width: "100%",
              p: 2,
              borderRadius: 2,
              bgcolor: "background.default",
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              textAlign="left"
            >
              <AccountBalanceWalletOutlinedIcon color="success" />
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  Online payment received
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your payment has been securely confirmed. No further payment is due.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {orders.length > 0 && (
            <Box sx={{ width: "100%", textAlign: "left" }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <ShoppingBagOutlinedIcon color="action" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={800}>
                  Order references
                </Typography>
              </Stack>
              <Stack spacing={1}>
                {orders.map((order) => (
                  <Stack
                    key={order.orderId || order.id}
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                    sx={{
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {order.id}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {formatCurrency(order.total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          <Divider flexItem />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ width: "100%" }}
          >
            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={() =>
                navigate("/buyer/profile/orders", { replace: true })
              }
              sx={{ borderRadius: 999, textTransform: "none", py: 1.2, color:"#fff" }}
            >
              View order status
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={() => navigate("/buyer/shop")}
              sx={{ borderRadius: 999, textTransform: "none", py: 1.2 }}
            >
              Continue browsing
            </Button>
            {firstSellerId && (
              <Button
                fullWidth
                variant="outlined"
                color="inherit"
                onClick={() => navigate(`/buyer/messages?seller=${encodeURIComponent(firstSellerId)}`)}
                sx={{ borderRadius: 999, textTransform: "none", py: 1.2 }}
              >
                Contact Seller
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>
      </Container>
      <RecommendedSection />
    </Box>
  );
}

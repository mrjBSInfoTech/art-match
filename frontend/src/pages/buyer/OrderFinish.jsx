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
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";

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

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Order confirmed</title>
      </Helmet>
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
              CASH ON DELIVERY
            </Typography>
            <Typography variant="h4" fontWeight={800}>
              Order placed
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Your order is now with the seller. Pay the courier in cash when
              your artwork arrives.
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
              <LocalAtmOutlinedIcon color="primary" />
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  Payment due on delivery
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Have the order total ready in cash. No online payment is due
                  now.
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
              onClick={() =>
                navigate("/buyer/profile/orders", { replace: true })
              }
              sx={{ borderRadius: 999, textTransform: "none", py: 1.2 }}
            >
              View order status
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate("/buyer/shop")}
              sx={{ borderRadius: 999, textTransform: "none", py: 1.2 }}
            >
              Continue browsing
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

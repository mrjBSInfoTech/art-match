import { useState, useEffect, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Chip,
  Grid,
} from "@mui/material";
// Icons
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";

import { fetchCart } from "../../api/buyer/cartAPI";
import { fetchAddresses } from "../../api/buyer/addressAPI";
import { cancelBuyerPayment, fetchBuyerPayment, placeBuyerOrder, retryBuyerPayment } from "../../api/buyer/orderAPI";
import { canResumePayment, isOrderPaid } from "../../utils/orderPayments.js";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";

const currency = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));

export default function Checkout() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const selectedArtworkIds = useMemo(() => {
    const params = new URLSearchParams(search);
    if (!params.has("artwork_ids")) return null;
    const ids = params.get("artwork_ids").split(",").map(Number);
    return ids.length && ids.every((id) => Number.isSafeInteger(id) && id > 0) ? [...new Set(ids)] : [];
  }, [search]);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("paymongo");
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [existingCheckout, setExistingCheckout] = useState("");
  const [payment, setPayment] = useState(null);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentActionError, setPaymentActionError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentRefresh, setPaymentRefresh] = useState(0);
  const submitting = useRef(false);
  const paymentAction = useRef(false);
  const cancelledReturns = useRef(new Set());
  const confirmedPayments = useRef(new Set());
  const params = new URLSearchParams(search);
  const returnPayment = params.get("payment") || "";
  const paymentReference = params.get("reference") || existingCheckout;

  useEffect(() => {
    if (!paymentReference) {
      setPayment(null);
      return;
    }
    let active = true;
    let controller;
    let timer;
    let pollUntil = Date.now() + 120000;
    const checkPayment = async () => {
      clearTimeout(timer);
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setPaymentChecking(true);
      let keepPolling = false;
      try {
        let result = await fetchBuyerPayment(paymentReference, { signal: request.signal });
        if (!active || request.signal.aborted) return;
        let launchedReference = "";
        try { launchedReference = sessionStorage.getItem("paymongo_payment_reference") || ""; } catch { /* Manual cancellation is also available. */ }
        const matching = Array.isArray(result.orders) ? result.orders : [];
        const mayCancel = matching.length > 0 && matching.every(canResumePayment);
        // Only a return from the checkout launched in this tab may auto-cancel it.
        if (returnPayment === "cancelled" && launchedReference === paymentReference && mayCancel &&
            !cancelledReturns.current.has(paymentReference) && !paymentAction.current) {
          cancelledReturns.current.add(paymentReference);
          paymentAction.current = true;
          try {
            const cancelled = await cancelBuyerPayment(paymentReference);
            if (!active || request.signal.aborted) return;
            setPaymentMessage(cancelled.message || "Checkout cancelled. Your cart items were kept.");
            try { sessionStorage.removeItem("paymongo_payment_reference"); } catch { /* Cancellation was confirmed by the backend. */ }
            result = await fetchBuyerPayment(paymentReference, { signal: request.signal });
            if (!active || request.signal.aborted) return;
          } catch (cancelError) {
            if (active && !request.signal.aborted) setPaymentActionError(cancelError.message || "Unable to cancel checkout. Please try again.");
          } finally {
            paymentAction.current = false;
          }
        } else {
          setPaymentError("");
        }
        setPayment(result);
        const orders = Array.isArray(result.orders) ? result.orders : [];
        const paid = String(result.payment_status).toLowerCase() === "paid" && orders.length > 0 && orders.every(isOrderPaid);
        if (paid) {
          if (!confirmedPayments.current.has(paymentReference)) {
            confirmedPayments.current.add(paymentReference);
            try { sessionStorage.removeItem("paymongo_payment_reference"); } catch { /* Confirmed server state remains authoritative. */ }
            window.dispatchEvent(new Event("cart-updated"));
            navigate("/buyer/order-finish", {
              replace: true,
              state: { orders, paymentMethod: "paymongo" },
            });
          }
          return;
        }
        keepPolling = orders.some(canResumePayment);
      } catch (statusError) {
        if (active && !request.signal.aborted) setPaymentError(statusError.message || "Unable to verify your payment. Try checking again.");
      } finally {
        if (active && !request.signal.aborted) {
          setPaymentChecking(false);
          if (keepPolling && document.visibilityState !== "hidden" && Date.now() + 4000 <= pollUntil) timer = setTimeout(checkPayment, 4000);
        }
      }
    };
    const checkVisible = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        controller?.abort();
        return;
      }
      pollUntil = Date.now() + 120000;
      checkPayment();
    };
    setPayment(null);
    setPaymentError("");
    checkPayment();
    window.addEventListener("focus", checkVisible);
    window.addEventListener("pageshow", checkVisible);
    document.addEventListener("visibilitychange", checkVisible);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener("focus", checkVisible);
      window.removeEventListener("pageshow", checkVisible);
      document.removeEventListener("visibilitychange", checkVisible);
    };
  }, [paymentReference, paymentRefresh, returnPayment, navigate]);

  useEffect(() => {
    if (paymentReference) {
      setPageLoading(false);
      return;
    }
    let active = true;
    let latestRequest = 0;
    const loadCheckoutData = async () => {
      const request = ++latestRequest;
      try {
        setPageLoading(true);
        const [cart, addresses] = await Promise.all([
          fetchCart(),
          fetchAddresses(),
        ]);
        if (!active || request !== latestRequest) return;
        const availableCart = Array.isArray(cart) ? cart : [];
        const checkoutItems = selectedArtworkIds === null ? availableCart : availableCart.filter((item) => selectedArtworkIds.includes(Number(item.artwork_id)));
        setCartItems(checkoutItems);
        if (selectedArtworkIds !== null && (!selectedArtworkIds.length || checkoutItems.length !== selectedArtworkIds.length)) {
          setError("Some selected artworks are no longer in your cart. Return to the cart and select your artworks again.");
        }
        const addressList = Array.isArray(addresses) ? addresses : [];
        setAddresses(addressList);
        setCurrentAddress(
          addressList.find((address) => Boolean(address.is_current)) ||
            addressList[0] ||
            null,
        );
      } catch (loadError) {
        if (active && request === latestRequest) setError(loadError.message || "Unable to load checkout data");
      } finally {
        if (active && request === latestRequest) setPageLoading(false);
      }
    };

    loadCheckoutData();
    const restoreCheckout = (event) => {
      if (!event.persisted) return;
      submitting.current = false;
      setLoading(false);
      setError("");
      try {
        const reference = sessionStorage.getItem("paymongo_payment_reference");
        if (reference) {
          setExistingCheckout(reference);
          return;
        }
      } catch { /* A new submission can also recover the checkout from the server. */ }
      loadCheckoutData();
    };
    window.addEventListener("pageshow", restoreCheckout);
    return () => {
      active = false;
      window.removeEventListener("pageshow", restoreCheckout);
    };
  }, [selectedArtworkIds, paymentReference]);

  const profile = {
    firstName: localStorage.getItem("buyer_first_name") || "Customer",
    lastName: localStorage.getItem("buyer_last_name") || "",
    email: localStorage.getItem("buyer_email") || "",
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );
  const hasSoldOutItems = cartItems.some(
    (item) => Number(item.is_sold_out) === 1,
  );
  // Delivery is arranged by each seller through a third-party courier
  // (J&T, Lalamove, etc.), so no shipping fee is charged at checkout.
  const total = subtotal;

  /*
   * One payment, several storefronts. The buyer is charged once, but each
   * seller ships and is paid separately, so show that split up front rather
   * than surprising them with N orders after paying.
   */
  const storefrontGroups = useMemo(() => {
    const groups = new Map();
    cartItems.forEach((item) => {
      const key = item.seller_id != null ? String(item.seller_id) : "unknown";
      const group = groups.get(key) || {
        sellerId: key,
        // Prefer the storefront name, then fall back to the seller's name.
        shopName:
          item.shop_name ||
          item.store_name ||
          item.artist_name ||
          item.artist ||
          "Independent artist",
        items: [],
        subtotal: 0,
      };
      group.items.push(item);
      group.subtotal += Number(item.price || 0);
      groups.set(key, group);
    });
    return [...groups.values()];
  }, [cartItems]);
  const multiStorefront = storefrontGroups.length > 1;
  const selectionIncomplete = selectedArtworkIds !== null &&
    (!selectedArtworkIds.length || selectedArtworkIds.length !== cartItems.length);

  const handlePlaceOrder = async () => {
    if (submitting.current) return;
    if (!cartItems.length || selectionIncomplete || hasSoldOutItems) {
      setError("Please return to your cart and select available artworks to checkout.");
      return;
    }
    if (!currentAddress?.address_id) {
      setError("Please select a delivery address.");
      return;
    }

    try {
      submitting.current = true;
      setError("");
      setExistingCheckout("");
      setLoading(true);

      const result = await placeBuyerOrder(
        currentAddress.address_id,
        paymentMethod,
        selectedArtworkIds ?? cartItems.map((item) => Number(item.artwork_id)),
      );

      /*
       * CASH ON DELIVERY
       */
      if (paymentMethod === "cod") {
        navigate("/buyer/order-finish", {
          state: {
            orders: result.orders,
            paymentMethod,
          },
        });

        return;
      }

      /*
       * PAYMONGO
       *
       * Backend creates the checkout session
       * and gives us the PayMongo checkout URL.
       */
      if (paymentMethod === "paymongo") {
        if (!result?.checkout_url) {
          throw new Error("PayMongo checkout URL was not returned.");
        }

        try {
          if (result.payment_reference) sessionStorage.setItem("paymongo_payment_reference", result.payment_reference);
        } catch {
          // The return URL also includes the reference when browser storage is unavailable.
        }

        /*
         * Leave ArtMatch and open the secure
         * PayMongo Hosted Checkout page.
         */
        window.location.assign(result.checkout_url);

        return;
      }

      throw new Error("Unsupported payment method.");
    } catch (orderError) {
      setError(orderError.message || "Unable to place your order");
      if (orderError.status === 409 && orderError.canResume) {
        setExistingCheckout(orderError.paymentReference);
        setError("");
      }

      setLoading(false);
      submitting.current = false;
    }
  };

  const handlePaymentAction = async (action) => {
    if (paymentAction.current || !paymentReference) return;
    paymentAction.current = true;
    setLoading(true);
    setPaymentActionError("");
    try {
      if (action === "cancel") {
        const result = await cancelBuyerPayment(paymentReference);
        setPaymentMessage(result.message || "Checkout cancelled. Your cart items were kept.");
        try { sessionStorage.removeItem("paymongo_payment_reference"); } catch { /* The backend has confirmed cancellation. */ }
        setPaymentRefresh((value) => value + 1);
      } else {
        const result = await retryBuyerPayment(paymentReference);
        if (String(result.payment_status).toLowerCase() === "paid") {
          setPaymentActionError("");
          setPaymentMessage(result.message || "Payment confirmed. Updating your order status.");
          setPaymentRefresh((value) => value + 1);
          return;
        }
        if (!result.checkout_url) throw new Error("Unable to open payment. Check its status and try again.");
        try { sessionStorage.setItem("paymongo_payment_reference", paymentReference); } catch { /* The return URL includes the reference. */ }
        window.location.assign(result.checkout_url);
      }
    } catch (actionError) {
      setPaymentActionError(actionError.message || "Unable to update this checkout.");
      setPaymentRefresh((value) => value + 1);
    } finally {
      paymentAction.current = false;
      setLoading(false);
    }
  };

  const paymentOrders = Array.isArray(payment?.orders) ? payment.orders : [];
  const paymentCanResume = paymentOrders.length > 0 && paymentOrders.every(canResumePayment);
  const paymentPaid = String(payment?.payment_status).toLowerCase() === "paid" && paymentOrders.length > 0 && paymentOrders.every(isOrderPaid);
  const paymentRefunded = String(payment?.payment_status).toLowerCase() === "refunded";
  const paymentNeedsReview = String(payment?.payment_status).toLowerCase() === "paid" &&
    paymentOrders.length > 0 && paymentOrders.every((order) => String(order.status).toLowerCase() === "cancelled");
  const paymentClosed = paymentOrders.length > 0 && paymentOrders.every((order) => String(order.status).toLowerCase() === "cancelled") || ["expired", "refunded"].includes(String(payment?.payment_status).toLowerCase());

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 3, md: 6 },
        px: { md: 5 },
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Checkout</title>
      </Helmet>

      {pageLoading && (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 300 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !paymentReference && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {paymentReference && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 2.5,
            maxWidth: 850,
            mx: "auto",
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {paymentPaid ? "Payment received" : paymentNeedsReview ? "Payment needs review" : paymentRefunded ? "Payment refunded" : paymentClosed ? "Checkout closed" : "Complete your payment"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {paymentPaid ? "Opening your order confirmation…" : paymentNeedsReview ? "PayMongo confirmed this payment, but ArtMatch could not confirm the order. Please contact support about your payment." : paymentRefunded ? "Your payment has been refunded. View Orders for your purchase history." : paymentClosed
                  ? "Your unpaid checkout was not added to Orders. Your cart items were kept."
                  : "These artworks will appear in Orders after payment is confirmed. You can continue this payment or cancel it to change your selection."}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, overflowWrap: "anywhere" }}
              >
                Checkout: {paymentReference}
              </Typography>
            </Box>
            {paymentChecking && <Stack direction="row" alignItems="center" spacing={1.5}><CircularProgress size={20} /><Typography role="status">Verifying your payment…</Typography></Stack>}
            {paymentError && <Alert severity="error">{paymentError}</Alert>}
            {paymentActionError && <Alert severity="error">{paymentActionError}</Alert>}
            {paymentMessage && <Alert severity="info">{paymentMessage}</Alert>}
            {!paymentChecking && !paymentError && !paymentPaid && !paymentClosed && <Alert severity={String(payment?.payment_status).toLowerCase() === "failed" ? "warning" : "info"}>
              {String(payment?.payment_status).toLowerCase() === "failed" ? "Payment was unsuccessful. Continue payment to try again, or cancel this checkout." : "Payment has not been confirmed yet. No purchase has been placed."}
            </Alert>}
            {paymentOrders.length > 0 && (
              <Stack spacing={2} divider={<Divider />}>
                {paymentOrders.map((order) => (
                  <Box key={order.orderId}>
                    {order.items?.map((item) => (
                      <Stack key={item.id || item.artworkId} direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                        <WatermarkedArtworkImage image={item.image} alt={item.title || "Artwork"} sx={{ width: 64, height: 64, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{item.artist} · Qty {item.qty || 1}</Typography>
                        </Box>
                        <Typography fontWeight={700}>{currency(Number(item.price) * Number(item.qty || 1))}</Typography>
                      </Stack>
                    ))}
                  </Box>
                ))}
                <SummaryRow label="Total" value={currency(paymentOrders.reduce((sum, order) => sum + Number(order.total || 0), 0))} bold />
              </Stack>
            )}
            <Stack
              direction="row"
              flexWrap="wrap"
              justifyContent="flex-end"
              gap={1}
            >
              {paymentCanResume && <Button variant="contained" disabled={loading || paymentChecking} onClick={() => handlePaymentAction("resume")}>Continue payment</Button>}
              {paymentCanResume && <Button color="error" disabled={loading || paymentChecking} onClick={() => handlePaymentAction("cancel")}>Cancel checkout</Button>}
              {(paymentRefunded || paymentNeedsReview) && <Button onClick={() => navigate("/buyer/profile/orders")}>View orders</Button>}
              <Button variant="contained" color="error" fullWidth  disabled={loading} onClick={() => navigate("/buyer/cart")}>Return to cart</Button>
            </Stack>
          </Stack>
        </Paper>
      )}
      {!paymentReference && !pageLoading && hasSoldOutItems && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate("/buyer/cart")}
            >
              Review cart
            </Button>
          }
        >
          Your cart contains sold-out artwork. Remove it from your cart before
          placing this order.
        </Alert>
      )}

      {!paymentReference && !pageLoading && (!error || cartItems.length > 0) && (
        <Grid
          container
          spacing={4}
          sx={{
            display: { xs: "flex", lg: "grid" },
            gridTemplateColumns: { lg: "minmax(0, 7fr) minmax(0, 3fr)" },
          }}
        >
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              {/* Shipping Information Card */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3.5,
                  bgcolor: "background.paper",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ mb: 3 }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: "action.selected",
                      color: "error.main",
                      display: "flex",
                    }}
                  >
                    <LocalShippingOutlinedIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Shipping Information
                  </Typography>
                </Stack>

                {/* Recipient Snapshot */}
                <Box
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 2.5,
                    bgcolor: "background.default",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    Recipient Details
                  </Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>
                    {profile.firstName} {profile.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {profile.email || "No email provided"}
                  </Typography>
                </Box>

                {/* Delivery Address */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                >
                  Delivery Address
                </Typography>

                {addresses.length > 1 && (
                  <FormControl fullWidth size="small" sx={{ mt: 1.5, mb: 1 }}>
                    <InputLabel id="checkout-address-label">Select delivery address</InputLabel>
                    <Select
                      labelId="checkout-address-label"
                      label="Select delivery address"
                      value={currentAddress?.address_id || ""}
                      disabled={loading}
                      onChange={(event) => setCurrentAddress(addresses.find((address) => String(address.address_id) === String(event.target.value)) || null)}
                    >
                      {addresses.map((address) => (
                        <MenuItem key={address.address_id} value={address.address_id}>
                          {[address.street_name, address.barangay, address.city, address.province].filter(Boolean).join(", ")}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {currentAddress ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      mt: 1,
                      borderRadius: 2.5,
                      borderColor: "error.main",
                      bgcolor: "action.selected",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <LocationOnOutlinedIcon
                        color="error"
                        sx={{ mt: 0.3 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            Shipping Destination
                          </Typography>
                          {currentAddress.is_current && (
                            <Chip
                              icon={
                                <CheckCircleIcon
                                  sx={{ fontSize: "12px !important" }}
                                />
                              }
                              label="Default"
                              size="small"
                              color="error"
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                color: "#fff",
                              }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="body2"
                          color="text.primary"
                          sx={{ lineHeight: 1.5 }}
                        >
                          {[
                            currentAddress.street_name,
                            currentAddress.barangay,
                            currentAddress.city,
                            currentAddress.province,
                            currentAddress.region,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5, fontWeight: 600 }}
                        >
                          ZIP Code: {currentAddress.postal_code || "N/A"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ) : (
                  <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                    No address selected. Please configure a default delivery
                    address in your profile.
                  </Alert>
                )}
              </Paper>

              {/* Payment Method Card */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3.5,
                  bgcolor: "background.paper",
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ mb: 3 }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: "action.selected",
                      color: "error.main",
                      display: "flex",
                    }}
                  >
                    <PaymentOutlinedIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Payment Options
                  </Typography>
                </Stack>

                <RadioGroup
                  value={paymentMethod}
                  aria-label="Payment method"
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  sx={{ gap: 1.5 }}
                >
                  <PaymentOptionCard
                    value="paymongo"
                    title="Secure Online Payment"
                    subtitle="Choose your e-wallet, card, or QR payment on PayMongo"
                    icon={<AccountBalanceWalletOutlinedIcon color="error" />}
                    selectedValue={paymentMethod}
                    disabled={loading}
                  />

                  <PaymentOptionCard
                    value="cod"
                    title="Cash on Delivery"
                    subtitle="Pay in cash upon artwork delivery"
                    icon={<LocalAtmOutlinedIcon color="error" />}
                    selectedValue={paymentMethod}
                    disabled={loading}
                  />
                </RadioGroup>
                {paymentMethod === "paymongo" && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    You will be redirected to PayMongo to choose from its available
                    e-wallet, card, and QR payment options. Your purchase appears in
                    Orders after payment is confirmed.
                  </Typography>
                )}

                {paymentMethod === "cod" && (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    Pay the delivery amount in cash when your artwork arrives.
                  </Alert>
                )}
              </Paper>
            </Stack>
          </Grid>

          {/* Right Sidebar: Compact Summary (4 columns out of 12) */}
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 3.5 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3.5,
                position: { md: "sticky" },
                top: 96,
                bgcolor: "background.paper",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{ mb: 2.5 }}
              >
                <ShoppingBagOutlinedIcon color="action" />
                <Typography variant="h6" fontWeight={700}>
                  Order Details
                </Typography>
              </Stack>

              <Stack
                spacing={2}
                sx={{ my: 2, maxHeight: 320, overflowY: "auto", pr: 0.5 }}
              >
                {cartItems.map((item) => (
                  <Stack
                    key={item.cart_item_id || item.artwork_id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                  >
                    <WatermarkedArtworkImage
                      image={item.image}
                      alt={item.title || "Artwork"}
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2.5,
                        flexShrink: 0,
                        objectFit: "cover",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Original Artwork
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" fontWeight={700}>
                      ₱{Number(item.price || 0).toLocaleString()}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label="Subtotal"
                  value={`₱${subtotal.toLocaleString()}`}
                />
                {multiStorefront && (
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2.5,
                      p: 1.75,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 700, letterSpacing: 0.4 }}
                    >
                      SPLIT ACROSS {storefrontGroups.length} STOREFRONTS
                    </Typography>
                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                      {storefrontGroups.map((group) => (
                        <Button
                          key={group.sellerId}
                          variant="text"
                          disabled
                          disableElevation
                          sx={{
                            p: 0,
                            justifyContent: "space-between",
                            textTransform: "none",
                            color: "text.primary",
                            width: "100%",
                            "&.Mui-disabled": { color: "text.primary" },
                          }}
                        >
                          <Stack alignItems="flex-start" sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              sx={{ maxWidth: 190 }}
                            >
                              {group.shopName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.items.length}{" "}
                              {group.items.length === 1 ? "artwork" : "artworks"}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight={700} sx={{ ml: 1 }}>
                            ₱{group.subtotal.toLocaleString()}
                          </Typography>
                        </Button>
                      ))}
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1.25 }}
                    >
                      You pay once for all artworks. Each storefront ships
                      separately through a third-party courier (J&T, Lalamove,
                      etc.) and is paid separately.
                    </Typography>
                  </Box>
                )}
                <SummaryRow
                  label="Shipping"
                  value="Paid to courier"
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: -1, mb: 1 }}
                >
                  Not included in the total. You arrange and pay the courier
                  directly with the seller.
                </Typography>
                <Divider sx={{ my: 1 }} />
                <SummaryRow
                  label="Total Amount"
                  value={`₱${total.toLocaleString()}`}
                  bold
                />
              </Stack>

              <Button
                variant="contained"
                fullWidth
                size="large"
                disableElevation
                color="error"
                sx={{
                  mt: 3.5,
                  borderRadius: 3,
                  textTransform: "none",
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
                disabled={
                  cartItems.length === 0 ||
                  !currentAddress ||
                  loading ||
                  hasSoldOutItems || selectionIncomplete
                }
                onClick={handlePlaceOrder}
              >
                {loading
                  ? "Processing..."
                  : paymentMethod === "paymongo"
                    ? "Continue to Secure Payment"
                    : "Place COD Order"}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

function PaymentOptionCard({ value, title, subtitle, icon, selectedValue, disabled = false }) {
  const isSelected = selectedValue === value;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2.5,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.65 : 1,
        borderColor: isSelected ? "error.main" : "divider",
        borderWidth: isSelected ? 2 : 1,
        bgcolor: isSelected ? "action.selected" : "background.paper",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: disabled ? "divider" : "error.main",
        },
      }}
    >
      <FormControlLabel
        value={value}
        disabled={disabled}
        control={<Radio size="small" color="error" />}
        sx={{ width: "100%", m: 0, alignItems: "center" }}
        label={
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ ml: 1, width: "100%" }}
          >
            <Box sx={{ display: "flex" }}>{icon}</Box>
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                sx={{ lineHeight: 1.2 }}
              >
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Stack>
        }
      />
    </Paper>
  );
}

function SummaryRow({ label, value, bold = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography
        variant={bold ? "subtitle1" : "body2"}
        color={bold ? "text.primary" : "text.secondary"}
        fontWeight={bold ? 800 : 500}
      >
        {label}
      </Typography>

      <Typography
        variant={bold ? "subtitle1" : "body2"}
        color={bold ? "error.main" : "text.primary"}
        fontWeight={bold ? 800 : 600}
      >
        {value}
      </Typography>
    </Stack>
  );
}

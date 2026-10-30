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
  IconButton,
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
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";

import { fetchCart, updateCartItemQuantity } from "../../api/buyer/cartAPI";
import { addAddress, fetchAddresses, updateAddress } from "../../api/buyer/addressAPI";
import { cancelBuyerPayment, fetchBuyerPayment, fetchPaymentMethods, placeBuyerOrder, retryBuyerPayment, validateCheckoutVoucher } from "../../api/buyer/orderAPI";
import { canResumePayment, isOrderPaid } from "../../utils/orderPayments.js";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import CheckoutVoucher from "../../components/buyer/Checkout/CheckoutVoucher";
import AddressForm from "../../components/buyer/Address/AddressForm";

const currency = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));

const isProductItem = (item) => {
  const artType = String(item?.art_type || "").trim().toLowerCase();
  const product = String(item?.product || "").trim().toLowerCase();
  const productValues = ["product", "3d_object", "3d object", "sculpture", "physical_product", "physical product"];
  return productValues.includes(artType) || productValues.includes(product);
};

const getRemainingStock = (item) => {
  const rawStock = item?.stock_available;
  if (rawStock === null || rawStock === undefined || String(rawStock).trim() === "") {
    return null;
  }
  const totalStock = Number(rawStock);
  if (!Number.isFinite(totalStock) || totalStock < 0) return null;
  const sold = Math.max(0, Number(item?.sold_quantity || 0));
  return Math.max(0, Math.floor(totalStock - sold));
};

const paymentChannelLabel = (channel) => {
  const labels = {
    gcash: "GCash",
    paymaya: "Maya",
    card: "Credit/Debit Card",
    qrph: "QR Ph",
  };
  return labels[String(channel || "").toLowerCase()] || String(channel || "").toUpperCase();
};

export default function Checkout() {
  const navigate = useNavigate();
  const { search, state: locationState } = useLocation();
  const selectedArtworkIds = useMemo(() => {
    const params = new URLSearchParams(search);
    if (!params.has("artwork_ids")) return null;
    const ids = params.get("artwork_ids").split(",").map(Number);
    return ids.length && ids.every((id) => Number.isSafeInteger(id) && id > 0) ? [...new Set(ids)] : [];
  }, [search]);
  const requestedQuantities = useMemo(() => {
    const map = {};
    if (locationState?.quantities && typeof locationState.quantities === "object") {
      Object.entries(locationState.quantities).forEach(([id, qty]) => {
        const parsedQty = Number(qty);
        if (Number.isSafeInteger(parsedQty) && parsedQty > 0) {
          map[String(id)] = parsedQty;
        }
      });
    }
    const params = new URLSearchParams(search);
    const rawQuantities = params.get("quantities");
    if (rawQuantities) {
      rawQuantities.split(",").forEach((entry) => {
        const [rawId, rawQty] = String(entry).split(":");
        const id = Number(rawId);
        const qty = Number(rawQty);
        if (Number.isSafeInteger(id) && id > 0 && Number.isSafeInteger(qty) && qty > 0) {
          map[String(id)] = qty;
        }
      });
    }
    return map;
  }, [search, locationState]);
  const [editableQuantities, setEditableQuantities] = useState({});
  const getItemQuantity = (item) => {
    if (!isProductItem(item)) return 1;
    const id = String(item?.artwork_id ?? "");
    const override = editableQuantities[id] ?? requestedQuantities[id];
    const value = Number(override ?? item?.quantity ?? 1);
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  };
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState("door_to_door");
  const [paymentMethod, setPaymentMethod] = useState("paymongo");
  const [enabledPaymentChannels, setEnabledPaymentChannels] = useState(["gcash", "paymaya", "card", "qrph"]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [existingCheckout, setExistingCheckout] = useState("");
  const [payment, setPayment] = useState(null);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentActionError, setPaymentActionError] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentRefresh, setPaymentRefresh] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherQuote, setVoucherQuote] = useState(null);
  const [voucherWarning, setVoucherWarning] = useState("");
  const [voucherChecking, setVoucherChecking] = useState(false);
  const voucherRequest = useRef(0);
  const submitting = useRef(false);
  const paymentAction = useRef(false);
  const cancelledReturns = useRef(new Set());
  const confirmedPayments = useRef(new Set());
  const params = new URLSearchParams(search);
  const returnPayment = params.get("payment") || "";
  const paymentReference = params.get("reference") || existingCheckout;
  const cartKey = JSON.stringify(cartItems.map((item) => [item.artwork_id, item.price, item.seller_id, item.is_sold_out, getItemQuantity(item)]));
  const appliedVoucher = voucherQuote?.cartKey === cartKey && voucherQuote.code === voucherCode.trim().toUpperCase()
    ? voucherQuote.result : null;
  const voucherMessage = voucherQuote && !appliedVoucher
    ? "Your checkout items changed. Apply the voucher again to check its requirements." : voucherWarning;

  useEffect(() => () => { voucherRequest.current += 1; }, []);

  const changeVoucherCode = (value) => {
    voucherRequest.current += 1;
    setVoucherCode(value);
    setVoucherQuote(null);
    setVoucherWarning("");
    setVoucherChecking(false);
  };

  const hasCustomQuantities =
    Object.keys(requestedQuantities).length > 0 ||
    Object.keys(editableQuantities).length > 0 ||
    cartItems.some((item) => getItemQuantity(item) > 1);

  const applyVoucher = async () => {
    if (loading || voucherChecking || submitting.current) return;
    const code = voucherCode.trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
      setVoucherWarning("Enter a valid voucher code using 3–20 letters, numbers, or hyphens.");
      return;
    }
    if (!cartItems.length) {
      setVoucherWarning("Select artworks in your cart before applying a voucher.");
      return;
    }
    const request = ++voucherRequest.current;
    setVoucherChecking(true);
    setVoucherWarning("");
    setVoucherQuote(null);
    try {
      const quantities = Object.fromEntries(
        cartItems.map((item) => [Number(item.artwork_id), getItemQuantity(item)]),
      );
      const artworkIdList = cartItems.map((item) => Number(item.artwork_id));
      const result = hasCustomQuantities
        ? await validateCheckoutVoucher(code, artworkIdList, { quantities })
        : await validateCheckoutVoucher(code, artworkIdList);
      if (request !== voucherRequest.current) return;
      setVoucherCode(result.voucher.code);
      setVoucherQuote({ code: result.voucher.code, cartKey, result });
    } catch (voucherError) {
      if (request === voucherRequest.current) setVoucherWarning(voucherError.message || "Unable to apply this voucher.");
    } finally {
      if (request === voucherRequest.current) setVoucherChecking(false);
    }
  };

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
        } else if (returnPayment === "success" && String(result.payment_status).toLowerCase() !== "paid" && !paymentAction.current) {
          try {
            paymentAction.current = true;
            const retryResult = await retryBuyerPayment(paymentReference);
            if (!active || request.signal.aborted) return;
            if (retryResult?.orders?.length || String(retryResult?.payment_status).toLowerCase() === "paid") {
              result = {
                ...result,
                ...retryResult,
                orders: retryResult.orders?.length ? retryResult.orders : result.orders,
                payment_status: retryResult.payment_status || result.payment_status,
              };
            }
          } catch (retryError) {
            console.warn("Direct PayMongo reconciliation check:", retryError?.message);
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
        const [cart, addresses, paymentConfig] = await Promise.all([
          fetchCart(),
          fetchAddresses(),
          typeof fetchPaymentMethods === "function"
            ? Promise.resolve(fetchPaymentMethods()).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (!active || request !== latestRequest) return;
        if (Array.isArray(paymentConfig?.payment_method_types) && paymentConfig.payment_method_types.length) {
          setEnabledPaymentChannels(paymentConfig.payment_method_types);
        }
        const availableCart = Array.isArray(cart) ? cart : [];
        const checkoutItems = (selectedArtworkIds === null ? availableCart : availableCart.filter((item) => selectedArtworkIds.includes(Number(item.artwork_id))))
          .map((item) => ({
            ...item,
            quantity: requestedQuantities[String(item.artwork_id)] ?? Math.max(1, Number(item.quantity || 1)),
          }));
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

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressFormOpen(true);
  };

  const handleOpenEditAddress = (addressToEdit = currentAddress) => {
    if (!addressToEdit) return;
    setEditingAddress(addressToEdit);
    setAddressFormOpen(true);
  };

  const handleAddressFormSubmit = async (formData) => {
    try {
      setError("");
      let savedAddressId = editingAddress?.address_id;
      if (editingAddress?.address_id) {
        await updateAddress(editingAddress.address_id, formData);
      } else {
        const created = await addAddress(formData);
        savedAddressId = created?.address_id;
      }
      const updatedList = await fetchAddresses();
      const addressList = Array.isArray(updatedList) ? updatedList : [];
      setAddresses(addressList);
      const nextCurrent =
        (savedAddressId && addressList.find((addr) => String(addr.address_id) === String(savedAddressId))) ||
        addressList.find((addr) => Boolean(addr.is_current)) ||
        addressList[0] ||
        null;
      setCurrentAddress(nextCurrent);
      setAddressFormOpen(false);
      setEditingAddress(null);
    } catch (addrError) {
      setError(addrError.message || "Unable to save delivery address.");
    }
  };

  const handleCheckoutQuantityChange = async (item, rawNextQuantity) => {
    if (!isProductItem(item) || loading || submitting.current) return;
    const remaining = getRemainingStock(item);
    const maxAllowed = remaining !== null ? Math.max(1, remaining) : 999;
    const nextQuantity = Math.min(maxAllowed, Math.max(1, Number(rawNextQuantity) || 1));
    const artworkIdKey = String(item.artwork_id);

    setEditableQuantities((prev) => ({
      ...prev,
      [artworkIdKey]: nextQuantity,
    }));
    setCartItems((prev) =>
      prev.map((entry) =>
        String(entry.artwork_id) === artworkIdKey
          ? { ...entry, quantity: nextQuantity }
          : entry,
      ),
    );

    try {
      await updateCartItemQuantity(item.artwork_id, nextQuantity);
    } catch {
      // Checkout payload also submits quantities directly to the server.
    }

    if (voucherQuote?.code) {
      const code = voucherQuote.code;
      const request = ++voucherRequest.current;
      setVoucherChecking(true);
      try {
        const nextQuantities = Object.fromEntries(
          cartItems.map((entry) => [
            Number(entry.artwork_id),
            String(entry.artwork_id) === artworkIdKey ? nextQuantity : getItemQuantity(entry),
          ]),
        );
        const nextCartKey = JSON.stringify(
          cartItems.map((entry) => [
            entry.artwork_id,
            entry.price,
            entry.seller_id,
            entry.is_sold_out,
            String(entry.artwork_id) === artworkIdKey ? nextQuantity : getItemQuantity(entry),
          ]),
        );
        const result = await validateCheckoutVoucher(
          code,
          cartItems.map((entry) => Number(entry.artwork_id)),
          { quantities: nextQuantities },
        );
        if (request === voucherRequest.current) {
          setVoucherQuote({ code: result.voucher.code, cartKey: nextCartKey, result });
          setVoucherWarning("");
        }
      } catch (voucherError) {
        if (request === voucherRequest.current) {
          setVoucherQuote(null);
          setVoucherWarning(voucherError.message || "Voucher requirements changed for the updated quantity.");
        }
      } finally {
        if (request === voucherRequest.current) setVoucherChecking(false);
      }
    }
  };

  const handleContactSeller = (sellerId) => {
    if (!sellerId || sellerId === "unknown") {
      navigate("/buyer/messages");
      return;
    }
    navigate(`/buyer/messages?seller=${encodeURIComponent(sellerId)}`);
  };

  const profile = {
    firstName: localStorage.getItem("buyer_first_name") || "Customer",
    lastName: localStorage.getItem("buyer_last_name") || "",
    email: localStorage.getItem("buyer_email") || "",
  };

  const originalSubtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * getItemQuantity(item),
    0,
  );
  const totalUnits = cartItems.reduce(
    (sum, item) => sum + getItemQuantity(item),
    0,
  );
  const subtotal = appliedVoucher?.subtotal ?? originalSubtotal;
  const discountAmount = Number(appliedVoucher?.discount_amount || 0);
  const shippingFee = 0;
  const hasSoldOutItems = cartItems.some(
    (item) => Number(item.is_sold_out) === 1,
  );
  const hasInsufficientStock = cartItems.some((item) => {
    const remaining = getRemainingStock(item);
    return remaining !== null && getItemQuantity(item) > remaining;
  });
  // Total Amount = Product Subtotal + Shipping Fee - Valid Discount
  const total = Math.max(0, (appliedVoucher?.total ?? (originalSubtotal - discountAmount)) + shippingFee);

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
        artistName:
          item.artist_name ||
          item.artist ||
          item.shop_name ||
          "Seller",
        pickupLocation:
          item.seller_address ||
          "Central Academy of Fine Arts (CAFA) Campus Studio",
        items: [],
        subtotal: 0,
      };
      group.items.push(item);
      group.subtotal += Number(item.price || 0) * getItemQuantity(item);
      groups.set(key, group);
    });
    return [...groups.values()];
  }, [cartItems, requestedQuantities, editableQuantities]);
  const multiStorefront = storefrontGroups.length > 1;
  const selectionIncomplete = selectedArtworkIds !== null &&
    (!selectedArtworkIds.length || selectedArtworkIds.length !== cartItems.length);

  const isDoorToDoor = deliveryMethod === "door_to_door";

  const handlePlaceOrder = async () => {
    if (submitting.current || voucherChecking) return;
    if (voucherCode.trim() && !appliedVoucher) {
      setVoucherWarning(voucherMessage || "Apply the voucher or remove its code before continuing to checkout.");
      return;
    }
    if (!cartItems.length || selectionIncomplete || hasSoldOutItems) {
      setError("Please return to your cart and select available artworks to checkout.");
      return;
    }
    if (hasInsufficientStock) {
      setError("Selected quantity exceeds available stock for one or more items.");
      return;
    }
    if (!["door_to_door", "pickup"].includes(deliveryMethod)) {
      setError("Please select a valid delivery option.");
      return;
    }
    if (isDoorToDoor && !currentAddress?.address_id) {
      setError("Please select or add a delivery address for Door-to-Door orders.");
      return;
    }

    try {
      submitting.current = true;
      setError("");
      setExistingCheckout("");
      setLoading(true);

      const quantities = Object.fromEntries(
        cartItems.map((item) => [Number(item.artwork_id), getItemQuantity(item)]),
      );
      const orderOptions = {
        voucherCode: appliedVoucher?.voucher.code,
        expectedTotalCentavos: appliedVoucher ? Math.round(Number(appliedVoucher.total) * 100) : undefined,
        ...(hasCustomQuantities ? { quantities } : {}),
        ...(deliveryMethod !== "door_to_door" ? { deliveryMethod } : {}),
      };
      const result = await placeBuyerOrder(
        isDoorToDoor ? currentAddress.address_id : (currentAddress?.address_id || null),
        paymentMethod,
        selectedArtworkIds ?? cartItems.map((item) => Number(item.artwork_id)),
        orderOptions,
      );

      /*
       * CASH ON DELIVERY
       */
      if (paymentMethod === "cod") {
        navigate("/buyer/order-finish", {
          state: {
            orders: result.orders,
            paymentMethod,
            deliveryMethod,
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
      if (orderError.code === "voucher_invalid") {
        setVoucherQuote(null);
        setVoucherWarning(orderError.message || "This voucher is no longer valid. Apply another voucher or remove the code.");
        setError("");
      }
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
        returnPayment === "success" && !paymentError && !paymentClosed ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 3,
              maxWidth: 550,
              mx: "auto",
              textAlign: "center",
            }}
          >
            <Stack spacing={2.5} alignItems="center">
              <CircularProgress size={44} color="success" />
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Confirming your payment…
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Your online payment is being verified. Taking you to your order confirmation…
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ) : (
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
        )
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

                {/* Delivery Options: Door-to-Door vs Pickup */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 1 }}
                >
                  Delivery Option
                </Typography>

                <Stack spacing={1.5} sx={{ mb: 3 }} role="radiogroup" aria-label="Delivery method">
                  <DeliveryOptionCard
                    value="door_to_door"
                    title="Door-to-Door Delivery"
                    subtitle="Seller ships the order to your delivery address via courier"
                    icon={<LocalShippingOutlinedIcon color="error" />}
                    selectedValue={deliveryMethod}
                    onSelect={setDeliveryMethod}
                    disabled={loading}
                  />
                  <DeliveryOptionCard
                    value="pickup"
                    title="Pickup"
                    subtitle="Collect the order from the seller's designated pickup location (No shipping fee)"
                    icon={<StorefrontOutlinedIcon color="error" />}
                    selectedValue={deliveryMethod}
                    onSelect={setDeliveryMethod}
                    disabled={loading}
                  />
                </Stack>

                {isDoorToDoor ? (
                  <>
                    {/* Delivery Address */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                      gap={1}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                      >
                        Delivery Address
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {currentAddress && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            startIcon={<EditOutlinedIcon fontSize="small" />}
                            disabled={loading}
                            onClick={() => handleOpenEditAddress(currentAddress)}
                            sx={{ textTransform: "none", borderRadius: 2, fontSize: "0.75rem" }}
                          >
                            Edit Address
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<AddLocationAltOutlinedIcon fontSize="small" />}
                          disabled={loading}
                          onClick={handleOpenAddAddress}
                          sx={{ textTransform: "none", borderRadius: 2, fontSize: "0.75rem", fontWeight: 600 }}
                        >
                          Add New Address
                        </Button>
                      </Stack>
                    </Stack>

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
                      <Alert
                        severity="warning"
                        sx={{ mt: 1, borderRadius: 2 }}
                        action={
                          <Button color="inherit" size="small" onClick={handleOpenAddAddress}>
                            Add Address
                          </Button>
                        }
                      >
                        No delivery address found. Please add a delivery address to place a Door-to-Door order, or switch to Pickup.
                      </Alert>
                    )}
                  </>
                ) : (
                  <>
                    {/* Seller Pickup Location(s) */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Seller Pickup Location{storefrontGroups.length > 1 ? "s" : ""}
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      {storefrontGroups.map((group) => (
                        <Paper
                          key={group.sellerId}
                          variant="outlined"
                          sx={{
                            p: 2.5,
                            borderRadius: 2.5,
                            borderColor: "error.main",
                            bgcolor: "action.selected",
                          }}
                        >
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ sm: "flex-start" }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <StorefrontOutlinedIcon color="error" sx={{ mt: 0.3 }} />
                              <Box>
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                  <Typography variant="subtitle2" fontWeight={700}>
                                    {group.shopName}
                                  </Typography>
                                  <Chip
                                    label="Free Pickup"
                                    size="small"
                                    color="success"
                                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                  />
                                </Stack>
                                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
                                  {group.pickupLocation}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                                  Coordinate your pickup schedule directly with {group.artistName}.
                                </Typography>
                              </Box>
                            </Stack>
                            {group.sellerId && group.sellerId !== "unknown" && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />}
                                onClick={() => handleContactSeller(group.sellerId)}
                                sx={{ textTransform: "none", borderRadius: 2, flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}
                              >
                                Contact Seller
                              </Button>
                            )}
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </>
                )}

                <CheckoutVoucher
                  code={voucherCode}
                  onCodeChange={changeVoucherCode}
                  onApply={applyVoucher}
                  onRemove={() => changeVoucherCode("")}
                  voucher={appliedVoucher}
                  warning={voucherMessage}
                  checking={voucherChecking}
                  disabled={loading || hasSoldOutItems || selectionIncomplete}
                />
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
                    subtitle={
                      enabledPaymentChannels.length
                        ? `Pay via PayMongo Hosted Checkout (${enabledPaymentChannels.map(paymentChannelLabel).join(", ")})`
                        : "Choose your e-wallet, card, or QR payment on PayMongo"
                    }
                    icon={<AccountBalanceWalletOutlinedIcon color="error" />}
                    selectedValue={paymentMethod}
                    disabled={loading}
                  />

                  <PaymentOptionCard
                    value="cod"
                    title={isDoorToDoor ? "Cash on Delivery" : "Cash on Pickup / Delivery"}
                    subtitle={
                      isDoorToDoor
                        ? "Pay in cash upon artwork delivery"
                        : "Pay in cash when collecting your order from the seller"
                    }
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
                    {isDoorToDoor
                      ? "Pay the order amount in cash when your artwork arrives."
                      : "Pay the order amount in cash when picking up your order from the seller."}
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
                spacing={2.25}
                sx={{ my: 2, maxHeight: 380, overflowY: "auto", pr: 0.5 }}
              >
                {cartItems.map((item) => {
                  const qty = getItemQuantity(item);
                  const unitPrice = Number(item.price || 0);
                  const lineTotal = unitPrice * qty;
                  const isProduct = isProductItem(item);
                  const remainingStock = getRemainingStock(item);
                  const typeLabel = isProduct ? "Product" : (item.art_type || "Original Artwork");
                  const variationParts = [
                    isProduct && item.product && String(item.product).toLowerCase() !== "product" ? item.product : null,
                    item.art_size ? `Size: ${item.art_size}` : null,
                    !isProduct && item.genre ? item.genre : null,
                  ].filter(Boolean);

                  return (
                    <Box
                      key={item.cart_item_id || item.artwork_id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                      }}
                    >
                      <Stack direction="row" spacing={1.75} alignItems="flex-start">
                        <WatermarkedArtworkImage
                          image={item.image}
                          alt={item.title || "Artwork"}
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 2,
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
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            Seller: {item.artist || item.shop_name || "Independent artist"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            Type: {typeLabel}
                            {variationParts.length > 0 ? ` · ${variationParts.join(" · ")}` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                            Unit Price: ₱{unitPrice.toLocaleString()} × Qty: {qty}
                          </Typography>

                          {isProduct && (
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                              <IconButton
                                size="small"
                                aria-label={`Decrease quantity for ${item.title}`}
                                disabled={loading || qty <= 1}
                                onClick={() => handleCheckoutQuantityChange(item, qty - 1)}
                                sx={{ border: "1px solid", borderColor: "divider", width: 24, height: 24 }}
                              >
                                <RemoveRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <Typography variant="caption" fontWeight={700} sx={{ minWidth: 20, textAlign: "center" }}>
                                {qty}
                              </Typography>
                              <IconButton
                                size="small"
                                aria-label={`Increase quantity for ${item.title}`}
                                disabled={loading || (remainingStock !== null && qty >= remainingStock)}
                                onClick={() => handleCheckoutQuantityChange(item, qty + 1)}
                                sx={{ border: "1px solid", borderColor: "divider", width: 24, height: 24 }}
                              >
                                <AddRoundedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              {remainingStock !== null && (
                                <Typography variant="caption" color="text.secondary">
                                  ({remainingStock} available)
                                </Typography>
                              )}
                            </Stack>
                          )}
                        </Box>

                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            ₱{lineTotal.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Subtotal
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

              {/* Seller Contact Section */}
              {storefrontGroups.length > 0 && (
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2.5,
                    p: 1.5,
                    mb: 2,
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700, letterSpacing: 0.4, display: "block", mb: 1 }}
                  >
                    {multiStorefront ? `SELLERS (${storefrontGroups.length} STOREFRONTS)` : "SELLER"}
                  </Typography>
                  <Stack spacing={1}>
                    {storefrontGroups.map((group) => (
                      <Stack
                        key={group.sellerId}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {group.shopName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {group.items.length} {group.items.length === 1 ? "item" : "items"} ·{" "}
                            {currency(
                              group.subtotal -
                                (Number(appliedVoucher?.voucher.student_id) === Number(group.sellerId)
                                  ? Number(appliedVoucher.discount_amount)
                                  : 0),
                            )}
                          </Typography>
                        </Box>
                        {group.sellerId && group.sellerId !== "unknown" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ChatBubbleOutlineRoundedIcon fontSize="small" />}
                            onClick={() => handleContactSeller(group.sellerId)}
                            sx={{ textTransform: "none", borderRadius: 2, fontSize: "0.75rem", flexShrink: 0 }}
                          >
                            Contact Seller
                          </Button>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                  {multiStorefront && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      You pay once for all items. Each storefront fulfills and ships its order separately.
                    </Typography>
                  )}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <SummaryRow
                  label={`Product Subtotal (${totalUnits} ${totalUnits === 1 ? "unit" : "units"})`}
                  value={`₱${originalSubtotal.toLocaleString()}`}
                />
                <SummaryRow
                  label="Delivery Option"
                  value={isDoorToDoor ? "Door-to-Door" : "Pickup"}
                />
                <SummaryRow
                  label="Shipping Fee"
                  value={isDoorToDoor ? "₱0 (Paid to courier)" : "₱0 (Free Pickup)"}
                />
                {isDoorToDoor ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: -1, mb: 0.5 }}
                  >
                    Courier shipping is arranged directly with the seller via third-party courier (J&T, Lalamove, etc.).
                  </Typography>
                ) : (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: -1, mb: 0.5 }}
                  >
                    No shipping fee for Pickup orders. Coordinate pickup schedule with the seller.
                  </Typography>
                )}
                {appliedVoucher && (
                  <SummaryRow
                    label={`Voucher (${appliedVoucher.voucher.code})`}
                    value={`−${currency(appliedVoucher.discount_amount)}`}
                  />
                )}
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
                  (isDoorToDoor && !currentAddress) ||
                  loading ||
                  voucherChecking ||
                  hasSoldOutItems ||
                  hasInsufficientStock ||
                  selectionIncomplete
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

      <AddressForm
        open={addressFormOpen}
        handleClose={() => {
          setAddressFormOpen(false);
          setEditingAddress(null);
        }}
        onSubmit={handleAddressFormSubmit}
        selectedAddress={editingAddress}
      />
    </Container>
  );
}

function DeliveryOptionCard({ value, title, subtitle, icon, selectedValue, onSelect, disabled = false }) {
  const isSelected = selectedValue === value;
  return (
    <Paper
      variant="outlined"
      onClick={() => {
        if (!disabled && onSelect) onSelect(value);
      }}
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
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Radio
          size="small"
          color="error"
          checked={isSelected}
          disabled={disabled}
          onChange={() => {
            if (!disabled && onSelect) onSelect(value);
          }}
        />
        <Box sx={{ display: "flex" }}>{icon}</Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
      </Stack>
    </Paper>
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

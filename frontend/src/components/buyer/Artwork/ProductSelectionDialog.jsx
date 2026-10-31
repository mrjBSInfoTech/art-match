import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import ArtworkImage from "../../common/ArtworkImage";
import {
  getSavedProductOptions,
  getSelectedProductsTotalQuantity,
} from "../../../utils/productOptions";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

const formatPrice = (value) => new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
}).format(Number(value || 0));

export default function ProductSelectionDialog({
  open,
  artwork,
  onClose,
  onConfirm,
  isSubmitting = false,
}) {
  const theme = useTheme();
  const options = useMemo(() => getSavedProductOptions(artwork || {}), [artwork]);
  const priceMode = artwork?.artwork_details?.product_price_mode
    || (() => {
      try {
        return JSON.parse(artwork?.artwork_details || "{}").product_price_mode;
      } catch {
        return "shared";
      }
    })();
  const [quantities, setQuantities] = useState({});
  const [orderNote, setOrderNote] = useState("");
  const [error, setError] = useState("");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantities({});
      setOrderNote("");
      setError("");
      setRequestDialogOpen(false);
    }
  }, [open, artwork?.artwork_id, artwork?.id]);

  const selectedProducts = options
    .map((option) => ({
      id: option.id,
      quantity: Number(quantities[option.id] || 0),
    }))
    .filter((option) => option.quantity > 0);

  const totalQuantity = getSelectedProductsTotalQuantity(selectedProducts);
  const totalPrice = selectedProducts.reduce((total, selection) => {
    const option = options.find((item) => item.id === selection.id);
    const unitPrice = priceMode === "manual" ? Number(option?.price) : Number(artwork?.price);
    return total + unitPrice * selection.quantity;
  }, 0);

  const handleContinue = () => {
    if (!selectedProducts.length) {
      setError("Choose at least one product and quantity.");
      return;
    }
    setError("");
    setRequestDialogOpen(true);
  };

  const handleAddToCart = async () => {
    setError("");
    try {
      await onConfirm(selectedProducts, totalQuantity, orderNote.trim());
      setRequestDialogOpen(false);
    } catch (submitError) {
      setError(submitError.message || "Unable to add these products to your cart.");
    }
  };

  return (
    <>
      <Dialog
        open={open && !requestDialogOpen}
        onClose={isSubmitting ? undefined : onClose}
        TransitionComponent={Transition}
        keepMounted
        PaperProps={{
          sx: {
            width: "min(100% - 24px, 470px)",
            maxWidth: "470px",
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: theme.palette.background.paper,
          },
        }}
        aria-labelledby="product-selection-title"
      >
        <DialogTitle
          id="product-selection-title"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 2.5,
            py: 1.75,
            color: theme.palette.text.primary,
            fontSize: 16,
            fontWeight: 700,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ShoppingBagOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          Choose Products
          <Button
            aria-label="Close product selection"
            onClick={isSubmitting ? undefined : onClose}
            disabled={isSubmitting}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              ml: "auto",
              p: 0,
              color: theme.palette.text.secondary,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Select one or more products and enter how many of each you want.
            </Typography>
            {options.map((option) => {
              const quantity = Number(quantities[option.id] || 0);
              const available = Number(option.quantity);
              const price = priceMode === "manual" ? Number(option.price) : Number(artwork?.price);
              return (
                <Box
                  key={option.id}
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 1.5,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flex: 1,
                      minWidth: 0,
                      gap: 1.5,
                      alignItems: "flex-start",
                    }}
                  >
                    {option.imagePreview && (
                      <ArtworkImage
                        image={option.imagePreview}
                        alt={option.name}
                        sx={{
                          width: { xs: 64, sm: 72 },
                          height: { xs: 64, sm: 72 },
                          flexShrink: 0,
                          objectFit: "cover",
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "action.hover",
                        }}
                      />
                    )}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={700} sx={{ fontSize: 14.5, overflowWrap: "anywhere" }}>
                        {option.name}
                      </Typography>
                      {option.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: 12.5,
                            mt: 0.25,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {option.description}
                        </Typography>
                      )}
                      <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                        {formatPrice(price)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {available > 0 ? `${available} available` : "Out of stock"}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      width: { xs: "100%", sm: 96 },
                      flexShrink: 0,
                      pt: { xs: 0.5, sm: 0 },
                    }}
                  >
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      value={quantity === 0 ? "" : quantity}
                      placeholder="0"
                      onChange={(event) => {
                        const raw = event.target.value;
                        if (raw === "") {
                          setQuantities((current) => ({
                            ...current,
                            [option.id]: 0,
                          }));
                          return;
                        }
                        const value = Number(raw);
                        setQuantities((current) => ({
                          ...current,
                          [option.id]: Number.isSafeInteger(value)
                            ? Math.min(Math.max(value, 0), available)
                            : 0,
                        }));
                      }}
                      inputProps={{ min: 0, max: available, step: 1 }}
                      disabled={!Number.isSafeInteger(available) || available <= 0}
                    />
                  </Box>
                </Box>
              );
            })}
            {error && <Alert severity="error">{error}</Alert>}
            {totalQuantity > 0 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Total Selected: {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                  {formatPrice(totalPrice)}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleContinue}
            disabled={isSubmitting || !options.length || totalQuantity === 0}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={open && requestDialogOpen}
        onClose={isSubmitting ? undefined : () => setRequestDialogOpen(false)}
        TransitionComponent={Transition}
        keepMounted
        PaperProps={{
          sx: {
            width: "min(100% - 24px, 470px)",
            maxWidth: "470px",
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: theme.palette.background.paper,
          },
        }}
        aria-labelledby="order-request-title"
      >
        <DialogTitle
          id="order-request-title"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 2.5,
            py: 1.75,
            color: theme.palette.text.primary,
            fontSize: 16,
            fontWeight: 700,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ShoppingBagOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          Add Order Request
          <Button
            aria-label="Back to product selection"
            onClick={isSubmitting ? undefined : () => setRequestDialogOpen(false)}
            disabled={isSubmitting}
            sx={{
              minWidth: 28,
              width: 28,
              height: 28,
              ml: "auto",
              p: 0,
              color: theme.palette.text.secondary,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Add any special requests for the seller. This is optional.
            </Typography>
            <TextField
              label="Request for this order (optional)"
              placeholder="For example, packaging or personalization instructions"
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value.slice(0, 2000))}
              multiline
              minRows={4}
              maxRows={8}
              inputProps={{ maxLength: 2000 }}
              helperText={`${orderNote.length}/2000`}
              autoFocus
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1.5,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Total: {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                {formatPrice(totalPrice)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRequestDialogOpen(false)} disabled={isSubmitting} color="inherit">
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleAddToCart}
            disabled={isSubmitting}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {isSubmitting && (
              <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
            )}
            {isSubmitting ? "Adding..." : "Add to cart"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

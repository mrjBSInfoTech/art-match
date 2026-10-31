import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArtworkImage from "../../common/ArtworkImage";
import {
  getSavedProductOptions,
  getSelectedProductsTotalQuantity,
} from "../../../utils/productOptions";

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
        fullWidth
        maxWidth="sm"
        aria-labelledby="product-selection-title"
      >
        <DialogTitle id="product-selection-title">
          Choose products
        </DialogTitle>
        <DialogContent dividers>
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
                    display: "grid",
                    gridTemplateColumns: option.imagePreview ? "72px minmax(0, 1fr) 100px" : "minmax(0, 1fr) 100px",
                    gap: 1.5,
                    alignItems: "center",
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  {option.imagePreview && (
                    <ArtworkImage
                      image={option.imagePreview}
                      alt={option.name}
                      sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: 1 }}
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                      {option.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                      {option.description}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                      {formatPrice(price)} each
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {available} available
                    </Typography>
                  </Box>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={quantity}
                    onChange={(event) => {
                      const value = Number(event.target.value);
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
              );
            })}
            {error && <Alert severity="error">{error}</Alert>}
            {totalQuantity > 0 && (
              <Typography textAlign="right" fontWeight={700}>
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"} · {formatPrice(totalPrice)}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleContinue}
            disabled={isSubmitting || !options.length}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={open && requestDialogOpen}
        onClose={isSubmitting ? undefined : () => setRequestDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="order-request-title"
      >
        <DialogTitle id="order-request-title">Add an order request</DialogTitle>
        <DialogContent dividers>
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
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Typography textAlign="right" fontWeight={700}>
              {totalQuantity} {totalQuantity === 1 ? "item" : "items"} · {formatPrice(totalPrice)}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRequestDialogOpen(false)} disabled={isSubmitting}>Back</Button>
          <Button
            variant="contained"
            onClick={handleAddToCart}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add to cart"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

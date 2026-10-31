import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArtworkImage from "../../common/ArtworkImage";
import { MAX_STOCK_QUANTITY } from "../../../utils/inventory";

function isPositiveWholeNumber(value) {
  return /^[1-9]\d*$/.test(String(value).trim());
}

export default function ProductInventoryDialog({
  open,
  product,
  onClose,
  onAdjustStock,
  saving = false,
}) {
  const [adjustments, setAdjustments] = useState({});
  const options = product.product_options || [];

  const updateAdjustment = (optionId, patch) => {
    setAdjustments((current) => ({
      ...current,
      [optionId]: {
        direction: "add",
        quantity: "",
        ...current[optionId],
        ...patch,
        error: patch.error === undefined ? "" : patch.error,
      },
    }));
  };

  const saveAdjustment = async (option) => {
    const form = adjustments[option.id] || { direction: "add", quantity: "" };
    const quantity = Number(form.quantity);
    const available = Number(option.stock_quantity) || 0;
    const sold = Number(option.sold_quantity) || 0;
    const maxAddition = Math.max(0, MAX_STOCK_QUANTITY - available - sold);

    if (!isPositiveWholeNumber(form.quantity) || !Number.isSafeInteger(quantity)) {
      updateAdjustment(option.id, { error: "Enter a positive whole number." });
      return;
    }
    if (form.direction === "reduce" && quantity > available) {
      updateAdjustment(option.id, {
        error: `You can reduce at most ${available.toLocaleString()} units.`,
      });
      return;
    }
    if (form.direction === "add" && quantity > maxAddition) {
      updateAdjustment(option.id, {
        error: `You can add at most ${maxAddition.toLocaleString()} units.`,
      });
      return;
    }

    try {
      await onAdjustStock(
        product.artwork_id,
        option.id,
        form.direction,
        quantity,
      );
      updateAdjustment(option.id, { quantity: "" });
    } catch (error) {
      updateAdjustment(option.id, {
        error: error.message || "Unable to update this product's stock.",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby={`product-inventory-title-${product.artwork_id}`}
    >
      <DialogTitle id={`product-inventory-title-${product.artwork_id}`}>
        Products in {product.title}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            View each product and adjust its available quantity by adding or reducing stock.
          </Typography>
          {options.map((option) => {
            const form = adjustments[option.id] || { direction: "add", quantity: "", error: "" };
            const available = Number(option.stock_quantity) || 0;
            const maxAddition = Math.max(
              0,
              MAX_STOCK_QUANTITY - available - (Number(option.sold_quantity) || 0),
            );
            return (
              <Box
                key={option.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: option.image ? "88px minmax(0, 1fr) minmax(190px, 230px)" : "minmax(0, 1fr) minmax(190px, 230px)",
                  },
                  gap: 2,
                  alignItems: "center",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                {option.image && (
                  <ArtworkImage
                    image={option.image}
                    alt={option.name}
                    sx={{ width: 88, height: 88, objectFit: "cover", borderRadius: 1.5 }}
                  />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                    {option.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", mt: 0.5 }}
                  >
                    {option.description}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${available.toLocaleString()} available`}
                    color={available === 0 ? "error" : "success"}
                    sx={{ mt: 1, fontWeight: 700 }}
                  />
                </Box>
                <Stack spacing={1}>
                  <FormControl size="small" fullWidth disabled={saving}>
                    <InputLabel id={`option-action-${product.artwork_id}-${option.id}`}>
                      Stock action
                    </InputLabel>
                    <Select
                      labelId={`option-action-${product.artwork_id}-${option.id}`}
                      value={form.direction}
                      label="Stock action"
                      onChange={(event) =>
                        updateAdjustment(option.id, { direction: event.target.value })
                      }
                    >
                      <MenuItem value="add">Add stock</MenuItem>
                      <MenuItem value="reduce">Reduce stock</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    type="number"
                    label={form.direction === "add" ? "Amount to add" : "Amount to reduce"}
                    value={form.quantity}
                    onChange={(event) =>
                      updateAdjustment(option.id, { quantity: event.target.value })
                    }
                    error={Boolean(form.error)}
                    helperText={
                      form.error ||
                      (form.direction === "reduce"
                        ? `1 to ${available.toLocaleString()}`
                        : maxAddition > 0
                          ? `1 to ${maxAddition.toLocaleString()}`
                          : "At supported maximum")
                    }
                    slotProps={{
                      htmlInput: {
                        min: 1,
                        max: form.direction === "reduce" ? available : maxAddition,
                        step: 1,
                      },
                    }}
                    disabled={
                      saving ||
                      (form.direction === "add" && maxAddition === 0) ||
                      (form.direction === "reduce" && available === 0)
                    }
                  />
                  <Button
                    variant="contained"
                    onClick={() => saveAdjustment(option)}
                    disabled={saving || !form.quantity.trim()}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    {saving ? "Updating..." : "Update Quantity"}
                  </Button>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

import React, { useEffect, useState } from "react";
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
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import ArtworkImage from "../../common/ArtworkImage";
import { MAX_STOCK_QUANTITY } from "../../../utils/inventory";

function isPositiveWholeNumber(value) {
  return /^[1-9]\d*$/.test(String(value).trim());
}

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});


export default function InventoryStock({
  open,
  product,
  onClose,
  onAdjustStock,
  saving = false,
}) {
  const theme = useTheme();
  const [adjustments, setAdjustments] = useState({});
  const options = product?.product_options || [];

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };

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
      await onAdjustStock(product.artwork_id, option.id, form.direction, quantity);
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
      TransitionComponent={Transition}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 620px)",
          maxWidth: "620px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
      aria-labelledby={`product-inventory-title-${product?.artwork_id}`}
    >
      <DialogTitle
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
        <PaletteOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Products in {product?.title || "this artwork"}
        <Button
          aria-label="Close product stock details"
          onClick={onClose}
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

      <DialogContent dividers sx={{ py: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            View each product and adjust its available quantity by adding or reducing stock.
          </Typography>

          {options.length === 0 ? (
            <Typography sx={{ color: theme.palette.text.secondary }}>
              No product options available for this artwork.
            </Typography>
          ) : (
            options.map((option) => {
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
                    p: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.default,
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: option.image ? "84px minmax(0, 1fr)" : "1fr" },
                      gap: 1.5,
                      alignItems: "start",
                    }}
                  >
                    {option.image && (
                      <ArtworkImage
                        image={option.image}
                        alt={option.name || "Product image"}
                        sx={{ width: { xs: "100%", sm: 84 }, height: 84, objectFit: "cover", borderRadius: 1.5 }}
                      />
                    )}

                    <Stack spacing={1.25}>
                      <Box>
                        <Typography sx={detailLabelSx}>Product</Typography>
                        <Typography sx={detailValueSx}>{option.name || "Not provided"}</Typography>
                      </Box>

                      <Box>
                        <Typography sx={detailLabelSx}>Description</Typography>
                        <Typography sx={detailValueSx}>{option.description || "No description provided."}</Typography>
                      </Box>

                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.25 }}>
                        <Box>
                          <Typography sx={detailLabelSx}>Available stock</Typography>
                          <Typography sx={detailValueSx}>{available.toLocaleString()} units</Typography>
                        </Box>
                        <Box>
                          <Typography sx={detailLabelSx}>Sold</Typography>
                          <Typography sx={detailValueSx}>{(Number(option.sold_quantity) || 0).toLocaleString()} units</Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 1.5, alignItems: "end" }}>
                        <FormControl size="small" fullWidth disabled={saving}>
                          <InputLabel id={`option-action-${product.artwork_id}-${option.id}`}>Stock action</InputLabel>
                          <Select
                            labelId={`option-action-${product.artwork_id}-${option.id}`}
                            value={form.direction}
                            label="Stock action"
                            onChange={(event) => updateAdjustment(option.id, { direction: event.target.value })}
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
                          onChange={(event) => updateAdjustment(option.id, { quantity: event.target.value })}
                          error={Boolean(form.error)}
                          helperText={form.error || ""}
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
                      </Box>

                      <Button
                        variant="contained"
                        onClick={() => saveAdjustment(option)}
                        disabled={saving || !String(form.quantity || "").trim()}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          width: "100%",
                          mt: 1,
                          height: 52,
                          fontSize: 18,
                          borderRadius: 2,
                        }}
                      >
                        {saving ? "Updating..." : "Update Quantity"}
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ fontWeight: 600 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import ArtworkImage from "../../common/ArtworkImage";
import ProductInventoryDialog from "./ProductInventoryDialog";
import {
  MAX_STOCK_QUANTITY,
  getStockStatus,
  getStockStatusLabel,
  toStockQuantity,
} from "../../../utils/inventory";

const statusColors = {
  "in-stock": { color: "success", background: "#C1FFA9", text: "#2C8508" },
  "low-stock": { color: "warning", background: "#FDCB80", text: "#9B5F03" },
  "out-of-stock": { color: "error", background: "#FC9495", text: "#880506" },
};

function validStockInput(value) {
  return /^(?:0|[1-9]\d*)$/.test(String(value).trim());
}

export default function InventoryCard({
  product,
  onSaveStock,
  onAdjustOptionStock,
  saving = false,
}) {
  const [adjustment, setAdjustment] = useState("add");
  const [stockInput, setStockInput] = useState("");
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const stock = toStockQuantity(product.stock_quantity);
  const hasProductOptions = product.product_options?.length > 0;
  const maxAddition = Math.max(
    0,
    MAX_STOCK_QUANTITY - stock - toStockQuantity(product.sold_quantity),
  );
  const status = getStockStatus(stock);
  const colors = statusColors[status];

  useEffect(() => {
    setAdjustment("add");
    setStockInput("");
    setError("");
  }, [product.artwork_id, product.stock_quantity]);

  const save = async () => {
    const value = stockInput.trim();
    const quantity = Number(value);

    if (!validStockInput(value) || !Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Enter a positive whole number.");
      return;
    }

    if (quantity > MAX_STOCK_QUANTITY) {
      setError(`Stock cannot be greater than ${MAX_STOCK_QUANTITY.toLocaleString()}.`);
      return;
    }

    if (adjustment === "reduce" && quantity > stock) {
      setError(`You can reduce at most ${stock.toLocaleString()} units.`);
      return;
    }

    try {
      setError("");
      await onSaveStock(product.artwork_id, adjustment, quantity);
      setStockInput("");
    } catch (saveError) {
      setError(saveError.message || "Unable to save stock.");
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <ArtworkImage
        image={product.image}
        alt={product.title}
        sx={{ width: "100%", height: 190, objectFit: "cover", bgcolor: "action.hover" }}
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }} noWrap>
              {product.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              ₱{Number(product.price || 0).toLocaleString()}
            </Typography>
          </Box>
          <Chip
            label={getStockStatusLabel(stock)}
            color={colors.color}
            size="small"
            sx={{ fontWeight: 700, flexShrink: 0, color:"#fff" }}
          />
        </Box>

        <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: colors.background }}>
          <Typography variant="caption" sx={{ display: "block", color: colors.text, fontWeight: "bold" }}>
            Current stock
          </Typography>
          <Typography variant="h5" sx={{ color: colors.text, fontWeight: "bold", mt: 0.25 }}>
            {stock.toLocaleString()} {stock === 1 ? "unit" : "units"}
          </Typography>
        </Box>

        {hasProductOptions ? (
          <Button
            variant="outlined"
            onClick={() => setDetailsOpen(true)}
            disabled={saving}
            sx={{ mt: "auto", textTransform: "none", fontWeight: 700 }}
          >
            Details
          </Button>
        ) : (
          <>
            <FormControl size="small" fullWidth disabled={saving}>
              <InputLabel id={`stock-adjustment-label-${product.artwork_id}`}>
                Stock action
              </InputLabel>
              <Select
                labelId={`stock-adjustment-label-${product.artwork_id}`}
                value={adjustment}
                label="Stock action"
                onChange={(event) => {
                  setAdjustment(event.target.value);
                  setError("");
                }}
              >
                <MenuItem value="add">Add stock</MenuItem>
                <MenuItem value="reduce">Reduce stock</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={adjustment === "add" ? "Amount to add" : "Amount to reduce"}
              type="number"
              size="small"
              fullWidth
              value={stockInput}
              onChange={(event) => {
                setStockInput(event.target.value);
                setError("");
              }}
              error={Boolean(error)}
              helperText={
                error ||
                (adjustment === "reduce"
                  ? `Enter a whole number from 1 to ${stock.toLocaleString()}.`
                  : maxAddition > 0
                    ? `Enter a whole number from 1 to ${maxAddition.toLocaleString()}.`
                    : "Stock is already at the supported maximum.")
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: adjustment === "reduce" ? stock : maxAddition,
                  step: 1,
                },
              }}
              disabled={saving || (adjustment === "add" && maxAddition === 0)}
            />
            <Button
              variant="contained"
              onClick={save}
              disabled={saving || !stockInput.trim()}
              sx={{ mt: "auto", textTransform: "none", fontWeight: 700, color: "#fff" }}
            >
              {saving ? "Updating..." : "Update Stock"}
            </Button>
          </>
        )}
      </CardContent>
      {hasProductOptions && (
        <ProductInventoryDialog
          open={detailsOpen}
          product={product}
          onClose={() => setDetailsOpen(false)}
          onAdjustStock={onAdjustOptionStock}
          saving={saving}
        />
      )}
    </Card>
  );
}

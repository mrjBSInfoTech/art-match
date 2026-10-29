import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Typography,
} from "@mui/material";
import ArtworkImage from "../../common/ArtworkImage";
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

export default function InventoryCard({ product, onSaveStock, saving = false }) {
  const [stockInput, setStockInput] = useState(String(toStockQuantity(product.stock_quantity)));
  const [error, setError] = useState("");
  const stock = toStockQuantity(product.stock_quantity);
  const status = getStockStatus(stock);
  const colors = statusColors[status];

  useEffect(() => {
    setStockInput(String(toStockQuantity(product.stock_quantity)));
    setError("");
  }, [product.artwork_id, product.stock_quantity]);

  const save = async () => {
    const value = stockInput.trim();
    const quantity = Number(value);

    if (!validStockInput(value) || !Number.isSafeInteger(quantity)) {
      setError("Enter a non-negative whole number.");
      return;
    }

    if (quantity > MAX_STOCK_QUANTITY) {
      setError(`Stock cannot be greater than ${MAX_STOCK_QUANTITY.toLocaleString()}.`);
      return;
    }

    try {
      setError("");
      await onSaveStock(product.artwork_id, quantity);
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

        <TextField
          label="New stock quantity"
          type="number"
          size="small"
          fullWidth
          value={stockInput}
          onChange={(event) => {
            setStockInput(event.target.value);
            setError("");
          }}
          error={Boolean(error)}
          helperText={error || "Use a whole number from 0 upward."}
          slotProps={{ htmlInput: { min: 0, max: MAX_STOCK_QUANTITY, step: 1 } }}
          disabled={saving}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <Button
          variant="contained"
          color="error"
          onClick={save}
          disabled={saving || stockInput === String(stock)}
          sx={{ mt: "auto", textTransform: "none", fontWeight: 700, color:"#fff" }}
        >
          {saving ? "Saving..." : "Save Stock"}
        </Button>
      </CardContent>
    </Card>
  );
}

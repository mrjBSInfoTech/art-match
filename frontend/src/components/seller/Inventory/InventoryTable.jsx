import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArtworkImage from "../../common/ArtworkImage";
import InventoryStock from "./InventoryStock";
import { sellerTableButtonSx } from "../sellerTableStyles";
import {
  MAX_STOCK_QUANTITY,
  getStockStatus,
  getStockStatusLabel,
  toStockQuantity,
} from "../../../utils/inventory";

function validStockInput(value) {
  return /^(?:0|[1-9]\d*)$/.test(String(value).trim());
}

function formatPrice(value) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
      }).format(Number(value))
    : "—";
}

function getStockPillStyle(theme, status) {
  const isDark = theme.palette.mode === "dark";
  const shade = isDark ? "light" : "dark";
  const paletteKey =
    status === "in-stock"
      ? "success"
      : status === "low-stock"
        ? "warning"
        : "error";
  const baseColor = theme.palette[paletteKey]?.main || theme.palette.text.secondary;

  return {
    bgcolor: alpha(baseColor, isDark ? 0.18 : 0.12),
    color: theme.palette[paletteKey]?.[shade] || baseColor,
    border: "1px solid",
    borderColor: alpha(baseColor, 0.35),
  };
}

function StockControls({
  product,
  form,
  saving,
  compact = false,
  onFormChange,
  onSave,
  onOpenOptions,
}) {
  const stock = toStockQuantity(product.stock_quantity);
  const sold = toStockQuantity(product.sold_quantity);
  const hasProductOptions = Boolean(product.product_options?.length > 0);
  const maxAddition = Math.max(0, MAX_STOCK_QUANTITY - stock - sold);
  const adjustment = form?.adjustment || "add";
  const stockInput = form?.stockInput ?? "";
  const error = form?.error || "";

  if (hasProductOptions) {
    return (
      <Stack
        direction="row"
        spacing={1}
        justifyContent={compact ? "flex-start" : "center"}
        alignItems="center"
        sx={{ width: compact ? "100%" : "auto" }}
      >
        <Button
          variant="outlined"
          onClick={() => onOpenOptions(product.artwork_id)}
          disabled={saving}
          fullWidth={compact}
          sx={sellerTableButtonSx}
        >
          Manage Options ({product.product_options.length})
        </Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: compact
            ? { xs: "1fr", sm: "130px minmax(0, 1fr) auto" }
            : "120px 104px auto",
          gap: 1,
          alignItems: "center",
          justifyContent: compact ? "stretch" : "center",
        }}
      >
        <FormControl size="small" fullWidth disabled={saving}>
          <InputLabel id={`table-stock-action-${product.artwork_id}`}>
            Action
          </InputLabel>
          <Select
            labelId={`table-stock-action-${product.artwork_id}`}
            value={adjustment}
            label="Action"
            onChange={(event) =>
              onFormChange(product.artwork_id, {
                adjustment: event.target.value,
                error: "",
              })
            }
          >
            <MenuItem value="add">Add</MenuItem>
            <MenuItem value="reduce">Reduce</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          label="Qty"
          placeholder="0"
          fullWidth
          value={stockInput}
          onChange={(event) =>
            onFormChange(product.artwork_id, {
              stockInput: event.target.value,
              error: "",
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" && stockInput.trim() && !saving) {
              onSave(product);
            }
          }}
          error={Boolean(error)}
          slotProps={{
            htmlInput: {
              min: 1,
              max: adjustment === "reduce" ? stock : maxAddition,
              step: 1,
              "aria-label": `${adjustment === "add" ? "Amount to add" : "Amount to reduce"} for ${product.title || "artwork"}`,
            },
          }}
          disabled={
            saving ||
            (adjustment === "add" && maxAddition === 0) ||
            (adjustment === "reduce" && stock === 0)
          }
        />

        <Button
          variant="outlined"
          onClick={() => onSave(product)}
          disabled={saving || !stockInput.trim()}
          sx={sellerTableButtonSx}
        >
          {saving ? "Saving..." : "Update"}
        </Button>
      </Box>

      {error && (
        <FormHelperText error sx={{ mt: 0.5, mx: 0.25 }}>
          {error}
        </FormHelperText>
      )}
    </Box>
  );
}

export default function InventoryTable({
  products = [],
  onSaveStock,
  onAdjustOptionStock,
  savingProductId = null,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [rowForms, setRowForms] = useState({});
  const [selectedProductId, setSelectedProductId] = useState(null);

  const selectedProduct =
    products.find((item) => item.artwork_id === selectedProductId) || null;

  useEffect(() => {
    setRowForms((current) => {
      const next = {};
      for (const product of products) {
        const prev = current[product.artwork_id];
        if (prev && prev.lastStock === product.stock_quantity) {
          next[product.artwork_id] = prev;
        }
      }
      return next;
    });
  }, [products]);

  const updateRowForm = (artworkId, patch) => {
    const product = products.find((item) => item.artwork_id === artworkId);
    setRowForms((current) => ({
      ...current,
      [artworkId]: {
        adjustment: "add",
        stockInput: "",
        error: "",
        lastStock: product?.stock_quantity,
        ...current[artworkId],
        ...patch,
      },
    }));
  };

  const handleSave = async (product) => {
    const form = rowForms[product.artwork_id] || {
      adjustment: "add",
      stockInput: "",
    };
    const adjustment = form.adjustment || "add";
    const value = String(form.stockInput || "").trim();
    const quantity = Number(value);
    const stock = toStockQuantity(product.stock_quantity);
    const sold = toStockQuantity(product.sold_quantity);
    const maxAddition = Math.max(0, MAX_STOCK_QUANTITY - stock - sold);

    if (!validStockInput(value) || !Number.isSafeInteger(quantity) || quantity <= 0) {
      updateRowForm(product.artwork_id, {
        error: "Enter a positive whole number.",
      });
      return;
    }

    if (quantity > MAX_STOCK_QUANTITY) {
      updateRowForm(product.artwork_id, {
        error: `Stock cannot be greater than ${MAX_STOCK_QUANTITY.toLocaleString()}.`,
      });
      return;
    }

    if (adjustment === "reduce" && quantity > stock) {
      updateRowForm(product.artwork_id, {
        error: `You can reduce at most ${stock.toLocaleString()} units.`,
      });
      return;
    }

    if (adjustment === "add" && quantity > maxAddition) {
      updateRowForm(product.artwork_id, {
        error: `You can add at most ${maxAddition.toLocaleString()} units.`,
      });
      return;
    }

    try {
      updateRowForm(product.artwork_id, { error: "" });
      await onSaveStock(product.artwork_id, adjustment, quantity);
      updateRowForm(product.artwork_id, {
        adjustment: "add",
        stockInput: "",
        error: "",
      });
    } catch (saveError) {
      updateRowForm(product.artwork_id, {
        error: saveError.message || "Unable to save stock.",
      });
    }
  };

  return (
    <>
      <Paper
        component="section"
        variant="outlined"
        aria-label="Seller inventory table"
        sx={{
          borderRadius: 3.5,
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
            Inventory stock
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            Review available stock levels and quickly add or reduce listing quantities.
          </Typography>
        </Box>

        {isMobile ? (
          <Stack divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}>
            {products.map((product) => {
              const stock = toStockQuantity(product.stock_quantity);
              const sold = toStockQuantity(product.sold_quantity);
              const status = getStockStatus(stock);
              const pillStyle = getStockPillStyle(theme, status);
              const isSaving = savingProductId === product.artwork_id;

              return (
                <Box key={product.artwork_id} sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
                        <ArtworkImage
                          variant="thumb"
                          image={product.image}
                          alt={product.title || "Artwork"}
                          sx={{
                            width: 52,
                            height: 52,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            objectFit: "cover",
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            title={product.title || "Untitled artwork"}
                          >
                            {product.title || "Untitled artwork"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {product.product || product.exact_art_type || product.product_type || "Artwork"}
                          </Typography>
                        </Box>
                      </Box>

                      <Chip
                        size="small"
                        label={getStockStatusLabel(stock)}
                        sx={{
                          ...pillStyle,
                          fontWeight: 800,
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 1,
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: theme.palette.action.hover,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Price
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                          noWrap
                        >
                          {formatPrice(product.price)}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Available
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                          noWrap
                        >
                          {stock.toLocaleString()} {stock === 1 ? "unit" : "units"}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sold
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                          noWrap
                        >
                          {sold.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <StockControls
                      product={product}
                      form={rowForms[product.artwork_id]}
                      saving={isSaving}
                      compact
                      onFormChange={updateRowForm}
                      onSave={handleSave}
                      onOpenOptions={setSelectedProductId}
                    />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
            <Table
              stickyHeader
              size="small"
              aria-label="Seller inventory table"
              sx={{ minWidth: 920 }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: "text.secondary",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Artwork</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Current Stock</TableCell>
                  <TableCell align="right">Sold</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Adjust Stock</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => {
                  const stock = toStockQuantity(product.stock_quantity);
                  const sold = toStockQuantity(product.sold_quantity);
                  const hasProductOptions = Boolean(product.product_options?.length > 0);
                  const status = getStockStatus(stock);
                  const pillStyle = getStockPillStyle(theme, status);
                  const isSaving = savingProductId === product.artwork_id;

                  return (
                    <TableRow
                      key={product.artwork_id}
                      hover
                      sx={{
                        "& td": { py: 1.75, verticalAlign: "middle" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ minWidth: 230, maxWidth: 320 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                          <ArtworkImage
                            variant="thumb"
                            image={product.image}
                            alt={product.title || "Artwork"}
                            sx={{
                              width: 52,
                              height: 52,
                              flexShrink: 0,
                              borderRadius: 1.5,
                              objectFit: "cover",
                            }}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              noWrap
                              title={product.title || "Untitled artwork"}
                            >
                              {product.title || "Untitled artwork"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {hasProductOptions
                                ? `${product.product_options.length} product ${
                                    product.product_options.length === 1 ? "option" : "options"
                                  }`
                                : product.product || product.exact_art_type || product.product_type || "Artwork"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {formatPrice(product.price)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {stock.toLocaleString()} {stock === 1 ? "unit" : "units"}
                        </Typography>
                      </TableCell>

                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {sold.toLocaleString()}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          label={getStockStatusLabel(stock)}
                          sx={{
                            ...pillStyle,
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>

                      <TableCell align="center" sx={{ width: 340, minWidth: 320 }}>
                        <StockControls
                          product={product}
                          form={rowForms[product.artwork_id]}
                          saving={isSaving}
                          onFormChange={updateRowForm}
                          onSave={handleSave}
                          onOpenOptions={setSelectedProductId}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {selectedProduct && (
        <InventoryStock
          open={Boolean(selectedProduct)}
          product={selectedProduct}
          onClose={() => setSelectedProductId(null)}
          onAdjustStock={onAdjustOptionStock}
          saving={savingProductId === selectedProduct.artwork_id}
        />
      )}
    </>
  );
}

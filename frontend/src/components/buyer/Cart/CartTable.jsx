import {
  Box,
  Button,
  Chip,
  Checkbox,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

export default function CartTable({
  items, onRemove, removing = false, selectedIds = [], onSelectionChange,
  cartQuantities = {}, onQuantityChange,
}) {
  const availableIds = items
    .filter((item) => Number(item.is_sold_out) !== 1)
    .map((item) => String(item.artwork_id));
  const selected = new Set(selectedIds.map(String));
  const selectedCount = availableIds.filter((id) => selected.has(id)).length;
  const isProductItem = (item) => {
    const artType = String(item?.art_type || "").trim().toLowerCase();
    const product = String(item?.product || "").trim().toLowerCase();
    const productValues = ["product", "3d_object", "3d object", "sculpture", "physical_product", "physical product"];
    return productValues.includes(artType) || productValues.includes(product);
  };
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 3, overflow: "hidden", minWidth: 0 }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Your cart
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select the artworks you want to checkout.
          </Typography>
        </Box>
        <Chip
          label={`${items.length} ${items.length === 1 ? "item" : "items"}`}
          size="small"
          variant="outlined"
          sx={{ ml: 1, fontWeight: 600 }}
        />
      </Stack>
      <TableContainer>
        <Table
          aria-label="Artworks in your cart"
          sx={{
            tableLayout: "fixed",
            "& th, & td": { borderColor: "divider" },
          }}
        >
          <TableHead sx={{ bgcolor: "action.hover" }}>
            <TableRow>
              <TableCell
                sx={{
                  pl: { xs: 1, sm: 3 },
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                <Stack direction="row" alignItems="center">
                  <Checkbox
                    size="small"
                    checked={availableIds.length > 0 && selectedCount === availableIds.length}
                    indeterminate={selectedCount > 0 && selectedCount < availableIds.length}
                    disabled={!availableIds.length || removing}
                    onChange={(_, checked) => onSelectionChange(checked ? availableIds : [])}
                    slotProps={{ input: { "aria-label": "Select all available artworks" } }}
                  />
                  Artwork
                </Stack>
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  width: { xs: 110, sm: 165 },
                  color: "text.secondary",
                  fontWeight: 600,
                }}
              >
                Quantity / Price
              </TableCell>
              <TableCell sx={{ width: { xs: 44, sm: 64 }, px: 0 }}>
                <Box
                  component="span"
                  sx={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                    clipPath: "inset(50%)",
                  }}
                >
                  Remove
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const soldOut = Number(item.is_sold_out) === 1;
              return (
                <TableRow
                  key={item.artwork_id}
                  selected={selected.has(String(item.artwork_id)) && !soldOut}
                  sx={{
                    "&:last-child td": { borderBottom: 0 },
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <TableCell sx={{ pl: { xs: 1, sm: 3 }, pr: 0.5, py: 2.5 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} alignItems="flex-start" sx={{ minWidth: 0 }}>
                      <Checkbox
                        size="small"
                        checked={selected.has(String(item.artwork_id)) && !soldOut}
                        disabled={soldOut || removing}
                        onChange={(_, checked) => onSelectionChange(checked
                          ? [...selectedIds, String(item.artwork_id)]
                          : selectedIds.filter((id) => String(id) !== String(item.artwork_id)))}
                        slotProps={{ input: { "aria-label": `Select ${item.title || "artwork"} for checkout` } }}
                        sx={{ ml: -1, mr: 0.5 }}
                      />
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{ minWidth: 0, alignItems: { xs: "flex-start", sm: "center" } }}
                    >
                      <WatermarkedArtworkImage
                        image={item.image}
                        alt={item.title || "Artwork"}
                        sx={{
                          width: { xs: 64, sm: 88 },
                          height: { xs: 64, sm: 88 },
                          borderRadius: 2,
                          objectFit: "cover",
                          flexShrink: 0,
                          bgcolor: "action.hover",
                        }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                        >
                          {item.title || "Untitled artwork"}
                        </Typography>
                        {item.artist && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.25, overflowWrap: "anywhere" }}
                          >
                            {item.artist}
                          </Typography>
                        )}
                        <Chip
                          label={soldOut ? "Sold out" : "Available"}
                          size="small"
                          color={soldOut ? "default" : "success"}
                          variant="outlined"
                          sx={{
                            mt: 1,
                            height: 23,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      px: 1,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <Stack direction="column" alignItems="flex-end" spacing={0.75}>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!isProductItem(item)}
                          onClick={() => onQuantityChange?.(item.artwork_id, Math.max(1, Number(cartQuantities[item.artwork_id] || 1) - 1))}
                          sx={{
                            minWidth: 24,
                            width: 24,
                            height: 24,
                            p: 0,
                            borderRadius: 1,
                            opacity: isProductItem(item) ? 1 : 0.55,
                          }}
                        >
                          −
                        </Button>
                        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 18, textAlign: "center" }}>
                          {Number(cartQuantities[item.artwork_id] || 1)}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!isProductItem(item)}
                          onClick={() => onQuantityChange?.(item.artwork_id, Number(cartQuantities[item.artwork_id] || 1) + 1)}
                          sx={{
                            minWidth: 24,
                            width: 24,
                            height: 24,
                            p: 0,
                            borderRadius: 1,
                            opacity: isProductItem(item) ? 1 : 0.55,
                          }}
                        >
                          +
                        </Button>
                      </Stack>
                      <Typography variant="body2" color="text.primary">
                        {formatPrice(item.price * (Number(cartQuantities[item.artwork_id] || 1) || 1))}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0 }}>
                    <Tooltip title="Remove from cart">
                      <span>
                        <IconButton
                          aria-label={`Remove ${item.title || "artwork"} from cart`}
                          disabled={removing}
                          onClick={() => onRemove(item)}
                          sx={{
                            color: "text.secondary",
                            "&:hover": {
                              color: "error.main",
                              bgcolor: "action.selected",
                            },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

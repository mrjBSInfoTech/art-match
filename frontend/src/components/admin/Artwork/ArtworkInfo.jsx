import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Slide,
  Stack,
  Box,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkImage from "../../common/ArtworkImage";
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CancelSharpIcon from '@mui/icons-material/CancelSharp';
import {
  isArtworkSoldOut,
  getArtworkRemainingStock,
  getArtworkMaxOrderQuantity,
} from "../../../utils/artworkAvailability";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ArtworkInfo({
  open,
  handleClose,
  selectedArtwork,
  onVerify,
  onReject,
  canEdit,
}) {
  const theme = useTheme();
  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-PH", {
      month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };
  const [artwork, setArtwork] = useState(null);

  useEffect(() => {
    if (selectedArtwork) {
      setArtwork(selectedArtwork);
    } else {
      setArtwork(null);
    }
  }, [selectedArtwork, open]);

  const formatList = (value) => {
    if (!value) return "N/A";

    let list = value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        list = Array.isArray(parsed) ? parsed : value.split(",");
      } catch {
        list = value.split(",");
      }
    }
    if (!Array.isArray(list)) list = [list];

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";

        return item
          .trim()
          .replace(/_/g, " ")
          .replace(/\s+/g, " ")
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean);

    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };

  const toColorList = (value) => {
    if (!value) return [];
    if (Array.isArray(value))
      return value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean);
    } catch {
      // Scanned colors are usually comma-separated values.
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const isHexColor = (value) =>
    /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.test(value);

  const getChipTextColor = (value) => {
    if (!isHexColor(value)) return "#334155";
    const hex = value.replace("#", "");
    const expanded =
      hex.length === 3
        ? hex
            .split("")
            .map((part) => part + part)
            .join("")
        : hex;
    const red = parseInt(expanded.slice(0, 2), 16);
    const green = parseInt(expanded.slice(2, 4), 16);
    const blue = parseInt(expanded.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 150
      ? "#111"
      : "#fff";
  };

  const colors = artwork
    ? toColorList(artwork.color_used || artwork.colors_used)
    : [];
  let artworkDetails = artwork?.artwork_details;
  if (typeof artworkDetails === "string") {
    try {
      artworkDetails = JSON.parse(artworkDetails);
    } catch {
      artworkDetails = null;
    }
  }
  if (!artworkDetails || typeof artworkDetails !== "object" || Array.isArray(artworkDetails)) {
    artworkDetails = {};
  }
  const productType = String(artwork?.product_type || "Premade").trim().toLowerCase();
  const isCustomProduct = productType === "customize";
  const isDigitalProduct = productType === "digital" || String(artwork?.art_type || "").trim().toLowerCase() === "digital";
  const isPhysicalProduct = productType === "premade" && !isDigitalProduct;
  const productOptions = Array.isArray(artwork?.product_options)
    ? artwork.product_options
    : Array.isArray(artworkDetails.product_options)
      ? artworkDetails.product_options
      : [];

  const rawStock = artwork?.stock_available ?? artworkDetails?.stock_available;
  const hasExplicitStock = rawStock !== null && rawStock !== undefined && rawStock !== "" && Number.isSafeInteger(Number(rawStock));
  const isStockable = hasExplicitStock || productOptions.length > 0 || Boolean(artworkDetails?.stockable);

  const remainingStock = getArtworkRemainingStock(artwork);
  const maxOrderQuantity = getArtworkMaxOrderQuantity(artwork);
  const isSoldOut = isArtworkSoldOut(artwork) || (isStockable && remainingStock !== null && remainingStock <= 0);

  const isSold = Boolean(
    !isCustomProduct && (
      isSoldOut ||
      (isStockable && remainingStock !== null && remainingStock <= 0) ||
      (!isStockable && (
        [true, 1, "1", "true"].includes(artwork?.is_sold) ||
        String(artwork?.status || "").trim().toLowerCase() === "sold" ||
        (Number.isFinite(Number(artwork?.sold_quantity)) && Number(artwork?.sold_quantity) > 0) ||
        ["delivered", "completed"].includes(String(artwork?.order_status || "").trim().toLowerCase()) ||
        ["delivered", "completed"].includes(String(artwork?.delivery_status || "").trim().toLowerCase())
      ))
    )
  );

  const saleStatusLabel = isSold ? "Sold" : "Available";
  const saleStatusColor = isSold ? "default" : "success";
  const requestStatus = String(artwork?.request_status || artwork?.status || "Unverified").trim().toLowerCase();
  const statusShade = theme.palette.mode === "dark" ? "light" : "dark";
  const statusColor = ["verified", "approved"].includes(requestStatus)
    ? theme.palette.success[statusShade]
    : requestStatus === "rejected"
      ? theme.palette.error[statusShade]
      : ["pending", "requested"].includes(requestStatus)
        ? theme.palette.warning[statusShade]
        : theme.palette.text.secondary;
  const isVerified = artwork
    ? String(artwork.request_status || artwork.status || "").toLowerCase() ===
      "verified"
    : false;

  const imageUrl = artwork?.image || artwork?.image_url;

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
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        Artwork Information
        <Button
          aria-label="Close artwork information"
          onClick={handleClose}
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

      <DialogContent
        sx={{ p: 2.5, backgroundColor: theme.palette.background.paper }}
      >
        {artwork ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                mt: 1.5,
              }}
            >
              <ArtworkImage
                image={imageUrl}
                alt={artwork.title || "Artwork preview"}
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <Chip
                label={isVerified ? "APPROVED" : String(artwork.request_status || artwork.status || "Unverified").toUpperCase()}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: theme.palette.background.paper,
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: "bold",
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              <Box>
                <Typography sx={detailLabelSx}>Name</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.first_name || "N/A"} {artwork.last_name || ""}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>School Number</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.student_number || "N/A"}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Course</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.course || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Title</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.title || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Product Type</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.product_type || "Premade")}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Sale Status</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={saleStatusLabel}
                    size="small"
                    color={saleStatusColor}
                    sx={{ fontWeight: 700, color: "#fff" }}
                  />
                  {isStockable && remainingStock !== null && remainingStock <= 0 && (
                    <Chip
                      label="Stockable"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 10, fontWeight: 600 }}
                    />
                  )}
                </Stack>
              </Box>
              {isStockable && (
                <Box>
                  <Typography sx={detailLabelSx}>Stock Available</Typography>
                  <Typography sx={detailValueSx}>
                    {remainingStock !== null
                      ? `${remainingStock} ${remainingStock === 1 ? "unit" : "units"}${remainingStock === 0 ? " (Sold)" : ""}`
                      : "0 units (Sold)"}
                  </Typography>
                </Box>
              )}
              {maxOrderQuantity !== null && maxOrderQuantity !== undefined && (
                <Box>
                  <Typography sx={detailLabelSx}>Max Quantity Per Order</Typography>
                  <Typography sx={detailValueSx}>
                    {`${maxOrderQuantity} ${maxOrderQuantity === 1 ? "unit" : "units"}`}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography sx={detailLabelSx}>Style</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.genre || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Size</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.art_size || "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Price</Typography>
                <Typography sx={{ ...detailValueSx, color: "#dc2626" }}>
                  {artwork.price !== null && artwork.price !== undefined && artwork.price !== "" && Number.isFinite(Number(artwork.price))
                    ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(artwork.price))
                    : "Not provided"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Art Type</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.art_type || artwork.exact_art_type) || "Not provided"}
                </Typography>
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Color Used</Typography>
                {colors.length > 0 ? (
                  <Stack direction="row" flexWrap="wrap" gap={0.75}>
                    {colors.map((color, index) => (
                      <Chip
                        key={`${color}-${index}`}
                        label={formatList(color)}
                        size="small"
                        sx={{
                          height: 20,
                          backgroundColor: isHexColor(color)
                            ? color
                            : theme.palette.background.paper,
                          color: getChipTextColor(color),
                          border: `1px solid ${theme.palette.divider}`,
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={detailValueSx}>N/A</Typography>
                )}
              </Box>

              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Description</Typography>
                <Typography sx={detailValueSx}>
                  {artwork.description || "N/A"}
                </Typography>
              </Box>
              {isPhysicalProduct && (
                <>
                  <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                    <Typography sx={detailLabelSx}>Materials</Typography>
                    <Typography sx={detailValueSx}>
                      {formatList(artworkDetails.material_composition)}
                    </Typography>
                  </Box>
                  <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                    <Typography sx={detailLabelSx}>How to Handle with Care</Typography>
                    <Typography sx={detailValueSx}>
                      {artwork.care_instructions?.trim() || "Not provided"}
                    </Typography>
                  </Box>
                </>
              )}
              {isDigitalProduct && (
                <>
                  <Box>
                    <Typography sx={detailLabelSx}>Resolution</Typography>
                    <Typography sx={detailValueSx}>
                      {artworkDetails.resolution_width && artworkDetails.resolution_height
                        ? `${artworkDetails.resolution_width} × ${artworkDetails.resolution_height} px`
                        : "N/A"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={detailLabelSx}>File Format</Typography>
                    <Typography sx={detailValueSx}>
                      {artworkDetails.file_format || "N/A"}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={detailLabelSx}>Color Profile</Typography>
                    <Typography sx={detailValueSx}>
                      {artworkDetails.color_profile || "N/A"}
                    </Typography>
                  </Box>
                </>
              )}
              <Box>
                <Typography sx={detailLabelSx}>Features</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.feature_scanned || artwork.features)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={detailLabelSx}>Mediums Used</Typography>
                <Typography sx={detailValueSx}>
                  {formatList(artwork.mediums_used || artwork.mediums)}
                </Typography>
              </Box>
              {artwork?.art_type === "product" && productOptions.length > 0 && (
                <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                  <Typography sx={detailLabelSx}>Product Details</Typography>
                  <Stack spacing={1.25} sx={{ mt: 0.5 }}>
                    {productOptions.map((option, index) => (
                      <Box
                        key={option.id || `${option.name || "product"}-${index}`}
                        sx={{
                          p: 1.5,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          backgroundColor: theme.palette.background.paper,
                        }}
                      >
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: option.image ? "84px minmax(0, 1fr)" : "1fr" }, gap: 1.25 }}>
                          {option.image && (
                            <ArtworkImage
                              image={option.image}
                              alt={option.name || `Product ${index + 1}`}
                              sx={{ width: { xs: "100%", sm: 84 }, height: 84, objectFit: "cover", borderRadius: 1.5 }}
                            />
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ ...detailValueSx, fontSize: 13 }}>
                              {option.name || `Product ${index + 1}`}
                            </Typography>
                            <Typography sx={{ ...detailValueSx, mt: 0.5, color: theme.palette.text.secondary }}>
                              {option.description || "No description provided."}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.75 }}>
                              {option.quantity !== undefined && option.quantity !== null && (
                                <Chip
                                  size="small"
                                  label={`Qty: ${Number(option.quantity).toLocaleString()}`}
                                  sx={{ fontWeight: 700 }}
                                />
                              )}
                              {option.stock_quantity !== undefined && option.stock_quantity !== null && (
                                <Chip
                                  size="small"
                                  label={`Stock: ${Number(option.stock_quantity).toLocaleString()}`}
                                  sx={{ fontWeight: 700 }}
                                />
                              )}
                              {option.price !== undefined && option.price !== null && (
                                <Chip
                                  size="small"
                                  label={new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(option.price))}
                                  sx={{ fontWeight: 700 }}
                                />
                              )}
                            </Stack>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                <Typography sx={detailLabelSx}>Posted</Typography>
                <Typography sx={detailValueSx}>
                  {formatDateTime(artwork.date_created)}
                </Typography>
              </Box>
              {[
                ["Requested", artwork.request_date],
                ["Approved", artwork.approved_date],
                ["Rejected", artwork.rejection_date],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography sx={detailLabelSx}>{label}</Typography>
                  <Typography sx={detailValueSx}>{formatDateTime(value)}</Typography>
                </Box>
              ))}
              {artwork.rejection_reason && (
                <Box sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}>
                  <Typography sx={detailLabelSx}>Rejection reason</Typography>
                  <Typography sx={{ ...detailValueSx, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {artwork.rejection_reason}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: "#475569" }}>
            No artwork selected.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "flex-end",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        {!isVerified && canEdit && (
          <Button
            onClick={() => onReject?.(artwork)}
            variant="contained"
            startIcon={<CancelSharpIcon />}
            sx={{
              backgroundColor: "#be4f4f",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              "&:hover": { backgroundColor: "#a93d3d" },
            }}
          >
            Reject 
          </Button>
        )}
        
        {!isVerified && canEdit && (
          <Button
            onClick={() => onVerify?.(artwork)}
            variant="contained"
            startIcon={<CheckIcon />}
            sx={{
              backgroundColor: "success.main",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              "&:hover": { backgroundColor: "success.dark" },
            }}
          >
            Verify 
          </Button>
        )}
        <Button
          onClick={handleClose}
          sx={{
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 600,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ArtworkInfo;

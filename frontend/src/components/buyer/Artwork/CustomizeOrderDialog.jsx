import { useEffect, useId, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import WatermarkedArtworkImage from "./WatermarkedArtworkImage";
import { getArtworkRemainingStock, getArtworkOrderLimit } from "../../../utils/artworkAvailability";

export default function CustomizeOrderDialog({
  open,
  artwork,
  initialQuantity = 1,
  onClose,
  onConfirm,
  isCustomizable = true,
  isSubmitting = false,
}) {
  const titleId = useId();
  const [step, setStep] = useState(isCustomizable ? "choice" : "note");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [details, setDetails] = useState("");
  const [quantity, setQuantity] = useState(initialQuantity);
  const [error, setError] = useState("");
  const [sampleImageFailed, setSampleImageFailed] = useState(false);

  const remainingStock = getArtworkRemainingStock(artwork);
  const orderLimit = getArtworkOrderLimit(artwork);
  const isCustom =
    String(artwork?.product_type || "").trim().toLowerCase() === "customize";
  const maxStock = orderLimit !== null && !isCustom ? orderLimit : 999999;

  useEffect(() => {
    if (open) {
      setStep(isCustomizable ? "choice" : "note");
      setSelectedChoice("");
      setDetails("");
      setQuantity(
        maxStock < 999999
          ? Math.min(Math.max(1, initialQuantity || 1), maxStock)
          : Math.max(1, initialQuantity || 1),
      );
      setError("");
      setSampleImageFailed(false);
    }
  }, [
    open,
    artwork?.artwork_id,
    artwork?.id,
    artwork?.product_sample_image,
    artwork?.image,
    isCustomizable,
    initialQuantity,
    maxStock,
  ]);

  const addSelection = async (orderNote = "") => {
    setError("");
    try {
      await onConfirm(orderNote, quantity);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to add this artwork to your cart.");
    }
  };

  const handleAddWithDetails = () => {
    const request = details.trim();
    if (step === "customize" && !request) {
      setError("Enter the details you want the seller to customize.");
      return;
    }
    void addSelection(request);
  };

  const handleContinue = () => {
    if (selectedChoice === "sample") {
      setError("");
      setStep("note");
    } else if (selectedChoice === "customize") {
      setError("");
      setDetails("");
      setStep("customize");
    }
  };

  const hasSeparateSampleImage = Boolean(
    artwork?.product_sample_image && artwork.product_sample_image !== artwork?.image,
  );
  const sampleImage = hasSeparateSampleImage && !sampleImageFailed
    ? artwork.product_sample_image
    : artwork?.image;
  const handleSampleImageError = () => {
    if (hasSeparateSampleImage) setSampleImageFailed(true);
  };

  const renderChoice = (choice, title) => {
    const checked = selectedChoice === choice;
    return (
      <Box
        key={choice}
        onClick={() => {
          setSelectedChoice(choice);
          setError("");
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          border: 1,
          borderColor: checked ? "primary.main" : "divider",
          borderRadius: 2,
          p: 1.5,
          cursor: "pointer",
          bgcolor: checked ? "action.selected" : "background.paper",
        }}
      >
        <Checkbox
          checked={checked}
          onChange={() => {
            setSelectedChoice(choice);
            setError("");
          }}
          onClick={(event) => event.stopPropagation()}
          disabled={isSubmitting}
          inputProps={{ "aria-label": `Select ${title}` }}
        />
        <WatermarkedArtworkImage
          image={sampleImage}
          alt={`${artwork?.title || "Artwork"} ${title.toLowerCase()} preview`}
          variant="web"
          onLoadError={handleSampleImageError}
          sx={{
            width: 88,
            height: 88,
            flexShrink: 0,
            borderRadius: 1.5,
            border: 1,
            borderColor: "divider",
            objectFit: "cover",
            bgcolor: "action.hover",
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} sx={{ fontSize: 14.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
            ₱{Number(artwork?.price || 0).toLocaleString()}
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          width: "min(calc(100% - 24px), 590px)",
          maxWidth: "590px",
          borderRadius: 3,
          overflow: "hidden",
        },
      }}
      aria-labelledby={titleId}
    >
      <DialogTitle
        id={titleId}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: "divider",
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        <ShoppingBagOutlinedIcon sx={{ color: "#ef3340" }} />
        {step === "choice"
          ? "Choose an option"
          : step === "customize"
            ? "Customize this artwork"
            : "Add an order note"}
        <Button
          aria-label="Close"
          onClick={isSubmitting ? undefined : onClose}
          disabled={isSubmitting}
          sx={{ minWidth: 32, ml: "auto", p: 0, color: "text.primary" }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {step === "choice" ? (
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Select the sample or request a customization at the listed price.
            </Typography>
            {renderChoice("sample", "Sample")}
            {renderChoice("customize", "Customize")}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        ) : (
          <Stack spacing={2}>
            <WatermarkedArtworkImage
              image={sampleImage}
              alt={`${artwork?.title || "Artwork"} product sample`}
              variant="web"
              onLoadError={handleSampleImageError}
              sx={{
                width: "100%",
                height: 160,
                borderRadius: 1.5,
                objectFit: "contain",
                bgcolor: "action.hover",
              }}
            />
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={3}
              label={step === "customize" ? "Customization details" : "Order note (optional)"}
              placeholder={step === "customize"
                ? "Describe what you would like the seller to customize"
                : "Add any details or requests for the seller"}
              value={details}
              onChange={(event) => {
                setDetails(event.target.value.slice(0, 2000));
                setError("");
              }}
              inputProps={{ maxLength: 2000 }}
              error={Boolean(error)}
              helperText={error || `${details.length}/2000`}
              disabled={isSubmitting}
            />
            <Box
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.03)"
                    : "rgba(0, 0, 0, 0.02)",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    Quantity
                  </Typography>
                  {remainingStock !== null && !isCustom ? (
                    <Typography variant="caption" color="text.secondary">
                      {remainingStock} available
                      {orderLimit !== null && orderLimit < remainingStock
                        ? ` (Limit: ${orderLimit} per order)`
                        : ` (Max: ${remainingStock})`}
                    </Typography>
                  ) : isCustom ? (
                    <Typography variant="caption" color="text.secondary">
                      Custom made to order
                    </Typography>
                  ) : null}
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <IconButton
                    size="small"
                    disabled={quantity <= 1 || isSubmitting}
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      width: 32,
                      height: 32,
                    }}
                    aria-label="Decrease quantity"
                  >
                    <RemoveIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <TextField
                    size="small"
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setQuantity(1);
                        return;
                      }
                      const val = Number(raw);
                      if (Number.isSafeInteger(val)) {
                        setQuantity(Math.min(Math.max(1, val), maxStock));
                      }
                    }}
                    inputProps={{
                      min: 1,
                      max: maxStock,
                      style: {
                        textAlign: "center",
                        width: 38,
                        padding: "4px 4px",
                        fontWeight: 700,
                        fontSize: "0.95rem",
                      },
                    }}
                    sx={{
                      width: 52,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 1.5,
                        height: 32,
                      },
                      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                        {
                          display: "none",
                        },
                      "& input[type=number]": {
                        MozAppearance: "textfield",
                      },
                    }}
                  />
                  <IconButton
                    size="small"
                    disabled={
                      (maxStock < 999999 && quantity >= maxStock) ||
                      isSubmitting
                    }
                    onClick={() =>
                      setQuantity((prev) => Math.min(maxStock, prev + 1))
                    }
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      width: 32,
                      height: 32,
                    }}
                    aria-label="Increase quantity"
                  >
                    <AddIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
        {step === "choice" ? (
          <>
            <Button onClick={onClose} disabled={isSubmitting} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={isSubmitting || !selectedChoice}
              sx={{ minWidth: 126, borderRadius: 1.5, fontWeight: 700 }}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
          <Button
            onClick={() => {
              if (isCustomizable) {
                setStep("choice");
              } else {
                onClose();
              }
              setError("");
            }}
            disabled={isSubmitting}
          >
            {isCustomizable ? "Back" : "Cancel"}
          </Button>
          <Button
            variant="contained"
            onClick={handleAddWithDetails}
            disabled={isSubmitting}
          >
            Add to cart - ₱{(Number(artwork?.price || 0) * (quantity || 1)).toLocaleString()}
          </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

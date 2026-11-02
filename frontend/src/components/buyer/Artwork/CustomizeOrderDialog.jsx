import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import WatermarkedArtworkImage from "./WatermarkedArtworkImage";

export default function CustomizeOrderDialog({
  open,
  artwork,
  onClose,
  onConfirm,
  isSubmitting = false,
}) {
  const [step, setStep] = useState("choice");
  const [selectedChoice, setSelectedChoice] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sampleImageFailed, setSampleImageFailed] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("choice");
      setSelectedChoice("");
      setDetails("");
      setError("");
      setSampleImageFailed(false);
    }
  }, [
    open,
    artwork?.artwork_id,
    artwork?.id,
    artwork?.product_sample_image,
    artwork?.image,
  ]);

  const addSelection = async (orderNote = "") => {
    setError("");
    try {
      await onConfirm(orderNote);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to add this artwork to your cart.");
    }
  };

  const handleCustomize = () => {
    const request = details.trim();
    if (!request) {
      setError("Enter the details you want the seller to customize.");
      return;
    }
    void addSelection(request);
  };

  const handleContinue = () => {
    if (selectedChoice === "sample") {
      void addSelection();
    } else if (selectedChoice === "customize") {
      setError("");
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
      aria-labelledby="premade-order-title"
    >
      <DialogTitle
        id="premade-order-title"
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
        {step === "choice" ? "Choose an option" : "Customize this artwork"}
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
              label="Customization details"
              placeholder="Describe what you would like the seller to customize"
              value={details}
              onChange={(event) => {
                setDetails(event.target.value);
                setError("");
              }}
              inputProps={{ maxLength: 2000 }}
              error={Boolean(error)}
              helperText={error || `${details.length}/2000`}
              disabled={isSubmitting}
            />
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
              setStep("choice");
              setError("");
            }}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleCustomize}
            disabled={isSubmitting}
          >
            Add to cart - ₱{Number(artwork?.price || 0).toLocaleString()}
          </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import { fetchArtworks } from "../../../api/seller/artworkAPI";
import { checkSellerVoucherCode } from "../../../api/seller/voucherAPI";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{ enter: "cubic-bezier(0.4, 0, 0.2, 1)", exit: "ease-out" }}
    />
  );
});

const createEmptyForm = () => ({
  code_mode: "auto",
  custom_code: "",
  discount_type: "percentage",
  discount_value: "",
  minimum_purchase: "0",
  starts_on: "",
  expires_on: "",
  applies_to_all: true,
  artwork_ids: [],
});

export default function VouvherForm({
  open,
  handleClose,
  onSubmit,
  selectedVoucher = null,
}) {
  const theme = useTheme();
  const [form, setForm] = useState(createEmptyForm);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [codeCheck, setCodeCheck] = useState({ code: "", status: "idle" });
  const submittingRef = useRef(false);
  const normalizedCustomCode = form.custom_code.trim().toUpperCase();
  const customCodeIsValid = /^[A-Z0-9-]{3,20}$/.test(normalizedCustomCode);
  const isEditing = Boolean(selectedVoucher);
  const originalCode = String(selectedVoucher?.code || "")
    .trim()
    .toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setForm(
      selectedVoucher
        ? {
            code_mode: "custom",
            custom_code: selectedVoucher.code || "",
            discount_type: selectedVoucher.discount_type || "percentage",
            discount_value: selectedVoucher.discount_value ?? "",
            minimum_purchase: selectedVoucher.minimum_purchase ?? "0",
            starts_on: String(selectedVoucher.starts_on || "").slice(0, 10),
            expires_on: String(selectedVoucher.expires_on || "").slice(0, 10),
            applies_to_all:
              selectedVoucher.applies_to_all === true ||
              Number(selectedVoucher.applies_to_all) === 1,
            artwork_ids: (selectedVoucher.artwork || [])
              .map((artwork) =>
                Number(
                  typeof artwork === "object" ? artwork.artwork_id : artwork,
                ),
              )
              .filter((id) => Number.isSafeInteger(id) && id > 0),
          }
        : createEmptyForm(),
    );
    setError("");
    setCodeCheck({ code: "", status: "idle" });
    setArtworks([]);
    setLoading(true);
    const loadListings = async () => {
      try {
        const listings = await fetchArtworks();
        if (!cancelled) setArtworks(Array.isArray(listings) ? listings : []);
      } catch (loadError) {
        if (!cancelled)
          setError(loadError.message || "Unable to load voucher information.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadListings();
    return () => {
      cancelled = true;
    };
  }, [open, selectedVoucher]);

  useEffect(() => {
    if (!open || form.code_mode !== "custom") return undefined;
    if (!customCodeIsValid) {
      setCodeCheck({ code: normalizedCustomCode, status: "invalid" });
      return undefined;
    }
    if (isEditing && normalizedCustomCode === originalCode) {
      setCodeCheck({ code: normalizedCustomCode, status: "available" });
      return undefined;
    }
    let cancelled = false;
    setCodeCheck({ code: normalizedCustomCode, status: "checking" });
    const timeout = window.setTimeout(async () => {
      try {
        const result = await checkSellerVoucherCode(normalizedCustomCode);
        if (!cancelled) {
          setCodeCheck({
            code: normalizedCustomCode,
            status: result.available ? "available" : "taken",
          });
        }
      } catch {
        if (!cancelled)
          setCodeCheck({ code: normalizedCustomCode, status: "error" });
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    open,
    customCodeIsValid,
    form.code_mode,
    normalizedCustomCode,
    isEditing,
    originalCode,
  ]);

  const updateForm = (field, value) => {
    if (submittingRef.current) return;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeDialog = () => {
    if (!submittingRef.current) handleClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!open || submittingRef.current) return;
    setError("");
    if (
      form.code_mode === "custom" &&
      (!customCodeIsValid ||
        codeCheck.code !== normalizedCustomCode ||
        (codeCheck.status !== "available" && codeCheck.status !== "error"))
    ) {
      setError(
        `Enter an available voucher code before ${isEditing ? "updating" : "creating"} the voucher.`,
      );
      return;
    }
    if (!form.applies_to_all && !form.artwork_ids.length) {
      setError(
        "Select eligible listings or apply the voucher to all listings in your shop.",
      );
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    try {
      const { code_mode: codeMode, custom_code: customCode, ...voucher } = form;
      await onSubmit({
        ...voucher,
        ...(codeMode === "custom"
          ? { code: customCode.trim().toUpperCase() }
          : {}),
        discount_value:
          form.discount_type === "freebie" ? null : Number(form.discount_value),
        minimum_purchase: Number(form.minimum_purchase),
      });
      handleClose();
    } catch (submissionError) {
      setError(
        submissionError.message ||
          `Unable to ${isEditing ? "update" : "create"} voucher.`,
      );
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      disableEscapeKeyDown={saving}
      TransitionComponent={Transition}
      keepMounted
      aria-labelledby="voucher-form-title"
      PaperProps={{
        component: "form",
        onSubmit: handleSubmit,
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
        id="voucher-form-title"
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
        <ConfirmationNumberOutlinedIcon
          sx={{ color: "#ef3340", fontSize: 20 }}
        />
        {isEditing ? "Edit Voucher" : "Add Voucher"}
        <Button
          type="button"
          aria-label="Close voucher form"
          onClick={closeDialog}
          disabled={saving}
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
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControl disabled={saving}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Voucher code
            </Typography>
            {!isEditing && (
              <RadioGroup
                row
                value={form.code_mode}
                onChange={(event) => {
                  updateForm("code_mode", event.target.value);
                  setError("");
                }}
              >
                <FormControlLabel
                  value="auto"
                  control={
                    <Radio
                      sx={{
                        color: "#ef3340",
                        "&.Mui-checked": {
                          color: "#ef3340",
                        },
                      }}
                    />
                  }
                  label="Generate a code for me"
                />
                <FormControlLabel
                  value="custom"
                  control={
                    <Radio
                      sx={{
                        color: "#ef3340",
                        "&.Mui-checked": {
                          color: "#ef3340",
                        },
                      }}
                    />
                  }
                  label="Create my own code"
                />
              </RadioGroup>
            )}
            {form.code_mode === "custom" && (
              <TextField
                fullWidth
                required
                label="Custom voucher code"
                value={form.custom_code}
                onChange={(event) =>
                  updateForm("custom_code", event.target.value.toUpperCase())
                }
                disabled={saving}
                error={
                  Boolean(form.custom_code) &&
                  (!customCodeIsValid ||
                    (codeCheck.code === normalizedCustomCode &&
                      codeCheck.status === "taken"))
                }
                helperText={
                  !form.custom_code
                    ? "Use 3–20 letters, numbers, or hyphens. Codes are checked across all sellers and can be reused after expiry."
                    : !customCodeIsValid
                      ? "Use 3–20 letters, numbers, or hyphens."
                      : codeCheck.code !== normalizedCustomCode ||
                          codeCheck.status === "checking"
                        ? "Checking code availability..."
                        : codeCheck.status === "available"
                          ? "This code is available."
                          : codeCheck.status === "taken"
                            ? "This code is currently active. Try another."
                            : "Could not check now. The server will check again when you create the voucher."
                }
                inputProps={{ maxLength: 20 }}
              />
            )}
          </FormControl>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              alignItems: "start",
              "& > *": { minWidth: 0 },
              gap: 2,
            }}
          >
            <FormControl fullWidth disabled={saving}>
              <InputLabel id="voucher-discount-type-label">
                Discount type
              </InputLabel>
              <Select
                labelId="voucher-discount-type-label"
                label="Discount type"
                value={form.discount_type}
                onChange={(event) => {
                  const discountType = event.target.value;
                  setForm((current) => ({
                    ...current,
                    discount_type: discountType,
                    discount_value:
                      discountType === "freebie" ? "" : current.discount_value,
                  }));
                }}
              >
                <MenuItem value="percentage">Percentage discount</MenuItem>
                <MenuItem value="fixed">Fixed amount discount</MenuItem>
                <MenuItem value="freebie">Freebie</MenuItem>
              </Select>
            </FormControl>
            {form.discount_type !== "freebie" && (
              <TextField
                required
                fullWidth
                type="number"
                label={
                  form.discount_type === "percentage"
                    ? "Discount percentage"
                    : "Discount amount"
                }
                value={form.discount_value}
                onChange={(event) =>
                  updateForm("discount_value", event.target.value)
                }
                disabled={saving}
                inputProps={{
                  min: 0.01,
                  max: form.discount_type === "percentage" ? 100 : undefined,
                  step: 0.01,
                }}
                InputProps={
                  form.discount_type === "percentage"
                    ? {
                        endAdornment: (
                          <InputAdornment position="end">%</InputAdornment>
                        ),
                      }
                    : undefined
                }
                helperText={
                  form.discount_type === "percentage"
                    ? "Enter a value up to 100%."
                    : "Amount is in Philippine pesos."
                }
              />
            )}
            <TextField
              fullWidth
              required
              type="number"
              label="Minimum purchase"
              value={form.minimum_purchase}
              onChange={(event) =>
                updateForm("minimum_purchase", event.target.value)
              }
              disabled={saving}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="The voucher can only be used when eligible items meet this amount."
              sx={{ gridColumn: "1 / -1" }}
            />
            <TextField
              fullWidth
              required
              type="date"
              label="Start date"
              value={form.starts_on}
              onChange={(event) => updateForm("starts_on", event.target.value)}
              disabled={saving}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              required
              type="date"
              label="Expiry date"
              value={form.expires_on}
              onChange={(event) => updateForm("expires_on", event.target.value)}
              disabled={saving}
              inputProps={{ min: form.starts_on || undefined }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                color="error"
                checked={form.applies_to_all}
                disabled={saving}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    applies_to_all: event.target.checked,
                    artwork_ids: [],
                  }))
                }
              />
            }
            label="Apply this voucher to all listings in my shop"
          />
          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Loading listings...
              </Typography>
            </Stack>
          )}
          {!loading &&
            !form.applies_to_all &&
            (artworks.length ? (
              <FormControl fullWidth required disabled={saving}>
                <InputLabel id="voucher-artwork-label">
                  Eligible listings
                </InputLabel>
                <Select
                  multiple
                  labelId="voucher-artwork-label"
                  label="Eligible listings"
                  value={form.artwork_ids}
                  onChange={(event) =>
                    updateForm(
                      "artwork_ids",
                      typeof event.target.value === "string"
                        ? event.target.value.split(",").map(Number)
                        : event.target.value,
                    )
                  }
                  renderValue={(selected) =>
                    `${selected.length} listing${selected.length === 1 ? "" : "s"} selected`
                  }
                >
                  {artworks.map((artwork) => (
                    <MenuItem
                      key={artwork.artwork_id}
                      value={artwork.artwork_id}
                    >
                      {artwork.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Alert severity="info">
                You do not have listings to select. Add a listing or apply the
                voucher to all listings.
              </Alert>
            ))}
          {!loading && form.applies_to_all && artworks.length === 0 && (
            <Alert severity="info">
              Add listings to your shop to make a voucher eligible for specific
              items.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          type="button"
          onClick={closeDialog}
          disabled={saving}
          sx={{ color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={
            saving || (!form.applies_to_all && !form.artwork_ids.length)
          }
          sx={{
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
          }}
          color="error"
        >
          {saving && (
            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
          )}
          {saving
            ? isEditing
              ? "Saving..."
              : "Creating..."
            : isEditing
              ? "Save changes"
              : "Add Voucher"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

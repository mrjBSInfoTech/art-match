import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import { createSellerVoucher } from "../../api/seller/voucherAPI";

const emptyForm = {
  discount_type: "percentage",
  discount_value: "",
  minimum_purchase: "0",
  starts_on: "",
  expires_on: "",
  applies_to_all: true,
  artwork_ids: [],
};

export default function VoucherGeneration() {
  const [form, setForm] = useState(emptyForm);
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const listingData = await fetchArtworks();
      setArtworks(Array.isArray(listingData) ? listingData : []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load voucher information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await createSellerVoucher({
        ...form,
        discount_value:
          form.discount_type === "freebie" ? null : Number(form.discount_value),
        minimum_purchase: Number(form.minimum_purchase),
      });
      setForm(emptyForm);
      setError("");
      setNotice(
        `Voucher created. Your code is ${created.code}. View it in the Discount Code tab.`,
      );
    } catch (createError) {
      setError(createError.message || "Unable to create voucher.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: (theme) => theme.palette.background.default,
        color: (theme) => theme.palette.text.primary,
      }}
    >
      <Helmet>
        <title>Voucher Generation | Red Nexus Seller</title>
      </Helmet>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Voucher Generation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create shop-only discount codes for your customers.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Card
        variant="outlined"
        sx={{
          mt: 3,
          borderRadius: 4,
          borderColor: "divider",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 22px 48px rgba(2, 6, 23, 0.28)"
              : "0 18px 36px rgba(15, 23, 42, 0.08)",
        }}
      >
          <CardContent
            sx={{
              p: { xs: 2, md: 3 },
              "&:last-child": { pb: { xs: 2, md: 3 } },
            }}
          >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 2.5 }}
              >
                <ConfirmationNumberOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Create a voucher
                </Typography>
              </Stack>
              <Box component="form" onSubmit={handleSubmit}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 2.5,
                    alignItems: "start",
                  }}
                >
                  <FormControl fullWidth>
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
                            discountType === "freebie"
                              ? ""
                              : current.discount_value,
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
                      inputProps={{
                        min: 0.01,
                        max: form.discount_type === "percentage" ? 100 : undefined,
                        step: form.discount_type === "percentage" ? 0.01 : 0.01,
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
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="The voucher can only be used when eligible items meet this amount."
                    sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                  />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        sm: "repeat(2, minmax(0, 1fr))",
                      },
                      gap: 2,
                      gridColumn: { xs: "auto", md: "1 / -1" },
                    }}
                  >
                    <TextField
                      fullWidth
                      required
                      type="date"
                      label="Start date"
                      value={form.starts_on}
                      onChange={(event) =>
                        updateForm("starts_on", event.target.value)
                      }
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      fullWidth
                      required
                      type="date"
                      label="Expiry date"
                      value={form.expires_on}
                      onChange={(event) =>
                        updateForm("expires_on", event.target.value)
                      }
                      inputProps={{ min: form.starts_on || undefined }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>

                  <FormControlLabel
                    sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                    control={
                      <Checkbox
                        checked={form.applies_to_all}
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

                  {!form.applies_to_all && (
                    artworks.length ? (
                      <FormControl
                        fullWidth
                        required
                        sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                      >
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
                        You do not have listings to select. Add a listing or apply the voucher to all listings.
                      </Alert>
                    )
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving || (!form.applies_to_all && !form.artwork_ids.length)}
                    startIcon={
                      saving ? <CircularProgress size={18} color="inherit" /> : null
                    }
                    sx={{
                      gridColumn: { xs: "auto", md: "1 / -1" },
                      justifySelf: { xs: "stretch", sm: "start" },
                    }}
                  >
                    {saving ? "Creating voucher..." : "Create voucher"}
                  </Button>
                </Box>
              </Box>
          </CardContent>
        </Card>

      {!loading && artworks.length === 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Add listings to your shop to make a voucher eligible for specific items.
        </Alert>
      )}
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={6000}
        onClose={() => setNotice("")}
        message={notice}
      />
    </Box>
  );
}

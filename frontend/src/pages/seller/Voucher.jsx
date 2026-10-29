import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import VoucherCard from "../../components/seller/Voucher/VoucherCard";
import VoucherDelete from "../../components/seller/Voucher/VoucherDelete";
import VoucherForm from "../../components/seller/Voucher/VoucherForm";
import {
  createSellerVoucher,
  deleteSellerVoucher,
  fetchSellerVouchers,
  updateSellerVoucher,
} from "../../api/seller/voucherAPI";
import { getSellerProfile } from "../../api/seller/sellerAPI";
import { fetchStorefront } from "../../api/seller/storefrontAPI";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type).value)
    .join("-");
};

const getVoucherStatus = (voucher, today) => {
  const startsOn = String(voucher.starts_on || "").slice(0, 10);
  const expiresOn = String(voucher.expires_on || "").slice(0, 10);
  if (!startsOn || !expiresOn) return "unknown";
  if (expiresOn < today) return "expired";
  return startsOn > today ? "upcoming" : "active";
};

export default function Voucher() {
  const theme = useTheme();
  const [vouchers, setVouchers] = useState([]);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [openVoucherForm, setOpenVoucherForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const deleteInFlight = useRef(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const today = getToday();

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, storefront, seller] = await Promise.all([
        fetchSellerVouchers(),
        fetchStorefront(),
        getSellerProfile(),
      ]);
      setVouchers(Array.isArray(result) ? result : []);
      setStoreName(
        String(storefront?.shop_name || "").trim() ||
          String(
            seller?.username ||
              seller?.student_number ||
              localStorage.getItem("seller_student_number") ||
              "",
          ).trim(),
      );
    } catch (loadError) {
      setError(loadError.message || "Unable to load vouchers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const filteredVouchers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = vouchers.filter((voucher) => {
      const searchable = [
        voucher.code,
        ...(voucher.artwork || []).map((artwork) => artwork.title),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (statusFilter === "all" ||
          getVoucherStatus(voucher, today) === statusFilter) &&
        (typeFilter === "all" || voucher.discount_type === typeFilter)
      );
    });
    return filtered.sort((first, second) => {
      if (sortOption === "az")
        return String(first.code).localeCompare(String(second.code));
      if (sortOption === "za")
        return String(second.code).localeCompare(String(first.code));
      return sortOption === "oldest"
        ? Number(first.voucher_id) - Number(second.voucher_id)
        : Number(second.voucher_id) - Number(first.voucher_id);
    });
  }, [vouchers, searchQuery, statusFilter, typeFilter, sortOption, today]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortOption("newest");
  };

  const handleSubmitVoucher = async (payload) => {
    const isEditing = Boolean(editingVoucher);
    let created;
    try {
      created = isEditing
        ? await updateSellerVoucher(editingVoucher.voucher_id, payload)
        : await createSellerVoucher(payload);
    } catch (createError) {
      showSnackbar(createError.message || `Unable to ${isEditing ? "update" : "create"} voucher.`, "error");
      throw createError;
    }

    setVouchers((current) => [
      created,
      ...current.filter((voucher) => voucher.voucher_id !== created.voucher_id),
    ]);
    resetFilters();
    setError("");
    // The create response contains listing IDs; refresh to get their display titles.
    // A failed refresh must not turn a successful creation into a retryable failure.
    try {
      const result = await fetchSellerVouchers();
      if (Array.isArray(result)) setVouchers(result);
    } catch {
      // Keep the created voucher visible; reloading will retrieve its listing titles.
    }
    showSnackbar(`Voucher ${created.code} ${isEditing ? "updated" : "created"} successfully.`, "success");
    return created;
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      showSnackbar(`Copied ${code} to clipboard.`, "success");
    } catch {
      showSnackbar(
        "Unable to copy the code. You can still download the voucher.",
        "error",
      );
    }
  };

  const handleDeleteVoucher = async () => {
    if (!selectedVoucher || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    try {
      await deleteSellerVoucher(selectedVoucher.voucher_id);
      setVouchers((current) =>
        current.filter(
          (voucher) => voucher.voucher_id !== selectedVoucher.voucher_id,
        ),
      );
      setSelectedVoucher(null);
      showSnackbar(`Voucher ${selectedVoucher.code} deleted.`, "success");
    } catch (deleteError) {
      showSnackbar(deleteError.message || "Unable to delete voucher.", "error");
    } finally {
      deleteInFlight.current = false;
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Vouchers</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Vouchers
          </Typography>
          <Typography
            sx={{ mt: 0.75, color: theme.palette.text.secondary, fontSize: 13 }}
          >
            Manage your shop vouchers.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            setEditingVoucher(null);
            setOpenVoucherForm(true);
          }}
          disabled={loading}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Add Voucher
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: 2.5,
        }}
      >
        {[
          {
            label: "TOTAL VOUCHERS",
            value: vouchers.length,
            caption: "All shop vouchers",
            icon: ConfirmationNumberOutlinedIcon,
          },
          {
            label: "ACTIVE",
            value: vouchers.filter(
              (voucher) => getVoucherStatus(voucher, today) === "active",
            ).length,
            caption: "Currently available",
            icon: VerifiedOutlinedIcon,
          },
          {
            label: "EXPIRED",
            value: vouchers.filter(
              (voucher) => getVoucherStatus(voucher, today) === "expired",
            ).length,
            caption: "Past their expiry date",
            icon: EventBusyOutlinedIcon,
          },
        ].map(({ label, value, caption, icon: MetricIcon }) => (
          <Card
            key={label}
            sx={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2.5,
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: theme.palette.text.primary,
                      fontSize: 30,
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1,
                      color: theme.palette.text.secondary,
                      fontSize: 12,
                    }}
                  >
                    {caption}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(239, 68, 68, 0.14)"
                        : "#fff5f5",
                    color: theme.palette.error.main,
                  }}
                >
                  {createElement(MetricIcon)}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Filter Section */}
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          containerType: "inline-size",
          containerName: "artwork-filters",
          minWidth: 0,
        }}
        variant="outlined"
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ display: "block", mb: 1.5 }}
        >
          <strong>{filteredVouchers.length}</strong> vouchers shown
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mt: 2,
            mb: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search vouchers..."
            size="small"
            sx={{
              minWidth: 0,
              gridColumn: "1 / -1",
              "@container artwork-filters (min-width: 900px)": {
                gridColumn: "auto",
              },
              "& .MuiInputBase-input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            inputProps={{ "aria-label": "Search vouchers" }}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <FormControl size="small" fullWidth sx={{ minWidth: { sm: 140 } }}>
              <InputLabel id="voucher-status-label">Status</InputLabel>
              <Select
                labelId="voucher-status-label"
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="upcoming">Upcoming</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ minWidth: { sm: 160 } }}>
              <InputLabel id="voucher-type-label">Discount type</InputLabel>
              <Select
                labelId="voucher-type-label"
                label="Discount type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <MenuItem value="all">All types</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed">Fixed amount</MenuItem>
                <MenuItem value="freebie">Freebie</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth sx={{ minWidth: { sm: 150 } }}>
              <InputLabel id="voucher-sort-label">Sort by</InputLabel>
              <Select
                labelId="voucher-sort-label"
                label="Sort by"
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
                startAdornment={
                  <SwapVertIcon
                    sx={{ mr: 0.5, fontSize: 17, color: "text.secondary" }}
                  />
                }
              >
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
                <MenuItem value="az">Code: A to Z</MenuItem>
                <MenuItem value="za">Code: Z to A</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Voucher Display */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.5 },
          mt: 2.5,
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={loadVouchers}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : filteredVouchers.length > 0 ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 2.5,
            }}
          >
            {filteredVouchers.map((voucher) => (
              <VoucherCard
                key={voucher.voucher_id}
                voucher={voucher}
                storeName={storeName}
                onCopy={copyCode}
                onEdit={(voucher) => {
                  setEditingVoucher(voucher);
                  setOpenVoucherForm(true);
                }}
                onDelete={setSelectedVoucher}
              />
            ))}
          </Box>
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {searchQuery || statusFilter !== "all" || typeFilter !== "all"
              ? "No vouchers match your search and filters."
              : "No vouchers found. Add your first voucher!"}
          </Typography>
        )}
      </Paper>

      <VoucherForm
        open={openVoucherForm}
        selectedVoucher={editingVoucher}
        handleClose={() => {
          setOpenVoucherForm(false);
          setEditingVoucher(null);
        }}
        onSubmit={handleSubmitVoucher}
      />
      <VoucherDelete
        open={Boolean(selectedVoucher)}
        voucher={selectedVoucher}
        deleting={deleting}
        onClose={() => !deleting && setSelectedVoucher(null)}
        onSubmit={handleDeleteVoucher}
      />
      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            "& .MuiAlert-icon": { color: "#fff" },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

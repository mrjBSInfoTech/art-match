import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
// Icons matching Artwork.jsx
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

import { searchSellerCertificates } from "../../api/seller/certificateAPI.js";
import CertificateCard from "../../components/seller/Certificate/CertificateCard";
import CertificateImage from "../../components/seller/Certificate/CertificateImage";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import {
  adminSearchInputSx,
  adminSelectInputSx,
} from "../../components/admin/adminFilterStyles";

export default function SearchCertificate() {
  const theme = useTheme();

  // Search & Filter state matching Artwork.jsx structure
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [excludeSelf, setExcludeSelf] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("az");
  const [priceOption, setPriceOption] = useState("all");

  // Data & loading state
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState("");
  const [toastOpen, setToastOpen] = useState(false);

  const abortControllerRef = useRef(null);

  // Execute search function
  const handleSearch = useCallback(
    async (queryText = activeQuery, otherSellersOnly = excludeSelf) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError("");

      try {
        const response = await searchSellerCertificates({
          query: queryText.trim(),
          excludeSelf: otherSellersOnly,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        setCertificates(Array.isArray(response?.certificates) ? response.certificates : []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Failed to search certificates. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [activeQuery, excludeSelf]
  );

  // Trigger search on mount and when excludeSelf changes
  useEffect(() => {
    handleSearch(activeQuery, excludeSelf);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [activeQuery, excludeSelf, handleSearch]);

  // Debounce search query changes to search endpoint
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCopyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage(`${label} copied to clipboard!`);
      setToastOpen(true);
    } catch {
      setToastMessage("Failed to copy to clipboard.");
      setToastOpen(true);
    }
  };

  const handleViewDetails = (cert) => {
    setSelectedCertificate(cert);
    setOpenInfoDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenInfoDialog(false);
  };

  // Client-side filtering & sorting matching Artwork.jsx design and logic
  const filteredCertificates = useMemo(() => {
    let list = [...certificates];

    // Status / Scope filter
    if (statusFilter === "qr") {
      list = list.filter((cert) => Boolean(cert.publicToken || cert.verificationUrl));
    } else if (statusFilter === "own") {
      list = list.filter((cert) => cert.isOwnCertificate);
    } else if (statusFilter === "other") {
      list = list.filter((cert) => !cert.isOwnCertificate);
    }

    // Title sort (A to Z / Z to A) matching Artwork.jsx
    if (sortOption === "za") {
      list.sort((a, b) =>
        String(b.artwork?.title || "").localeCompare(String(a.artwork?.title || ""))
      );
    } else if (sortOption === "az") {
      list.sort((a, b) =>
        String(a.artwork?.title || "").localeCompare(String(b.artwork?.title || ""))
      );
    } else if (sortOption === "newest") {
      list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    } else if (sortOption === "oldest") {
      list.sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0));
    }

    // Price sort (Lowest to Highest / Highest to Lowest) matching Artwork.jsx
    if (priceOption === "lthPrice") {
      list.sort((a, b) => Number(a.artwork?.price || 0) - Number(b.artwork?.price || 0));
    } else if (priceOption === "htlPrice") {
      list.sort((a, b) => Number(b.artwork?.price || 0) - Number(a.artwork?.price || 0));
    }

    return list;
  }, [certificates, statusFilter, sortOption, priceOption]);

  if (loading && !certificates.length && !activeQuery) {
    return (
      <SellerLoadingPanel
        title="Check Artwork Authenticity"
        subtitle="Search and verify certificates of other sellers"
        showMetrics={false}
      />
    );
  }

  if (error && !certificates.length) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Check Art Authenticity</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Search Certificates Unavailable"
          message={error}
          onRetry={() => handleSearch(activeQuery, excludeSelf)}
        />
      </Box>
    );
  }

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
        <title>Check Artwork Authenticity</title>
      </Helmet>

      {/* Page Header */}
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
            Check Artwork Authenticity
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Search and verify certificates of other sellers
          </Typography>
        </Box>

        <Button
          component={Link}
          to="/seller/authenticity/certificate"
          variant="contained"
          color="error"
          startIcon={<PaletteOutlinedIcon />}
          sx={{
            width: { xs: "100%", sm: "auto" },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 15 },
            px: 2.5,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          My Certificates
        </Button>
      </Box>

      {/* Filter Section matching Artwork.jsx structure & design */}
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          minWidth: 0,
          overflow: "hidden",
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(220px, 1fr) auto",
            },
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            minWidth: 0,
          }}
        >
          {/* Search TextField matching Artwork.jsx */}
          <TextField
            variant="outlined"
            placeholder="Search certificates by title, artist, or certificate ID..."
            size="small"
            fullWidth
            sx={adminSearchInputSx(theme, { minWidth: 0 })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            inputProps={{ "aria-label": "Search certificates" }}
          />

          {/* Filter Select Controls Container matching Artwork.jsx */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(auto-fit, minmax(145px, 1fr))",
                lg: "repeat(3, minmax(136px, 160px))",
                xl: "repeat(3, minmax(150px, 175px))",
              },
              gap: { xs: 1.5, sm: 2 },
              minWidth: 0,
            }}
          >
            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                id="seller-certificate-status-label"
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Status
              </InputLabel>
              <Select
                labelId="seller-certificate-status-label"
                id="seller-certificate-status"
                name="status"
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="all">All certificates</MenuItem>
                <MenuItem value="other">Other sellers</MenuItem>
                <MenuItem value="qr">QR verified</MenuItem>
                <MenuItem value="own">My certificates</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                id="seller-certificate-title-sort-label"
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Title
              </InputLabel>
              <Select
                labelId="seller-certificate-title-sort-label"
                id="seller-certificate-title-sort"
                name="sort"
                label="Title"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                startAdornment={
                  <SwapVertIcon sx={{ mr: 0.5, fontSize: 17, color: "text.secondary" }} />
                }
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="az">A to Z</MenuItem>
                <MenuItem value="za">Z to A</MenuItem>
                <MenuItem value="newest">Newest first</MenuItem>
                <MenuItem value="oldest">Oldest first</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth sx={{ minWidth: 0 }}>
              <InputLabel
                id="seller-certificate-price-sort-label"
                sx={{ color: theme.palette.text.secondary, fontSize: 12 }}
              >
                Price
              </InputLabel>
              <Select
                labelId="seller-certificate-price-sort-label"
                id="seller-certificate-price-sort"
                name="price"
                label="Price"
                value={priceOption}
                onChange={(e) => setPriceOption(e.target.value)}
                sx={adminSelectInputSx(theme)}
              >
                <MenuItem value="all">Default price</MenuItem>
                <MenuItem value="lthPrice">Lowest to Highest</MenuItem>
                <MenuItem value="htlPrice">Highest to Lowest</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 2,
          mb: 1,
          minHeight: 34,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          <strong>{filteredCertificates.length}</strong> certificates shown
        </Typography>

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={excludeSelf}
              onChange={(e) => setExcludeSelf(e.target.checked)}
              color="error"
            />
          }
          label={
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>
              Other sellers only
            </Typography>
          }
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 2, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => handleSearch(activeQuery, excludeSelf)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Certificate Display Paper Container matching Artwork.jsx */}
      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress color="error" />
          </Box>
        ) : filteredCertificates.length > 0 ? (
          <CertificateCard
            certificates={filteredCertificates}
            onViewDetails={handleViewDetails}
            onCopyText={handleCopyText}
          />
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {searchQuery
              ? `No certificates found matching "${searchQuery}".`
              : "No certificates found for this filter."}
          </Typography>
        )}
      </Paper>

      {/* Certificate Details Dialog rendered through CertificateImage */}
      <CertificateImage
        open={openInfoDialog}
        handleClose={handleCloseDialog}
        selectedCertificate={selectedCertificate}
        onCopyText={handleCopyText}
      />

      {/* Toast Notification Snackbar */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}

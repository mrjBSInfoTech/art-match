import { createElement, useState, useEffect, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Snackbar,
  Slide,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkCard from "../../components/admin/Artwork/ArtworkCard";
import ArtworkVerify from "../../components/admin/Artwork/ArtworkVerify";
import ArtworkReject from "../../components/admin/Artwork/ArtworkReject";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import {
  fetchArtworks,
  verifyArtwork,
  rejectArtwork,
} from "../../api/admin/artworkAPI.js";
// Icons
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import BlockIcon from '@mui/icons-material/Block';
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Artwork() {
  const theme = useTheme();
  const location = useLocation();
  const isVerifiedSection = location.pathname.endsWith("/verified");
  const [artworks, setArtworks] = useState([]);
  const [allArtworks, setAllArtworks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingStatusFilter, setPendingStatusFilter] = useState("pending");
  const statusFilter = isVerifiedSection ? "approved" : pendingStatusFilter;
  const [sortOption, setSortOption] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [verificationArtwork, setVerificationArtwork] = useState(null);
  const [rejectionArtwork, setRejectionArtwork] = useState(null);

  const loadArtworks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const apiStatus = statusFilter === "approved" ? "verified" : statusFilter;
      const data = await fetchArtworks(apiStatus);
      setArtworks(Array.isArray(data) ? data : []);
      // Also fetch all artworks to compute totals across statuses
      const all = await fetchArtworks();
      setAllArtworks(Array.isArray(all) ? all : []);
    } catch (err) {
      setArtworks([]);
      setErrorMessage(err.message || "Failed to load artworks");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadArtworks();
  }, [loadArtworks]);

  const normalizeStatus = (artwork) =>
    String(artwork.request_status || artwork.status || "")
      .trim()
      .toLowerCase();
  const totalPending = allArtworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "pending" || s === "pending verification";
  }).length;
  const totalVerified = allArtworks.filter((artwork) => {
    const s = normalizeStatus(artwork);
    return s === "verified" || s === "approved";
  }).length;
  const totalRejected = allArtworks.filter(
    (artwork) => normalizeStatus(artwork) === "rejected",
  ).length;

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = artworks.filter((artwork) => {
      const searchableFields = [
        artwork.title,
        artwork.genre,
        artwork.art_size,
        artwork.description,
        artwork.first_name,
        artwork.last_name,
        artwork.student_number,
      ];

      return searchableFields.some((field) =>
        String(field || "")
          .toLowerCase()
          .includes(query),
      );
    });

    return [...filtered].sort((first, second) => {
      if (sortOption === "oldest") {
        return Number(first.artwork_id || 0) - Number(second.artwork_id || 0);
      }
      return Number(second.artwork_id || 0) - Number(first.artwork_id || 0);
    });
  }, [artworks, searchQuery, sortOption]);

  const statusCount =
    statusFilter === "pending"
      ? totalPending
      : statusFilter === "approved"
        ? totalVerified
        : totalRejected;

  const handleVerify = async (artwork) => {
    try {
      await verifyArtwork(artwork.artwork_id);
      setVerificationArtwork(null);
      showSnackbar("Artwork verified successfully.", "success");
      await loadArtworks();
    } catch (err) {
      showSnackbar(err.message || "Failed to verify artwork.", "error");
      throw err;
    }
  };

  const handleReject = async (artwork, reason) => {
    try {
      await rejectArtwork(artwork.artwork_id, reason);
      setRejectionArtwork(null);
      showSnackbar("Artwork rejected successfully.", "success");
      await loadArtworks();
    } catch (err) {
      showSnackbar(err.message || "Failed to reject artwork.", "error");
      throw err;
    }
  };

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

  if (loading && artworks.length === 0 && allArtworks.length === 0) {
    return (
      <AdminLoadingPanel
        title={isVerifiedSection ? "Verified Artworks" : "Art Verification"}
        subtitle={
          isVerifiedSection
            ? "Browse all approved and verified student artworks."
            : "Review and manage the artwork catalog"
        }
      />
    );
  }

  if (errorMessage) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>
            {isVerifiedSection ? "Verified Artworks" : "Art Verification"}
          </title>
        </Helmet>
        <ConnectionErrorPanel
          title={
            isVerifiedSection
              ? "Verified Artworks Unavailable"
              : "Art Verification Unavailable"
          }
          message={errorMessage}
          onRetry={loadArtworks}
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
        <title>Artwork</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 34 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Art Verification
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Review and manage the artwork catalog
          </Typography>
        </Box>
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
            label: "PENDING REVIEW",
            value: totalPending,
            caption: "Awaiting verification",
            icon: PendingActionsOutlinedIcon,
          },
          {
            label: "VERIFIED ARTWORKS",
            value: totalVerified,
            caption: "Verified artworks",
            icon: VerifiedOutlinedIcon,
          },
          {
            label: "REJECTED ARTWORKS",
            value: totalRejected,
            caption: "Rejected artworks",
            icon: BlockIcon,
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

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", lg: "center" },
            gap: 1.25,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search artworks..."
            inputProps={{ "aria-label": "Search artworks" }}
            size="small"
            sx={{
              width: { xs: "100%", lg: 255 },
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.background.default,
                "& fieldset": { borderColor: theme.palette.divider },
                "&:hover fieldset": {
                  borderColor: theme.palette.text.secondary,
                },
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
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            {!isVerifiedSection && (
              <ToggleButtonGroup
                exclusive
                size="small"
                value={pendingStatusFilter}
                onChange={(_, value) => value && setPendingStatusFilter(value)}
                sx={{
                  "& .MuiToggleButton-root": {
                    px: 1,
                    py: 0.5,
                    minHeight: 44,
                    minWidth: { xs: 90, sm: 100 },
                    fontSize: 11,
                    color: theme.palette.text.secondary,
                    borderColor: theme.palette.divider,
                    backgroundColor: theme.palette.background.default,
                  },
                  "& .MuiToggleButton-root.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "#fff",
                  },
                  "& .MuiToggleButton-root.Mui-selected:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                <ToggleButton value="pending">Pending</ToggleButton>
                <ToggleButton value="rejected">Rejected</ToggleButton>
              </ToggleButtonGroup>
            )}
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 130 } }}
            >
              <Select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                startAdornment={
                  <SwapVertIcon
                    sx={{ mr: 0.5, fontSize: 17, color: "#94a3b8" }}
                  />
                }
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.primary,
                  backgroundColor: theme.palette.background.default,
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.divider,
                  },
                }}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Paper
        sx={{
          p: { xs: 1.5, sm: 2 },
          mt: 2,
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
        variant="outlined"
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredArtworks.length > 0 ? (
          <ArtworkCard
            artworks={filteredArtworks}
            onVerify={setVerificationArtwork}
            onReject={setRejectionArtwork}
          />
        ) : (
          <Typography
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {searchQuery
              ? "No artworks match your search."
              : "No artworks found for this status."}
          </Typography>
        )}
      </Paper>

      <ArtworkVerify
        open={Boolean(verificationArtwork)}
        handleClose={() => setVerificationArtwork(null)}
        onSubmit={handleVerify}
        selectedArt={verificationArtwork}
      />

      <ArtworkReject
        open={Boolean(rejectionArtwork)}
        handleClose={() => setRejectionArtwork(null)}
        onSubmit={handleReject}
        selectedArt={rejectionArtwork}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

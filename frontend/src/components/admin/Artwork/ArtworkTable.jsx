import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArtworkImage from "../../common/ArtworkImage";
import ArtworkInfo from "./ArtworkInfo";
import { adminTableButtonSx } from "../adminTableStyles";

const getStatus = (artwork) => {
  const status = String(artwork.request_status || artwork.status || "").trim();
  return status || "Pending";
};

const getStatusColor = (theme, status) => {
  const normalized = status.toLowerCase();
  if (["verified", "approved"].includes(normalized)) return theme.palette.success.main;
  if (normalized === "rejected") return theme.palette.error.main;
  if (["pending", "requested", "unverified"].includes(normalized)) return theme.palette.warning.main;
  return theme.palette.text.secondary;
};

export default function ArtworkTable({ artworks = [], onVerify, onReject }) {
  const theme = useTheme();
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const role = (localStorage.getItem("admin_role") || "").toLowerCase().trim();
  const canEdit = role === "super admin"
    || ["admin", "moderator"].includes(role)
    || (role === "customize" && ["1", "true"].includes(
      String(localStorage.getItem("admin_can_edit")).toLowerCase(),
    ));

  const openArtworkInfo = (artwork) => {
    setSelectedArtwork(artwork);
    setInfoOpen(true);
  };

  return (
    <>
      <Paper
        component="section"
        variant="outlined"
        aria-label="Artwork verification table"
        sx={{
          borderRadius: 3.5,
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
            Artwork catalog
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
            Review artwork details and verification status.
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
          <Table stickyHeader size="small" aria-label="Artwork verification table" sx={{ minWidth: 760 }}>
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
                <TableCell>Artist</TableCell>
                <TableCell>Art type / Style</TableCell>
                <TableCell>Product type</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {artworks.map((artwork) => {
                const status = getStatus(artwork);
                return (
                  <TableRow
                    key={artwork.artwork_id}
                    hover
                    sx={{
                      "& td": { py: 1.75, verticalAlign: "middle" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={{ minWidth: 240, maxWidth: 340 }}>
                      <StackArtwork artwork={artwork} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {[artwork.first_name, artwork.last_name].filter(Boolean).join(" ") || "Unknown artist"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {artwork.student_number || "Student number not provided"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Typography
                        variant="body2"
                        sx={{ textTransform: "capitalize" }}
                      >
                        {artwork.exact_art_type || artwork.art_type || "Not provided"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", textTransform: "capitalize" }}
                      >
                        {artwork.genre || "Style not provided"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Typography
                        variant="body2"
                        sx={{ textTransform: "capitalize" }}
                      >
                        {artwork.product_type || "Premade"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" fontWeight={700} fontVariantNumeric="tabular-nums">
                        {Number.isFinite(Number(artwork.price))
                          ? new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(artwork.price))
                          : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={status}
                        sx={{
                          color: getStatusColor(theme, status),
                          bgcolor: theme.palette.action.hover,
                          border: "1px solid",
                          borderColor: "divider",
                          fontWeight: 800,
                          fontSize: 11,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        onClick={() => openArtworkInfo(artwork)}
                        sx={adminTableButtonSx}
                      >
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <ArtworkInfo
        open={infoOpen}
        handleClose={() => setInfoOpen(false)}
        selectedArtwork={selectedArtwork}
        onVerify={onVerify}
        onReject={onReject}
        canEdit={canEdit}
      />
    </>
  );
}

function StackArtwork({ artwork }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <ArtworkImage
        variant="thumb"
        image={artwork.image || artwork.image_url}
        alt={artwork.title || "Artwork"}
        sx={{ width: 52, height: 52, flexShrink: 0, borderRadius: 1.5, objectFit: "cover" }}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap title={artwork.title || "Untitled artwork"}>
          {artwork.title || "Untitled artwork"}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {artwork.art_size || "Size not provided"}
        </Typography>
      </Box>
    </Box>
  );
}
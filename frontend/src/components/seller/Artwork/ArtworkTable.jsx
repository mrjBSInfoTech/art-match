import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
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

const getRequestStatus = (artwork) => {
  const raw = String(artwork.request_status || "").trim();
  return !raw || raw.toLowerCase() === "available" ? "Unverified" : raw;
};

const getStatusColor = (theme, status) => {
  const normalized = status.toLowerCase();
  const shade = theme.palette.mode === "dark" ? "light" : "dark";
  if (["verified", "approved"].includes(normalized)) return theme.palette.success[shade];
  if (normalized === "rejected") return theme.palette.error[shade];
  if (["pending", "requested"].includes(normalized)) return theme.palette.warning[shade];
  return theme.palette.text.secondary;
};

export default function ArtworkTable({ artworks = [], onEdit, onVerify, onDelete }) {
  const theme = useTheme();
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const openArtworkInfo = (artwork) => {
    setSelectedArtwork(artwork);
    setInfoOpen(true);
  };

  return (
    <>
      <Paper
        component="section"
        variant="outlined"
        aria-label="Seller artwork table"
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
            Manage your artwork, prices, and verification progress.
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
          <Table stickyHeader size="small" aria-label="Seller artwork table" sx={{ minWidth: 920 }}>
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
                <TableCell>Art type / Style</TableCell>
                <TableCell>Product type</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {artworks.map((artwork) => {
                const status = getRequestStatus(artwork);
                const canRequestVerification = ["unverified", "rejected"].includes(status.toLowerCase());
                return (
                  <TableRow
                    key={artwork.artwork_id}
                    hover
                    sx={{
                      "& td": { py: 1.75, verticalAlign: "middle" },
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell sx={{ minWidth: 240, maxWidth: 360 }}>
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
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <Typography variant="body2">{artwork.exact_art_type || artwork.art_type || "Not provided"}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textTransform: "capitalize" }}
                      >
                        {artwork.genre || "Style not provided"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Typography variant="body2">{artwork.product_type || "Premade"}</Typography>
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
                    <TableCell align="center" sx={{ minWidth: 310 }}>
                      <Stack direction="row" spacing={0.75} justifyContent="center">
                        <Button
                          variant="outlined"
                          onClick={() => openArtworkInfo(artwork)}
                          sx={{ minHeight: 44, px: 1.25, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          Details
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => onEdit(artwork)}
                          sx={{ minHeight: 44, px: 1.25, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          disabled={!canRequestVerification}
                          onClick={() => onVerify(artwork)}
                          sx={{ minHeight: 44, px: 1.25, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          Verify
                        </Button>
                        <Button
                          color="error"
                          variant="outlined"
                          onClick={() => onDelete(artwork.artwork_id)}
                          sx={{ minHeight: 44, px: 1.25, borderRadius: 2, fontWeight: 700, textTransform: "none" }}
                        >
                          Delete
                        </Button>
                      </Stack>
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
        canEdit={Boolean(onVerify)}
      />
    </>
  );
}
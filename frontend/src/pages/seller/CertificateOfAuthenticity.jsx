import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import { fetchArtworks } from "../../api/seller/artworkAPI";
import { getSellerProfile } from "../../api/seller/sellerAPI";
import { fetchStorefront } from "../../api/seller/storefrontAPI";
import {
  fetchPublishedCertificate,
  reserveCertificateIdentity,
  publishCertificate,
} from "../../api/seller/certificateAPI.js";

import { createCertificateQr } from "../../utils/certificateQr.js";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.valueOf() - offset * 60_000).toISOString().slice(0, 10);
};

const makeCertificateId = () => {
  const bytes = new Uint8Array(4);
  window.crypto.getRandomValues(bytes);
  const code = [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `RN-${new Date().getFullYear()}-${code}`;
};

const escapeXml = (value) =>
  String(value ?? "").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the template image."));
    reader.readAsDataURL(file);
  });

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const createCertificateSvg = ({
  artworkTitle,
  medium,
  artistName,
  certificateId,
  issueDate,
  templateData,
  qrData,
}) => {
  const template = templateData
    ? `<image href="${templateData}" x="0" y="0" width="1200" height="800" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="0" width="1200" height="800" fill="#fbf8f1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  ${template}
  <rect x="22" y="22" width="1156" height="756" fill="none" stroke="#941b27" stroke-width="8"/>
  <rect x="42" y="42" width="1116" height="716" fill="none" stroke="#d7ba83" stroke-width="2"/>
  <circle cx="600" cy="112" r="27" fill="#941b27"/>
  <path d="M588 112l8 8 16-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="600" y="196" text-anchor="middle" fill="#941b27" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="7">RED NEXUS • ARTIST CERTIFICATE</text>
  <text x="600" y="272" text-anchor="middle" fill="#202124" font-family="Georgia,serif" font-size="48">Certificate of Authenticity</text>
  <text x="600" y="336" text-anchor="middle" fill="#344054" font-family="Arial,sans-serif" font-size="23">This document certifies that the artwork</text>
  <text x="600" y="405" text-anchor="middle" fill="#941b27" font-family="Georgia,serif" font-size="42" font-style="italic">${escapeXml(artworkTitle || "Artwork title")}</text>
  <text x="600" y="450" text-anchor="middle" fill="#687385" font-family="Arial,sans-serif" font-size="21">${escapeXml(medium || "Medium or materials")}</text>
  <text x="600" y="508" text-anchor="middle" fill="#344054" font-family="Arial,sans-serif" font-size="22">is an original work created by</text>
  <text x="600" y="560" text-anchor="middle" fill="#202124" font-family="Georgia,serif" font-size="34">${escapeXml(artistName || "Artist name")}</text>
  <line x1="230" y1="642" x2="970" y2="642" stroke="#cbd0d7" stroke-width="2"/>
  <text x="246" y="685" fill="#687385" font-family="Arial,sans-serif" font-size="16" letter-spacing="1">RED NEXUS</text>
  <text x="954" y="685" text-anchor="end" fill="#687385" font-family="Arial,sans-serif" font-size="16" letter-spacing="1">${escapeXml(formatDate(issueDate).toUpperCase())}</text>
  <text x="600" y="730" text-anchor="middle" fill="#687385" font-family="Arial,sans-serif" font-size="15">CERTIFICATE ID: ${escapeXml(certificateId)}</text>
${qrData ? `<g id="certificate-verification-qr"><rect x="990" y="597" width="146" height="151" fill="#fff"/><image href="${qrData}" x="1000" y="602" width="126" height="126"/><text x="1063" y="741" text-anchor="middle" fill="#202124" font-family="Arial,sans-serif" font-size="12">Scan to verify</text></g>` : ""}
</svg>`;
};

export default function CertificateOfAuthenticity() {
  const [qrData, setQrData] = useState("");
  const [artworks, setArtworks] = useState([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState("");
  const [artworkTitle, setArtworkTitle] = useState("");
  const [medium, setMedium] = useState("");
  const [artistName, setArtistName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [certificateId, setCertificateId] = useState(makeCertificateId);
  const [issueDate, setIssueDate] = useState(today);
  const [template, setTemplate] = useState(null);
  const [templateData, setTemplateData] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [publishedCertificate, setPublishedCertificate] = useState(null);
  const [publicationLoading, setPublicationLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");

  const approvedArtworks = useMemo(
    () =>
      artworks.filter((artwork) =>
        ["verified", "approved"].includes(
          String(artwork.request_status || artwork.status || "").toLowerCase(),
        ),
      ),
    [artworks],
  );

  const selectedArtwork = approvedArtworks.find(
    (artwork) => String(artwork.artwork_id) === String(selectedArtworkId),
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [artworkData, profile, storefront] = await Promise.all([
        fetchArtworks(),
        getSellerProfile(),
        fetchStorefront(),
      ]);
      const approved = (Array.isArray(artworkData) ? artworkData : []).filter(
        (artwork) =>
          ["verified", "approved"].includes(
            String(artwork.request_status || artwork.status || "").toLowerCase(),
          ),
      );
      setArtworks(Array.isArray(artworkData) ? artworkData : []);
      setSelectedArtworkId(approved.length ? String(approved[0].artwork_id) : "");
      setArtistName(
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          localStorage.getItem("seller_student_number") ||
          "Artist",
      );
      setStoreName(
        String(storefront?.shop_name || "").trim() ||
          profile?.username ||
          profile?.student_number ||
          localStorage.getItem("seller_student_number") ||
          "Your shop",
      );
    } catch (loadError) {
      setError(loadError.message || "Unable to load certificate details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedArtwork) return;
    setArtworkTitle(selectedArtwork.title || "");
    setMedium(
      selectedArtwork.mediums_used ||
        selectedArtwork.art_type ||
        selectedArtwork.product ||
        "",
    );
  }, [selectedArtwork]);

  useEffect(() => {
    if (!selectedArtworkId) {
      setPublishedCertificate(null);
      return undefined;
    }
    let active = true;
    setPublicationLoading(true);
    setQrData("");
    setPublishedCertificate(null);
    Promise.all([fetchPublishedCertificate(selectedArtworkId), reserveCertificateIdentity(selectedArtworkId)])
      .then(async ([certificate, identity]) => {
        const qr = await createCertificateQr(identity.verificationUrl);
        if (!active) return;
        setQrData(qr);
        setPublishedCertificate(certificate?.published === false ? null : certificate);
        if (certificate?.certificateId) setCertificateId(certificate.certificateId);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Unable to check certificate publication.");
      })
      .finally(() => {
        if (active) setPublicationLoading(false);
      });
    return () => { active = false; };
  }, [selectedArtworkId]);

  const handleTemplateChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Upload a PNG, JPG, or WebP certificate template.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Certificate templates must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setTemplate(file);
      setTemplateData(String(dataUrl));
      setError("");
    } catch (fileError) {
      setError(fileError.message);
    }
  };

  const downloadCertificate = () => {
    const svg = publishedCertificate?.svg || createCertificateSvg({
      artworkTitle,
      medium,
      artistName,
      certificateId,
      issueDate,
      templateData,
      qrData,
    });
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `red-nexus-certificate-${certificateId.toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const publishBuyerCertificate = async () => {
    if (!selectedArtwork || publishing || publishedCertificate || !qrData || publicationLoading) return;
    setPublishing(true);
    setError("");
    setPublishMessage("");
    try {
      const svg = publishedCertificate?.svg || createCertificateSvg({
        artworkTitle,
        medium,
        artistName,
        certificateId,
        issueDate,
        templateData,
        qrData,
      });
      const published = await publishCertificate({
        artworkId: selectedArtwork.artwork_id,
        certificateId,
        svg,
      });
      setPublishedCertificate({ ...published, publishedAt: new Date().toISOString() });
      setPublishMessage("Published. The certificate QR code will be sent in the buyer's messages one day after delivery.");
    } catch (publishError) {
      setError(publishError.message || "Unable to publish this certificate.");
    } finally {
      setPublishing(false);
    }
  };

  const previewSvg = publishedCertificate?.svg || createCertificateSvg({
    artworkTitle,
    medium,
    artistName: artistName || "Artist name",
    certificateId,
    issueDate,
    templateData,
    qrData,
  });

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
        <title>Certificate of Authenticity | Red Nexus Seller</title>
      </Helmet>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Certificate of Authenticity
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a certificate for a platform-approved artwork from your shop.
          </Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                xl: "minmax(320px, 0.8fr) minmax(0, 1.4fr)",
              },
              gap: 2.5,
              alignItems: "start",
            }}
          >
              <Card
                variant="outlined"
                sx={{
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
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Certificate details
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Add the information that will appear on your certificate.
                      </Typography>
                    </Box>
                    {approvedArtworks.length === 0 ? (
                      <Alert severity="info">
                        Only approved artworks can receive a certificate. Your approved shop listings will appear here.
                      </Alert>
                    ) : (
                      <TextField
                        select
                        fullWidth
                        label="Choose from your approved artworks"
                        value={selectedArtworkId}
                        onChange={(event) =>
                          setSelectedArtworkId(event.target.value)
                        }
                      >
                        {approvedArtworks.map((artwork) => (
                          <MenuItem
                            key={artwork.artwork_id}
                            value={String(artwork.artwork_id)}
                          >
                            {artwork.title}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    <TextField
                      fullWidth
                      label="Artwork title"
                      value={artworkTitle}
                      onChange={(event) => setArtworkTitle(event.target.value)}
                      disabled={!selectedArtwork}
                    />
                    <TextField
                      fullWidth
                      label="Medium or materials"
                      value={medium}
                      onChange={(event) => setMedium(event.target.value)}
                      disabled={!selectedArtwork}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <TextField
                        fullWidth
                        label="Certificate ID"
                        value={certificateId}
                        onChange={(event) =>
                          setCertificateId(event.target.value)
                        }
                      />
                      <TextField
                        fullWidth
                        type="date"
                        label="Issue date"
                        value={issueDate}
                        onChange={(event) => setIssueDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Stack>
                    <Box
                      sx={{
                        p: 2,
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 2,
                        bgcolor: "background.default",
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ImageOutlinedIcon color="error" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700}>
                            Use your own design
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Upload a PNG, JPG, or WebP template (up to 8 MB). Certificate details are layered on top.
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        fullWidth
                        sx={{ mt: 1.5 }}
                      >
                        {template ? "Change template" : "Upload template"}
                        <input
                          hidden
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleTemplateChange}
                        />
                      </Button>
                      {template && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 1, overflowWrap: "anywhere" }}
                        >
                          {template.name}
                        </Typography>
                      )}
                    </Box>
                    <Alert severity="success">
                      Certificate is issued by {storeName} and identifies the selected approved artwork.
                    </Alert>
                    <Button
                      variant="contained"
                      startIcon={<DownloadOutlinedIcon />}
                      onClick={downloadCertificate}
                      disabled={!selectedArtwork || !artworkTitle.trim() || !qrData || publicationLoading}
                      sx={{
                        bgcolor: "#941b27",
                        "&:hover": { bgcolor: "#78151f" },
                        color:"#fff",
                        fontWeight:"bold"
                      }}
                    >
                      Download certificate (SVG)
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<VerifiedOutlinedIcon />}
                      onClick={publishBuyerCertificate}
                      disabled={!selectedArtwork || !artworkTitle.trim() || !qrData || publicationLoading || publishing || Boolean(publishedCertificate)}
                    >
                      {publicationLoading
                        ? "Checking publication..."
                        : publishing
                          ? "Publishing..."
                          : publishedCertificate
                            ? "Published for buyer delivery"
                            : "Publish for buyer messages"}
                    </Button>
                    {publishedCertificate && (
                      <Alert severity="info">
                        This certificate is published. Its QR code will be sent one day after delivery and becomes unavailable when the order return is completed.
                      </Alert>
                    )}
                    {publishMessage && <Alert severity="success">{publishMessage}</Alert>}
                  </Stack>
                </CardContent>
              </Card>

              <Stack spacing={1.5} sx={{ minWidth: 0 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Live preview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your downloaded certificate will use this layout.
                  </Typography>
                </Box>
                <Card
                  variant="outlined"
                  sx={{
                    p: { xs: 1, sm: 2 },
                    minWidth: 0,
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
                  <Box
                    component="img"
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg)}`}
                    alt="Certificate of authenticity preview"
                    sx={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                      borderRadius: 1,
                      boxShadow: "0 4px 18px rgba(15,23,42,.12)",
                    }}
                  />
                </Card>
                <Typography variant="caption" color="text.secondary">
                  Red Nexus certificate • {storeName}
                </Typography>
              </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

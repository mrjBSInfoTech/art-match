import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import {
  fetchBuyerCertificate,
  fetchPublicCertificate,
} from "../../api/buyer/certificateAPI.js";

export default function CertificateView() {
  const { orderItemId, token } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [svgUrl, setSvgUrl] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";

    setLoading(true);
    setError("");
    setSvgUrl("");
    setDetails(null);

    const run = async () => {
      try {
        if (token) {
          const result = await fetchPublicCertificate(token, {
            signal: controller.signal,
          });

          if (controller.signal.aborted) return;

          objectUrl = URL.createObjectURL(
            new Blob([result.svg], { type: "image/svg+xml" }),
          );
          setDetails(result);
          setSvgUrl(objectUrl);
          return;
        }

        if (!orderItemId) {
          throw new Error("Certificate route is missing an order item id.");
        }

        const svg = await fetchBuyerCertificate(orderItemId, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" }),
        );
        setSvgUrl(objectUrl);
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure.message || "Unable to load certificate.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderItemId, token]);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
      <Helmet>
        <title>Certificate of Authenticity | ArtMatch</title>
      </Helmet>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Certificate of Authenticity
          </Typography>
          <Typography color="text.secondary">
            {token
              ? "Read-only certificate verification"
              : "Certificate access is linked to this delivered order."}
          </Typography>
          {details && (
            <Typography>
              Certificate ID: {details.certificateId} · Status: {details.status}
            </Typography>
          )}
        </Box>
        {loading && <CircularProgress aria-label="Loading certificate" />}
        {error && <Alert severity="warning">{error}</Alert>}
        {svgUrl && (
          <Paper
            variant="outlined"
            sx={{ p: { xs: 1, sm: 2 }, borderRadius: 3 }}
          >
            <Box
              component="img"
              src={svgUrl}
              alt="Certificate of Authenticity"
              sx={{ display: "block", width: "100%", height: "auto" }}
            />
            <Button
              component="a"
              href={svgUrl}
              download="certificate-of-authenticity.svg"
              startIcon={<DownloadOutlinedIcon />}
              sx={{ mt: 1 }}
            >
              Download certificate
            </Button>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

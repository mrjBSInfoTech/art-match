import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import {
  fetchBuyerCertificate,
  fetchPublicCertificate,
} from "../../api/buyer/certificateAPI.js";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";

export default function CertificateView() {
  const { orderItemId, token } = useParams();
  const theme = useTheme();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [svgUrl, setSvgUrl] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";

    setLoading(true);
    setError("");
    setErrorStatus(null);
    setIsConnectionError(false);
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
          const message = failure.message || "Unable to load certificate.";
          setError(message);
          setErrorStatus(failure.status ?? null);
          setIsConnectionError(
            Boolean(failure.isConnectionError || (!failure.status && /network/i.test(message))),
          );
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
    <Box sx={{ minWidth: 0 }}>
      <Helmet>
        <title>Certificate of Authenticity | ArtMatch</title>
      </Helmet>

      <Box
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? "#fff9ef"
              : theme.palette.background.default,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6, md: 9 } }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ color: "#bb493d", mb: 2 }}
          >
            <VerifiedOutlinedIcon aria-hidden="true" />
            <Typography
              variant="overline"
              sx={{ fontWeight: 800, letterSpacing: 1.5 }}
            >
              Buyer certificate
            </Typography>
          </Stack>
          <Typography
            variant="h2"
            sx={{
              fontSize: { xs: 40, md: 62 },
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              maxWidth: 800,
            }}
          >
            Certificate of Authenticity
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mt: 2,
              maxWidth: 680,
              lineHeight: 1.75,
              fontSize: { md: "1.1rem" },
            }}
          >
            {token
              ? "Read-only certificate verification"
              : "Certificate access is linked to this delivered order."}
          </Typography>
        </Container>
      </Box>

      <Box
        sx={{
          minHeight: "40vh",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#f5f5f5"
              : theme.palette.background.default,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6, md: 8 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Your certificate
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Review the authenticity details for this artwork.
          </Typography>

          <Stack spacing={2}>
            {error && isConnectionError && !loading && !svgUrl && (
              <ConnectionErrorPanel
                title="Certificate Unavailable"
                onRetry={() => window.location.reload()}
              />
            )}
            {error && !isConnectionError && (
              <Alert
                severity={
                  errorStatus === 410 || /revoked|returned/i.test(error)
                    ? "error"
                    : "warning"
                }
              >
                {error}
              </Alert>
            )}
            {loading && (
              <Paper
                role="status"
                aria-live="polite"
                aria-label="Loading certificate"
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: "background.paper",
                }}
              >
                <Stack spacing={2}>
                  {token && <Skeleton variant="text" width={260} height={24} />}
                  <Box sx={{ position: "relative", width: "100%" }}>
                    <Skeleton
                      variant="rounded"
                      animation="wave"
                      sx={{
                        width: "100%",
                        height: "auto",
                        aspectRatio: "3 / 2",
                        borderRadius: 2,
                      }}
                    />
                    <Stack
                      spacing={1.25}
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        position: "absolute",
                        inset: 0,
                        px: 2,
                        textAlign: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <CircularProgress size={32} />
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.secondary"
                      >
                        {token
                          ? "Verifying Certificate of Authenticity..."
                          : "Loading Certificate of Authenticity..."}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            )}
            {svgUrl && (
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: "background.paper",
                }}
              >
                {details && (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Certificate ID:{" "}
                      <Box
                        component="span"
                        sx={{ color: "text.primary", fontWeight: 700 }}
                      >
                        {details.certificateId}
                      </Box>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status:{" "}
                      <Box
                        component="span"
                        sx={{
                          color: /revoked|returned|expired/i.test(
                            details.status || "",
                          )
                            ? "error.main"
                            : "success.main",
                          fontWeight: 700,
                        }}
                      >
                        {details.status}
                      </Box>
                    </Typography>
                  </Stack>
                )}
                <Box
                  component="img"
                  src={svgUrl}
                  alt="Certificate of Authenticity"
                  sx={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    borderRadius: 2,
                  }}
                />
                <Box
                  component="a"
                  href={svgUrl}
                  download="certificate-of-authenticity.svg"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    minHeight: 44,
                    px: 0.5,
                    mt: 2,
                    color: "primary.main",
                    fontWeight: 600,
                    textUnderlineOffset: "3px",
                    "&:focus-visible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: 3,
                      borderRadius: 0.5,
                    },
                  }}
                >
                  <DownloadOutlinedIcon fontSize="small" aria-hidden="true" />
                  Download certificate
                </Box>
              </Paper>
            )}
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { fetchFaqs } from "../../api/buyer/faqAPI";
import {
  fetchProfileEmail,
  sendSupportMessage,
} from "../../api/buyer/supportChatAPI";
import { getBuyerProfile } from "../../api/buyer/buyerAuthenticationAPI";
import FAQInfo from "../../components/buyer/HelpSupport/FAQInfo";
import ShippingInfo from "../../components/buyer/HelpSupport/ShippingInfo";
import PaymentInfo from "../../components/buyer/HelpSupport/PaymentInfo";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import { isAuthenticated } from "../../../utils/auth";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";

const supportCards = [
  {
    icon: ContactSupportOutlinedIcon,
    title: "Frequently Asked Questions",
    description:
      "Browse the most common buyer questions about ordering, shipping, registration, and artwork delivery.",
    cta: "Browse FAQs",
    action: "faqs",
  },
  {
    icon: LocalShippingOutlinedIcon,
    title: "Shipping & Delivery",
    description:
      "Learn about door-to-door courier shipping, campus studio pickup, parcel photo verification, and the 4-day return window.",
    cta: "View shipping & return guide",
    action: "shipping",
  },
  {
    icon: LockOutlinedIcon,
    title: "Payment & Security",
    description:
      "Review PayMongo checkout protection, 4-day escrow holds, Certificates of Authenticity, and RA 10173 data privacy.",
    cta: "View payment & security guide",
    action: "payment",
  },
  {
    icon: ForumOutlinedIcon,
    title: "Studio & Support Inbox",
    description:
      "Open your live message inbox to chat directly with student artists or view replies from the ArtMatch support desk.",
    cta: "Open Messages",
    action: "messages",
    requiresAuth: true,
  },
];

const ISSUE_TYPES = [
  "Order/Shipping",
  "Payment/Refund",
  "Artwork Condition",
  "Account/Access",
  "Seller Inquiry",
  "Other",
];

export default function HelpSupport() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(() => isAuthenticated("buyer"));
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqsError, setFaqsError] = useState("");
  const [faqsRetryCount, setFaqsRetryCount] = useState(0);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);

  // Contact form (the template buyers use to reach admin support).
  // The reply address comes from the buyer's profile, not from this form.
  const [profileEmail, setProfileEmail] = useState("");
  const [issueType, setIssueType] = useState("Order/Shipping");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [touched, setTouched] = useState(false);

  const detailsInvalid = touched && !details.trim();
  const visibleSupportCards = supportCards.filter(
    (card) => loggedIn || !card.requiresAuth,
  );

  useEffect(() => {
    const syncAuth = () => setLoggedIn(isAuthenticated("buyer"));
    window.addEventListener("storage", syncAuth);
    window.addEventListener("buyer-profile-updated", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("buyer-profile-updated", syncAuth);
    };
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      setProfileEmail("");
      return undefined;
    }

    let active = true;
    getBuyerProfile()
      .then((profile) => {
        if (active) setProfileEmail(profile.email || "");
      })
      .catch(() => {
        if (active) setProfileEmail("");
      });
    return () => {
      active = false;
    };
  }, [loggedIn]);

  const retryLoadFaqs = () => {
    setFaqsRetryCount((count) => count + 1);
  };

  useEffect(() => {
    if (!loggedIn) return undefined;

    let active = true;
    fetchProfileEmail()
      .then((email) => {
        if (active && email) setProfileEmail(email);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [loggedIn]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched(true);
    setSubmitError("");
    setSubmitNotice("");

    if (!issueType || !details.trim()) {
      setSubmitError("Choose the issue type and tell us more before sending.");
      return;
    }

    setSubmitting(true);
    try {
      await sendSupportMessage({
        issueType,
        message: details.trim(),
      });
      setSubmitNotice(
        profileEmail
          ? `Your message has been sent to ArtMatch support. We'll reply to ${profileEmail}.`
          : "Your message has been sent to ArtMatch support.",
      );
      setDetails("");
      setTouched(false);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let active = true;
    setFaqsLoading(true);
    setFaqsError("");

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setFaqsError("You appear to be offline.");
      setFaqsLoading(false);
      return () => {
        active = false;
      };
    }

    fetchFaqs()
      .then((data) => {
        if (active) setFaqs(data);
      })
      .catch((error) => {
        if (active) setFaqsError(error?.message || "Unable to load help and support.");
      })
      .finally(() => {
        if (active) setFaqsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [faqsRetryCount]);

  if (faqsLoading) {
    return (
      <Box
        role="status"
        aria-label="Loading help and support"
        sx={{ minHeight: "70vh", minWidth: 0 }}
      >
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Help &amp; Support</title>
          <meta
            name="description"
            content="Get answers to frequently asked questions about buying artwork, orders, payments, and support on ArtMatch."
          />
          <link rel="canonical" href="https://art-match-indol.vercel.app/buyer/help-support" />
        </Helmet>
        <Box
          sx={{
            minHeight: "40vh",
            backgroundColor:
              theme.palette.mode === "light"
                ? "#fff9ef"
                : theme.palette.background.default,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Container maxWidth="lg" sx={{ py: { xs: 5, sm: 6, md: 9 } }}>
            <Skeleton variant="text" width={150} height={24} />
            <Skeleton
              variant="text"
              sx={{
                width: { xs: "100%", sm: "68%" },
                height: { xs: 56, md: 72 },
                mt: 1,
              }}
            />
            <Skeleton variant="text" width="60%" height={28} sx={{ mt: 1 }} />
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
            <Skeleton variant="text" width={240} height={44} />
            <Skeleton variant="text" width="55%" height={28} sx={{ mb: 3 }} />
            <Grid container spacing={3} sx={{ mb: { xs: 3, md: 5 } }}>
              {Array.from({ length: visibleSupportCards.length }).map(
                (_, index) => (
                  <Grid
                    size={{
                      xs: 12,
                      md: visibleSupportCards.length === 3 ? 4 : 6,
                    }}
                    key={`support-skeleton-${index}`}
                  >
                    <Skeleton
                      variant="rounded"
                      height={210}
                      sx={{ borderRadius: 3 }}
                    />
                  </Grid>
                ),
              )}
            </Grid>
            {loggedIn && (
              <Skeleton
                variant="rounded"
                height={280}
                sx={{ borderRadius: 3 }}
              />
            )}
          </Container>
        </Box>
      </Box>
    );
  }

  if (faqsError) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Help &amp; Support</title>
          <meta
            name="description"
            content="Get answers to frequently asked questions about buying artwork, orders, payments, and support on ArtMatch."
          />
          <link rel="canonical" href="https://art-match-indol.vercel.app/buyer/help-support" />
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
              sx={{ color: theme.palette.error.main, mb: 2 }}
            >
              <ContactSupportOutlinedIcon aria-hidden="true" />
              <Typography
                variant="overline"
                sx={{ fontWeight: 800, letterSpacing: 1.5 }}
              >
                Buyer support
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
              Help &amp; Support
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 2, maxWidth: 680, lineHeight: 1.75, fontSize: { md: "1.1rem" } }}
            >
              Get answers about artwork delivery, secure checkout, account
              access, and the studio experience.
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
            <ConnectionErrorPanel
              title="Help & Support Unavailable"
              onRetry={retryLoadFaqs}
            />
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Help &amp; Support</title>
        <meta
          name="description"
          content="Get answers to frequently asked questions about buying artwork, orders, payments, and support on ArtMatch."
        />
        <link rel="canonical" href="https://art-match-indol.vercel.app/buyer/help-support" />
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
            sx={{ color: theme.palette.error.main, mb: 2 }}
          >
            <ContactSupportOutlinedIcon aria-hidden="true" />
            <Typography
              variant="overline"
              sx={{ fontWeight: 800, letterSpacing: 1.5 }}
            >
              Buyer support
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
            Help &amp; Support
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
            Get answers about artwork delivery, secure checkout, account access,
            and the studio experience before or after purchase.
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
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Support resources
        </Typography>
        <Typography color="text.secondary">
          Find quick answers or contact our support team for help.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: { xs: 3, md: 5 } }}>
        {visibleSupportCards.map((card) => {
          const { title, description, cta, action } = card;
          const onClick =
            action === "faqs"
              ? () => setFaqDialogOpen(true)
              : action === "shipping" || action === "payment"
                ? () => setActiveTopic(action)
                : action === "messages"
                  ? () => navigate("/buyer/profile/messages?support=1")
                  : undefined;
          return (
          <Grid size={{ xs: 12, md: visibleSupportCards.length === 3 ? 4 : 6 }} key={title}>
            <Card
              onClick={onClick}
              role={onClick ? "button" : undefined}
              tabIndex={onClick ? 0 : undefined}
              onKeyDown={
                onClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onClick();
                      }
                    }
                  : undefined
              }
              sx={{
                height: "100%",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                boxShadow: "none",
                backgroundColor: theme.palette.background.paper,
                cursor: onClick ? "pointer" : "default",
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                ...(onClick && {
                  "&:hover": {
                    borderColor: theme.palette.error.main,
                    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
                  },
                  "&:focus-visible": {
                    outline: "3px solid",
                    outlineColor: theme.palette.error.main,
                    outlineOffset: 2,
                  },
                }),
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: "rgba(233, 72, 72, 0.09)",
                    color: theme.palette.error.main,
                    mb: 2,
                  }}
                >
                  {React.createElement(card.icon, { fontSize: "medium" })}
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    mb: 1,
                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.7,
                    fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    mb: 2,
                  }}
                >
                  {description}
                </Typography>
                {cta && (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{ mt: "auto", color: theme.palette.error.main, fontWeight: 700, fontSize: "0.875rem" }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "inherit" }}>
                      {cta}
                    </Typography>
                    <ArrowForwardIcon sx={{ fontSize: 16 }} />
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
          );
        })}
      </Grid>

      <FAQInfo
        open={faqDialogOpen}
        handleClose={() => setFaqDialogOpen(false)}
        faqs={faqs}
        loading={faqsLoading}
        error={faqsError}
        onRetry={retryLoadFaqs}
      />

      <ShippingInfo
        open={activeTopic === "shipping"}
        handleClose={() => setActiveTopic(null)}
        showOrderTracking={loggedIn}
      />

      <PaymentInfo
        open={activeTopic === "payment"}
        handleClose={() => setActiveTopic(null)}
      />

      {loggedIn && (
        <Box
          id="contact-support-form"
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 4,
          p: { xs: 2, sm: 3, md: 4 },
          background:
            theme.palette.mode === "light"
              ? "#fffaf4"
              : theme.palette.background.paper,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box sx={{ maxWidth: 560 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                mb: 1,
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              Need direct assistance?
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: "0.85rem", sm: "0.95rem" } }}
            >
              Tell us what you need and our support team will help guide you
              through your order, account, or artwork questions.
            </Typography>
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            endIcon={
              submitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <ArrowForwardIcon />
              )
            }
            sx={{
              borderRadius: 999,
              px: 3,
              py: 1.2,
              width: { xs: "100%", md: "auto" },
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": { backgroundColor: theme.palette.error.dark },
            }}
          >
            Contact Support
          </Button>
        </Stack>

        <Box sx={{ mt: 3 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          {submitNotice && (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ mb: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => navigate("/buyer/profile/messages?support=1")}
                  sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                >
                  View in Messages
                </Button>
              }
            >
              {submitNotice}
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Your email"
              variant="outlined"
              value={profileEmail || "Loading your profile email…"}
              helperText="From your profile — replies are sent here"
              slotProps={{ input: { readOnly: true } }}
              disabled
            />
            <TextField
              fullWidth
              required
              select
              label="Issue type"
              variant="outlined"
              value={issueType}
              onChange={(event) => setIssueType(event.target.value)}
              disabled={submitting}
            >
              {ISSUE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            fullWidth
            required
            multiline
            minRows={5}
            label="Tell us more"
            variant="outlined"
            placeholder="Describe the issue so our support team can help you faster."
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            error={detailsInvalid}
            helperText={
              detailsInvalid ? "Tell us what you need help with." : ""
            }
            disabled={submitting}
            sx={{ mt: 2 }}
          />
        </Box>
        </Box>
      )}
      </Container>
      </Box>
    </Box>
  );
}

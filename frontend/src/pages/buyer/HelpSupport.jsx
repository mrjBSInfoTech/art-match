import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import { fetchFaqs } from "../../api/buyer/faqAPI";
import {
  fetchProfileEmail,
  sendSupportMessage,
} from "../../api/buyer/supportChatAPI";
import { getBuyerProfile } from "../../api/buyer/buyerAuthenticationAPI";
import FAQInfo from "../../components/buyer/HelpSupport/FAQInfo";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";

const DialogTransition = React.forwardRef(function DialogTransition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={400}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

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
  },
];

const TOPIC_GUIDES = {
  shipping: {
    icon: LocalShippingOutlinedIcon,
    title: "Shipping, Delivery & Returns Guide",
    subtitle: "How artworks are packed, tracked, delivered, and protected.",
    items: [
      {
        heading: "1. Door-to-Door Delivery & Campus Pickup",
        body: "Buyers can choose Door-to-Door courier delivery using their saved shipping address or select Campus Studio Pickup to collect artworks directly from the Central Academy of Fine Arts (CAFA) studio.",
      },
      {
        heading: "2. Mandatory Parcel Photo Verification",
        body: "Before an order can be marked as Shipped, student sellers are required to upload parcel condition photos and handling instructions (such as Fragile or Keep Dry) so you can verify how your artwork was packaged.",
      },
      {
        heading: "3. Live Courier Tracking & Delivery Proof",
        body: "Once shipped, your order details page displays the courier name, tracking number, and tracking link. Upon arrival, sellers record delivery proof photos and notes to confirm safe receipt.",
      },
      {
        heading: "4. 4-Day Inspection & Return Window",
        body: "You have 4 calendar days (96 hours) from the recorded delivery timestamp to inspect your artwork and request a return if it arrives damaged, missing components, or not as described.",
      },
    ],
    primaryAction: { label: "Track My Orders", path: "/buyer/profile/orders" },
    secondaryAction: { label: "Terms & Return Policy", path: "/buyer/terms-of-service" },
  },
  payment: {
    icon: LockOutlinedIcon,
    title: "Payment Security & Buyer Protection",
    subtitle: "How your payment, authenticity, and personal data are safeguarded.",
    items: [
      {
        heading: "1. Encrypted PayMongo Checkout",
        body: "Online payments are processed through PayMongo supporting GCash, Maya, QR Ph, and major cards. ArtMatch never stores your raw card numbers or e-wallet PINs.",
      },
      {
        heading: "2. Escrow Hold Until Delivery & Inspection",
        body: "Your payment is held securely while the artwork is prepared, shipped, and inspected. Seller payouts only become eligible after delivery is confirmed and the 4-day return window finishes with no unresolved disputes.",
      },
      {
        heading: "3. VerifiedListings & Certificate of Authenticity (COA)",
        body: "Every listed artwork is reviewed by administrators before appearing in the shop. Completed purchases receive a cryptographic Certificate of Authenticity verifying the student artist and edition.",
      },
      {
        heading: "4. RA 10173 Data Privacy Protection",
        body: "Your account details, shipping addresses, and order history are protected in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).",
      },
    ],
    primaryAction: { label: "Privacy Policy (RA 10173)", path: "/buyer/privacy-policy" },
    secondaryAction: { label: "Terms of Service", path: "/buyer/terms-of-service" },
  },
};

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
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqsError, setFaqsError] = useState("");
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const selectedGuide = activeTopic ? TOPIC_GUIDES[activeTopic] : null;

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

  useEffect(() => {
    getBuyerProfile()
      .then((profile) => setProfileEmail(profile.email || ""))
      .catch(() => setProfileEmail(""));
  }, []);

  const retryLoadFaqs = () => {
    setFaqsLoading(true);
    setFaqsError("");
    fetchFaqs()
      .then((items) => setFaqs(items))
      .catch((error) => setFaqsError(error.message))
      .finally(() => setFaqsLoading(false));
  };

  useEffect(() => {
    let active = true;
    fetchProfileEmail()
      .then((email) => {
        if (active && email) setProfileEmail(email);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
    fetchFaqs()
      .then((data) => {
        if (active) setFaqs(data);
      })
      .catch((error) => {
        if (active) setFaqsError(error.message);
      })
      .finally(() => {
        if (active) setFaqsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Container
      maxWidth="lg"
      sx={{ py: { xs: 3, md: 8 }, px: { xs: 2, sm: 3 } }}
    >
      <Box sx={{ mb: { xs: 3, md: 5 } }}>
        <Typography
          variant="overline"
          sx={{
            color: theme.palette.error.main,
            fontWeight: 800,
            letterSpacing: 1.5,
          }}
        >
          Help & Support
        </Typography>
        <Typography
          variant="h3"
          sx={{
            mt: 1,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontSize: { xs: "1.75rem", sm: "2.25rem", md: "3rem" },
          }}
        >
          We’re here to help you collect confidently.
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            mt: 1.5,
            maxWidth: 720,
            fontSize: { xs: "0.9rem", sm: "1rem" },
          }}
        >
          Get answers about artwork delivery, secure checkout, account access,
          and the studio experience before or after purchase.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: { xs: 3, md: 5 } }}>
        {supportCards.map((card) => {
          const { title, description, cta, action } = card;
          const onClick =
            action === "faqs"
              ? () => setFaqDialogOpen(true)
              : action === "shipping" || action === "payment"
                ? () => setActiveTopic(action)
                : action === "messages"
                  ? () => navigate("/buyer/messages?support=1")
                  : undefined;
          return (
          <Grid size={{ xs: 12, md: 6 }} key={title}>
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

      <Dialog
        open={Boolean(selectedGuide)}
        onClose={() => setActiveTopic(null)}
        TransitionComponent={DialogTransition}
        scroll="paper"
        PaperProps={{
          sx: {
            width: "min(100% - 24px, 720px)",
            maxWidth: "720px",
            maxHeight: "calc(100% - 32px)",
            borderRadius: 3,
            overflow: "hidden",
            backgroundColor: theme.palette.background.paper,
          },
        }}
        aria-labelledby="support-topic-dialog-title"
      >
        {selectedGuide && (
          <>
            <DialogTitle
              id="support-topic-dialog-title"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2.5,
                py: 1.75,
                color: theme.palette.text.primary,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
                fontWeight: 700,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              {selectedGuide.icon &&
                React.createElement(selectedGuide.icon, {
                  sx: { color: theme.palette.error.main, fontSize: 22 },
                })}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                  {selectedGuide.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {selectedGuide.subtitle}
                </Typography>
              </Box>
              <Button
                aria-label="Close guide"
                onClick={() => setActiveTopic(null)}
                sx={{
                  minWidth: 28,
                  width: 28,
                  height: 28,
                  ml: "auto",
                  p: 0,
                  color: theme.palette.text.secondary,
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </Button>
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack spacing={2}>
                {selectedGuide.items.map((item) => (
                  <Box
                    key={item.heading}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.background.default,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.75 }}>
                      {item.heading}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {item.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, py: 1.75, justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  const target = selectedGuide.secondaryAction.path;
                  setActiveTopic(null);
                  navigate(target);
                }}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
              >
                {selectedGuide.secondaryAction.label}
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  onClick={() => setActiveTopic(null)}
                  color="inherit"
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => {
                    const target = selectedGuide.primaryAction.path;
                    setActiveTopic(null);
                    navigate(target);
                  }}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, color: "#fff" }}
                >
                  {selectedGuide.primaryAction.label}
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

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
                  onClick={() => navigate("/buyer/messages?support=1")}
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
    </Container>
  );
}

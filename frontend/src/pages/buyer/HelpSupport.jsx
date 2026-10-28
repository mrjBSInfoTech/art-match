import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { fetchFaqs } from "../../api/buyer/faqAPI";
import {
  fetchProfileEmail,
  sendSupportMessage,
} from "../../api/buyer/supportChatAPI";
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
    action: "faqs",
  },
  {
    icon: LocalShippingOutlinedIcon,
    title: "Shipping & Delivery",
    description:
      "Learn about international shipping, delivery windows, tracked packages, and condition reporting.",
  },
  {
    icon: LockOutlinedIcon,
    title: "Payment & Security",
    description:
      "Review secure payment steps, buyer protection, returns, and verification checks for each listing.",
  },
  {
    icon: ForumOutlinedIcon,
    title: "Contact the Studio",
    description:
      "Reach out to the Red Nexus support desk for custom requests, account issues, or order follow-ups.",
    action: "contact",
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

const scrollToContactForm = () => {
  document
    .getElementById("contact-support-form")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
};

export default function HelpSupport() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [faqs, setFaqs] = useState([]);
  const [faqsLoading, setFaqsLoading] = useState(true);
  const [faqsError, setFaqsError] = useState("");
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);

  // Contact form (the template buyers use to reach admin support).
  // The reply address comes from the buyer's profile, not from this form.
  const [profileEmail, setProfileEmail] = useState(
    () => localStorage.getItem("buyer_email") || "",
  );
  const [issueType, setIssueType] = useState("Order/Shipping");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitNotice, setSubmitNotice] = useState("");
  const [touched, setTouched] = useState(false);

  const detailsInvalid = touched && !details.trim();

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
        {supportCards.map(({ icon: Icon, title, description, action }) => {
          const onClick =
            action === "faqs"
              ? () => setFaqDialogOpen(true)
              : action === "contact"
                ? scrollToContactForm
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
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
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
                  <Icon fontSize="medium" />
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
                  }}
                >
                  {description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          );
        })}
      </Grid>

      <Dialog
        open={faqDialogOpen}
        onClose={() => setFaqDialogOpen(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            fontWeight: 800,
            fontSize: { xs: "1.15rem", sm: "1.35rem" },
          }}
        >
          Frequently Asked Questions
          <IconButton
            aria-label="Close frequently asked questions"
            onClick={() => setFaqDialogOpen(false)}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {faqsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : faqsError ? (
          <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
            {faqsError}
          </Typography>
        ) : !faqs.length ? (
          <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
            No frequently asked questions are available yet.
          </Typography>
        ) : (
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflow: "hidden",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {faqs.map((faq, index) => (
              <Accordion
                key={faq.faq_id ?? index}
                disableGutters
                elevation={0}
                sx={{
                  backgroundColor: "transparent",
                  "&:before": { display: "none" },
                  "&:not(:last-of-type)": {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.95rem", sm: "1.05rem" },
                    }}
                  >
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    color="text.secondary"
                    sx={{
                      whiteSpace: "pre-line",
                      lineHeight: 1.7,
                      fontSize: { xs: "0.85rem", sm: "0.95rem" },
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
          )}
        </DialogContent>
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

import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";

const supportCards = [
  {
    icon: ContactSupportOutlinedIcon,
    title: "Frequently Asked Questions",
    description: "Browse the most common buyer questions about ordering, shipping, registration, and artwork delivery.",
  },
  {
    icon: LocalShippingOutlinedIcon,
    title: "Shipping & Delivery",
    description: "Learn about international shipping, delivery windows, tracked packages, and condition reporting.",
  },
  {
    icon: LockOutlinedIcon,
    title: "Payment & Security",
    description: "Review secure payment steps, buyer protection, returns, and verification checks for each listing.",
  },
  {
    icon: ForumOutlinedIcon,
    title: "Contact the Studio",
    description: "Reach out to the Red Nexus support desk for custom requests, account issues, or order follow-ups.",
  },
];

export default function HelpSupport() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      <Box sx={{ mb: 5 }}>
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
          sx={{ mt: 1, fontWeight: 800, letterSpacing: "-0.04em" }}
        >
          We’re here to help you collect confidently.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 720 }}>
          Get answers about artwork delivery, secure checkout, account access, and the studio experience before or after purchase.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {supportCards.map(({ icon: Icon, title, description }) => (
          <Grid item xs={12} md={6} key={title}>
            <Card
              sx={{
                height: "100%",
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                boxShadow: "none",
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <CardContent sx={{ p: 3 }}>
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
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  {title}
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 4,
          p: { xs: 2.5, md: 4 },
          background: theme.palette.mode === "light" ? "#fffaf4" : theme.palette.background.paper,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="center" justifyContent="space-between">
          <Box sx={{ maxWidth: 560 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Need direct assistance?
            </Typography>
            <Typography color="text.secondary">
              Tell us what you need and our support team will help guide you through your order, account, or artwork questions.
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={() => navigate("/buyer/messages")}
            endIcon={<ArrowForwardIcon />}
            sx={{
              borderRadius: 999,
              px: 3,
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": { backgroundColor: theme.palette.error.dark },
            }}
          >
            Contact Support
          </Button>
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Your email"
              variant="outlined"
              defaultValue="buyer@example.com"
              sx={{ maxWidth: 420 }}
            />
            <TextField
              fullWidth
              label="Issue type"
              variant="outlined"
              defaultValue="Order/Shipping"
              sx={{ maxWidth: 420 }}
            />
          </Stack>

          <TextField
            fullWidth
            multiline
            minRows={5}
            label="Tell us more"
            variant="outlined"
            defaultValue="Hi, I would like help tracking my order and confirming the arrival timeline for my selected artwork."
            sx={{ mt: 2 }}
          />

          <Stack direction="row" spacing={1.5} sx={{ mt: 2, flexWrap: "wrap" }}>
            <Chip label="Fast response" color="error" variant="filled" />
            <Chip label="Secure support" color="default" variant="outlined" />
            <Chip label="Buyer protection" color="default" variant="outlined" />
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}

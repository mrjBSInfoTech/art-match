import { createElement } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useThemeMode } from "../../theme/ThemeModeProvider";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import HeadsetMicOutlinedIcon from "@mui/icons-material/HeadsetMicOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

const commitments = [
  {
    icon: AutoAwesomeOutlinedIcon,
    title: "Original work, clearly represented",
    description:
      "Every listing names the artist, medium, dimensions, edition details, and condition so buyers can decide with confidence.",
  },
  {
    icon: FavoriteBorderRoundedIcon,
    title: "Artists keep agency",
    description:
      "Artists set prices and availability. We publish fees plainly and never pressure creators into exclusivity.",
  },
  {
    icon: GppGoodOutlinedIcon,
    title: "Buyer protection by design",
    description:
      "Protected payments, insured art handling, and documented delivery give every new collector peace of mind.",
  },
];

const steps = [
  {
    number: "01",
    title: "Discover",
    description: "Browse by artist, medium, budget, or curatorial story.",
  },
  {
    number: "02",
    title: "Understand",
    description: "Review provenance, artist context, full pricing, and delivery estimates.",
  },
  {
    number: "03",
    title: "Acquire safely",
    description: "Pay through encrypted checkout. Funds are protected while work is prepared and shipped.",
  },
  {
    number: "04",
    title: "Receive with care",
    description: "Follow tracking, inspect the work, and reach buyer support if anything is not as described.",
  },
];

const trustItems = [
  { icon: VerifiedOutlinedIcon, title: "Verified artists", description: "Identity and artwork provenance are reviewed" },
  { icon: LockOutlinedIcon, title: "Secure payments", description: "Encrypted checkout with transparent totals" },
  { icon: LocalShippingOutlinedIcon, title: "Insured handling", description: "Art-safe packaging and trackable delivery" },
  { icon: HeadsetMicOutlinedIcon, title: "Human support", description: "Real help from a caring service team" },
];

const borderColor = (theme) =>
  theme.palette.mode === "dark" ? "rgba(255,255,255,0.16)" : "#e9dfd2";

export default function AboutUs() {
  const navigate = useNavigate();
  const { theme } = useThemeMode();
  const warm = theme.palette.mode === "dark" ? "#211b19" : "#fff9f0";
  const soft = theme.palette.mode === "dark" ? "#171313" : "#fffdf9";
  const accent = theme.palette.error.main;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: soft }}>
      <Box sx={{ backgroundColor: warm, borderBottom: `1px solid ${borderColor(theme)}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 13 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="overline" sx={{ color: accent, fontWeight: 800, letterSpacing: 1.4 }}>
                About Red Nexus
              </Typography>
              <Typography
                component="h1"
                sx={{
                  mt: 1,
                  maxWidth: 650,
                  fontSize: { xs: "2.35rem", sm: "3rem", md: "3.55rem" },
                  lineHeight: 1.02,
                  fontWeight: 800,
                  letterSpacing: "-0.055em",
                }}
              >
                Art has more meaning when its story stays attached
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2.5, maxWidth: 610, lineHeight: 1.7 }}>
                Red Nexus is a buyer-first marketplace for original work by emerging artists. We make the path from studio to home more transparent, more respectful, and safer for everyone involved.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate("/buyer/shop")}
                  sx={{ borderRadius: 999, px: 2.2, backgroundColor: accent, color: "#fff", boxShadow: "none" }}
                >
                  Explore the marketplace
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/buyer/artist")}
                  sx={{ borderRadius: 999, px: 2.2, color: "text.primary", borderColor: "text.primary" }}
                >
                  Read our trust standards
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ position: "relative", minHeight: { xs: 250, sm: 340 }, maxWidth: 420, mx: "auto" }}>
                <Box sx={{ position: "absolute", inset: "7% 5% 0 0", border: `1px solid ${borderColor(theme)}`, borderRadius: 3 }} />
                <Box sx={{ position: "absolute", inset: "0 0 7% 20%", border: `1px solid ${borderColor(theme)}`, borderRadius: 3 }} />
                <Box
                  sx={{
                    position: "absolute",
                    right: 8,
                    bottom: 0,
                    width: 125,
                    p: 1.6,
                    borderRadius: 2,
                    backgroundColor: "#a9151d",
                    color: "#fff",
                    boxShadow: 3,
                  }}
                >
                  <Typography sx={{ fontSize: "1.5rem", lineHeight: 1, fontWeight: 800 }}>82%</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: "0.6rem", lineHeight: 1.3 }}>
                    of each sale reaches the artist after transparent marketplace and payment fees.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 11 } }}>
        <Grid container spacing={{ xs: 4, md: 5 }} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              component="img"
              src="https://images.unsplash.com/photo-1561214115-9c0c8c3f1f4f?auto=format&fit=crop&w=1000&q=85"
              alt="Original artwork in a gallery"
              sx={{ display: "block", width: "100%", height: { xs: 270, md: 340 }, objectFit: "cover", borderRadius: 3, filter: "saturate(.82)" }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="overline" sx={{ color: accent, fontWeight: 800, letterSpacing: 1.3 }}>Our mission</Typography>
            <Typography component="h2" sx={{ mt: 0.6, fontSize: { xs: "2rem", md: "2.4rem" }, lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.045em" }}>
              Build lasting connections, not quick transactions
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
              Too much art commerce removes the artist, context, and care from the sale. We keep those elements visible while giving buyers practical tools to compare, ask questions, track delivery, and resolve issues.
            </Typography>
            <Stack spacing={1.35} sx={{ mt: 2.75 }}>
              {["Artists set authorship and control over pricing", "Buyers see full costs before checkout", "Sensitive addresses and contacts stay masked until needed", "Support decisions are documented and appealable"].map((item) => (
                <Stack direction="row" spacing={1} alignItems="center" key={item}>
                  <VerifiedOutlinedIcon sx={{ color: accent, fontSize: 16 }} />
                  <Typography variant="body2">{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ backgroundColor: warm, borderTop: `1px solid ${borderColor(theme)}`, borderBottom: `1px solid ${borderColor(theme)}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
          <Typography variant="overline" sx={{ color: accent, fontWeight: 800, letterSpacing: 1.3 }}>What we commit to</Typography>
          <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: "2rem", md: "2.35rem" }, fontWeight: 800, letterSpacing: "-0.045em" }}>Trust is a product feature</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, mb: 4, lineHeight: 1.65 }}>Our standards shape listing review, checkout, shipping, communication, privacy, and support.</Typography>
          <Grid container spacing={2}>
            {commitments.map(({ icon: Icon, title, description }) => (
              <Grid size={{ xs: 12, md: 4 }} key={title}>
                <Box sx={{ height: "100%", minHeight: { md: 185 }, p: 3, border: `1px solid ${borderColor(theme)}`, borderRadius: 2.5, backgroundColor: soft }}>
                  <Box sx={{ display: "grid", placeItems: "center", width: 28, height: 28, mb: 2, borderRadius: "50%", backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,.1)" : "#fff0db" }}>
                    {createElement(Icon, { sx: { color: accent, fontSize: 16 } })}
                  </Box>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{description}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Typography variant="overline" sx={{ color: accent, fontWeight: 800, letterSpacing: 1.3 }}>How the marketplace works</Typography>
        <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: "2rem", md: "2.35rem" }, fontWeight: 800, letterSpacing: "-0.045em" }}>A clear path from discovery to delivery</Typography>
        <Grid container spacing={2} sx={{ mt: 3.5 }}>
          {steps.map((step) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={step.number}>
              <Box sx={{ height: "100%", minHeight: { md: 150 }, p: 2.5, border: `1px solid ${borderColor(theme)}`, borderRadius: 2.5 }}>
                <Typography sx={{ color: accent, fontSize: "0.7rem", fontWeight: 800 }}>{step.number}</Typography>
                <Typography sx={{ mt: 1, fontWeight: 800 }}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: "0.75rem", lineHeight: 1.55 }}>{step.description}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ borderTop: `1px solid ${borderColor(theme)}`, backgroundColor: soft }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Grid container spacing={2}>
            {trustItems.map(({ icon: Icon, title, description }) => (
              <Grid size={{ xs: 6, md: 3 }} key={title}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ display: "grid", placeItems: "center", flexShrink: 0, width: 30, height: 30, borderRadius: "50%", backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,.1)" : "#fff0db" }}>
                    {createElement(Icon, { sx: { color: accent, fontSize: 16 } })}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800 }}>{title}</Typography>
                    <Typography color="text.secondary" sx={{ fontSize: "0.65rem", lineHeight: 1.35 }}>{description}</Typography>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

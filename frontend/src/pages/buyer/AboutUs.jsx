import { Box, Button, Container, Divider, Grid, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";

const principles = [
  {
    icon: PaletteOutlinedIcon,
    title: "Original by design",
    description: "Every work begins in a student studio and carries the artist's own point of view.",
  },
  {
    icon: SchoolOutlinedIcon,
    title: "Rooted in CAFA",
    description: "We connect collectors with emerging voices from one of China's leading art academies.",
  },
  {
    icon: HandshakeOutlinedIcon,
    title: "Direct connection",
    description: "Artists keep ownership of their story while buyers discover work with confidence.",
  },
  {
    icon: PublicOutlinedIcon,
    title: "Art without borders",
    description: "Our gallery makes it easier for thoughtful work to travel from Beijing to the world.",
  },
];

export default function AboutUs() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box
        sx={{
          backgroundColor: theme.palette.mode === "light" ? "#fff8ed" : theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography
                variant="overline"
                sx={{ color: theme.palette.error.main, fontWeight: 800, letterSpacing: 1.5 }}
              >
                About Red Nexus
              </Typography>
              <Typography
                variant="h2"
                sx={{ mt: 1, fontSize: { xs: 38, md: 58 }, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.05em" }}
              >
                A closer way to discover original art.
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 3, maxWidth: 620, fontSize: { md: "1.1rem" }, lineHeight: 1.75 }}>
                Red Nexus is a digital gallery for the next generation of CAFA artists. We bring original paintings, sculpture, digital work, and design studies out of the studio and into the hands of curious collectors.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate("/buyer/artwork")}
                  sx={{ borderRadius: 999, px: 2.5, backgroundColor: theme.palette.error.main, color: "#fff" }}
                >
                  Explore the gallery
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/buyer/artist")}
                  sx={{ borderRadius: 999, px: 2.5, color: "text.primary", borderColor: "text.primary" }}
                >
                  Meet the artists
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  minHeight: { xs: 270, md: 390 },
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundImage: "url(https://images.unsplash.com/photo-1561214115-9c0c8c3f1f4f?auto=format&fit=crop&w=1000&q=85)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: theme.shadows[4],
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Box sx={{ maxWidth: 700, mb: 5 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
            Built around the people behind the work.
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.75 }}>
            Art is more meaningful when you know where it came from. Red Nexus gives each artist room to be seen, heard, and supported while giving buyers a thoughtful, transparent way to collect.
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 7 }}>
          {principles.map(({ icon: Icon, title, description }) => (
            <Grid item xs={12} sm={6} md={3} key={title}>
              <Box sx={{ height: "100%", p: 2.5, border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                <Icon sx={{ color: theme.palette.error.main, fontSize: 32, mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
                  {description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 5 }} />
        <Grid container spacing={3} sx={{ mb: 7 }}>
          <Grid item xs={6} md={3}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>100%</Typography>
            <Typography color="text.secondary">student-led stories</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>8+</Typography>
            <Typography color="text.secondary">creative departments</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>1:1</Typography>
            <Typography color="text.secondary">artist connection</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>CAFA</Typography>
            <Typography color="text.secondary">our creative home</Typography>
          </Grid>
        </Grid>

        <Box
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            backgroundColor: theme.palette.text.primary,
            color: theme.palette.background.paper,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            alignItems: { md: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ maxWidth: 640 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Find something that stays with you.
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.65 }}>
              Start with a genre, browse a studio, or follow an artist whose work keeps pulling you back.
            </Typography>
          </Box>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate("/buyer/help-support")}
            sx={{ flexShrink: 0, borderRadius: 999, backgroundColor: theme.palette.error.main, color: "#fff" }}
          >
            Visit support
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

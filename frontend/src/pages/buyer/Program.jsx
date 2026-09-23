import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArchitectureOutlinedIcon from "@mui/icons-material/ArchitectureOutlined";
import ChairOutlinedIcon from "@mui/icons-material/ChairOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

const programs = {
  architecture: {
    title: "Architecture",
    eyebrow: "CAFA Program",
    subtitle: "Spaces that give ideas a place to live.",
    description: "Explore architectural studies, models, and visual experiments shaped by students who think carefully about people, place, and possibility.",
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=85",
    icon: ArchitectureOutlinedIcon,
    accent: "#c9633d",
    focus: ["Spatial storytelling", "Material studies", "Urban futures"],
    stat: "32+",
    statLabel: "studio projects",
  },
  "interior-design": {
    title: "Interior Design",
    eyebrow: "CAFA Program",
    subtitle: "Objects, rooms, and moods in conversation.",
    description: "Meet the makers exploring how light, texture, furniture, and human movement can transform an interior into an experience.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
    icon: ChairOutlinedIcon,
    accent: "#ad7b35",
    focus: ["Furniture studies", "Light and atmosphere", "Human-centered spaces"],
    stat: "24+",
    statLabel: "design studies",
  },
  "fine-arts": {
    title: "Fine Arts",
    eyebrow: "CAFA Program",
    subtitle: "A direct line from studio practice to collection.",
    description: "Discover paintings, sculpture, printmaking, and mixed media works from artists developing their own visual language inside the academy.",
    image: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85",
    icon: PaletteOutlinedIcon,
    accent: "#b53a3a",
    focus: ["Painting and color", "Sculptural form", "Experimental media"],
    stat: "86+",
    statLabel: "original works",
  },
};

export default function Program() {
  const { program } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const details = useMemo(() => programs[decodeURIComponent(program || "").toLowerCase()] || programs["fine-arts"], [program]);
  const Icon = details.icon;

  return (
    <>
      <Helmet titleTemplate="%s - Red Nexus">
        <title>{details.title}</title>
      </Helmet>

      <Box sx={{ backgroundColor: theme.palette.mode === "light" ? "#fff9ef" : theme.palette.background.default }}>
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: details.accent, mb: 2 }}>
                <Icon />
                <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5 }}>
                  {details.eyebrow}
                </Typography>
              </Stack>
              <Typography variant="h2" sx={{ fontSize: { xs: 40, md: 62 }, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.05em" }}>
                {details.title}
              </Typography>
              <Typography variant="h5" sx={{ mt: 2, fontWeight: 700, lineHeight: 1.25 }}>
                {details.subtitle}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 570, lineHeight: 1.75 }}>
                {details.description}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate(`/buyer/artwork/${encodeURIComponent(details.title)}`)}
                  sx={{ borderRadius: 999, px: 2.5, backgroundColor: details.accent, color: "#fff", "&:hover": { backgroundColor: details.accent } }}
                >
                  Explore {details.title}
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
            <Grid item xs={12} md={6}>
              <Box sx={{ height: { xs: 270, md: 420 }, borderRadius: 4, backgroundImage: `url(${details.image})`, backgroundSize: "cover", backgroundPosition: "center", border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[4] }} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={5}>
            <Box sx={{ height: "100%", p: { xs: 3, md: 4 }, borderRadius: 3, backgroundColor: theme.palette.text.primary, color: theme.palette.background.paper }}>
              <Typography variant="overline" sx={{ color: details.accent, fontWeight: 800, letterSpacing: 1.5 }}>
                Inside the program
              </Typography>
              <Typography variant="h4" sx={{ mt: 1.5, fontWeight: 800, letterSpacing: "-0.03em" }}>
                A living archive of student practice.
              </Typography>
              <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
                Each project reflects a process of looking, testing, and making. Browse the program to find work with a point of view.
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>{details.stat}</Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.72)" }}>{details.statLabel}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            <Box sx={{ p: { xs: 3, md: 4 }, border: `1px solid ${theme.palette.divider}`, borderRadius: 3, height: "100%" }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
                What you will find
              </Typography>
              <Stack spacing={2}>
                {details.focus.map((item, index) => (
                  <Box key={item} sx={{ display: "flex", gap: 2, alignItems: "center", py: 1.5, borderBottom: index < details.focus.length - 1 ? `1px solid ${theme.palette.divider}` : "none" }}>
                    <Typography sx={{ color: details.accent, fontWeight: 800, minWidth: 28 }}>0{index + 1}</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{item}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

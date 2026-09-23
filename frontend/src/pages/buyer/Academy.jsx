import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Box, Button, Container, Divider, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";

const academyPages = {
  exhibitions: {
    title: "Exhibitions Calendar",
    eyebrow: "Academy Programs",
    description: "Keep up with upcoming showcases, open studios, and graduate exhibitions from the CAFA creative community.",
    icon: CalendarMonthOutlinedIcon,
    accent: "#bb493d",
    events: [
      ["OCT 12", "New Voices: Studio Selection", "Red Nexus Online Gallery"],
      ["NOV 03", "Material / Memory", "CAFA Design Building"],
      ["DEC 08", "Winter Degree Show", "Central Academy of Fine Arts"],
    ],
  },
  inquiries: {
    title: "Vocation & Inquiries",
    eyebrow: "Academy Programs",
    description: "Connect with the Red Nexus team about collaborations, academic partnerships, press requests, and artist opportunities.",
    icon: MailOutlineOutlinedIcon,
    accent: "#a8752e",
    events: [
      ["ARTISTS", "Portfolio and studio opportunities", "artists@rednexus.art"],
      ["PARTNERS", "Exhibitions and academic partnerships", "partners@rednexus.art"],
      ["PRESS", "Stories, interviews, and media requests", "press@rednexus.art"],
    ],
  },
};

export default function Academy() {
  const { section } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const details = useMemo(() => academyPages[section] || academyPages.exhibitions, [section]);
  const Icon = details.icon;

  return (
    <>
      <Helmet titleTemplate="%s - Red Nexus">
        <title>{details.title}</title>
      </Helmet>
      <Box sx={{ backgroundColor: theme.palette.mode === "light" ? "#fff9ef" : theme.palette.background.default, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: details.accent, mb: 2 }}>
            <Icon />
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1.5 }}>{details.eyebrow}</Typography>
          </Stack>
          <Typography variant="h2" sx={{ fontSize: { xs: 40, md: 62 }, lineHeight: 1, fontWeight: 800, letterSpacing: "-0.05em", maxWidth: 800 }}>
            {details.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 680, lineHeight: 1.75, fontSize: { md: "1.1rem" } }}>
            {details.description}
          </Typography>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate("/buyer/artwork")}
            sx={{ mt: 4, borderRadius: 999, px: 2.5, backgroundColor: details.accent, color: "#fff" }}
          >
            Explore the gallery
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>What is happening</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>A small preview of the academy calendar and community connections.</Typography>
        <Grid container spacing={2}>
          {details.events.map(([label, title, location]) => (
            <Grid item xs={12} md={4} key={title}>
              <Box sx={{ p: 3, height: "100%", border: `1px solid ${theme.palette.divider}`, borderRadius: 3, backgroundColor: theme.palette.background.paper }}>
                <Typography variant="overline" sx={{ color: details.accent, fontWeight: 800, letterSpacing: 1.5 }}>{label}</Typography>
                <Typography variant="h6" sx={{ mt: 1.5, fontWeight: 800 }}>{title}</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">{location}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 6, p: { xs: 3, md: 4 }, borderRadius: 3, backgroundColor: theme.palette.text.primary, color: theme.palette.background.paper }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Stay close to the studio.</Typography>
          <Typography sx={{ mt: 1, maxWidth: 650, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }}>
            Red Nexus brings the academy community closer to collectors, collaborators, and curious visitors around the world.
          </Typography>
          <Button onClick={() => navigate("/buyer/help-support")} sx={{ mt: 2, color: "#fff", borderColor: "#fff", borderRadius: 999 }} variant="outlined">
            Contact the team
          </Button>
        </Box>
      </Container>
    </>
  );
}

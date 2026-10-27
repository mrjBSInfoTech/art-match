import { createElement, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ContactPageOutlinedIcon from "@mui/icons-material/ContactPageOutlined";
import { useThemeMode } from "../../theme/ThemeModeProvider";
import { fetchAboutContent } from "../../api/aboutContentAPI";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";

const navigationItems = [
  { label: "About Us", icon: InfoOutlinedIcon, href: "#about-us", active: true },
  { label: "Institution Profile", icon: BadgeOutlinedIcon, href: "#about-us" },
  { label: "Vision & Mission", icon: TrackChangesOutlinedIcon, href: "#vision-mission" },
  { label: "Goals & Objectives", icon: FlagOutlinedIcon, href: "#goals-objectives" },
  { label: "Brief History", icon: HistoryEduOutlinedIcon, href: "#history" },
  { label: "Academic Offerings", icon: MenuBookOutlinedIcon, href: "#academic-offerings" },
  { label: "Contact Details", icon: ContactPageOutlinedIcon, href: "#contact-details" },
];

const sectionTitleSx = {
  fontSize: { xs: "1rem", md: "1.05rem" },
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

function InfoCard({ title, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        p: { xs: 1.75, md: 2 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontSize: "0.9rem", fontWeight: 800, mb: 0.65 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.82rem", lineHeight: 1.6 }}>
        {children}
      </Typography>
    </Paper>
  );
}

export default function AboutUs() {
  const { theme } = useThemeMode();
  const accent = theme.palette.error.main;
  const canvas = theme.palette.mode === "dark" ? "#111827" : "#f6f7f8";
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchAboutContent()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError?.message || "Unable to load About page content.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryCount]);

  const contactIcon = (label) => {
    const normalizedLabel = label.toLowerCase();
    if (normalizedLabel.includes("location") || normalizedLabel.includes("address")) {
      return LocationOnOutlinedIcon;
    }
    if (normalizedLabel.includes("phone") || normalizedLabel.includes("number")) {
      return PhoneOutlinedIcon;
    }
    if (normalizedLabel.includes("email")) return EmailOutlinedIcon;
    if (normalizedLabel.includes("website")) return SchoolOutlinedIcon;
    return PublicOutlinedIcon;
  };

  if (loading) {
    return <Box sx={{ minHeight: 320, display: "grid", placeItems: "center", backgroundColor: canvas }}><CircularProgress /></Box>;
  }

  if (error || !content) {
    return (
      <ConnectionErrorPanel
        title="About Page Unavailable"
        onRetry={() => setRetryCount((count) => count + 1)}
      />
    );
  }

  return (
    <Box sx={{ minHeight: "100%", backgroundColor: canvas }}>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, px: { xs: 1.5, md: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: { xs: 0, md: 2.5 }, maxWidth: 1080, mx: "auto" }}>
          <Paper
            component="nav"
            aria-label="About page sections"
            elevation={0}
            sx={{
              display: { xs: "none", md: "block" },
              position: "sticky",
              top: 24,
              flex: "0 0 205px",
              p: 1.1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.25,
              backgroundColor: theme.palette.mode === "dark" ? "background.paper" : "#fafafa",
            }}
          >
            <Typography
              variant="overline"
              sx={{ display: "block", px: 1.1, pt: 0.65, color: "text.secondary", fontSize: "0.65rem", fontWeight: 800, letterSpacing: 0.8 }}
            >
              About the academy
            </Typography>
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {navigationItems.map(({ label, icon, href, active }) => (
                <ListItem key={label} disablePadding sx={{ mb: 0.25 }}>
                  <ListItemButton
                    component="a"
                    href={href}
                    selected={active}
                    sx={{
                      minHeight: 38,
                      px: 1,
                      py: 0.5,
                      borderRadius: 0.75,
                      "&.Mui-selected": {
                        color: "#fff",
                        backgroundColor: accent,
                        "&:hover": { backgroundColor: accent },
                      },
                    }}
                  >
                    {createElement(icon, { sx: { mr: 0.8, fontSize: 16 } })}
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{ fontSize: "0.78rem", fontWeight: active ? 700 : 500, lineHeight: 1.25 }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>

          <Box
            component="main"
            id="about-us"
            sx={{
              width: "100%",
              maxWidth: 820,
              mx: { xs: "auto", md: 0 },
              p: { xs: 2, sm: 3, md: 3.25 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.25,
              backgroundColor: "background.paper",
            }}
          >
          <Typography component="h1" sx={{ fontSize: { xs: "1.25rem", md: "1.65rem" }, fontWeight: 800, letterSpacing: "-0.035em" }}>
            {content.collegeName}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: "0.85rem", lineHeight: 1.55 }}>
            {content.tagline}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", lineHeight: 1.65 }}>
            {content.introduction}
          </Typography>

          <Box component="section" id="vision-mission" sx={{ mt: 2.5, scrollMarginTop: 24 }}>
            <Typography sx={sectionTitleSx}>Vision &amp; Mission</Typography>
            <Grid container spacing={1.25} sx={{ mt: 0.4 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoCard title="Vision">
                  {content.vision}
                </InfoCard>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoCard title="Mission">
                  {content.mission}
                </InfoCard>
              </Grid>
            </Grid>
          </Box>

          <Box component="section" id="goals-objectives" sx={{ mt: 2.5, scrollMarginTop: 24 }}>
            <Typography sx={sectionTitleSx}>Goals</Typography>
            <Grid container spacing={1} sx={{ mt: 0.4 }}>
              {content.goals.map((goal, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={`${index}-${goal}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      alignItems: "flex-start",
                      p: 1.5,
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 0.8,
                      backgroundColor: "background.default",
                    }}
                  >
                    <Typography sx={{ color: accent, fontWeight: 800, fontSize: "0.8rem" }}>{index + 1}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", lineHeight: 1.5 }}>{goal}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box component="section" id="objectives" sx={{ mt: 2.5, scrollMarginTop: 24 }}>
            <Typography sx={sectionTitleSx}>Objectives</Typography>
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {content.objectives.map((objective, index) => (
                <ListItem key={`${index}-${objective}`} disableGutters sx={{ alignItems: "flex-start", py: 0.45 }}>
                  <ListItemIcon sx={{ minWidth: 32, mt: 0.1 }}>
                    <CheckCircleOutlineRoundedIcon sx={{ color: theme.palette.success.main, fontSize: 17 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={objective}
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.55 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Box component="section" id="history" sx={{ mt: 2.5, scrollMarginTop: 24 }}>
            <Typography sx={sectionTitleSx}>Brief History or Background</Typography>
            <Paper elevation={0} sx={{ mt: 1, p: { xs: 1.75, md: 2 }, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              {content.history.split(/\n{2,}/).map((paragraph, index) => (
                <Typography key={`${index}-${paragraph}`} variant="body2" color="text.secondary" sx={{ mt: index ? 1 : 0, fontSize: "0.82rem", lineHeight: 1.65 }}>
                  {paragraph}
                </Typography>
              ))}
            </Paper>
          </Box>

          <Box component="section" id="academic-offerings" sx={{ mt: 2.5, scrollMarginTop: 24 }}>
            <Typography sx={sectionTitleSx}>Academic Offerings</Typography>
            <Grid container spacing={1} sx={{ mt: 0.4 }}>
              {content.offerings.map(({ title, description }, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`${index}-${title}`}>
                  <InfoCard title={title}>{description}</InfoCard>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box component="section" id="contact-details" sx={{ mt: 2.5, scrollMarginTop: 24 }}>
            <Typography sx={sectionTitleSx}>Contact Details</Typography>
            <Grid container spacing={1} sx={{ mt: 0.4 }}>
              {content.contacts.map(({ label, value }, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`${index}-${label}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.1,
                      p: 1.4,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 0.8,
                    }}
                  >
                    {createElement(contactIcon(label), { sx: { color: accent, fontSize: 18 } })}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.68rem", fontWeight: 700 }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.78rem", fontWeight: 700, overflowWrap: "anywhere" }}>{value}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
        </Box>
      </Container>
    </Box>
  );
}

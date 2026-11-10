import { createElement, useEffect, useState } from "react";
import {
  Box,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
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
  fontSize: { xs: "1.2rem", md: "1.35rem" },
  fontWeight: 800,
  letterSpacing: "-0.02em",
};
const sectionScrollMargin = "calc(var(--buyer-header-height, 160px) + 16px)";

function InfoCard({ title, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        p: { xs: 2, md: 2.5 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontSize: "1rem", fontWeight: 800, mb: 0.8 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.95rem", lineHeight: 1.7 }}>
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
    return (
      <Box sx={{ minHeight: "70vh", backgroundColor: canvas, py: { xs: 2, md: 4 } }}>
        <Container maxWidth="lg">
          <Skeleton variant="rounded" height={150} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "250px minmax(0, 1fr)" }, gap: 2, mt: 2 }}>
            <Skeleton variant="rounded" height={360} />
            <Box>
              <Skeleton variant="rounded" height={190} />
              <Skeleton variant="rounded" height={240} sx={{ mt: 2 }} />
            </Box>
          </Box>
        </Container>
      </Box>
    );
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
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, sm: 3, lg: 5 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "flex-start",
            gap: { xs: 1.5, md: 2.5 },
            maxWidth: 1280,
            mx: "auto",
          }}
        >
          <Paper
            component="nav"
            aria-label="About page sections"
            elevation={0}
            sx={{
              display: "block",
              position: "sticky",
              top: "calc(var(--buyer-header-height, 160px) + 12px)",
              flex: { md: "0 0 240px" },
              width: { xs: "100%", md: 240 },
              minWidth: 0,
              p: { xs: 1, md: 1.5 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: { xs: "hidden", md: "visible" },
              backgroundColor: theme.palette.mode === "dark" ? "background.paper" : "#fafafa",
            }}
          >
            <Typography
              variant="overline"
              sx={{ display: { xs: "none", md: "block" }, px: 1.1, pt: 0.65, color: "text.secondary", fontSize: "0.72rem", fontWeight: 800, letterSpacing: 0.8 }}
            >
              About the academy
            </Typography>
            <List
              dense
              disablePadding
              sx={{
                mt: { xs: 0, md: 0.75 },
                display: { xs: "flex", md: "block" },
                gap: { xs: 0.75, md: 0 },
                overflowX: { xs: "auto", md: "visible" },
                scrollbarWidth: "thin",
                "&::-webkit-scrollbar": { height: 4 },
              }}
            >
              {navigationItems.map(({ label, icon, href, active }) => (
                <ListItem
                  key={label}
                  disablePadding
                  sx={{ mb: { md: 0.5 }, flex: { xs: "0 0 auto", md: "initial" } }}
                >
                  <ListItemButton
                    component="a"
                    href={href}
                    selected={active}
                    sx={{
                      minHeight: 44,
                      width: { xs: "max-content", md: "100%" },
                      px: { xs: 1.5, md: 1.25 },
                      py: 0.75,
                      borderRadius: 1.25,
                      "&.Mui-selected": {
                        color: "#fff",
                        backgroundColor: accent,
                        "&:hover": { backgroundColor: accent },
                      },
                    }}
                  >
                    {createElement(icon, { sx: { mr: 1, fontSize: 18 } })}
                    <ListItemText
                      primary={label}
                      primaryTypographyProps={{ fontSize: "0.85rem", fontWeight: active ? 700 : 500, lineHeight: 1.25, whiteSpace: "nowrap" }}
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
              scrollMarginTop: sectionScrollMargin,
              width: "100%",
              maxWidth: 960,
              mx: { xs: "auto", md: 0 },
              p: { xs: 2, sm: 3, md: 4 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: { xs: 2, md: 3 },
              backgroundColor: "background.paper",
            }}
          >
          <Box
            sx={{
              p: { xs: 2, sm: 2.5, md: 3 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              background: theme.palette.mode === "dark"
                ? "linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96))"
                : "linear-gradient(135deg, #fff4e6, #fffaf2 68%)",
            }}
          >
            <Typography
              sx={{
                mb: 0.75,
                color: accent,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              About the academy
            </Typography>
            <Typography component="h1" sx={{ fontSize: { xs: "1.7rem", sm: "2rem", md: "2.4rem" }, fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.15 }}>
              {content.collegeName}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: { xs: "0.95rem", md: "1.05rem" }, lineHeight: 1.6 }}>
              {content.tagline}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: "0.95rem", md: "1rem" }, lineHeight: 1.75 }}>
              {content.introduction}
            </Typography>
          </Box>

          <Box component="section" id="vision-mission" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: sectionScrollMargin }}>
            <Typography sx={sectionTitleSx}>Vision &amp; Mission</Typography>
            <Grid container spacing={2} sx={{ mt: 0.4 }}>
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

          <Box component="section" id="goals-objectives" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: sectionScrollMargin }}>
            <Typography sx={sectionTitleSx}>Goals</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.4 }}>
              {content.goals.map((goal, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={`${index}-${goal}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      alignItems: "flex-start",
                      p: 2,
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      backgroundColor: "background.default",
                    }}
                  >
                    <Typography sx={{ color: accent, fontWeight: 800, fontSize: "0.9rem" }}>{index + 1}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.92rem", lineHeight: 1.6 }}>{goal}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box component="section" id="objectives" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: sectionScrollMargin }}>
            <Typography sx={sectionTitleSx}>Objectives</Typography>
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {content.objectives.map((objective, index) => (
                <ListItem key={`${index}-${objective}`} disableGutters sx={{ alignItems: "flex-start", py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.1 }}>
                    <CheckCircleOutlineRoundedIcon sx={{ color: theme.palette.success.main, fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={objective}
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary", fontSize: "0.92rem", lineHeight: 1.65 }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>

          <Box component="section" id="history" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: sectionScrollMargin }}>
            <Typography sx={sectionTitleSx}>Brief History or Background</Typography>
            <Paper elevation={0} sx={{ mt: 1.25, p: { xs: 2, md: 2.5 }, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
              {content.history.split(/\n{2,}/).map((paragraph, index) => (
                <Typography key={`${index}-${paragraph}`} variant="body2" color="text.secondary" sx={{ mt: index ? 1.25 : 0, fontSize: "0.95rem", lineHeight: 1.75 }}>
                  {paragraph}
                </Typography>
              ))}
            </Paper>
          </Box>

          <Box component="section" id="academic-offerings" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: sectionScrollMargin }}>
            <Typography sx={sectionTitleSx}>Academic Offerings</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.4 }}>
              {content.offerings.map(({ title, description }, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`${index}-${title}`}>
                  <InfoCard title={title}>{description}</InfoCard>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box component="section" id="contact-details" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: sectionScrollMargin }}>
            <Typography sx={sectionTitleSx}>Contact Details</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.4 }}>
              {content.contacts.map(({ label, value }, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`${index}-${label}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.1,
                      p: 1.75,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                    }}
                  >
                    {createElement(contactIcon(label), { sx: { color: accent, fontSize: 21, flexShrink: 0 } })}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.75rem", fontWeight: 700 }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: "0.9rem", fontWeight: 700, overflowWrap: "anywhere" }}>{value}</Typography>
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

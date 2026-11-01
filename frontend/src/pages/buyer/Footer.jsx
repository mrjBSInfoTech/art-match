import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import InstagramIcon from "@mui/icons-material/Instagram";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import YouTubeIcon from "@mui/icons-material/YouTube";
import { useThemeMode } from "../../theme/ThemeModeProvider";
import { fetchFooterContent } from "../../api/footerContentAPI";
import logo from "../../assets/Nexus.png";

const defaultFooterContent = {
  brandName: "RED NEXUS",
  description:
    "An e-commerce marketplace powered by the Central Academy of Fine Arts student community. Curating true creative expressions straight from the studio.",
  columns: [
    {
      title: "Acquire Art",
      links: [
        { label: "Paintings", url: "/buyer/shop" },
        { label: "Sculptures", url: "/buyer/shop/Sculpture" },
        { label: "Photography", url: "/buyer/shop/Photography" },
      ],
    },
    {
      title: "Programs",
      links: [
        { label: "Architecture", url: "/buyer/programs/architecture" },
        { label: "Interior Design", url: "/buyer/programs/interior-design" },
        { label: "Fine Arts", url: "/buyer/programs/fine-arts" },
      ],
    },
    {
      title: "Academy",
      links: [
        { label: "About CAFA", url: "/buyer/about" },
        { label: "Exhibitions Calendar", url: "/buyer/academy/exhibitions" },
        { label: "Vocation & Inquiries", url: "/buyer/academy/inquiries" },
        { label: "Support Desk", url: "/buyer/help-support" },
      ],
    },
  ],
  copyright:
    "© {year} CAFArtMart. Powered safely by Central Academy of Fine Arts.",
  socials: [
    { platform: "Twitter", url: "" },
    { platform: "Facebook", url: "" },
    { platform: "Instagram", url: "" },
  ],
};

const socialIcons = {
  Twitter: TwitterIcon,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  LinkedIn: LinkedInIcon,
  YouTube: YouTubeIcon,
};

const Footer = () => {
  const { theme } = useThemeMode();
  const [content, setContent] = useState(defaultFooterContent);
  const footerText = "#fff7f2";

  useEffect(() => {
    let active = true;
    fetchFooterContent()
      .then((savedContent) => {
        if (active) setContent(savedContent);
      })
      .catch((error) => {
        console.error("Unable to load saved footer content:", error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        mt: 0,
        backgroundColor: theme.palette.background.footer,
        color: footerText,
      }}
    >
      <Container
        maxWidth="xl"
        sx={{ px: { xs: 3, sm: 5, lg: 7 }, py: { xs: 5, md: 7 } }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 4, sm: 5, lg: 10 }}
          sx={{ justifyContent: "space-between" }}
        >
          <Box sx={{ maxWidth: 330, flex: "1 1 30%" }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ mb: 2 }}
            >
              <Box
                component="img"
                src={logo}
                alt={content.brandName}
                sx={{ width: 23, height: 30, objectFit: "contain" }}
              />
              <Typography
                sx={{ color: footerText, fontWeight: 800, fontSize: 16 }}
              >
                {content.brandName}
              </Typography>
            </Stack>
            <Typography
              variant="body2"
              sx={{ color: footerText, lineHeight: 1.5, maxWidth: 310 }}
            >
              {content.description}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 3, sm: 7, lg: 12 }}
            sx={{ flex: "1 1 55%" }}
          >
            {content.columns.map((column, index) => (
              <Stack spacing={1.25} sx={{ minWidth: 120 }} key={`${column.title}-${index}`}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: footerText, fontWeight: 800, mb: 0.5 }}
                >
                  {column.title}
                </Typography>
                {column.links.map((link, linkIndex) => (
                  <FooterLink
                    key={`${link.label}-${linkIndex}`}
                    to={link.url}
                    color={footerText}
                  >
                    {link.label}
                  </FooterLink>
                ))}
              </Stack>
            ))}
          </Stack>
        </Stack>

        <Divider
          sx={{ my: { xs: 4, md: 5 }, borderColor: "rgba(255,247,242,0.65)" }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Typography variant="caption" sx={{ color: "white" }}>
            {content.copyright.replaceAll("{year}", String(new Date().getFullYear()))}
          </Typography>
          <Stack direction="row" spacing={1}>
            {content.socials.map((social, index) => {
              const SocialIcon = socialIcons[social.platform];
              if (!SocialIcon) return null;
              return (
                <IconButton
                  key={`${social.platform}-${index}`}
                  size="small"
                  aria-label={social.platform}
                  component={social.url ? "a" : "button"}
                  href={social.url || undefined}
                  target={social.url ? "_blank" : undefined}
                  rel={social.url ? "noopener noreferrer" : undefined}
                  sx={{ color: footerText }}
                >
                  <SocialIcon fontSize="small" />
                </IconButton>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

const FooterLink = ({ to, children, color }) => {
  const isInternal = to.startsWith("/");
  return (
    <Typography
      component={isInternal ? Link : "a"}
      to={isInternal ? to : undefined}
      href={isInternal ? undefined : to}
      target={isInternal ? undefined : "_blank"}
      rel={isInternal ? undefined : "noopener noreferrer"}
      variant="body2"
      sx={{
        color,
        textDecoration: "none",
        display: "block",
        opacity: 0.86,
        "&:hover": { opacity: 1 },
      }}
    >
      {children}
    </Typography>
  );
};

export default Footer;

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Slide,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Link as RouterLink } from "react-router-dom";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import {
  fetchPromotionHeroEnabled,
  fetchPromotionSlides,
} from "../../../api/buyer/promotionSlideAPI";

const getButtonHref = (value) => {
  if (typeof value !== "string") return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
};

export default function UpcomingEventsSlider({ heroArtwork }) {
  const theme = useTheme();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState("left");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchPromotionSlides(),
      fetchPromotionHeroEnabled().catch((error) => {
        console.error("Unable to load default promotion hero setting:", error);
        return true;
      }),
    ])
      .then(([loadedSlides, heroEnabled]) => {
        if (active) {
          setSlides(
            heroEnabled
              ? [
                  {
                    slide_id: "default-hero",
                    is_default_hero: true,
                    sort_order: 1,
                  },
                  ...loadedSlides,
                ]
              : loadedSlides,
          );
          setLoading(false);
        }
      })
      .catch((error) => {
        if (active) {
          console.error("Unable to load promotion slides:", error);
          setLoadError(error.message || "Unable to load promotion slides.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = setInterval(() => {
      setSlideDirection("left");
      setCurrentIndex((index) => (index + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (direction) => {
    if (slides.length < 2) return;
    setSlideDirection(direction === "next" ? "left" : "right");
    setCurrentIndex((index) =>
      direction === "next"
        ? (index + 1) % slides.length
        : (index === 0 ? slides.length : index) - 1,
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: { xs: 400, sm: 500, md: 560 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          color: "#fff",
          textAlign: "center",
          background: "linear-gradient(135deg, #1f2937, #111827)",
        }}
      >
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  if (!slides.length) {
    if (!loadError) return null;
    return (
      <Box
        sx={{
          width: "100%",
          height: { xs: 400, sm: 500, md: 560 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          color: "#fff",
          textAlign: "center",
          background: "linear-gradient(135deg, #1f2937, #111827)",
        }}
      >
        <Typography>{loadError}</Typography>
      </Box>
    );
  }

  const currentSlide = slides[currentIndex];
  const buttonHref = getButtonHref(currentSlide.button_url);
  const isDefaultHero = currentSlide.is_default_hero;

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 400, sm: 500, md: 560 },
        overflow: "hidden",
        backgroundColor: isDefaultHero
          ? theme.palette.mode === "light"
            ? "#fff9ef"
            : theme.palette.background.paper
          : "#111827",
        ...(isDefaultHero
          ? {}
          : {
              backgroundImage: currentSlide.image_url
                ? `url("${currentSlide.image_url}")`
                : "linear-gradient(135deg, #334155, #111827)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              transition: "background-image 0.5s ease-in-out",
            }),
      }}
    >
      {!isDefaultHero && (
        <>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0.7) 50%, rgba(11,15,25,0.2) 100%)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(0deg, rgba(11,15,25,0.9) 0%, transparent 50%)",
            }}
          />
        </>
      )}
      <Slide
        direction={slideDirection}
        in
        timeout={400}
        key={currentSlide.slide_id}
      >
        {isDefaultHero ? (
          <Container
            maxWidth="lg"
            sx={{
              height: "100%",
              width: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              px: { xs: 3, sm: 5 },
              py: { xs: 4, md: 6 },
            }}
          >
            <Grid
              container
              spacing={{ xs: 4, md: 7 }}
              sx={{
                width: "100%",
                flex: "1 1 100%",
                alignItems: "center",
                mx: 0,
              }}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: 34, sm: 44, md: 52 },
                    lineHeight: 1.02,
                    letterSpacing: "-0.03em",
                    fontWeight: 800,
                    maxWidth: 590,
                    color: theme.palette.text.primary,
                  }}
                >
                  Discover Original Art by Emerging CAFA Artists
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mt: 3, maxWidth: 500, lineHeight: 1.65 }}
                >
                  Acquire hand-crafted paintings, fine art printworks, digital
                  assets and miniature architectural mockups straight from the
                  studios of Beijing&apos;s premier Fine Arts academy.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ mt: 4 }}
                >
                  <Button
                    size="large"
                    variant="contained"
                    component={RouterLink}
                    to="/buyer/shop"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderRadius: 99999,
                      color: "#fff",
                      backgroundColor: theme.palette.error.main,
                      px: 2.5,
                      "&:hover": { backgroundColor: theme.palette.error.dark },
                    }}
                  >
                    Shop Now
                  </Button>
                  <Button
                    size="large"
                    variant="outlined"
                    component={RouterLink}
                    to="/buyer/gallery"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderRadius: 99999,
                      color: "text.primary",
                      borderColor: "text.primary",
                      px: 2.5,
                    }}
                  >
                    Explore Gallery
                  </Button>
                </Stack>
              </Grid>
              <Grid
                size={{ xs: 12, md: 5 }}
                sx={{
                  display: { xs: "none", md: "block" },
                  ml: { md: "auto" },
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    aspectRatio: "4 / 5",
                    backgroundColor: "#e0e0e0",
                  }}
                >
                  <WatermarkedArtworkImage
                    image={heroArtwork?.image}
                    alt={heroArtwork?.title || "Featured artwork"}
                    variant="web"
                    hideWhenBlurred
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Container>
        ) : (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              p: { xs: 3, sm: 6 },
              maxWidth: 760,
              width: "100%",
            }}
          >
            <Typography
              variant="h2"
              sx={{
                color: "#fff",
                fontWeight: 900,
                fontSize: { xs: "2rem", sm: "3rem", md: "3.5rem" },
                lineHeight: 1.1,
                textTransform: "uppercase",
                mb: 1.5,
                letterSpacing: "-0.02em",
              }}
            >
              {currentSlide.title}
            </Typography>
            {currentSlide.description && (
              <Typography
                variant="body1"
                sx={{
                  color: "grey.300",
                  fontSize: { xs: 14, sm: 16 },
                  mb: 3,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {currentSlide.description}
              </Typography>
            )}
            {currentSlide.button_label && buttonHref && (
              <Button
                component="a"
                href={buttonHref}
                color="error"
                variant="contained"
                sx={{
                  alignSelf: "flex-start",
                  width: { xs: "100%", sm: "auto" },
                  minWidth: { sm: 140 },
                  py: 1,
                  px: 2.5,
                  fontWeight: 700,
                  textTransform: "none",
                  borderRadius: 1.5,
                }}
              >
                {currentSlide.button_label}
              </Button>
            )}
          </Box>
        )}
      </Slide>

      {slides.length > 1 && (
        <>
          <IconButton
            aria-label="Previous promotion"
            onClick={() => goToSlide("previous")}
            sx={{
              position: "absolute",
              zIndex: 3,
              left: { xs: 1, sm: 2 },
              top: "50%",
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.35)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            aria-label="Next promotion"
            onClick={() => goToSlide("next")}
            sx={{
              position: "absolute",
              zIndex: 3,
              right: { xs: 1, sm: 2 },
              top: "50%",
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.35)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              position: "absolute",
              zIndex: 3,
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            {slides.map((slide, index) => (
              <Box
                key={slide.slide_id}
                component="button"
                type="button"
                aria-label={`Show promotion ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                onClick={() => {
                  setSlideDirection(index > currentIndex ? "left" : "right");
                  setCurrentIndex(index);
                }}
                sx={{
                  width: index === currentIndex ? 24 : 8,
                  height: 8,
                  p: 0,
                  border: 0,
                  borderRadius: 99,
                  cursor: "pointer",
                  bgcolor: index === currentIndex ? "#fff" : "rgba(255,255,255,.55)",
                  transition: "width 180ms ease",
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

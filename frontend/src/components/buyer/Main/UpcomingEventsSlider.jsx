import React, { useState, useEffect } from "react";
import { Box, Typography, Button, IconButton, Stack, Slide } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const events = [
  {
    id: 1,
    title: "ARTMATCH ANNUAL EXHIBITION",
    description: "Discover exclusive physical and digital artworks from top student artists.",
    date: "2026",
    category: "EXHIBITION",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 2,
    title: "DIGITAL SCULPTURE WORKSHOP",
    description: "Learn advanced 3D object modeling and texturing techniques live.",
    date: "2026",
    category: "EVENT",
    image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 3,
    title: "MODERN CANVAS MASTERCLASS",
    description: "Master acrylic mixing, layering, and texture techniques from professional mentors.",
    date: "2026",
    category: "WORKSHOP",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 4,
    title: "STUDENT ARTIST SPOTLIGHT SHOWCASE",
    description: "Highlighting breakthrough creators and rising talents in our university network.",
    date: "2026",
    category: "FEATURE",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 5,
    title: "ABSTRACT REALITY GALLERY NIGHT",
    description: "An immersive evening exploring surrealism, expressionism, and contemporary digital paintings.",
    date: "2026",
    category: "EXHIBITION",
    image: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 6,
    title: "PORTRAIT PHOTOGRAPHY CLINIC",
    description: "Understand lighting framing, color grading, and composition for striking portraiture.",
    date: "2026",
    category: "WORKSHOP",
    image: "https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 7,
    title: "CERAMICS & 3D PRINTING FUSION",
    description: "Bridging traditional pottery craftsmanship with modern additive manufacturing technology.",
    date: "2026",
    category: "EVENT",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 8,
    title: "THE FUTURE OF DIGITAL ART MINTS",
    description: "Panel discussion on copyright, portfolio curation, and digital asset marketplaces.",
    date: "2026",
    category: "SEMINAR",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 9,
    title: "WATERCOLOR & INK LANDSCAPES",
    description: "Explore fluid dynamics and atmospheric blending in outdoor nature sketching.",
    date: "2026",
    category: "WORKSHOP",
    image: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 10,
    title: "CAMPUS ART MARKET FESTIVAL",
    description: "Support local student creators directly and acquire physical prints, keychains, and stickers.",
    date: "2026",
    category: "MARKET",
    image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 11,
    title: "MONOCHROME INK & CHARCOAL SESSION",
    description: "Deep dive into shadow mapping, contrast scaling, and high-detail sketch rendering.",
    date: "2026",
    category: "WORKSHOP",
    image: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 12,
    title: "ENVIRONMENT CONCEPT DESIGN LEAGUE",
    description: "A fast-paced digital painting challenge for concept artists and world-builders.",
    date: "2026",
    category: "COMPETITION",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 13,
    title: "MIXED MEDIA EXPERIMENTAL LAB",
    description: "Combine textiles, acrylics, and recycled elements into multi-layered wall art.",
    date: "2026",
    category: "EVENT",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 14,
    title: "ARCHITECTURAL BLUEPRINT RENDERING",
    description: "Precision ink detailing and perspective alignment for structural drafters.",
    date: "2026",
    category: "MASTERCLASS",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: 15,
    title: "GRADUATING ARTISTS CAPSTONE GALA",
    description: "Celebrating the final thesis collections and crowning the year's top student masterpieces.",
    date: "2026",
    category: "GALA",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=80",
  },
];

export default function UpcomingEventsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState("left");
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-slide effect every 6 seconds (slides left naturally)
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideDirection("left");
      setIsAnimating(false);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % events.length);
      setIsAnimating(true);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setSlideDirection("right"); // slide in from right when going back
    setIsAnimating(false);
    setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
    setIsAnimating(true);
  };

  const handleNext = () => {
    setSlideDirection("left"); // slide in from left when going next
    setIsAnimating(false);
    setCurrentIndex((prev) => (prev + 1) % events.length);
    setIsAnimating(true);
  };

  const currentEvent = events[currentIndex];

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 400, sm: 500, md: 560 },
        overflow: "hidden",
        backgroundImage: `url(${currentEvent.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.5s ease-in-out",
      }}
    >
      {/* Cinematic Gradient Overlays */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(90deg, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0.7) 50%, rgba(11,15,25,0.2) 100%)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(0deg, rgba(11,15,25,0.9) 0%, transparent 50%)",
        }}
      />

      {/* Animated Content Wrapper using MUI Slide */}
      <Slide direction={slideDirection} in={true} timeout={400} key={currentIndex}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            p: { xs: 3, sm: 6 },
            maxWidth: 700,
          }}
        >
          {/* Badges / Metadata */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700, letterSpacing: 1 }}>
              {currentEvent.category}
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.400", fontWeight: 700 }}>
              {currentEvent.date}
            </Typography>
          </Stack>

          {/* Title */}
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
            {currentEvent.title}
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: "grey.300",
              fontSize: { xs: 14, sm: 16 },
              mb: 3,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {currentEvent.description}
          </Typography>
        </Box>
      </Slide>

      {/* Navigation Arrows (Top Right) */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 3,
          display: { xs: "none", sm: "flex" },
        }}
      >
        <IconButton
          onClick={handlePrev}
          sx={{
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          onClick={handleNext}
          sx={{
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {/* Pagination Dash/Dots (Bottom Right) */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: "absolute",
          bottom: 24,
          right: 32,
          zIndex: 3,
          alignItems: "center",
        }}
      >
        {events.map((_, index) => (
          <Box
            key={index}
            onClick={() => {
              setSlideDirection(index > currentIndex ? "left" : "right");
              setCurrentIndex(index);
            }}
            sx={{
              width: currentIndex === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: currentIndex === index ? "error.main" : "rgba(255,255,255,0.4)",
              cursor: "pointer",
              transition: "all 0.3s ease-in-out",
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
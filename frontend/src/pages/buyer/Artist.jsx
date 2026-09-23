import { useNavigate } from "react-router-dom";
import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";

const popularArtists = [
  {
    rank: 1,
    name: "Sheng Yang",
    department: "Sculpture Dept.",
    sales: 34,
    rating: "5.0",
    image: "https://i.pravatar.cc/100?img=47",
    bio: "Awarded the Academy Grand Prix for her series 'Reborn Petals'. Her work explores the friction between traditional oil application techniques and pixelated generative representations.",
    works: "18 works",
  },
  {
    rank: 2,
    name: "He Ruo",
    department: "Oil Painting",
    sales: 28,
    rating: "4.9",
    image: "https://i.pravatar.cc/100?img=12",
    bio: "Known for layered atmospheric landscapes that combine ink wash gestures with contemporary abstraction.",
    works: "14 works",
  },
  {
    rank: 3,
    name: "Lin Jinshu",
    department: "Digital Art Dept.",
    sales: 27,
    rating: "4.8",
    image: "https://i.pravatar.cc/100?img=32",
    bio: "Blends storytelling, motion, and digital collage into immersive visual experiences for collectors.",
    works: "22 works",
  },
  {
    rank: 4,
    name: "Wang Xinyi",
    department: "Architecture Dept.",
    sales: 24,
    rating: "5.0",
    image: "https://i.pravatar.cc/100?img=44",
    bio: "Creates spatial studies and meticulous architectural sketches inspired by old Beijing courtyards.",
    works: "11 works",
  },
  {
    rank: 5,
    name: "Guo Dan",
    department: "Ink Wash",
    sales: 21,
    rating: "4.7",
    image: "https://i.pravatar.cc/100?img=49",
    bio: "Uses ink, texture, and hand-built forms to translate emotion into minimalist compositions.",
    works: "17 works",
  },
  {
    rank: 6,
    name: "Zhang Wei",
    department: "Sculpture Dept.",
    sales: 19,
    rating: "4.9",
    image: "https://i.pravatar.cc/100?img=11",
    bio: "Fuses classical sculpture language with softened industrial materials and tactile surfaces.",
    works: "13 works",
  },
  {
    rank: 7,
    name: "Elena Chen",
    department: "Digital Art",
    sales: 18,
    rating: "4.8",
    image: "https://i.pravatar.cc/100?img=25",
    bio: "Explores digital narratives through surreal textures, glowing color fields, and playful compositions.",
    works: "16 works",
  },
  {
    rank: 8,
    name: "Li Ran",
    department: "Photography Dept.",
    sales: 15,
    rating: "4.7",
    image: "https://i.pravatar.cc/100?img=5",
    bio: "Captures quiet textures and urban stillness, balancing documentary realism with poetic composition.",
    works: "9 works",
  },
];

export default function Artist() {
  const navigate = useNavigate();
  const theme = useTheme();
  const featuredArtist = popularArtists[0];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="overline"
          sx={{
            color: theme.palette.error.main,
            fontWeight: 800,
            letterSpacing: 1.5,
          }}
        >
          Popular artists
        </Typography>
        <Typography
          variant="h3"
          sx={{ mt: 1, fontWeight: 800, letterSpacing: "-0.04em" }}
        >
          Top Listed Artists This Month
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 0.92fr) 1.56fr" },
          gap: { xs: 3, md: 5 },
          alignItems: "center",
          p: { xs: 2, sm: 3 },
          mb: 4,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          backgroundColor:
            theme.palette.mode === "light" ? "#fff1d7" : theme.palette.background.paper,
        }}
      >
        <Box
          sx={{
            height: { xs: 220, md: 260 },
            borderRadius: 2,
            backgroundImage: `url(${featuredArtist.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[2],
          }}
        />

        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "inline-block",
              px: 1,
              py: 0.35,
              borderRadius: 999,
              color: "#fff",
              backgroundColor: theme.palette.error.main,
              fontWeight: 800,
            }}
          >
            STUDIO CHOICE
          </Typography>

          <Typography variant="h4" sx={{ mt: 1, fontWeight: 800 }}>
            {featuredArtist.name}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {featuredArtist.department}, Class of 2026
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 620 }}>
            {featuredArtist.bio}
          </Typography>

          <Stack direction="row" spacing={{ xs: 2, sm: 5 }} sx={{ mt: 2.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ARTWORKS
              </Typography>
              <Typography fontWeight={800}>{featuredArtist.works}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                SALES
              </Typography>
              <Typography fontWeight={800}>{featuredArtist.sales} items sold</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                RATING
              </Typography>
              <Typography fontWeight={800}>
                <Box component="span" sx={{ color: "#eab308" }}>
                  ★
                </Box>{" "}
                {featuredArtist.rating}
              </Typography>
            </Box>
          </Stack>

          <Button
            onClick={() => navigate("/buyer/artwork")}
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            sx={{
              mt: 2,
              borderRadius: 999,
              backgroundColor: theme.palette.text.primary,
              color: theme.palette.background.paper,
            }}
          >
            View {featuredArtist.name}'s Gallery
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {popularArtists.slice(1).map((artist) => (
          <Grid item xs={12} md={4} key={artist.rank}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                minWidth: 0,
                px: 2,
                py: 1.25,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
                height: "100%",
              }}
            >
              <Box
                component="img"
                src={artist.image}
                alt={artist.name}
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${theme.palette.background.default}`,
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 800 }}>
                  <Box component="span" sx={{ color: theme.palette.error.main, mr: 0.75 }}>
                    #{artist.rank}
                  </Box>
                  {artist.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {artist.department}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {artist.sales} sold&nbsp;&nbsp;{" "}
                  <Box component="span" sx={{ color: "#eab308" }}>
                    ★
                  </Box>{" "}
                  {artist.rating}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate("/buyer/artwork")}
                sx={{
                  flexShrink: 0,
                  minWidth: 70,
                  borderRadius: 999,
                  borderColor: theme.palette.text.primary,
                  color: theme.palette.text.primary,
                  fontSize: 11,
                }}
              >
                Follow
              </Button>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

import React from "react";
import {
  Box,
  CardActionArea,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { useThemeMode } from "../../../theme/ThemeModeProvider";

export default function ThemeModeSetting() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { mode, setMode } = useThemeMode();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 3,
        bgcolor: isDark ? "rgba(30, 41, 59, 0.4)" : "#ffffff",
        border: "1px solid",
        borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)",
        boxShadow: isDark
          ? "0 4px 20px rgba(0, 0, 0, 0.25)"
          : "0 4px 20px rgba(15, 23, 42, 0.04)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(239, 51, 64, 0.1)",
              color: "#ef3340",
              flexShrink: 0,
            }}
          >
            <PaletteOutlinedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              Appearance & Theme
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Customize your workspace viewing experience on this device
            </Typography>
          </Box>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <CardActionArea
            onClick={() => setMode("light")}
            sx={{
              borderRadius: 2.5,
              p: 2,
              border: "2px solid",
              borderColor:
                mode === "light"
                  ? "#ef3340"
                  : isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(15, 23, 42, 0.08)",
              bgcolor:
                mode === "light"
                  ? isDark
                    ? "rgba(239, 51, 64, 0.08)"
                    : "rgba(239, 51, 64, 0.03)"
                  : isDark
                    ? "rgba(255, 255, 255, 0.02)"
                    : "rgba(15, 23, 42, 0.01)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(245, 158, 11, 0.12)",
                    color: "#f59e0b",
                  }}
                >
                  <LightModeRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>
                    Light Theme
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Crisp, high-contrast daytime palette
                  </Typography>
                </Box>
              </Stack>
              {mode === "light" && (
                <CheckCircleRoundedIcon sx={{ color: "#ef3340", fontSize: 22 }} />
              )}
            </Stack>
          </CardActionArea>
        </Box>

        <Box sx={{ flex: 1 }}>
          <CardActionArea
            onClick={() => setMode("dark")}
            sx={{
              borderRadius: 2.5,
              p: 2,
              border: "2px solid",
              borderColor:
                mode === "dark"
                  ? "#ef3340"
                  : isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(15, 23, 42, 0.08)",
              bgcolor:
                mode === "dark"
                  ? isDark
                    ? "rgba(239, 51, 64, 0.08)"
                    : "rgba(239, 51, 64, 0.03)"
                  : isDark
                    ? "rgba(255, 255, 255, 0.02)"
                    : "rgba(15, 23, 42, 0.01)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "rgba(99, 102, 241, 0.12)",
                    color: "#6366f1",
                  }}
                >
                  <DarkModeRoundedIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>
                    Dark Theme
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Dim, studio-friendly nighttime palette
                  </Typography>
                </Box>
              </Stack>
              {mode === "dark" && (
                <CheckCircleRoundedIcon sx={{ color: "#ef3340", fontSize: 22 }} />
              )}
            </Stack>
          </CardActionArea>
        </Box>
      </Stack>
    </Paper>
  );
}

import {
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import { useThemeMode } from "../../theme/ThemeModeProvider";

export default function ThemeModeSetting() {
  const { mode, setMode } = useThemeMode();

  const handleChange = (event) => {
    setMode(event.target.checked ? "dark" : "light");
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <DarkModeRoundedIcon color="action" />
        <Stack sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Appearance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a dark color theme. Your preference is saved on this device.
          </Typography>
        </Stack>
        <FormControlLabel
          label="Dark mode"
          control={
            <Switch
              checked={mode === "dark"}
              onChange={handleChange}
              inputProps={{ "aria-label": "Enable dark mode" }}
            />
          }
        />
      </Stack>
    </Paper>
  );
}

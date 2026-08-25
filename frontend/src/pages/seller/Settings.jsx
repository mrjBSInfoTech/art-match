import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Snackbar,
  Slide,
} from "@mui/material";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const defaultSettings = {
  shopName: "Nexus Studio",
  shopStatus: true,
  autoAcceptOrders: true,
  orderAlertEmail: true,
  orderAlertSms: false,
  payoutMethod: "GCash",
  shippingDefault: "Standard",
  pickupEnabled: true,
  password: "",
};

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    const savedSettings = localStorage.getItem("seller_settings");
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch {
        setSettings(defaultSettings);
      }
    } else {
      const storedName = localStorage.getItem("seller_shop_name");
      const parsedName = storedName || defaultSettings.shopName;
      setSettings((current) => ({ ...current, shopName: parsedName }));
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem("seller_settings", JSON.stringify(settings));
    localStorage.setItem("seller_shop_name", settings.shopName);
    showSnackbar("Seller settings saved successfully.");
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem("seller_settings");
    localStorage.setItem("seller_shop_name", defaultSettings.shopName);
    showSnackbar("Settings reset to default values.", "info");
  };

  const handleToggle = (field) => {
    setSettings((current) => ({ ...current, [field]: !current[field] }));
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Settings</title>
      </Helmet>

      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Seller Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your shop preferences, notifications, and fulfillment options.
          </Typography>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Shop profile
              </Typography>
              <TextField
                fullWidth
                label="Shop name"
                value={settings.shopName}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    shopName: e.target.value,
                  }))
                }
                sx={{ maxWidth: 420 }}
              />
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Business availability
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.shopStatus}
                      onChange={() => handleToggle("shopStatus")}
                    />
                  }
                  label="Open shop for new orders"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoAcceptOrders}
                      onChange={() => handleToggle("autoAcceptOrders")}
                    />
                  }
                  label="Automatically accept incoming orders"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pickupEnabled}
                      onChange={() => handleToggle("pickupEnabled")}
                    />
                  }
                  label="Enable pickup / meet-up option"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Fulfillment settings
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <FormControl sx={{ minWidth: 220 }}>
                  <InputLabel>Default payout method</InputLabel>
                  <Select
                    label="Default payout method"
                    value={settings.payoutMethod}
                    onChange={(e) =>
                      setSettings((current) => ({
                        ...current,
                        payoutMethod: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="GCash">GCash</MenuItem>
                    <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                    <MenuItem value="PayMaya">PayMaya</MenuItem>
                    <MenuItem value="Cash on Pickup">Cash on Pickup</MenuItem>
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 220 }}>
                  <InputLabel>Default shipping</InputLabel>
                  <Select
                    label="Default shipping"
                    value={settings.shippingDefault}
                    onChange={(e) =>
                      setSettings((current) => ({
                        ...current,
                        shippingDefault: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="Standard">Standard</MenuItem>
                    <MenuItem value="Express">Express</MenuItem>
                    <MenuItem value="Pickup">Pickup</MenuItem>
                    <MenuItem value="Same Day">Same Day</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Alerts & notifications
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.orderAlertEmail}
                      onChange={() => handleToggle("orderAlertEmail")}
                    />
                  }
                  label="Send order alerts via email"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.orderAlertSms}
                      onChange={() => handleToggle("orderAlertSms")}
                    />
                  }
                  label="Send order alerts via SMS"
                />
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Security
              </Typography>

              <TextField
                fullWidth
                type="password"
                label="New password"
                value={settings.password}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    password: e.target.value,
                  }))
                }
                placeholder="Enter new password"
                sx={{ maxWidth: 420 }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                sx={{ borderRadius: 999, px: 3, textTransform: "none" }}
                onClick={saveSettings}
              >
                Save changes
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                sx={{ borderRadius: 999, px: 3, textTransform: "none" }}
                onClick={resetSettings}
              >
                Reset
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar
        open={snackbarOpen}
        severity={snackbarSeverity}
        variant="filled"
        autoHideDuration={2500}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          sx={{
            width: "100%",
            color: "#fff",
            backgroundColor:
              snackbarSeverity === "error"
                ? "error.light"
                : snackbarSeverity === "info"
                  ? "info.light"
                  : "success.light",
            "& .MuiAlert-icon": {
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

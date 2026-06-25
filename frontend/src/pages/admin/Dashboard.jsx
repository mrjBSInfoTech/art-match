import React, { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  Select,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Slide,
  Backdrop,
} from "@mui/material";
// Icons
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { fetchResidents } from "../api/residentAPI";
import { fetchHouseholds } from "../api/householdAPI";
import { fetchOfficials } from "../api/officialAPI";
import { fetchConcerns } from "../api/concernAPI";

const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

export default function Dashboard() {
  const [residents, setResidents] = useState([]);
  const [households, setHouseholds] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const [openPasswordWarning, setOpenPasswordWarning] = useState(false);
  const passwordChanged = localStorage.getItem("password_changed");

  useEffect(() => {
    if (passwordChanged === 0) {
      setOpenPasswordWarning(true);
    }
  }, [passwordChanged]);

  // Load residents count
  const loadResidents = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetchResidents();
      if (response) {
        setResidents(Array.isArray(response) ? response : []);
      } else {
        setResidents([]);
        setErrorMessage("0");
      }
    } catch (err) {
      console.error("0", err);
      setResidents([]);
      setErrorMessage("0");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
  }, []);

  // Load households count
  const loadHouseholds = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetchHouseholds();
      if (response) {
        setHouseholds(Array.isArray(response) ? response : []);
      } else {
        setHouseholds([]);
        setErrorMessage("0");
      }
    } catch (err) {
      console.error("0", err);
      setHouseholds([]);
      setErrorMessage("0");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHouseholds();
  }, []);

  // Load user accounts count
  const loadUserAccounts = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetchOfficials();

      if (response) {
        setUserAccounts(Array.isArray(response) ? response : []);
      } else {
        setUserAccounts([]);
        setErrorMessage("0");
      }
    } catch (err) {
      console.error("0", err);
      setUserAccounts([]);
      setErrorMessage("0");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserAccounts();
  }, []);

  // Load concerns count
  const loadConcerns = async () => {
    try {
      setLoading(true);
      const response = await fetchConcerns();

      if (response) {
        setConcerns(Array.isArray(response) ? response : []);
      } else {
        setConcerns([]);
        setErrorMessage("0");
      }
    } catch (err) {
      console.error("0", err);
      setConcerns([]);
      setErrorMessage("0");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConcerns();
  }, []);

  const totalResidents = residents.length;
  const totalHouseholds = households.length;
  const totalUserAccounts = userAccounts.length;

  const maleCount = residents.filter(
    (resident) => resident.gender === "Male",
  ).length;
  const femaleCount = residents.filter(
    (resident) => resident.gender === "Female",
  ).length;
  const lowCount = concerns.filter(
    (concern) =>
      concern.message_urgency === "Low" &&
      (concern.status || "").toLowerCase() === "solved",
  ).length;
  const mediumCount = concerns.filter(
    (concern) =>
      concern.message_urgency === "Medium" &&
      (concern.status || "").toLowerCase() === "solved",
  ).length;
  const highCount = concerns.filter(
    (concern) =>
      concern.message_urgency === "High" &&
      (concern.status || "").toLowerCase() === "solved",
  ).length;

  return (
    <Box sx={{ p: 3 }}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Dashboard</title>
      </Helmet>
      <Box>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Dashboard
        </Typography>
      </Box>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 500,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#C1FFA9",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#2C8508" }}
            >
              Residents
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <PersonIcon color="success" sx={{ fontSize: 30 }} />
              <Typography
                sx={{ fontWeight: "bold", color: "#2C8508", fontSize: 30 }}
              >
                {totalResidents}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 500,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#FDCB80",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#9B5F03" }}
            >
              Households
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <HomeIcon color="warning" sx={{ fontSize: 30 }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#9B5F03" }}
              >
                {totalHouseholds}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 350px",
            maxWidth: 500,
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#FC9495",
          }}
        >
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              sx={{ fontWeight: "bold", color: "#880506" }}
            >
              User Accounts
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <AccountCircleIcon color="error" sx={{ fontSize: 30 }} />
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "#880506" }}
              >
                {totalUserAccounts}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexDirection: { xs: "column", md: "row" }, // Column on mobile, row on desktop
          mt: 3,
        }}
      >
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2, md: 3 },
            mt: 3,
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
          }}
          variant="outlined"
        >
          <Typography
            textAlign="center"
            variant="h5"
            sx={{ fontWeight: "bold", mb: 2 }}
          >
            Population 
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: { xs: 250, sm: 300, md: 400 },
              width: "100%",
            }}
          >
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Male", value: maleCount },
                    { name: "Female", value: femaleCount },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  //label={({ name, value }) => `${name}: ${value}`} // For future use
                  outerRadius={{ xs: 50, sm: 60, md: 80 }}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#0088FE" />
                  <Cell fill="#f76cbb" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        <Paper
          sx={{
            p: 3,
            mt: 3,
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
          }}
          variant="outlined"
        >
          <Typography
            textAlign="center"
            variant="h5"
            sx={{ fontWeight: "bold", mb: 2 }}
          >
            Concerns
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: { xs: 250, sm: 300, md: 400 },
              width: "100%",
            }}
          >
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Low", value: lowCount },
                    { name: "Medium", value: mediumCount },
                    { name: "High", value: highCount },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={{ xs: 50, sm: 60, md: 80 }}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#0088FE" />
                  <Cell fill="#00C49F" />
                  <Cell fill="#FFBB28" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>
      {passwordChanged && (
        <Dialog
          open={openPasswordWarning}
          TransitionComponent={Transition}
          keepMounted
          disableEscapeKeyDown // Disables closing with the Escape key
          onClose={(event, reason) => {
            // Prevents closing the dialog if the user clicks outside of it
            if (reason === "backdropClick") return;
          }}
        >
          <DialogTitle sx={{ color: "error.main", fontWeight: "bold" }}>
            Security Action Required
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Hi there, you are currently using a temporary, system-generated
              initial password. For security reasons, you must change your
              password immediately before continuing to access system management
              features.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                setOpenPasswordWarning(false);
                setTimeout(() => {
                  navigate("/settings");
                }, 300);
              }}
            >
              Change Password Now
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

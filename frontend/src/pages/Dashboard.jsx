import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
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
} from "@mui/material";
// Icons
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

export default function Dashboard() {
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
                TBA
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
                TBA
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
                TBA
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
            p: 3,
            mt: 3,
            width: "50%",
            borderRadius: 2,
            width: { xs: "100%", md: "50%" },
          }}
          variant="outlined"
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 400, 
              width: "100%",
            }}
          >
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 400, 
              width: "100%",
            }}
          >
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

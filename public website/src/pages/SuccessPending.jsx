import React from "react";
import { useNavigate } from "react-router-dom"; // Added this
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function SuccessPending() {
  const navigate = useNavigate(); // Define navigate here

  return (
    <Box>
      <Helmet titleTemplate="%s - Barangay 415 Zone 42">
        <title>Success Pending</title>
      </Helmet>
      
      <Box
        sx={{ 
          backgroundColor: "#466ABE",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 3 // Added padding for mobile responsiveness
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 400 }}>
          <CheckCircleIcon sx={{ fontSize: 200, color: "#48ff10" }} />
          
          <Typography variant="h4" sx={{ color: "white", mt: 2, fontWeight: "bold", textAlign: "center" }}>
            Registration Successful!
          </Typography>

          <Typography variant="body1" sx={{ color: "white", mt: 1, textAlign: "center" }}>
            Please wait for the barangay officials to review and approve your account. 
            You will receive a notification once your account has been approved.
          </Typography>

          <Button 
            variant="contained" 
            onClick={() => navigate("/login")} // Fixed the syntax here
            sx={{ 
              mt: 4, 
              backgroundColor: "#48ff10", 
              color: "white",
              '&:hover': { backgroundColor: "#3cc413" },
              fontWeight: "bold"
            }}
          >
            Go to Login
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
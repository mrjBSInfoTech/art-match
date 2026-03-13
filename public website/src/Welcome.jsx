import React, { useState } from "react";
import { Button, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Welcome() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleEnter = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate("/main");
    }, 500);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)",
        fontSize: "24px",
        color: "white",
        animation: "fadeIn 0.8s ease-in",
        "@keyframes fadeIn": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      }}
    >
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .welcome-title {
          animation: slideUp 0.8s ease-out 0.2s both;
          font-size: 3rem;
          font-weight: bold;
          margin: 0;
        }
        .welcome-subtitle {
          animation: slideUp 0.8s ease-out 0.4s both;
          font-size: 1.2rem;
          margin: 1rem 0;
        }
        .welcome-button {
          animation: slideUp 0.8s ease-out 0.6s both;
        }
      `}</style>
      <h1 className="welcome-title">Welcome to Barangay 415</h1>
      <p className="welcome-subtitle">Click the button below to continue</p>
      <Box className="welcome-button">
        <Button
          variant="contained"
          color="secondary"
          onClick={handleEnter}
          disabled={isLoading}
          sx={{
            mt: 2,
            px: 4,
            py: 1.5,
            fontSize: "1rem",
            fontWeight: "bold",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
            },
            "&:disabled": {
              opacity: 0.7,
            },
          }}
        >
          {isLoading ? "Loading..." : "Enter Dashboard"}
        </Button>
      </Box>
    </Box>
  );
}

export default Welcome;

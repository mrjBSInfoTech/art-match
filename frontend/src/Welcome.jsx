import React from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Welcome() {
  const navigate = useNavigate();

  const handleEnter = () => {
    navigate("/dashboard"); // redirect to your Dashboard page
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(to right, #1565c0, #42a5f5)",
      fontSize: "24px",
      color: "white"
    }}>
      <h1>Welcome to My Dashboard</h1>
      <p>Click the button below to continue</p>
      <Button 
        variant="contained" 
        color="secondary"
        onClick={handleEnter}
      
        sx={{ mt: 2, px: 4 }}
      >
        Enter Dashboard
      </Button>
    </div>
  );
}

export default Welcome;

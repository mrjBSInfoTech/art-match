import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Resident from "./pages/Resident";
import Household from "./pages/Household";
import Files from "./pages/Files";
import Announcements from "./pages/Announcements";
import Messages from "./pages/Messages";
import Officials from "./pages/Officials";
import Citizens from "./pages/Citizens";
import History from "./pages/History";
import Login from "./pages/Login";
import Register from "./pages/Register";
import theme from './theme/fontTheme';
import Welcome from "./Welcome";

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline resets browser default styles for consistency */}
      <CssBaseline />
      <Router>
        <Routes>
          {/* First Page */}
          <Route path="/" element={<Welcome />} />
          <Route path="/register" element={<Register />} />
          {/* Dashboard Pages */}
          <Route
            path="/dashboard"
            element={
              <Sidebar>
                <Dashboard />
              </Sidebar>
            }
          />
          <Route
            path="records/resident"
            element={
              <Sidebar>
                <Resident />
              </Sidebar>
            }
          />
          <Route
            path="records/household"
            element={
              <Sidebar>
                <Household />
              </Sidebar>
            }
          />
          <Route
            path="records/files"
            element={
              <Sidebar>
                <Files />
              </Sidebar>
            }
          />
          <Route
            path="/announcements"
            element={
              <Sidebar>
                <Announcements />
              </Sidebar>
            }
          />
          <Route
            path="/messages"
            element={
              <Sidebar>
                <Messages />
              </Sidebar>
            }
          />
          <Route
            path="/officials"
            element={
              <Sidebar>
                <Officials />
              </Sidebar>
            }
          />
          <Route
            path="/citizens"
            element={
              <Sidebar>
                <Citizens />
              </Sidebar>
            }
          />
          <Route
            path="/history"
            element={
              <Sidebar>
                <History />
              </Sidebar>
            }
          />
        </Routes>
      </Router>
      
    </ThemeProvider>
  );
}

export default App;

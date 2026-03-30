import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Headers from "./components/Headers";
import Footer from "./components/Footer";
import About from "./pages/About";
import Announcements from "./pages/Announcements";
import Concerns from "./pages/Concerns";
import Main from "./pages/Main";
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
          
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />{/* First Page */}
          {/* Main Pages */}
          <Route
            path="/main"
            element={
              <Headers>
                <Main />
              </Headers>
            }
          />
          <Route
            path="/concerns"
            element={
              <Headers>
                <Concerns />
              </Headers>
            }
          />
          <Route
            path="/announcements"
            element={
              <Headers>
                <Announcements />
              </Headers>
            }
          />
          <Route
            path="/about"
            element={
              <Headers>
                <About />
              </Headers>
            }
          />
        </Routes>
      </Router>
      
    </ThemeProvider>
  );
}

export default App;

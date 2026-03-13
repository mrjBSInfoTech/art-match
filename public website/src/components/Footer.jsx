import React from "react";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import HomeIcon from "@mui/icons-material/Home";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Header Section */}
        <div className="footer-header">
          <div className="footer-header-content">
            <div className="footer-logo">
              <HomeIcon className="logo-icon" />
              <h2>Barangay 415 Zone 42</h2>
            </div>
          </div>
          <p className="footer-description">
            Your one-stop portal for community services, announcements, and
            engagement.
          </p>
        </div>

        {/* Main Content */}
        <div className="footer-content">
          {/* 1. Contact Info - NOW FIRST */}
          <div className="footer-column">
            <h3>Contact Info</h3>
            <div className="contact-item">
              <LocationOnIcon className="contact-icon" />
              {/* This matches the sample resident address in your database */}
              <p>Somewhere, Manila, Philippines</p>
            </div>
            <div className="contact-item">
              <PhoneIcon className="contact-icon" />
              <p>(02) 1234-5678</p>
            </div>
            <div className="contact-item">
              <EmailIcon className="contact-icon" />
              <p>info@barangay415.gov.ph</p>
            </div>
          </div>

          {/* 2. Quick Links - NOW SECOND */}
          <div className="footer-column">
            <h3>Quick Links</h3>
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/about">About Us</a>
              </li>
              <li>
                <a href="/services">Services</a>
              </li>
              <li>
                <a href="/announcements">Announcements</a>
              </li>
              <li>
                <a href="/concerns">Concerns</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-copyright">
          <p>
            &copy; {new Date().getFullYear()} Barangay 415 Zone 42. All Rights
            Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import express from "express";
import axios from "axios";
import db from "../database/db.js";
import multer from "multer";
import { authenticateToken } from "../middleware/authMiddleware.js";

const ESP32_IP = "192.168.1.9";
const router = express.Router();

router.get("/alert/high", async (req, res) => {
  await axios.get(`http://${ESP32_IP}/alert/high`);
  res.send("High alert triggered");
});

router.get("/alert/medium", async (req, res) => {
  await axios.get(`http://${ESP32_IP}/alert/medium`);
  res.send("Medium alert triggered");
});

router.get("/alert/clear", async (req, res) => {
  await axios.get(`http://${ESP32_IP}/alert/clear`);
  res.send("Alert cleared");
});

export default router;

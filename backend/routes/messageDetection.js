import express from "express";
import axios from "axios";
import db from "../database/db.js";
import multer from "multer";
import { authenticateToken } from "../middleware/authMiddleware.js";

const getEspAddress = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT port_number FROM port LIMIT 1"; 
    db.query(sql, (err, results) => {
      if (err) return reject(err);
      if (!results || results.length === 0) {
        return resolve("192.168.1.9"); 
      }
      
      const config = results[0];
      resolve(config.port_number);
    });
  });
};
const router = express.Router();

router.get("/alert/high", async (req, res) => {
  const ESP32_IP = await getEspAddress();
  await axios.get(`http://${ESP32_IP}/alert/high`);
  res.send("High alert triggered");
});

router.get("/alert/medium", async (req, res) => {
  const ESP32_IP = await getEspAddress();
  await axios.get(`http://${ESP32_IP}/alert/medium`);
  res.send("Medium alert triggered");
});

router.get("/alert/clear", async (req, res) => {
  const ESP32_IP = await getEspAddress();
  await axios.get(`http://${ESP32_IP}/alert/clear`);
  res.send("Alert cleared");
});

export default router;

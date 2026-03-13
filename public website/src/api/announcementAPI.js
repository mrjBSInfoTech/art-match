import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
});

// Fetch all announcements
export const fetchAnnouncements = async () => {
  try {
    console.log("Fetching all announcements");
    const res = await api.get("/post");
    console.log("Announcements fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAnnouncements:", error);
    handleError(error);
  }
};


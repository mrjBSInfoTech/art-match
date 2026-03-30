import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
});

// Fetch all officials
export const fetchOfficials = async () => {
  try {
    console.log("Fetching all officials");
    const res = await api.get("/about");
    console.log("Officials fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchOfficials:", error);
    handleError(error);
  }
};


import axios from "axios";

// Create an Axios instance (you can set global options here)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000, // wait max 5 seconds
});

// This interceptor will automatically add the Authorization header with the token for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }

  return config;
});

// Helper function to handle errors globally
const handleError = (error) => {
  if (error.response) {
    // Server responded but with an error code
    console.error(
      "Server error:",
      error.response.status,
      error.response.data
    );
    throw new Error(
      error.response.data.message || "Server responded with an error"
    );
  } else if (error.request) {
    // Request was made but no response (server down, CORS issue, etc.)
    console.error("No response from server:", error.message);
    throw new Error(
      "Server not responding. Please check your connection or try again later."
    );
  } else {
    // Something else happened
    console.error("Request setup error:", error.message);
    throw new Error("An unexpected error occurred. Please try again.");
  }
};

// Fetch all announcements
export const fetchAnnouncements = async () => {
  try {
    console.log("Fetching all announcements");
    const res = await api.get("/announcements");
    console.log("Announcements fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAnnouncements:", error);
    handleError(error);
  }
};

// Fetch single announcement by ID
export const fetchAnnouncementById = async (id) => {
  try {
    console.log("Fetching announcement by ID:", id);
    const res = await api.get(`/announcements/${id}`);
    console.log("Announcement fetched:", res.data);
    return res.data;
  } catch (error) {
    console.error("Error in fetchAnnouncementById:", error);
    handleError(error);
  }
};

// Add new announcement
export const addAnnouncement = async (announcementData) => {
  try {
    // Validate required fields
    if (!announcementData.title || !announcementData.title.trim()) {
      throw new Error("Title is required");
    }
    if (!announcementData.description || !announcementData.description.trim()) {
      throw new Error("Description is required");
    }
    if (!announcementData.date_posted || !announcementData.date_posted.trim()) {
      throw new Error("Date posted is required");
    }
    if (!announcementData.file || !(announcementData.file instanceof File)) {
      throw new Error("Image file is required");
    }

    const formData = new FormData();
    
    // Append the actual File object
    formData.append('file', announcementData.file);
    
    // Append other form fields
    formData.append('title', announcementData.title.trim());
    formData.append('description', announcementData.description.trim());
    formData.append('date_posted', announcementData.date_posted.trim());

    const res = await api.post("/announcements", formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Update announcement
export const updateAnnouncement = async (id, announcementData) => {
  try {
    // Validate required fields
    if (!announcementData.title || !announcementData.title.trim()) {
      throw new Error("Title is required");
    }
    if (!announcementData.description || !announcementData.description.trim()) {
      throw new Error("Description is required");
    }
    if (!announcementData.date_posted || !announcementData.date_posted.trim()) {
      throw new Error("Date posted is required");
    }

    const formData = new FormData();
    
    // Append the File object if present
    if (announcementData.file instanceof File) {
      formData.append('file', announcementData.file);
    }
    
    // Append other form fields
    formData.append('title', announcementData.title.trim());
    formData.append('description', announcementData.description.trim());
    formData.append('date_posted', announcementData.date_posted.trim());

    const res = await api.put(`/announcements/${id}`, formData);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

// Delete announcement
export const deleteAnnouncement = async (id) => {
  try {
    const res = await api.delete(`/announcements/${id}`);
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

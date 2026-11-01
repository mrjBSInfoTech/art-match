import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/seller",
  timeout: 120000,
});

// HttpOnly cookies handle authentication automatically

const handleError = (error) => {
  if (error.response) {
    throw new Error(error.response.data.message || "Storefront request failed");
  }
  if (error.request) {
    throw new Error("Server not responding. Please try again later.");
  }
  throw new Error("Unexpected storefront error");
};

export const fetchStorefront = async () => {
  try {
    const res = await api.get("/storefront");
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

export const saveStorefront = async ({
  shop_name,
  shop_description,
  specialties,
  pinned_artwork_ids,
}) => {
  try {
    const res = await api.put("/storefront", {
      shop_name,
      shop_description,
      specialties,
      pinned_artwork_ids,
    });
    return res.data;
  } catch (error) {
    handleError(error);
  }
};

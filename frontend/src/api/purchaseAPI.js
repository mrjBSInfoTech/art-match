import axios from "axios";

const API_URL = "http://localhost:5000/api/purchases";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 5000,
});

const handleError = (error) => {
  console.error("API Error:", error);
  throw error;
};

// Create a new transaction with products
export const createTransaction = async (transactionData) => {
  try {
    const response = await api.post(`${API_URL}`, transactionData);
    return response;
  } catch (error) {
    handleError(error);
  }
};


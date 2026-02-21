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

//For Purchase History Page
// Get all transactions
export const fetchTransactions = async () => {
  try {
    const response = await api.get(`${API_URL}`);
    return response;
  } catch (error) {
    handleError(error);
  }
};

// Get transaction by ID
export const getTransactionById = async (transactionId) => {
  try {
    const response = await api.get(`${API_URL}/${transactionId}`);
    return response;
  } catch (error) {
    handleError(error);
  }
};

//For Product History Page
//For Category History Page
//For Supplier History Page
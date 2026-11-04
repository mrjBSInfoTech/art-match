import axios from "axios";

const api = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:5000/api/admin/system-settings",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// HttpOnly cookies handle authentication automatically

const throwApiError = (error) => {
  throw new Error(
    error.response?.data?.message || error.message || "Unexpected error occurred.",
  );
};

export const fetchAccountExpirationDate = async () => {
  try {
    const response = await api.get("/account-expiration");
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const saveAccountExpirationDate = async (date) => {
  try {
    const response = await api.put("/account-expiration", { date });
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const downloadSystemBackup = async (password) => {
  try {
    const response = await api.post("/backup", { password }, {
      responseType: "blob",
      timeout: 0,
    });
    const disposition = response.headers["content-disposition"] || "";
    const filename = disposition.match(/filename="([^"]+)"/i)?.[1]
      || `artmatch-system-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    return { blob: response.data, filename };
  } catch (error) {
    const responseData = error.response?.data;
    if (responseData instanceof Blob) {
      try {
        const payload = JSON.parse(await responseData.text());
        throw new Error(payload.message || "Unable to download the system backup.");
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(error.message || "Unable to download the system backup.");
        }
        throw parseError;
      }
    }
    throwApiError(error);
  }
};

export const importSystemBackup = async (file, password) => {
  const formData = new FormData();
  formData.append("backup", file);
  formData.append("password", password);
  try {
    const response = await api.post("/backup/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 0,
    });
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const fetchPromotionHeroEnabled = async () => {
  try {
    const response = await api.get("/promotion-hero");
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const savePromotionHeroEnabled = async (enabled) => {
  try {
    const response = await api.put("/promotion-hero", { enabled });
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const fetchPromotionHeader = async () => {
  try {
    const response = await api.get("/promotion-header");
    return response.data;
  } catch (error) {
    throwApiError(error);
  }
};

export const savePromotionHeader = async (header) => {
  try {
    const response = await api.put("/promotion-header", header);
    return response.data.header;
  } catch (error) {
    throwApiError(error);
  }
};

export const fetchPromotionHeaderRequests = async () => {
  try {
    const response = await api.get("/promotion-header/requests");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throwApiError(error);
  }
};

export const reviewPromotionHeaderRequest = async (requestId, decision) => {
  try {
    const response = await api.post(
      `/promotion-header/requests/${requestId}/review`,
      { decision },
    );
    return response.data.request;
  } catch (error) {
    throwApiError(error);
  }
};

export const fetchFaqs = async () => {
  try {
    const response = await api.get("/faqs");
    return Array.isArray(response.data?.faqs) ? response.data.faqs : [];
  } catch (error) {
    throwApiError(error);
  }
};

export const saveFaqs = async (faqs) => {
  try {
    const response = await api.put("/faqs", { faqs });
    return Array.isArray(response.data?.faqs) ? response.data.faqs : [];
  } catch (error) {
    throwApiError(error);
  }
};

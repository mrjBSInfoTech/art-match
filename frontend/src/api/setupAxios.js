import axios from "axios";
import {
  clearAuthData,
  getToken,
  resolveAuthSectionFromUrl,
} from "../../utils/auth.js";

// Ensure all default Axios requests send credentials (HttpOnly cookies) cross-origin
axios.defaults.withCredentials = true;

// Custom header for CSRF defense (browsers prevent cross-origin form forgery from sending custom headers)
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

const getFullRequestUrl = (config = {}) => {
  const base = String(config.baseURL || "").replace(/\/+$/, "");
  const path = String(config.url || "");
  if (/^https?:\/\//i.test(path)) return path;
  if (!base) return path;
  if (!path) return base;
  return `${base}/${path.replace(/^\/+/, "")}`;
};

const attachAuthHeaders = (reqConfig) => {
  reqConfig.withCredentials = true;
  if (!reqConfig.headers) {
    reqConfig.headers = {};
  }
  if (!reqConfig.headers["X-Requested-With"]) {
    reqConfig.headers["X-Requested-With"] = "XMLHttpRequest";
  }

  const fullUrl = getFullRequestUrl(reqConfig);
  const lowerUrl = fullUrl.toLowerCase();
  if (lowerUrl.includes("/login") || lowerUrl.includes("/register")) {
    return reqConfig;
  }

  if (!reqConfig.headers.Authorization && !reqConfig.headers.authorization) {
    const pathname =
      typeof window !== "undefined" ? window.location.pathname : "";
    const section = resolveAuthSectionFromUrl(fullUrl, pathname);
    const token = getToken(section);
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
  }
  return reqConfig;
};

const isSessionFatal403 = (error) => {
  const message = String(
    error.response?.data?.message || error.response?.data?.error || "",
  ).toLowerCase();
  return (
    message.includes("expired") ||
    message.includes("banned") ||
    message.includes("privileges required") ||
    message.includes("unable to identify") ||
    message.includes("role mismatch")
  );
};

const handleSessionExpiration = (error) => {
  const status = error.response?.status;
  if (status === 401 || (status === 403 && isSessionFatal403(error))) {
    const fullUrl = getFullRequestUrl(error.config);
    const lowerUrl = fullUrl.toLowerCase();
    const pathname =
      typeof window !== "undefined" ? window.location.pathname || "" : "";

    // Do not clear state or redirect on login, register, logout, or password confirmation requests
    if (
      lowerUrl.includes("/login") ||
      lowerUrl.includes("/register") ||
      lowerUrl.includes("/logout") ||
      lowerUrl.includes("/verify-password")
    ) {
      return Promise.reject(error);
    }

    const section = resolveAuthSectionFromUrl(fullUrl, pathname);
    if (section === "admin" && !pathname.startsWith("/admin/login")) {
      clearAuthData("admin");
      window.location.assign("/admin/login");
    } else if (section === "seller" && !pathname.startsWith("/seller/login")) {
      clearAuthData("seller");
      window.location.assign("/seller/login");
    } else if (section === "buyer" && !pathname.startsWith("/buyer/login")) {
      clearAuthData("buyer");
      window.location.assign("/buyer/login");
    }
  }
  return Promise.reject(error);
};

// Wrap axios.create to guarantee withCredentials, Bearer fallback, CSRF header, and response handling
const originalCreate = axios.create.bind(axios);
axios.create = function (config = {}) {
  const instance = originalCreate({
    withCredentials: true,
    ...config,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      ...(config.headers || {}),
    },
  });
  instance.defaults.withCredentials = true;
  instance.interceptors.request.use(attachAuthHeaders);
  instance.interceptors.response.use((response) => response, handleSessionExpiration);
  return instance;
};

axios.interceptors.request.use(attachAuthHeaders);

// Global response interceptor for session expiration on default axios
axios.interceptors.response.use(
  (response) => response,
  handleSessionExpiration,
);

export default axios;

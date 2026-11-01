import axios from "axios";
import { clearAuthData } from "../../utils/auth.js";

// Ensure all default Axios requests send credentials (HttpOnly cookies) cross-origin
axios.defaults.withCredentials = true;

// Custom header for CSRF defense (browsers prevent cross-origin form forgery from sending custom headers)
axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

const handleSessionExpiration = (error) => {
  if (error.response?.status === 401) {
    const url = error.config?.url || "";
    // Do not clear state or redirect on login/register attempt failures
    if (url.includes("/login") || url.includes("/register")) {
      return Promise.reject(error);
    }
    if (url.includes("admin") && !window.location.pathname.startsWith("/admin/login")) {
      clearAuthData("admin");
      window.location.assign("/admin/login");
    } else if (url.includes("seller") && !window.location.pathname.startsWith("/seller/login")) {
      clearAuthData("seller");
      window.location.assign("/seller/login");
    } else if (url.includes("buyer")) {
      clearAuthData("buyer");
    }
  }
  return Promise.reject(error);
};

// Wrap axios.create to guarantee withCredentials, CSRF header, and response handling on any instance created
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
  instance.interceptors.request.use((reqConfig) => {
    reqConfig.withCredentials = true;
    if (!reqConfig.headers["X-Requested-With"]) {
      reqConfig.headers["X-Requested-With"] = "XMLHttpRequest";
    }
    return reqConfig;
  });
  instance.interceptors.response.use((response) => response, handleSessionExpiration);
  return instance;
};

// Global response interceptor for session expiration on default axios
axios.interceptors.response.use(
  (response) => response,
  handleSessionExpiration,
);

export default axios;

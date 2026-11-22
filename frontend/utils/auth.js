const COMMON_AUTH_KEYS = ["auth_section"];

// For admin part
const ADMIN_AUTH_KEYS = [
  "admin_token",
  "admin_logged_in",
  "admin_id",
  "admin_username",
  "admin_first_name",
  "admin_last_name",
  "admin_image",
  "admin_role",
  "admin_can_add",
  "admin_can_edit",
  "admin_can_delete",
  "admin_can_promote",
  "admin_can_demote",
  "admin_password_changed",
  "admin_created_at",
  "admin_updated_at",
];

const ADMIN_SIDEBAR_PREFERENCE_KEYS = [
  "admin_sidebar_manage_users_expanded",
  "admin_sidebar_system_settings_expanded",
];

const SELLER_SIDEBAR_PREFERENCE_KEYS = [
  "seller_sidebar_orders_expanded",
  "seller_sidebar_vouchers_expanded",
];

// For seller part
const SELLER_AUTH_KEYS = [
  "seller_token",
  "seller_logged_in",
  "seller_student_id",
  "seller_first_name",
  "seller_middle_name",
  "seller_last_name",
  "seller_profile_image",
];

// For buyer part
const BUYER_AUTH_KEYS = [
  "buyer_token",
  "buyer_logged_in",
  "buyer_customer_id",
  "buyer_username",
  "buyer_first_name",
  "buyer_last_name",
  "buyer_profile_image",
  "recommendation_session_id",
];

const clearBuyerRecommendationStorage = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith("recommendation_session_id")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage access errors
  }

  try {
    if (typeof sessionStorage !== "undefined") {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("recommendation_view_")) {
          sessionStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Ignore sessionStorage access errors
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("recommendation-updated"));
  }
};

const TOKEN_KEYS = {
  admin: "admin_token",
  seller: "seller_token",
  buyer: "buyer_token",
};

const REMOVED_PROFILE_KEYS = [
  "admin_email",
  "buyer_email",
  "buyer_phone_number",
  "seller_student_number",
  "seller_email",
  "seller_phone_number",
  "seller_address",
  "seller_birthdate",
  "seller_cor",
  "seller_year_level",
  "seller_course",
  "seller_register_status",
  "seller_registered_date",
  "seller_approved_date",
  "seller_settings",
  "seller_shop_name",
  "seller_shop_description",
];

export function clearRemovedProfileData() {
  REMOVED_PROFILE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function clearAuthData(section = null) {
  clearRemovedProfileData();
  if (section === "admin") {
    ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    ADMIN_SIDEBAR_PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (localStorage.getItem("auth_section") === "admin") {
      localStorage.removeItem("auth_section");
    }
  } else if (section === "seller") {
    SELLER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    SELLER_SIDEBAR_PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (localStorage.getItem("auth_section") === "seller") {
      localStorage.removeItem("auth_section");
    }
  } else if (section === "buyer") {
    BUYER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    clearBuyerRecommendationStorage();
    if (localStorage.getItem("auth_section") === "buyer") {
      localStorage.removeItem("auth_section");
    }
  } else {
    // Comprehensive cleanup
    ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    ADMIN_SIDEBAR_PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
    SELLER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    SELLER_SIDEBAR_PREFERENCE_KEYS.forEach((key) => localStorage.removeItem(key));
    BUYER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    clearBuyerRecommendationStorage();
    COMMON_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("token");
  }
}

/**
 * Decodes and checks if a given JWT string is structurally sound and unexpired.
 */
export function hasValidToken(token) {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return false;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split("")
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join(""),
      ),
    );

    if (decoded.exp) {
      return Date.now() < decoded.exp * 1000;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluates whether a user is currently authenticated in the targeted panel.
 */
export function isAuthenticated(section) {
  if (!section) return false;

  if (section === "admin") {
    return Boolean(
      localStorage.getItem("admin_logged_in") === "true" ||
      localStorage.getItem("admin_id") ||
      localStorage.getItem("admin_username"),
    );
  }
  if (section === "seller") {
    return Boolean(
      localStorage.getItem("seller_logged_in") === "true" ||
      localStorage.getItem("seller_student_id"),
    );
  }
  if (section === "buyer") {
    return Boolean(
      localStorage.getItem("buyer_logged_in") === "true" ||
      localStorage.getItem("buyer_customer_id") ||
      localStorage.getItem("buyer_username"),
    );
  }
  return false;
}

export function setAuthSection(section) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("auth_section", section);
}

export function getAuthSection() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("auth_section");
}

/**
 * Sets authenticated state for the given section and persists the session
 * token so cross-origin browsers that block third-party cookies (e.g. iOS
 * Safari / in-app WebViews) can fall back to Authorization Bearer headers.
 */
export function setToken(section, token = null) {
  if (!section || typeof localStorage === "undefined") return;
  localStorage.setItem(`${section}_logged_in`, "true");
  if (typeof token === "string" && token.trim() && TOKEN_KEYS[section]) {
    localStorage.setItem(TOKEN_KEYS[section], token.trim());
  }
  setAuthSection(section);
}

/**
 * Returns the stored session token for the given section (or active section)
 * if present and structurally unexpired, otherwise null.
 */
export function getToken(section = null) {
  if (typeof localStorage === "undefined") return null;
  const targetSection = section || getAuthSection();
  const key = TOKEN_KEYS[targetSection];
  if (!key) return null;
  const token = localStorage.getItem(key);
  if (!token) return null;
  if (!hasValidToken(token)) {
    localStorage.removeItem(key);
    return null;
  }
  return token;
}

/**
 * Resolves the auth section ("admin" | "seller" | "buyer" | null) for an API URL.
 */
export function resolveAuthSectionFromUrl(url = "", pathname = "") {
  const normalizedUrl = String(url || "").toLowerCase();
  if (
    normalizedUrl.includes("/api/admin/") ||
    normalizedUrl.includes("/api/admin?") ||
    normalizedUrl.endsWith("/api/admin") ||
    normalizedUrl.includes("/api/support-chat/admin")
  ) {
    return "admin";
  }
  if (
    normalizedUrl.includes("/api/seller/") ||
    normalizedUrl.includes("/api/seller?") ||
    normalizedUrl.endsWith("/api/seller") ||
    normalizedUrl.includes("/api/chat/seller") ||
    normalizedUrl.includes("/api/support-chat/seller")
  ) {
    return "seller";
  }
  if (
    normalizedUrl.includes("/api/buyer/") ||
    normalizedUrl.includes("/api/buyer?") ||
    normalizedUrl.endsWith("/api/buyer") ||
    normalizedUrl.includes("/api/payments/") ||
    normalizedUrl.includes("/api/chat/buyer") ||
    normalizedUrl.includes("/api/support-chat/buyer")
  ) {
    return "buyer";
  }

  const normalizedPath = String(pathname || "").toLowerCase();
  if (normalizedPath.startsWith("/admin")) return "admin";
  if (normalizedPath.startsWith("/seller")) return "seller";
  if (normalizedPath.startsWith("/buyer")) return "buyer";
  return getAuthSection();
}

/**
 * Clears out session marker and sections
 */
export function removeToken(section) {
  if (!section || typeof localStorage === "undefined") return;
  localStorage.removeItem(`${section}_logged_in`);
  if (TOKEN_KEYS[section]) {
    localStorage.removeItem(TOKEN_KEYS[section]);
  }
  if (localStorage.getItem("auth_section") === section) {
    localStorage.removeItem("auth_section");
  }
}

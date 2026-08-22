const COMMON_AUTH_KEYS = ["auth_section"];

// For admin part
const ADMIN_AUTH_KEYS = [
  "admin_token",
  "admin_username",
  "admin_first_name",
  "admin_last_name",
  "admin_email",
];

// For seller part
const SELLER_AUTH_KEYS = [
  "seller_token",
  "seller_student_id",
  "seller_student_number",
  "seller_first_name",
  "seller_middle_name",
  "seller_last_name",
  "seller_birthdate",
  "seller_email",
  "seller_phone_number",
  "seller_address",
  "seller_cor",
  "seller_year_level",
  "seller_course",
  "seller_register_status",
  "seller_registered_date",
  "seller_approved_date",
];
// For buyer part
const BUYER_AUTH_KEYS = [
  "buyer_token",
  "buyer_customer_id",
  "buyer_username",
  "buyer_first_name",
  "buyer_last_name",
  "buyer_email",
  "buyer_phone_number",
];

const TOKEN_KEYS = {
  admin: "admin_token",
  seller: "seller_token",
  buyer: "buyer_token",
};

export function clearAuthData(section = null) {
  if (section === "admin") {
    ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    // If the active track matches, clear the section marker too
    if (localStorage.getItem("auth_section") === "admin") {
      localStorage.removeItem("auth_section");
    }
  } else if (section === "seller") {
    SELLER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    // If the active track matches, clear the section marker too
    if (localStorage.getItem("auth_section") === "seller") {
      localStorage.removeItem("auth_section");
    }
  } else if (section === "buyer") {
    BUYER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    // If the active track matches, clear the section marker too
    if (localStorage.getItem("auth_section") === "buyer") {
      localStorage.removeItem("auth_section");
    }
  } else {
    // Brutal cleanup: Wipe absolutely everything out to be completely safe
    ADMIN_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    SELLER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    BUYER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    COMMON_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("token"); // Clean up legacy key remnants
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
  } catch (error) {
    console.warn("Invalid token format evaluation failed.", error);
    return false;
  }
}

/**
 * Evaluates whether a user has permission to access a targeted section.
 * Expects explicit string parameter: "public" or "private"
 */
export function isAuthenticated(section) {
  if (!section) return false;

  const token = getToken(section);
  if (!hasValidToken(token)) return false;

  // Ensure they possess the token assigned specifically to this sub-route segment
  return true;
}

export function setAuthSection(section) {
  localStorage.setItem("auth_section", section);
}

export function getAuthSection() {
  return localStorage.getItem("auth_section");
}

/**
 * Sets a token to its dedicated key assignment based on panel scope
 */
export function setToken(section, token) {
  if (!token || !TOKEN_KEYS[section]) return;
  localStorage.setItem(TOKEN_KEYS[section], token);
  setAuthSection(section);
}

/**
 * Gets a token strictly matching the requested panel scope
 */
export function getToken(section) {
  const key = TOKEN_KEYS[section];
  return key ? localStorage.getItem(key) : null;
}

/**
 * Clears out individual token data and sections
 */
export function removeToken(section) {
  if (!section || !TOKEN_KEYS[section]) return;
  
  localStorage.removeItem(TOKEN_KEYS[section]);
  if (localStorage.getItem("auth_section") === section) {
    localStorage.removeItem("auth_section");
  }
}
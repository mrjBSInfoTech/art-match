import { API_BASE_URL } from "../api/apiBase.js";

export const DEFAULT_PROFILE_IMAGE_URL = `${API_BASE_URL}/uploads/profile.jpg`;

const PROFILE_FOLDER_BY_ROLE = {
  admin: "/uploads/admin/uploadAdmin",
  buyer: "/uploads/buyer/uploadProfile",
  seller: "/uploads/seller/uploadProfile",
};

/**
 * Resolves a stored profile image filename or URL for the given role, defaulting
 * to backend/uploads/profile.jpg whenever missing or set to "profile.jpg".
 */
export function resolveProfileImageUrl(image, role = "seller") {
  const value = typeof image === "string" ? image.trim() : "";
  if (!value || value.toLowerCase() === "profile.jpg") {
    return DEFAULT_PROFILE_IMAGE_URL;
  }
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${API_BASE_URL}${value}`;
  }
  const folder = PROFILE_FOLDER_BY_ROLE[role] || PROFILE_FOLDER_BY_ROLE.seller;
  return `${API_BASE_URL}${folder}/${encodeURIComponent(value)}`;
}

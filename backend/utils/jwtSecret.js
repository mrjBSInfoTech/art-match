export const getJwtSecret = () => {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret || secret === "your_secret_key") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: A secure JWT_SECRET environment variable is required.");
    }
    return secret || "artmatch_development_jwt_secret_do_not_use_in_prod";
  }
  return secret;
};


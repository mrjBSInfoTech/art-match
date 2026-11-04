export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const weakSecrets = [
    "my_super_secret_key",
    "secret",
    "changeme",
    "default_secret",
    "your_secret_key",
    "artmatch_development_jwt_secret_do_not_use_in_prod",
  ];
  if (!secret || secret.length < 32 || weakSecrets.includes(secret.toLowerCase())) {
    throw new Error("JWT_SECRET must be a high-entropy secret of at least 256 bits (32+ characters)");
  }
  return secret;
};


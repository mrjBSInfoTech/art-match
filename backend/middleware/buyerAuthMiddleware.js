import jwt from "jsonwebtoken";

export const authenticateBuyer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }
  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    const customerId = user.customer_id || user.id;
    if (!customerId) {
      return res.status(403).json({ message: "Unable to identify buyer." });
    }

    req.user = { ...user, customer_id: customerId };
    next();
  });
};

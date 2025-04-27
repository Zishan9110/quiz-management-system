import jwt from "jsonwebtoken";

export const generateToken = (user, message, statusCode, res) => {
  // Token payload includes user ID and role
  const payload = { id: user._id, role: user.role };
  console.log("Token payload:", payload); // Debugging

  // Generate the token
  const token = jwt.sign(
    payload, // Include role in the token payload
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRE } // Use expiresIn from environment variable
  );

  // Set cookie options
  const options = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  console.log("Generated token:", token); // Debugging

  // Send response with token and user data
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    message,
    token,
    user,
  });
};
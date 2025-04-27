import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler, { errorMiddleware } from "./error.js";
import jwt from "jsonwebtoken";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
   const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
 
   if (!token) {
     return next(new ErrorHandler("User Not Authenticated!", 400));
   }
 
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
     console.log("Decoded token:", decoded); // Debugging: Check if role is included
 
     const user = await User.findById(decoded.id);
     if (!user) {
       return next(new ErrorHandler("User Not Authenticated!", 400));
     }
 
     // Attach user and role to the request
     req.user = user;
     req.role = decoded.role; // Role is now included in the token payload
     console.log("User role:", req.role); // Debugging: Check the role
 
     next();
   } catch (error) {
     console.error("Token verification error:", error); // Debugging
     return next(new ErrorHandler("User Not Authenticated!", 400));
   }
 });
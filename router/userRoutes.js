import express from "express";
import { sendMessage, getAllMessage } from "../controller/messageController.js";
import {register, login, logout, getUser, updateProfile, updatePassword, forgotPassword, resetPassword} from "../controller/userController.js";
import {isAuthenticated} from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", isAuthenticated ,logout);
router.get("/user/:role", isAuthenticated, getUser);
router.put("/update/profile", isAuthenticated, updateProfile);
router.put("/update/password", isAuthenticated, updatePassword);
router.post("/forgot/password", isAuthenticated, forgotPassword);
router.put("/reset/password/:token", resetPassword);

export default router;

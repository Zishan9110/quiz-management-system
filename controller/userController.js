import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { generateToken } from "../utils/jwtToken.js";
import {sendEmail} from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";



export const register = catchAsyncErrors(async (req, res, next) => {
    const { fullName, email, phone, password, role, rollNo, branch, section } = req.body;
  
    // Validate common required fields
    if (!fullName || !email || !phone || !password || !role) {
      return next(new ErrorHandler("Please fill all required fields.", 400));
    }
  
    // Validate role
    if (!["admin", "student"].includes(role)) {
      return next(new ErrorHandler("Invalid role. Role must be 'admin' or 'student'.", 400));
    }
  
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorHandler("User already exists.", 400));
    }
  
    // Upload Avatar to Cloudinary (if provided)
    let avatarUpload = null;
    if (req.files && req.files.avatar) {
      try {
        avatarUpload = await cloudinary.uploader.upload(req.files.avatar.tempFilePath, {
          folder: "AVATARS",
        });
      } catch (err) {
        console.error("Cloudinary Avatar Upload Error:", err);
        return next(new ErrorHandler("Failed to upload avatar to Cloudinary", 500));
      }
    }
  
    // Create user based on role
    const userData = {
      fullName,
      email,
      phone,
      password,
      role,
      avatar: avatarUpload
        ? {
            public_id: avatarUpload.public_id,
            url: avatarUpload.secure_url,
          }
        : null,
    };
  
    // Add student-specific fields if role is "student" and fields are provided
    if (role === "student") {
      if (rollNo) userData.rollNo = rollNo;
      if (branch) userData.branch = branch;
      if (section) userData.section = section;
    }
  
    // Create user
    const user = await User.create(userData);
  
    generateToken(user, `${role === "student" ? "Student" : "Admin"} Registered Successfully`, 201, res);
  });


export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;
  
    console.log("Login request received:", { email, password }); // Debugging
  
    // Check if email and password are provided
    if (!email || !password) {
      console.error("Email or password missing"); // Debugging
      return next(new ErrorHandler("Please provide email and password.", 400));
    }
  
    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.error("User not found:", email); // Debugging
      return next(new ErrorHandler("Invalid email or password.", 401));
    }
  
    // Compare passwords
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      console.error("Password does not match"); // Debugging
      return next(new ErrorHandler("Invalid email or password.", 401));
    }
  
    console.log("User authenticated successfully:", user); // Debugging
  
    // Generate token and send response
    generateToken(user, "Login Successful", 200, res);
  });

export const logout = catchAsyncErrors(async (req, res, next) => {
    // Clear the token cookie
    res.status(200)
       .cookie("token", null, {
           expires: new Date(Date.now()), // Expire the cookie immediately
           httpOnly: true,
       })
       .json({
           success: true,
           message: "Logged Out Successfully",
       });
});

export const getUser = catchAsyncErrors(async (req, res, next) => {
    const { role } = req.params;
    const { id } = req.user; // Assuming `id` is stored in `req.user` after authentication

    if (!["admin", "student", "teacher"].includes(role)) {
        return next(new ErrorHandler("Invalid role specified.", 400));
    }

    const user = await User.findById(id).select("-password"); 
    if (!user || user.role !== role) {
        return next(new ErrorHandler("User not found or unauthorized.", 404));
    }

    res.status(200).json({ success: true, user });
});

export const updateProfile = async (req, res, next) => {
    try {
        const { fullName, email, phone, aboutMe } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // ✅ Handle Avatar Upload
        if (req.files && req.files.avatar) {
            const avatar = req.files.avatar;

            // 🛑 Delete old avatar from Cloudinary (if exists)
            if (user.avatar && user.avatar.public_id) {
                await cloudinary.uploader.destroy(user.avatar.public_id);
            }

            // ✅ Upload new avatar
            const cloudinaryResponse = await cloudinary.uploader.upload(avatar.tempFilePath, {
                folder: "AVATARS",
            });

            user.avatar = {
                public_id: cloudinaryResponse.public_id,
                url: cloudinaryResponse.secure_url, // Use `secure_url` for HTTPS
            };
        }

        // ✅ Update other fields (if provided)
        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (aboutMe) user.aboutMe = aboutMe;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updatePassword = catchAsyncErrors(async(req, res, next)=>{
    const {currentPassword, newPassword, confirmNewPassword} = req.body;
    if(!currentPassword || !newPassword || !confirmNewPassword){
        return next(new ErrorHandler("Please Fill All Fields!", 400));
    }
    const user = await User.findById(req.user.id).select("+password");
    const isPasswordMatched = await user.comparePassword(currentPassword);
    if(!isPasswordMatched){
        return next(new ErrorHandler("Incorrect Current Password", 400));
    }
    if(newPassword !== confirmNewPassword){
        return next(new ErrorHandler("New Password And Confirm New Password Do Not Matching", 400));
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
        success: true,
        message: "Password Updated!",
    });
});

export const forgotPassword = catchAsyncErrors(async(req, res, next)=>{
           
    const user = await User.findOne({email: req.body.email});
    if(!user){
        return next(new ErrorHandler("user not found!", 404));
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({validateBeforeSave: false});
    const resetPasswordUrl = `${process.env.DASHBOARD_URL}/password/reset/${resetToken}`;
    const message = `Your Reset Password Token Is:- \n\n ${resetPasswordUrl} \n\n if you have not request for this please ignore it.`;

    try {
        await sendEmail({
            email: user.email,
            subject: "Personal portfolio Dashboard Recovery Password!",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email Sent To ${user.email} Successfully!`,
        })
    } catch (error) {
        user.resetPasswordExpire=undefined;
        user.resetPasswordToken=undefined;
        await user.save();
        return next(new ErrorHandler(error.message, 500));
        
    }
});

export const resetPassword = catchAsyncErrors(async(req, res, next)=>{
    const {token} = req.params;
    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: {$gt: Date.now()},
    });

    if(!user){
        return next(new ErrorHandler("Reset Password token is invalid or has been expired", 400));
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("Password And Confirm Password do not match!"))
    }
    user.password = req.body.password;
    user.resetPasswordExpire= undefined;
    user.resetPasswordToken=undefined;
    await user.save();
    genertateToken(user, "Reset Password Successfully!", 200, res);
});



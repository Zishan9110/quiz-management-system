import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, "Name Required!"],
    },
    email: {
        type: String,
        required: [true, "Email Required!"],
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
    },
    phone: {
        type: String,
        required: [true, "Phone Number Required!"],
        match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
    },
    password: {
        type: String,
        required: [true, "Password Is Required!"],
        minLength: [4, "Password must contain at least 4 characters"],
        select: false,
    },
    role: {
        type: String,
        enum: ["admin", "student", "teacher"],
        default: "student",
        required: true,
    },
    rollNo: {
        type: String,
    },
    branch: {
        type: String,
    },
    section: {
        type: String,
    },
    avatar: {
        public_id: {
            type: String,
            default: "",
        },
        url: {
            type: String,
            default: "",
        },
    },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateJsonWebToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: process.env.JWT_EXPIRES || "1d"
    });
};

userSchema.methods.getResetPasswordToken = function(){
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    return resetToken;
};

export const User = mongoose.model("User", userSchema);
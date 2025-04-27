import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { Message } from "../models/messageSchema.js";

// Function to send a message
export const sendMessage = catchAsyncErrors(async (req, res, next) => {
    const { senderName, subject, message } = req.body;

    if (!senderName || !subject || !message) {
        return next(new Error("Please fill out the entire form", 400));
    }

    const data = await Message.create({ senderName, subject, message });

    res.status(200).json({
        success: true,
        message: "Message Sent",
        data,
    });
});


// Function to get all messages
export const getAllMessage = catchAsyncErrors(async (req, res, next) => {
    const messages = await Message.find();
    console.log("Fetched messages:", messages); // Add this line for debugging

    res.status(200).json({
        success: true,
        data: messages,
    });
});

export const deleteMessage = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params; // Retrieve the ID from the request parameters

    if (!id) {
        return next(new Error("Message ID is required", 400));
    }

    const message = await Message.findByIdAndDelete(id);

    if (!message) {
        return next(new Error("Message not found", 404));
    }

    res.status(200).json({
        success: true,
        message: "Message deleted successfully",
    });
});

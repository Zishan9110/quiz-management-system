import app from './app.js';
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const PORT = 5000; // Change to a different port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

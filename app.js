import express from "express";
import dbConnection from "./database/dbConnection.js";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { errorMiddleware } from "./middlewares/error.js";
import messageRouter from "./router/messageRoutes.js";
import userRouter from "./router/userRoutes.js";
import quizRoutes from "./router/quizRoutes.js";



const app = express();
dotenv.config({ path: "./config/config.env" });

app.use(
    cors({
      origin: [process.env.STUDENT_URL, process.env.DASHBOARD_URL, process.env.TEACHER_URL],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
    })
  );

  // app.use(cors({ origin: "http://localhost:3000", credentials: true }));

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));


  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: "/tmp/",
    })
  );

  app.use("/api/v1/message", messageRouter);
  app.use("/api/v1/user", userRouter);
  app.use("/api/v1/quiz", quizRoutes);
  


dbConnection();
app.use(errorMiddleware);

export default app;

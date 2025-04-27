import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  addQuiz,
  updateQuiz,
  deleteQuiz,
  getAllQuizzes,
  getSingleQuiz,
  deleteQuestion,
  submitQuiz,
  getQuizLeaderboard,
  getLatestQuiz,
  saveCompletedQuiz,
  getCompletedQuizzes
} from "../controller/quizController.js";

const router = express.Router();

router.post("/add", isAuthenticated, addQuiz);
router.put("/update/:id", isAuthenticated, updateQuiz);
router.delete("/delete/:id", isAuthenticated, deleteQuiz);
router.delete("/delete/:quizId/question/:questionId", isAuthenticated, deleteQuestion);
router.get("/latest", getLatestQuiz); 
router.get("/getall", isAuthenticated, getAllQuizzes);
router.get("/:id", getSingleQuiz);
router.post("/submit/:quizId", isAuthenticated, submitQuiz);
router.get("/leaderboard/:quizId", isAuthenticated, getQuizLeaderboard);
router.post("/completed-quizzes", saveCompletedQuiz);
router.get("/completed-quizzes/:studentId", getCompletedQuizzes);

export default router;
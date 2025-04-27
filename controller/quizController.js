import { Quiz } from "../models/quizSchema.js";  // Quiz Model
import {CompletedQuiz} from "../models/completedQuizSchema .js"
import {Score} from "../models/score.js"
import { User } from "../models/userSchema.js";  // User Model
import { v2 as cloudinary } from "cloudinary";  // Cloudinary for image upload
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";  // Async error handler
import ErrorHandler from "../middlewares/error.js";  // Custom error handler
import { generateToken } from "../utils/jwtToken.js";  // JWT token utility
import { sendEmail } from "../utils/sendEmail.js";  // Email sending utility

// ✅ Add Quiz
export const addQuiz = catchAsyncErrors(async (req, res, next) => {
    const { title, description, questions, duration } = req.body;

    // Validate required fields
    if (!title || !questions || !duration) {
        return next(new ErrorHandler("Title, questions, and duration are required!", 400));
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
        return next(new ErrorHandler("Questions must be a non-empty array!", 400));
    }

    // Validate each question object
    for (const question of questions) {
        if (!question.question || !question.options || !question.correctAnswer) {
            return next(new ErrorHandler("Each question must have a question, options, and correctAnswer!", 400));
        }
        if (!Array.isArray(question.options) || question.options.length === 0) {
            return next(new ErrorHandler("Options must be a non-empty array!", 400));
        }
    }

    // Create the quiz
    const newQuiz = await Quiz.create({
        title,
        description: description || "", // Optional field
        questions,
        duration,
        createdBy: req.user.id, // Assuming user is authenticated
    });

    res.status(201).json({
        success: true,
        message: "Quiz added successfully!",
        quiz: newQuiz,
    });
});

// ✅ Update Quiz
export const updateQuiz = catchAsyncErrors(async (req, res, next) => {
    const { title, description, questions, duration } = req.body;

    // Validate required fields
    if (!title || !questions || !duration) {
        return next(new ErrorHandler("Title, questions, and duration are required!", 400));
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
        return next(new ErrorHandler("Questions must be a non-empty array!", 400));
    }

    // Validate each question object
    for (const question of questions) {
        if (!question.question || !question.options || !question.correctAnswer) {
            return next(new ErrorHandler("Each question must have a question, options, and correctAnswer!", 400));
        }
        if (!Array.isArray(question.options) || question.options.length === 0) {
            return next(new ErrorHandler("Options must be a non-empty array!", 400));
        }
    }

    // Update the quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
        req.params.id,
        { title, description, questions, duration },
        { new: true, runValidators: true }
    );

    if (!updatedQuiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    res.status(200).json({
        success: true,
        message: "Quiz updated successfully!",
        quiz: updatedQuiz,
    });
});

// 🗑 Pura Quiz Delete Karne Ka Function
export const deleteQuiz = catchAsyncErrors(async (req, res, next) => {
    const { id } = req.params;

    // ✅ Check if Quiz Exists
    const quiz = await Quiz.findById(id);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    // ✅ Delete Quiz
    await Quiz.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: "Quiz deleted successfully!",
    });
});

// 🔹 Sirf Ek Question Delete Karne Ka Controller
export const deleteQuestion = catchAsyncErrors(async (req, res, next) => {
    const { quizId, questionId } = req.params;

    // ✅ Check if Quiz Exists
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    // ✅ Remove Specific Question
    quiz.questions = quiz.questions.filter(q => q._id.toString() !== questionId);

    // ✅ Save Updated Quiz
    await quiz.save();

    res.status(200).json({
        success: true,
        message: "Question deleted successfully!",
    });
});


// ✅ Get All Quizzes
export const getAllQuizzes = catchAsyncErrors(async (req, res, next) => {
    let quizzes;
  
    if (req.user.role === "admin") {
      quizzes = await Quiz.find();
    } else {
      const latestQuiz = await Quiz.findOne().sort({ createdAt: -1 });
      const completedQuizzes = await CompletedQuiz.find({ student: req.user._id })
        .populate("quiz")
        .select("quiz");
      const completedQuizIds = completedQuizzes.map((cq) => cq.quiz);
      quizzes = [latestQuiz, ...completedQuizIds].filter(Boolean);
    }
  
    res.status(200).json({ success: true, quizzes });
  });

// ✅ Get Single Quiz
export const getSingleQuiz = catchAsyncErrors(async (req, res, next) => {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
        return next(new ErrorHandler("Quiz not found!", 404));
    }

    res.status(200).json({
        success: true,
        quiz,
    });
});

export const submitQuiz = catchAsyncErrors(async (req, res, next) => {
  const { quizId } = req.params;
  const { answers } = req.body;
  const userId = req.user.id;

  // Check if the student has already taken this quiz
  const previousAttempt = await CompletedQuiz.findOne({ quiz: quizId, student: userId });
  if (previousAttempt) {
    return res.status(400).json({
      success: false,
      message: "You have already taken this quiz.",
      result: previousAttempt,
    });
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) return next(new ErrorHandler("Quiz not found", 404));

  let score = 0;
  quiz.questions.forEach((q, index) => {
    if (q.correctAnswer === answers[index].selectedOption) score++;
  });

  const percentage = (score / quiz.questions.length) * 100;

  // Save the quiz result in the CompletedQuiz collection
  const completedQuiz = await CompletedQuiz.create({
    student: userId,
    quiz: quizId,
    score,
    totalQuestions: quiz.questions.length,
    percentage,
    questions: quiz.questions.map((q, index) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      selectedOption: answers[index].selectedOption,
    })),
  });

  // Save the score in the Score collection
  try {
    console.log("Creating Score document with data:", {
      quizId: quizId,
      studentId: userId,
      score: score,
      totalQuestions: quiz.questions.length,
      percentage: percentage,
    });

    const newScore = await Score.create({
      quizId: quizId,
      studentId: userId,
      score: score,
      totalQuestions: quiz.questions.length,
      percentage: percentage,
    });

    console.log("Score document created successfully:", newScore);
  } catch (error) {
    console.error("Error creating Score document:", error);
    if (error.name === "ValidationError") {
      console.error("Validation Error Details:", error.errors);
    }
    return next(new ErrorHandler("Failed to save score", 500));
  }

  res.status(200).json({ success: true, message: "Quiz submitted", result: completedQuiz });
});

export const getQuizLeaderboard = catchAsyncErrors(async (req, res, next) => {
  const { quizId } = req.params;

  // Validate quizId
  if (!quizId) {
    return res.status(400).json({ success: false, message: "Quiz ID is required" });
  }

  console.log("Fetching leaderboard for quizId:", quizId); // Debugging

  // Fetch all students who took the quiz, sorted by score (descending)
  const leaderboard = await Score.find({ quizId })
    .sort({ score: -1 }) // Sort by score in descending order
    .populate({
      path: "studentId", // Ensure this matches the field name in the Score model
      select: "fullName avatar", // Select 'fullName' and 'avatar' fields from the User model
    });

  console.log("Leaderboard data:", JSON.stringify(leaderboard, null, 2)); // Debugging

  res.status(200).json({ success: true, leaderboard });
});

// Backend route to fetch the latest quiz

export const getLatestQuiz = catchAsyncErrors(async (req, res, next) => {
  // Fetch the latest quiz based on createdAt timestamp
  const latestQuiz = await Quiz.findOne().sort({ createdAt: -1 });

  if (!latestQuiz) {
    return next(new ErrorHandler("No quizzes found!", 404));
  }

  res.status(200).json({
    success: true,
    latestQuiz,
  });
});

export const saveCompletedQuiz = catchAsyncErrors(async (req, res, next) => {
    const { student, quiz, score, totalQuestions, percentage, questions } = req.body;
  
    const completedQuiz = new CompletedQuiz({
      student,
      quiz,
      score,
      totalQuestions,
      percentage,
      questions,
    });
  
    await completedQuiz.save();
    res.status(201).json({ message: "Quiz completed successfully", completedQuiz });
});

export const getCompletedQuizzes = catchAsyncErrors(async (req, res, next) => {
  const { studentId } = req.params;

  // Fetch completed quizzes
  const completedQuizzes = await CompletedQuiz.find({ student: studentId })
    .populate({
      path: "quiz",
      model: "Quiz",
    })
    .sort({ completedAt: -1 });

  console.log("Completed Quizzes:", completedQuizzes); 

  if (!completedQuizzes || completedQuizzes.length === 0) {
    return next(new ErrorHandler("No completed quizzes found", 404));
  }

  // Filter out null quizzes and format the response
  const formattedQuizzes = completedQuizzes
    .filter((quiz) => quiz.quiz !== null) // Filter out null quizzes
    .map((quiz) => ({
      score: {
        score: quiz.score,
        totalQuestions: quiz.totalQuestions,
        completedAt: quiz.completedAt,
      },
      quiz: quiz.quiz,
    }));

  res.status(200).json({
    success: true,
    completedQuizzes: formattedQuizzes,
  });
});




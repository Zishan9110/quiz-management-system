import mongoose from "mongoose";

const completedQuizSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  questions: [
    {
      question: {
        type: String,
        required: true,
      },
      options: {
        type: [String],
        required: true,
      },
      correctAnswer: {
        type: String,
        required: true,
      },
      selectedOption: {
        type: String,
        required: true,
      },
    },
  ],
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

export const CompletedQuiz = mongoose.model("CompletedQuiz", completedQuizSchema);
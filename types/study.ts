export interface Note {
  id: string;
  title: string;
  content: string | null;
  favorite: boolean;
  tags: string[];
  courseId: string | null;
  courseName: string | null;
  courseColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDraft {
  title: string;
  content: string | null;
  favorite?: boolean;
  tags?: string[];
  courseId?: string | null;
}

export interface Flashcard {
  id: string;
  courseId: string | null;
  courseName: string | null;
  noteId: string | null;
  front: string;
  back: string;
  tags: string[];
  isKnown: boolean;
  correctCount: number;
  incorrectCount: number;
  lastReviewed: string | null;
  createdAt: string;
}

export interface FlashcardDraft {
  front: string;
  back: string;
  tags: string[];
  courseId: string | null;
  noteId: string | null;
}

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  position: number;
}

export interface Quiz {
  id: string;
  courseId: string | null;
  courseName: string | null;
  title: string;
  description: string | null;
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizDraft {
  title: string;
  description: string | null;
  courseId: string | null;
  questions: {
    questionText: string;
    questionType: QuestionType;
    options: string[];
    correctAnswer: string;
    explanation: string | null;
  }[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  answers: { questionId: string; answer: string }[];
  score: number;
  total: number;
  createdAt: string;
}

export interface CourseOption {
  id: string;
  name: string;
  color: string | null;
}

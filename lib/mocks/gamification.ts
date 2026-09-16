export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: "trophy" | "flame" | "star" | "book" | "target";
}

export const mockBadges: Badge[] = [
  { id: "b1", name: "First Focus", description: "Complete your first Pomodoro", unlocked: true, icon: "target" },
  { id: "b2", name: "Streak Starter", description: "3-day study streak", unlocked: true, icon: "flame" },
  { id: "b3", name: "Week Warrior", description: "7-day study streak", unlocked: false, icon: "flame" },
  { id: "b4", name: "Note Taker", description: "Create 5 notes", unlocked: true, icon: "book" },
  { id: "b5", name: "Quiz Master", description: "Score 90%+ on 3 quizzes", unlocked: false, icon: "star" },
  { id: "b6", name: "Task Crusher", description: "Complete 20 tasks", unlocked: true, icon: "trophy" },
  { id: "b7", name: "Early Bird", description: "Study before 7am 5 times", unlocked: false, icon: "star" },
  { id: "b8", name: "Scholar", description: "Reach Level 5", unlocked: false, icon: "trophy" },
  { id: "b9", name: "Chem Whiz", description: "Ace Chemistry midterm", unlocked: false, icon: "book" },
];

export const mockXp = {
  total: 1240,
  level: 4,
  nextLevelXp: 1600,
  streakDays: 7,
};

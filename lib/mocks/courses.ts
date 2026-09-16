export interface MockCourse {
  id: string;
  name: string;
  section: string | null;
  room: string | null;
  teacherName: string | null;
  color: string | null;
  progress: number | null;
  weightedProgress: number | null;
  milestones: { label: string; date: string; done: boolean }[];
  upcomingAssignments: { id: string; title: string; dueAt: string | null }[];
}

export const mockCourses: MockCourse[] = [
  {
    id: "c1",
    name: "Advanced Calculus",
    section: "MATH-301",
    room: "Room 204",
    teacherName: "Prof. Evelyn Reed",
    color: "#0033A0",
    progress: 0.72,
    weightedProgress: 0.78,
    milestones: [
      { label: "Midterm Exam", date: "2026-09-15", done: true },
      { label: "Project Proposal", date: "2026-09-28", done: true },
      { label: "Final Project", date: "2026-10-30", done: false },
      { label: "Final Exam", date: "2026-11-10", done: false },
    ],
    upcomingAssignments: [
      { id: "a1", title: "Problem Set 7 — Integrals", dueAt: new Date(Date.now() + 2 * 86400000).toISOString() },
      { id: "a2", title: "Project Draft Review", dueAt: new Date(Date.now() + 7 * 86400000).toISOString() },
    ],
  },
  {
    id: "c2",
    name: "Organic Chemistry",
    section: "CHEM-210",
    room: "Lab B",
    teacherName: "Dr. Marcus Chen",
    color: "#0EA5E9",
    progress: 0.64,
    weightedProgress: 0.61,
    milestones: [
      { label: "Lab Report 2", date: "2026-09-18", done: true },
      { label: "Midterm", date: "2026-10-02", done: false },
      { label: "Lab Final", date: "2026-11-05", done: false },
    ],
    upcomingAssignments: [
      { id: "a3", title: "Lab Report — Titration", dueAt: new Date(Date.now() + 1 * 86400000).toISOString() },
    ],
  },
  {
    id: "c3",
    name: "Modern World History",
    section: "HIST-150",
    room: "Room 112",
    teacherName: "Prof. Sarah Whitmore",
    color: "#F59E0B",
    progress: 0.88,
    weightedProgress: 0.85,
    milestones: [
      { label: "Essay 1", date: "2026-08-30", done: true },
      { label: "Presentation", date: "2026-09-20", done: false },
    ],
    upcomingAssignments: [
      { id: "a4", title: "Essay — Industrial Revolution", dueAt: new Date(Date.now() + 4 * 86400000).toISOString() },
    ],
  },
  {
    id: "c4",
    name: "Computer Science Fundamentals",
    section: "CS-101",
    room: "Lab A",
    teacherName: "Dr. Aisha Khan",
    color: "#10B981",
    progress: null,
    weightedProgress: null,
    milestones: [
      { label: "Sprint 1 Demo", date: "2026-09-12", done: true },
      { label: "Sprint 2 Demo", date: "2026-10-01", done: false },
    ],
    upcomingAssignments: [],
  },
];

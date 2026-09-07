export interface MockCalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "class" | "exam" | "assignment" | "personal";
  course?: string;
  location?: string;
}

function isoDaysFromToday(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
function isoEnd(startIso: string, durationMin: number) {
  return new Date(new Date(startIso).getTime() + durationMin * 60000).toISOString();
}

const s1 = isoDaysFromToday(0, 9, 0);
const s2 = isoDaysFromToday(0, 11, 0);
const s3 = isoDaysFromToday(1, 10, 0);
const s4 = isoDaysFromToday(1, 14, 0);
const s5 = isoDaysFromToday(2, 9, 30);
const s6 = isoDaysFromToday(3, 15, 0);

export const mockCalendarEvents: MockCalEvent[] = [
  { id: "e1", title: "Advanced Calculus Lecture", start: s1, end: isoEnd(s1, 60), kind: "class", course: "MATH-301", location: "Room 204" },
  { id: "e2", title: "Chemistry Lab — Titration", start: s2, end: isoEnd(s2, 120), kind: "class", course: "CHEM-210", location: "Lab B" },
  { id: "e3", title: "Essay Due — Industrial Revolution", start: isoDaysFromToday(1, 23, 59), end: isoDaysFromToday(1, 23, 59), kind: "assignment", course: "HIST-150" },
  { id: "e4", title: "Study Group", start: s3, end: isoEnd(s3, 90), kind: "personal", location: "Library 2F" },
  { id: "e5", title: "Midterm — Organic Chemistry", start: s4, end: isoEnd(s4, 90), kind: "exam", course: "CHEM-210", location: "Room 101" },
  { id: "e6", title: "Problem Set 7 Due", start: isoDaysFromToday(2, 23, 59), end: isoDaysFromToday(2, 23, 59), kind: "assignment", course: "MATH-301" },
  { id: "e7", title: "Dentist Appointment", start: s5, end: isoEnd(s5, 60), kind: "personal" },
  { id: "e8", title: "CS Sprint Demo", start: s6, end: isoEnd(s6, 60), kind: "class", course: "CS-101" },
  { id: "e9", title: "Gym", start: isoDaysFromToday(0, 17, 0), end: isoEnd(isoDaysFromToday(0, 17, 0), 60), kind: "personal" },
];

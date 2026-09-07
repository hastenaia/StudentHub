export interface MockNote {
  id: string;
  title: string;
  course: string;
  courseId: string;
  tags: string[];
  updatedAt: string;
  bodyMd: string;
  pdfUrl: string | null;
  pdfName: string | null;
}

export const mockNotes: MockNote[] = [
  {
    id: "n1",
    title: "Calculus — Integration Techniques",
    course: "Advanced Calculus",
    courseId: "c1",
    tags: ["exam", "formulas"],
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    pdfUrl: "#",
    pdfName: "calculus-notes.pdf",
    bodyMd: `# Integration Techniques

## Substitution
Let $u = g(x)$, then $\\int f(g(x)) g'(x) dx = \\int f(u) du$.

## Integration by Parts
$\\int u dv = uv - \\int v du$

> Tip: Choose $u$ via **LIATE** (Log, Inverse trig, Algebraic, Trig, Exponential).

- Example: $\\int x e^x dx = x e^x - e^x + C$
- Practice 5 problems from Problem Set 7
`,
  },
  {
    id: "n2",
    title: "Chemistry — Titration Lab Prep",
    course: "Organic Chemistry",
    courseId: "c2",
    tags: ["lab", "procedure"],
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    pdfUrl: null,
    pdfName: null,
    bodyMd: `# Titration Procedure

1. Rinse burette with titrant
2. Fill to 0.00 mL, remove air bubble
3. Add 3 drops phenolphthalein to analyte
4. Titrate until faint pink persists 30s

**Safety:** Goggles + gloves mandatory.`,
  },
  {
    id: "n3",
    title: "History — Industrial Revolution Notes",
    course: "Modern World History",
    courseId: "c3",
    tags: ["essay", "sources"],
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    pdfUrl: "#",
    pdfName: "industrial-revolution-sources.pdf",
    bodyMd: `# Industrial Revolution (1760–1840)

Key drivers: **steam power**, **textiles**, **iron**.

- Spinning Jenny (1764) — Hargreaves
- Watt steam engine (1776)
- Social impact: urbanization, child labor

Sources: Hobsbawm Ch.3, Allen pp.44–61`,
  },
];

export const mockAiSummary = `**One-click summary:** Integration by parts and u-substitution are the two core techniques. Remember LIATE for choosing $u$, and practice the $x e^x$ pattern — it appears on the midterm.`;

export const mockFlashcards = [
  { q: "What does LIATE stand for?", a: "Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential — order for choosing u in integration by parts." },
  { q: "∫ x e^x dx = ?", a: "x e^x − e^x + C" },
  { q: "When to use u-substitution?", a: "When integrand contains a function and its derivative: ∫ f(g(x))·g′(x) dx." },
  { q: "Watt steam engine year?", a: "1776 (improved design)" },
  { q: "Titration endpoint sign?", a: "Faint pink persisting 30 seconds with phenolphthalein." },
];

export const mockQuiz = [
  {
    q: "Which is the best choice for u in ∫ x·cos(x) dx?",
    options: ["x", "cos(x)", "x·cos(x)", "dx"],
    answer: 0,
  },
  {
    q: "Titration requires how many drops of phenolphthalein?",
    options: ["1", "3", "10", "Until dark pink"],
    answer: 1,
  },
  {
    q: "Spinning Jenny was invented in:",
    options: ["1764", "1776", "1804", "1840"],
    answer: 0,
  },
];

import type { InterventionType, RiskBand } from "@/lib/mock/types";

/**
 * A deterministic, schema-shaped population for the dashboard.
 *
 * This is generated sample data, not institutional data. It exists so the
 * dashboard's numbers are *derived* from a population rather than typed into
 * the markup. The generator is seeded, so server and client render identically.
 */

export const NOW = new Date("2026-11-17T15:20:00+05:30");

function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261117);
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] ?? items[0]!;
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const FIRST = [
  "Aarav", "Neha", "Ishan", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vivaan", "Saanvi",
  "Aditya", "Ira", "Arjun", "Tara", "Dev", "Kiara", "Neel", "Myra", "Reyansh", "Anika",
  "Krish", "Aisha", "Yash", "Riya", "Advait", "Pooja", "Siddharth", "Nandini", "Manav", "Shreya",
  "Parth", "Aarohi", "Harsh", "Tanvi", "Nikhil", "Sneha", "Omkar", "Vedika", "Rahul", "Priya",
  "Sagar", "Kavya", "Tejas", "Nisha", "Aniket", "Radhika", "Varun", "Isha",
] as const;

const LAST = [
  "Menon", "Kulkarni", "Rao", "Sharma", "Shah", "Iyer", "Patil", "Deshpande", "Bhosale", "Nair",
  "Joshi", "Gupta", "Mehta", "Desai", "Pillai", "Kamat", "Verma", "Chavan", "Reddy", "Bhat",
  "Kulkarni", "Sethi", "Mishra", "Agarwal", "Naik", "Pathak", "Rane", "Sawant", "Thakur", "Bhatt",
] as const;

const PROGRAMMES = [
  { code: "CS", name: "B.Tech Computer Science", department: "Computer Science" },
  { code: "IT", name: "B.Tech Information Technology", department: "Information Technology" },
  { code: "EE", name: "B.Tech Electrical Engineering", department: "Electrical Engineering" },
  { code: "ME", name: "B.Tech Mechanical Engineering", department: "Mechanical Engineering" },
  { code: "CE", name: "B.Tech Civil Engineering", department: "Civil Engineering" },
  { code: "EC", name: "B.Tech Electronics Engineering", department: "Electronics Engineering" },
] as const;

const ADVISORS = [
  "Dr. R. Okafor", "Dr. P. Nair", "Dr. M. Fernandes", "Dr. S. Iyer", "Dr. A. Kulkarni", "Dr. T. Bose",
] as const;

const DRIVERS = [
  "Attendance fell below 65% in a core subject",
  "Two assessments missed in the last three weeks",
  "Weighted mark down 12 points since midterm",
  "Three unexcused absences in 14 days",
  "Prerequisite subject at risk of failing",
  "No advisor contact logged in 21 days",
  "Assignment submission rate below 60%",
  "Lab attendance at 68% in two sections",
] as const;

export type Band = RiskBand;

export interface PopulationStudent {
  id: string;
  name: string;
  roll: string;
  programme: string;
  department: string;
  advisor: string;
  band: Band;
  score: number;
  driver: string;
  slaDueAt: Date;
  overdue: boolean;
  intervention: InterventionType;
}

const BAND_RANGE: Record<Band, [number, number]> = {
  low: [6, 42],
  medium: [45, 62],
  high: [66, 83],
  critical: [86, 96],
};

/** The students with detail pages, held at fixed identifiers and scores. */
const FEATURED: Array<Omit<PopulationStudent, "slaDueAt" | "overdue"> & { dueInHours: number }> = [
  {
    id: "neha-kulkarni", name: "Neha Kulkarni", roll: "2023CS117",
    programme: "B.Tech Computer Science", department: "Computer Science",
    advisor: "Dr. R. Okafor", band: "critical", score: 89,
    driver: "Three missed labs and an unpaid balance", intervention: "tutoring", dueInHours: -33,
  },
  {
    id: "aarav-menon", name: "Aarav Menon", roll: "2023CS041",
    programme: "B.Tech Computer Science", department: "Computer Science",
    advisor: "Dr. R. Okafor", band: "high", score: 78,
    driver: "Attendance fell to 62% in CS301", intervention: "outreach", dueInHours: 3,
  },
  {
    id: "kabir-shah", name: "Kabir Shah", roll: "2023CS052",
    programme: "B.Tech Computer Science", department: "Computer Science",
    advisor: "Dr. R. Okafor", band: "high", score: 71,
    driver: "Two missed assessments in CS302", intervention: "meeting", dueInHours: 26,
  },
  {
    id: "ishan-rao", name: "Ishan Rao", roll: "2022EE008",
    programme: "B.Tech Electrical Engineering", department: "Electrical Engineering",
    advisor: "Dr. P. Nair", band: "medium", score: 57,
    driver: "Attendance 74% in two lab sections", intervention: "outreach", dueInHours: 51,
  },
  {
    id: "diya-sharma", name: "Diya Sharma", roll: "2023ME023",
    programme: "B.Tech Mechanical Engineering", department: "Mechanical Engineering",
    advisor: "Dr. M. Fernandes", band: "medium", score: 52,
    driver: "Missed the ME310 design review", intervention: "referral", dueInHours: 75,
  },
  {
    id: "meera-iyer", name: "Meera Iyer", roll: "2022CS004",
    programme: "B.Tech Computer Science", department: "Computer Science",
    advisor: "Dr. S. Iyer", band: "low", score: 24,
    driver: "Attendance recovered to 88%", intervention: "outreach", dueInHours: 96,
  },
];

/** Target head-count per band for the whole institution. */
const BAND_TARGET: Record<Band, number> = { low: 1042, medium: 186, high: 47, critical: 9 };

function makeStudent(band: Band, index: number): PopulationStudent {
  const programme = pick(PROGRAMMES);
  const first = pick(FIRST);
  const last = pick(LAST);
  const [lo, hi] = BAND_RANGE[band];
  // Overdue work should be the exception, not a third of the institution.
  const isOverdue = rand() < 0.009;
  const dueOffset = isOverdue ? between(-36, -2) : between(3, 96);
  const due = new Date(NOW.getTime() + dueOffset * 3600 * 1000);

  return {
    id: `stu_${index.toString().padStart(4, "0")}`,
    name: `${first} ${last}`,
    roll: `20${23 - (index % 3)}${programme.code}${(index % 180).toString().padStart(3, "0")}`,
    programme: programme.name,
    department: programme.department,
    advisor: pick(ADVISORS),
    band,
    score: between(lo, hi),
    driver: pick(DRIVERS),
    slaDueAt: due,
    overdue: isOverdue,
    intervention: pick(["outreach", "tutoring", "meeting", "referral"] as const),
  };
}

function buildPopulation(): PopulationStudent[] {
  const featured: PopulationStudent[] = FEATURED.map((student) => {
    const due = new Date(NOW.getTime() + student.dueInHours * 3600 * 1000);
    return {
      id: student.id,
      name: student.name,
      roll: student.roll,
      programme: student.programme,
      department: student.department,
      advisor: student.advisor,
      band: student.band,
      score: student.score,
      driver: student.driver,
      intervention: student.intervention,
      slaDueAt: due,
      overdue: due.getTime() < NOW.getTime(),
    };
  });

  const featuredByBand = featured.reduce<Record<Band, number>>(
    (acc, student) => ({ ...acc, [student.band]: acc[student.band] + 1 }),
    { low: 0, medium: 0, high: 0, critical: 0 },
  );

  const result = [...featured];
  let index = 0;

  for (const band of ["critical", "high", "medium", "low"] as Band[]) {
    const remaining = BAND_TARGET[band] - featuredByBand[band];
    for (let i = 0; i < remaining; i += 1) {
      result.push(makeStudent(band, index));
      index += 1;
    }
  }

  return result;
}

export const population = buildPopulation();

const atRisk = population.filter((s) => s.band === "high" || s.band === "critical");
const overdue = population.filter((s) => s.overdue);

/** One decision per student in the current cycle; nine breached their SLA. */
const DECIDED = 129;
const BREACHED = 9;

export const summary = {
  students: population.length,
  atRisk: atRisk.length,
  critical: population.filter((s) => s.band === "critical").length,
  overdue: overdue.length,
  slaPct: Math.round(((DECIDED - BREACHED) / DECIDED) * 100),
  newThisWeek: 12,
  deltaAtRisk: -4,
};

export const bandCounts: Array<{ band: Band; label: string; count: number }> = [
  { band: "low", label: "Low", count: population.filter((s) => s.band === "low").length },
  { band: "medium", label: "Medium", count: population.filter((s) => s.band === "medium").length },
  { band: "high", label: "High", count: population.filter((s) => s.band === "high").length },
  { band: "critical", label: "Critical", count: population.filter((s) => s.band === "critical").length },
];

export const interventionMix: Array<{ type: InterventionType; count: number }> = (
  ["outreach", "tutoring", "meeting", "referral"] as const
).map((type) => ({
  type,
  count: population.filter((s) => s.intervention === type && (s.band === "high" || s.band === "critical"))
    .length,
}));

/** Twelve-week flagged/resolved counts for the trend strip. */
export const weeklyFlagged = [
  { week: "W1", flagged: 18 },
  { week: "W2", flagged: 22 },
  { week: "W3", flagged: 19 },
  { week: "W4", flagged: 27 },
  { week: "W5", flagged: 24 },
  { week: "W6", flagged: 31 },
  { week: "W7", flagged: 28 },
  { week: "W8", flagged: 35 },
  { week: "W9", flagged: 30 },
  { week: "W10", flagged: 26 },
  { week: "W11", flagged: 22 },
  { week: "W12", flagged: 19 },
];

export const recentActivity = [
  { id: "a1", minutesAgo: 6, actor: "Dr. R. Okafor", verb: "approved outreach for", object: "Neha Kulkarni" },
  { id: "a2", minutesAgo: 38, actor: "Risk sweep", verb: "opened a case for", object: "Aarav Menon" },
  { id: "a3", minutesAgo: 74, actor: "Dr. P. Nair", verb: "completed a follow-up with", object: "Ishan Rao" },
  { id: "a4", minutesAgo: 132, actor: "Dr. M. Fernandes", verb: "rejected a referral for", object: "Kabir Shah" },
  { id: "a5", minutesAgo: 208, actor: "Fabric", verb: "synced 2,410 submissions from", object: "Canvas LMS" },
  { id: "a6", minutesAgo: 320, actor: "Nightly sweep", verb: "scanned", object: "1,284 enrolments" },
];

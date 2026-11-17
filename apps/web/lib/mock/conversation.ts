import type { ChatTurn } from "./types";

export const seedConversation: ChatTurn[] = [
  {
    id: "turn_1",
    role: "student",
    content: "Can I drop CS301? It's been a lot this term.",
  },
  {
    id: "turn_2",
    role: "assistant",
    generated: true,
    content:
      "You can, but it has a cost. Dropping CS301 takes you from 12 credits to 8, which is below the 12-credit minimum for full-time status this term. It also puts the Operating Systems requirement behind by one term, and CS310 assumes it.",
    citations: [
      { kind: "fact", label: "Enrolment · 12 credits" },
      { kind: "document", label: "Academic Regulations 2026 §3.1" },
      { kind: "document", label: "Programme requirements · CS core" },
    ],
  },
  {
    id: "turn_3",
    role: "student",
    content: "What if I just stop attending?",
  },
  {
    id: "turn_4",
    role: "assistant",
    generated: true,
    content:
      "That is worse than dropping. CS301 requires 75% attendance to sit the final; you are at 62%. Stopping attendance means you fail the assessment and still carry the credits, and the withdrawal window closes on 21 November.",
    citations: [
      { kind: "fact", label: "Attendance · 13 of 21 sessions" },
      { kind: "document", label: "Academic Regulations 2026 §4.2" },
    ],
  },
  {
    id: "turn_5",
    role: "student",
    content: "Is there a way to keep the credits and fix the attendance?",
  },
  {
    id: "turn_6",
    role: "assistant",
    generated: true,
    requiresApproval: true,
    content:
      "Yes — a section swap rather than a drop. There is an evening section of CS301 (section 04) with 6 seats. Moving you there keeps you at 12 credits, keeps the requirement on track, and the evening slot does not clash with your Tuesday lab. Your advisor has to approve any section change, so I have prepared the request rather than submitting it.",
    citations: [
      { kind: "fact", label: "Timetable · evening section 04" },
      { kind: "fact", label: "Attendance · 62%" },
      { kind: "document", label: "Registration policy §5.4" },
    ],
  },
];

export const suggestedFollowUps = [
  "Send this swap to Dr. Okafor for approval",
  "Show me the CS301 attendance record",
  "What happens if I do nothing?",
];

/** Scripted replies — keyword matched. No model is called. */
export function scriptedReply(input: string): ChatTurn {
  const text = input.toLowerCase();

  if (text.includes("attendance") || text.includes("absent")) {
    return {
      id: `turn_${Date.now()}`,
      role: "assistant",
      generated: true,
      content:
        "Your CS301 attendance is 62% — 13 of 21 sessions. The course needs 75% to sit the final, so you are three sessions short. Attending Tuesday and Thursday this week brings you to 71%.",
      citations: [
        { kind: "fact", label: "Attendance · 13 of 21 sessions" },
        { kind: "document", label: "Academic Regulations 2026 §4.2" },
      ],
    };
  }

  if (text.includes("drop") || text.includes("withdraw")) {
    return {
      id: `turn_${Date.now()}`,
      role: "assistant",
      generated: true,
      requiresApproval: true,
      content:
        "Dropping CS301 would take you to 8 credits, below the 12-credit full-time floor, and the withdrawal window closes on 21 November. A section swap keeps the credits and the requirement intact. I can draft that for your advisor — I cannot submit it.",
      citations: [
        { kind: "fact", label: "Enrolment · 12 credits" },
        { kind: "document", label: "Registration policy §5.4" },
      ],
    };
  }

  if (text.includes("deadline") || text.includes("due")) {
    return {
      id: `turn_${Date.now()}`,
      role: "assistant",
      generated: true,
      content:
        "Two things are due this week: the CS302 lab report on Thursday 18:00, and the MA201 problem set on Friday. The CS301 final-exam eligibility check runs at the end of the month.",
      citations: [
        { kind: "fact", label: "Assignments · next 7 days" },
        { kind: "document", label: "Assessment calendar 2026-FA" },
      ],
    };
  }

  return {
    id: `turn_${Date.now()}`,
    role: "assistant",
    generated: true,
    content:
      "I can answer questions about your own record — attendance, marks, deadlines and programme requirements. Anything that changes your record goes to your advisor as a request, not an action. Ask me about attendance, a drop, or this week's deadlines.",
    citations: [
      { kind: "document", label: "Advisor scope · demo" },
    ],
  };
}

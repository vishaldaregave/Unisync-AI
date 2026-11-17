/**
 * Presentation prototype types.
 *
 * These mirror the *conceptual* model approved in the architecture documents.
 * Nothing here is backed by a database — every value is sample data.
 */

export type RiskBand = "low" | "medium" | "high" | "critical";

export type InterventionType = "outreach" | "tutoring" | "meeting" | "referral";
export type InterventionStatus = "proposed" | "awaiting_approval" | "active" | "completed";

export type ActionKind =
  | "send_message"
  | "create_support_referral"
  | "schedule_appointment"
  | "create_followup_task";

export type Decision = "approved" | "rejected" | "edited";

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  term: string;
  termLabel: string;
  timezone: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  programme: string;
  department: string;
  advisor: string;
  term: string;
  cgpa: number;
  creditsEarned: number;
  creditsInProgress: number;
  riskBand: RiskBand;
  riskScore: number;
  avatarHue: number;
}

export interface Enrollment {
  subjectCode: string;
  subjectName: string;
  credits: number;
  faculty: string;
  attendanceRate: number;
  sessionsAttended: number;
  sessionsTotal: number;
  weightedMark: number;
  trend: number;
}

export interface RiskDriver {
  feature: string;
  label: string;
  value: string;
  severity: number;
  weight: number;
  delta: number;
}

export interface RiskCase {
  id: string;
  studentId: string;
  severity: RiskBand;
  openedAt: string;
  owner: string;
  status: "open" | "monitoring" | "resolved";
  driver: string;
  slaDueAt: string;
}

export interface Intervention {
  id: string;
  caseId: string;
  studentId: string;
  type: InterventionType;
  status: InterventionStatus;
  owner: string;
  dueAt: string;
  outcome?: string;
}

export interface EvidenceItem {
  key: string;
  label: string;
  value: string;
  source: string;
}

export interface BlastRadiusWrite {
  table: string;
  effect: "create" | "update" | "append";
  rows: number;
}

export interface ProposedAction {
  id: string;
  kind: ActionKind;
  studentId: string;
  studentName: string;
  title: string;
  draft: string;
  rationale: string;
  evidence: EvidenceItem[];
  confidence: number;
  riskClass: "low" | "medium" | "high";
  slaDueAt: string;
  assignee: string;
  blastRadius: BlastRadiusWrite[];
}

export interface ApprovalRecord {
  id: string;
  actionId: string;
  actionTitle: string;
  studentName: string;
  decidedBy: string;
  decidedAt: string;
  decision: Decision;
  reason?: string;
  auditEntry: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  actor: string;
  verb: string;
  object: string;
  tone: "neutral" | "positive" | "warning";
}

export interface DataSource {
  id: string;
  name: string;
  kind: string;
  status: "connected" | "degraded" | "stale";
  records: number;
  lastSync: string;
  mode: "read-only" | "read · write-back";
}

export interface Citation {
  kind: "fact" | "document";
  label: string;
}

export interface ChatTurn {
  id: string;
  role: "assistant" | "student";
  content: string;
  citations?: Citation[];
  generated?: boolean;
  requiresApproval?: boolean;
}

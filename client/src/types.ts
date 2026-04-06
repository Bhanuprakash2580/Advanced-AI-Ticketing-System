export type Ticket = {
  id: string;
  subject: string;
  body: string;
  requester_email: string;
  status: string;
  category: string;
  ai_summary: string;
  severity: string;
  effective_severity: string;
  sentiment: string;
  recommended_resolution_path: string;
  confidence_score: number;
  estimated_resolution_minutes: number;
  suggested_department: string | null;
  suggested_employee_id: string | null;
  assigned_department: string | null;
  assigned_employee_id: string | null;
  assigned_at: string | null;
  priority_bump: string | null;
  auto_response: string | null;
  auto_resolved: number;
  helpful_feedback: number | null;
  escalated: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  picked_up: number;
  deleted_at?: string | null;
  assignee: {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    skill_tags: string;
    availability: string;
  } | null;
  assignee_load: number | null;
  assignee_avg_minutes: number | null;
};

export type TimelineEvent = {
  id: string;
  ticket_id: string;
  event_type: string;
  message: string;
  actor: string;
  meta: string | null;
  created_at: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  skill_tags: string;
  availability: string;
  active: number;
  avg_resolution_minutes: number | null;
  current_load: number;
};

export type Analytics = {
  totals: {
    open: number;
    resolved: number;
    autoResolved: number;
    escalated: number;
  };
  autoResolutionSuccessRate: number | null;
  departmentLoad: { department: string; c: number }[];
  avgResolutionMinutesByDepartment: { department: string; avgMinutes: number }[];
  topCategoriesWeek: { category: string; c: number }[];
};

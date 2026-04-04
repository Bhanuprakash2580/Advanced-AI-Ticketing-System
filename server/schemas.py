from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Common schemas for clean and easy-to-read validation
class EmployeeBase(BaseModel):
    name: str
    email: str
    department: str
    role: str
    skill_tags: List[str]
    availability: str = "Available"

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    skill_tags: Optional[List[str]] = None
    availability: Optional[str] = None
    active: Optional[bool] = None

class EmployeeOut(EmployeeBase):
    id: str
    active: bool
    current_load: int = 0
    avg_resolution_minutes: Optional[float] = None
    created_at: datetime

class TicketCreate(BaseModel):
    subject: str
    body: str
    requester_email: str

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    internal_note: Optional[str] = None
    actor: str = "agent"

class AssignmentUpdate(BaseModel):
    department: str
    employeeId: Optional[str] = None
    actor: str = "ops-admin"

class FeedbackCreate(BaseModel):
    helpful: bool

class InfoRequestCreate(BaseModel):
    message: str
    actor: str = "agent"

class AnalyticsOut(BaseModel):
    totals: dict
    autoResolutionSuccessRate: Optional[float] = None
    departmentLoad: List[dict]
    avgResolutionMinutesByDepartment: List[dict]
    topCategoriesWeek: List[dict]
    
class TimelineOut(BaseModel):
    id: str
    ticket_id: str
    event_type: str
    message: str
    actor: str
    meta: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TicketOut(BaseModel):
    id: str
    subject: str
    body: str
    requester_email: str
    status: str
    category: str
    ai_summary: str
    severity: str
    effective_severity: str
    sentiment: str
    recommended_resolution_path: str
    confidence_score: float
    estimated_resolution_minutes: int
    suggested_department: Optional[str] = None
    suggested_employee_id: Optional[str] = None
    assigned_department: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    assigned_at: Optional[datetime] = None
    auto_response: Optional[str] = None
    auto_resolved: int
    helpful_feedback: Optional[int] = None
    escalated: int
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    picked_up: int
    deleted_at: Optional[datetime] = None

    assignee: Optional[dict] = None
    assignee_load: Optional[int] = None
    assignee_avg_minutes: Optional[float] = None

    class Config:
        from_attributes = True

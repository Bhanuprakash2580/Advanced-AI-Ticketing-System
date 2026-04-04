import os
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

import db
import ai_service
import ticket_logic
import schemas

# Load environment variables (OPENAI_API_KEY, etc)
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AI Ticketing API")

# Setup CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# SSE message queue (simple in-memory signaling)
bus = asyncio.Queue()

async def broadcast(message: str = "refresh"):
    """Pushes a refresh signal to the SSE queue."""
    await bus.put(message)

# ─── DATABASE INITIALIZATION ───

@app.on_event("startup")
async def startup_event():
    """Initializes the SQLite database when the server starts."""
    db.init_db()
    # Start the background escalation task
    asyncio.create_task(run_escalation_loop())
    # Start the 30-day trash cleanup task
    asyncio.create_task(run_cleanup_loop())

async def run_escalation_loop():
    """Rule: Check for high-priority tickets sitting unassigned/unpicked for 2 hours."""
    while True:
      await asyncio.sleep(60) # Run every minute
      conn = db.get_connection()
      cursor = conn.cursor()
      # Find high-priority tickets that are assigned but not picked up
      cursor.execute("SELECT * FROM tickets WHERE status='Assigned' AND picked_up=0 AND effective_severity IN ('High', 'Critical')")
      rows = [dict(r) for r in cursor.fetchall()]
      
      for t in rows:
        if ticket_logic.should_escalate(t):
          cursor.execute("UPDATE tickets SET escalated=1, status='New', assigned_employee_id=NULL, updated_at=? WHERE id=?", 
                         (datetime.utcnow().isoformat(), t["id"]))
          log_event(cursor, t["id"], "escalation", "SLA Breach: Ticket escalated to queue.", "system")
          await broadcast()
      
      conn.commit()
      conn.close()

async def run_cleanup_loop():
    """Rule: Permanently delete tickets that were soft-deleted over 30 days ago."""
    while True:
      await asyncio.sleep(3600)  # Check every hour
      conn = db.get_connection()
      cursor = conn.cursor()
      thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
      
      # Delete events and notifications associated with purged tickets
      cursor.execute("DELETE FROM ticket_events WHERE ticket_id IN (SELECT id FROM tickets WHERE deleted_at <= ?)", (thirty_days_ago,))
      cursor.execute("DELETE FROM notifications WHERE ticket_id IN (SELECT id FROM tickets WHERE deleted_at <= ?)", (thirty_days_ago,))
      cursor.execute("DELETE FROM tickets WHERE deleted_at <= ?", (thirty_days_ago,))
      
      conn.commit()
      conn.close()

# ─── HELPER LOGGING ───

def log_event(cursor, ticket_id, event_type, message, actor, meta=None):
    """Adds a timeline event record to the database."""
    cursor.execute("""
      INSERT INTO ticket_events (id, ticket_id, event_type, message, actor, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), ticket_id, event_type, message, actor, json.dumps(meta) if meta else None, datetime.utcnow().isoformat()))

# ─── TICKETS API ───

@app.post("/api/tickets")
async def create_ticket(req: schemas.TicketCreate):
    """
    Module 1: Intake & AI Analysis
    Module 2: Auto-resolution Engine
    Module 3: Intelligent Department Routing
    """
    id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # 1. ANALYZE CONTENT WITH AI
    ai = ai_service.analyze_ticket(req.subject, req.body)
    
    # 2. DETERMINE DEPT ROUTING
    dept = ticket_logic.get_routing_department(ai.category)
    
    # 3. INITIAL DATA
    status = "New"
    auto_resolved = 0
    assigned_at = None
    emp_id = None
    
    if ai.auto_resolve:
        status = "Resolved"
        auto_resolved = 1
        
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # 4. FIND BEST ASSIGNEE IF NOT AUTO-RESOLVED
    if not ai.auto_resolve:
        cursor.execute("SELECT *, (SELECT COUNT(*) FROM tickets WHERE assigned_employee_id=employees.id AND status NOT IN ('Resolved', 'Closed')) as current_load FROM employees WHERE active=1 AND department=?", (dept,))
        emps = [dict(r) for r in cursor.fetchall()]
        best = ticket_logic.suggest_best_assignee(emps, ai.category, [ai.category])
        if best:
            emp_id = best["id"]
            status = "Assigned"
            assigned_at = now

    cursor.execute("""
      INSERT INTO tickets (id, subject, body, requester_email, status, category, ai_summary, severity, effective_severity, sentiment, recommended_resolution_path, confidence_score, estimated_resolution_minutes, suggested_department, suggested_employee_id, assigned_department, assigned_employee_id, assigned_at, auto_response, auto_resolved, resolved_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (id, req.subject, req.body, req.requester_email, status, ai.category, ai.ai_summary, ai.severity, ai.severity, ai.sentiment, ai.recommended_resolution_path, ai.confidence_score, ai.estimated_resolution_minutes, dept, emp_id, dept, emp_id, assigned_at, ai.auto_response, auto_resolved, now if auto_resolved == 1 else None, now, now))
    
    # LOG EVENTS
    log_event(cursor, id, "ai", "AI Analysis generated structured triage contract.", "ai", ai.dict())
    if ai.auto_resolve:
        log_event(cursor, id, "auto_resolve", "AI automatically resolved this ticket.", "ai")
        # Notify the requester
        cursor.execute("INSERT INTO notifications (id, ticket_id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                       (str(uuid.uuid4()), id, req.requester_email, f"Re: {req.subject}", ai.auto_response, now))
    elif emp_id:
        log_event(cursor, id, "assignment", f"Routed to {dept} and assigned to owner.", "system")
    else:
        log_event(cursor, id, "routing", f"Routed to {dept} for manual assignment.", "system")

    conn.commit()
    conn.close()
    await broadcast()
    return await get_ticket(id)

@app.get("/api/tickets")
async def list_tickets(status: Optional[str] = None, department: Optional[str] = None, severity: Optional[str] = None, q: Optional[str] = None, sort: str = "date", order: str = "desc"):
    """Lists tickets with optional filters and search."""
    conn = db.get_connection()
    q_str = "SELECT * FROM tickets WHERE 1=1"
    args = []
    if status == "Deleted":
        q_str += " AND deleted_at IS NOT NULL"
    else:
        q_str += " AND deleted_at IS NULL"
        if status:
            q_str += " AND status=?"
            args.append(status)
            
    if department:
        q_str += " AND assigned_department=?"
        args.append(department)
    if severity:
        q_str += " AND effective_severity=?"
        args.append(severity)
    if q:
        q_str += " AND (subject LIKE ? OR body LIKE ? OR requester_email LIKE ?)"
        term = f"%{q}%"
        args.extend([term, term, term])
    
    col = "created_at" if sort == "date" else "updated_at" if sort == "updated" else "effective_severity"
    q_str += f" ORDER BY {col} {'ASC' if order == 'asc' else 'DESC'}"
    
    cursor = conn.cursor()
    cursor.execute(q_str, args)
    rows = [dict(r) for r in cursor.fetchall()]
    
    # Enrich with assignee
    for t in rows:
        if t["assigned_employee_id"]:
            cursor.execute("SELECT * FROM employees WHERE id=?", (t["assigned_employee_id"],))
            emp = cursor.fetchone()
            t["assignee"] = dict(emp) if emp else None
    
    conn.close()
    return rows

@app.delete("/api/tickets/{id}")
async def soft_delete_ticket(id: str):
    """Soft deletes a ticket by setting deleted_at."""
    conn = db.get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("UPDATE tickets SET deleted_at=?, updated_at=? WHERE id=?", (now, now, id))
    log_event(cursor, id, "note", "Ticket moved to history (soft deleted).", "agent")
    conn.commit()
    conn.close()
    await broadcast()
    return {"status": "ok", "deleted_at": now}

@app.post("/api/tickets/{id}/restore")
async def restore_ticket(id: str):
    """Restores a soft-deleted ticket."""
    conn = db.get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("UPDATE tickets SET deleted_at=NULL, updated_at=? WHERE id=?", (now, id))
    log_event(cursor, id, "note", "Ticket restored from history.", "agent")
    conn.commit()
    conn.close()
    await broadcast()
    return {"status": "ok"}

@app.get("/api/tickets/{id}/timeline")
async def get_ticket_timeline(id: str):
    """Fetches the event history for a specific ticket."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ticket_events WHERE ticket_id=? ORDER BY created_at ASC", (id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.get("/api/tickets/{id}")
async def get_ticket(id: str):
    """Fetches a single ticket with details."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tickets WHERE id=?", (id,))
    t = cursor.fetchone()
    if not t:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    t_dict = dict(t)
    if t_dict["assigned_employee_id"]:
        cursor.execute("SELECT * FROM employees WHERE id=?", (t_dict["assigned_employee_id"],))
        emp = cursor.fetchone()
        t_dict["assignee"] = dict(emp) if emp else None
        
        # Current load for UI
        cursor.execute("SELECT COUNT(*) FROM tickets WHERE assigned_employee_id=? AND status NOT IN ('Resolved', 'Closed')", (t_dict["assigned_employee_id"],))
        t_dict["assignee_load"] = cursor.fetchone()[0]

        # Calculate average resolution time for UI
        cursor.execute("SELECT created_at, resolved_at FROM tickets WHERE assigned_employee_id=? AND resolved_at IS NOT NULL", (t_dict["assigned_employee_id"],))
        hist = cursor.fetchall()
        if hist:
            total_minutes = 0
            for row in hist:
                try:
                    c = datetime.fromisoformat(row["created_at"])
                    r = datetime.fromisoformat(row["resolved_at"])
                    total_minutes += (r - c).total_seconds() / 60
                except:
                    pass
            t_dict["assignee_avg_minutes"] = round(total_minutes / len(hist))
        else:
            t_dict["assignee_avg_minutes"] = None
        
    conn.close()
    return t_dict

@app.patch("/api/tickets/{id}")
async def update_ticket(id: str, req: schemas.TicketUpdate):
    """Updates status and internal notes."""
    now = datetime.utcnow().isoformat()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    updates = {"updated_at": now}
    if req.status:
        updates["status"] = req.status
        if req.status in ["Resolved", "Closed"]:
            updates["resolved_at"] = now
        
    set_clause = ", ".join([f"{k}=?" for k in updates.keys()])
    cursor.execute(f"UPDATE tickets SET {set_clause} WHERE id=?", list(updates.values()) + [id])
    
    if req.internal_note:
        log_event(cursor, id, "note", req.internal_note, req.actor)
    elif req.status:
        log_event(cursor, id, "status", f"Status changed to {req.status}.", req.actor)
        
    conn.commit()
    conn.close()
    await broadcast()
    return await get_ticket(id)

@app.post("/api/tickets/{id}/feedback")
async def ticket_feedback(id: str, req: schemas.FeedbackCreate):
    """Registers user feedback for auto-resolution improvement analysis."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE tickets SET helpful_feedback=? WHERE id=?", (1 if req.helpful else 0, id))
    log_event(cursor, id, "feedback", f"User marked this response as {'helpful' if req.helpful else 'not helpful'}.", "requester")
    conn.commit()
    conn.close()
    await broadcast()
    return await get_ticket(id)

@app.patch("/api/tickets/{id}/assignment")
async def update_assignment(id: str, req: schemas.AssignmentUpdate):
    """Module 3 & 4: Manual override for department and employee assignment."""
    now = datetime.utcnow().isoformat()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE tickets 
        SET assigned_department=?, assigned_employee_id=?, assigned_at=?, updated_at=? 
        WHERE id=?
    """, (req.department, req.employeeId, now, now, id))
    
    msg = f"Reassigned to {req.department}"
    if req.employeeId:
        cursor.execute("SELECT name FROM employees WHERE id=?", (req.employeeId,))
        emp = cursor.fetchone()
        if emp:
            msg += f" (Owner: {emp['name']})"
            
    log_event(cursor, id, "assignment", msg, req.actor)
    
    conn.commit()
    conn.close()
    await broadcast()
    return await get_ticket(id)

@app.post("/api/tickets/{id}/request-info")
async def request_info(id: str, req: schemas.InfoRequestCreate):
    """Module 5: Requesting more information from the requester."""
    now = datetime.utcnow().isoformat()
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Update status to Pending Info
    cursor.execute("UPDATE tickets SET status='Pending Info', updated_at=? WHERE id=?", (now, id))
    log_event(cursor, id, "request_info", req.message, req.actor)
    
    # Notify the requester (simulated inbox)
    cursor.execute("SELECT requester_email, subject FROM tickets WHERE id=?", (id,))
    ticket = cursor.fetchone()
    if ticket:
        cursor.execute("INSERT INTO notifications (id, ticket_id, to_email, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                       (str(uuid.uuid4()), id, ticket["requester_email"], f"Info Requested: {ticket['subject']}", req.message, now))
    
    conn.commit()
    conn.close()
    await broadcast()
    return {"status": "ok"}

# ─── NOTIFICATIONS API ───

@app.get("/api/notifications")
async def list_notifications(email: Optional[str] = None):
    """Lists notifications for a a specific user (inbox simulation)."""
    conn = db.get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM notifications"
    args = []
    if email:
        query += " WHERE to_email=?"
        args.append(email.strip())
    query += " ORDER BY created_at DESC"
    cursor.execute(query, args)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/notifications/{id}/read")
async def mark_notification_read(id: str):
    """Marks a notification as read."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET read_at=? WHERE id=?", (datetime.utcnow().isoformat(), id))
    conn.commit()
    conn.close()
    return {"status": "ok"}

# ─── EMPLOYEES API ───

@app.get("/api/employees")
async def list_employees():
    """Lists all employees with their metrics."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees ORDER BY department ASC, name ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    
    for r in rows:
        cursor.execute("SELECT COUNT(*) FROM tickets WHERE assigned_employee_id=? AND status NOT IN ('Resolved', 'Closed')", (r["id"],))
        r["current_load"] = cursor.fetchone()[0]
        # Handle string to list conversion for skill_tags if needed
        if isinstance(r["skill_tags"], str):
            r["skill_tags"] = json.loads(r["skill_tags"])
        r["avg_resolution_minutes"] = 15.0 

    conn.close()
    return rows

@app.post("/api/employees")
async def create_employee(req: schemas.EmployeeCreate):
    """Adds a new employee to the system."""
    id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO employees (id, name, email, department, role, skill_tags, availability, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (id, req.name, req.email, req.department, req.role, json.dumps(req.skill_tags), req.availability, now))
    conn.commit()
    conn.close()
    return await get_employee(id)

@app.get("/api/employees/{id}")
async def get_employee(id: str):
    """Fetches a single employee with all current metrics."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM employees WHERE id=?", (id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")
    
    r = dict(row)
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE assigned_employee_id=? AND status NOT IN ('Resolved', 'Closed')", (id,))
    r["current_load"] = cursor.fetchone()[0]
    if isinstance(r["skill_tags"], str):
        r["skill_tags"] = json.loads(r["skill_tags"])
    r["avg_resolution_minutes"] = 15.0
    conn.close()
    return r

@app.patch("/api/employees/{id}")
async def update_employee(id: str, req: schemas.EmployeeUpdate):
    """Updates an existing employee's details or status."""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    updates = {}
    if req.name is not None: updates["name"] = req.name
    if req.email is not None: updates["email"] = req.email
    if req.department is not None: updates["department"] = req.department
    if req.role is not None: updates["role"] = req.role
    if req.skill_tags is not None: updates["skill_tags"] = json.dumps(req.skill_tags)
    if req.availability is not None: updates["availability"] = req.availability
    if req.active is not None: updates["active"] = 1 if req.active else 0

    if not updates:
        conn.close()
        return await get_employee(id)

    set_clause = ", ".join([f"{k}=?" for k in updates.keys()])
    cursor.execute(f"UPDATE employees SET {set_clause} WHERE id=?", list(updates.values()) + [id])
    
    conn.commit()
    conn.close()
    await broadcast() # Signalling UI refresh via SSE
    return await get_employee(id)

# ─── DASHBOARD & SSE ───

@app.get("/api/analytics")
async def get_analytics():
    """Module 6: Dashboards & Analytics."""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT status, COUNT(*) as c FROM tickets WHERE deleted_at IS NULL GROUP BY status")
    stats = {r["status"]: r["c"] for r in cursor.fetchall()}
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE auto_resolved=1 AND deleted_at IS NULL")
    auto_total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE escalated=1 AND deleted_at IS NULL")
    escalated_total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE auto_resolved=1 AND helpful_feedback=1 AND deleted_at IS NULL")
    helpful = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tickets WHERE auto_resolved=1 AND helpful_feedback IS NOT NULL AND deleted_at IS NULL")
    total_feed = cursor.fetchone()[0]
    rate = round((helpful / total_feed * 100), 1) if total_feed > 0 else None

    # Dept load
    cursor.execute("SELECT assigned_department, COUNT(*) as c FROM tickets WHERE status NOT IN ('Resolved', 'Closed') AND deleted_at IS NULL GROUP BY assigned_department")
    load = [{"department": r["assigned_department"] or "Unknown", "c": r["c"]} for r in cursor.fetchall()]

    # Avg resolution minutes by department
    cursor.execute("""
        SELECT assigned_department, AVG((julianday(resolved_at) - julianday(created_at)) * 1440) as avg_min 
        FROM tickets 
        WHERE status IN ('Resolved', 'Closed') AND resolved_at IS NOT NULL AND deleted_at IS NULL
        GROUP BY assigned_department
    """)
    avg_res = [{"department": r["assigned_department"] or "Unknown", "avgMinutes": round(r["avg_min"], 1)} for r in cursor.fetchall()]

    # Top categories this week
    one_week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    cursor.execute("""
        SELECT category, COUNT(*) as c 
        FROM tickets 
        WHERE created_at >= ? AND deleted_at IS NULL
        GROUP BY category 
        ORDER BY c DESC 
        LIMIT 5
    """, (one_week_ago,))
    top_cats = [{"category": r["category"], "c": r["c"]} for r in cursor.fetchall()]
    
    conn.close()
    return {
        "totals": {
            "open": stats.get("New", 0) + stats.get("Assigned", 0) + stats.get("In Progress", 0) + stats.get("Pending Info", 0),
            "resolved": stats.get("Resolved", 0) + stats.get("Closed", 0),
            "autoResolved": auto_total,
            "escalated": escalated_total
        },
        "autoResolutionSuccessRate": rate,
        "departmentLoad": load,
        "avgResolutionMinutesByDepartment": avg_res, 
        "topCategoriesWeek": top_cats
    }

@app.get("/api/stream")
async def stream(request: Request):
    """Real-time SSE event stream for live UI updates."""
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            try:
               # Wait for a broadcast signal
               msg = await asyncio.wait_for(bus.get(), timeout=20.0)
               yield {"data": msg}
            except asyncio.TimeoutError:
               yield {"data": "ping"} # Keep-alive
    return EventSourceResponse(event_generator())

# ─── MAIN ───
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)

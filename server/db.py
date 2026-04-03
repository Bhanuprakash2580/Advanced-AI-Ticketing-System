import sqlite3
import os
import uuid
from datetime import datetime

# Path to the SQLite database file
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "app.db")

def get_connection():
    """Returns a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Access columns by name
    return conn

def init_db():
    """Initializes the database schema and seeds initial data."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()

    # Employees Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        skill_tags TEXT NOT NULL DEFAULT '[]',
        availability TEXT NOT NULL DEFAULT 'Available',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # Tickets Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        status TEXT NOT NULL,
        category TEXT NOT NULL,
        ai_summary TEXT NOT NULL,
        severity TEXT NOT NULL,
        effective_severity TEXT NOT NULL,
        sentiment TEXT NOT NULL,
        recommended_resolution_path TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        estimated_resolution_minutes INTEGER NOT NULL,
        suggested_department TEXT,
        suggested_employee_id TEXT,
        assigned_department TEXT,
        assigned_employee_id TEXT,
        assigned_at TEXT,
        priority_bump TEXT,
        auto_response TEXT,
        auto_resolved INTEGER NOT NULL DEFAULT 0,
        helpful_feedback INTEGER,
        escalated INTEGER NOT NULL DEFAULT 0,
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        picked_up INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT
    )
    """)

    # Ticket Events Table (Timeline)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ticket_events (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        actor TEXT NOT NULL,
        meta TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    )
    """)

    # Notifications Table (Simulated Email)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        read_at TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at)")

    # Graceful migration for existing databases
    try:
        cursor.execute("ALTER TABLE tickets ADD COLUMN deleted_at TEXT")
    except sqlite3.OperationalError:
        pass # Column likely exists already

    conn.commit()
    seed_if_empty(conn)
    conn.close()

def seed_if_empty(conn):
    """Adds initial employee data if the table is empty."""
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM employees")
    if cursor.fetchone()[0] > 0:
      return

    now = datetime.utcnow().isoformat()
    employees = [
        ("Alex Rivera", "alex.rivera@company.internal", "Engineering", "Senior Backend Engineer", ["Database", "API", "DB", "SQL"], "Available"),
        ("Jordan Lee", "jordan.lee@company.internal", "DevOps", "SRE Lead", ["Server", "Networking", "Kubernetes", "Performance"], "Available"),
        ("Sam Patel", "sam.patel@company.internal", "Finance", "Payroll Specialist", ["Payroll", "Billing", "Reimbursement"], "Busy"),
        ("Taylor Chen", "taylor.chen@company.internal", "HR", "HR Business Partner", ["Leave", "Onboarding", "Policy"], "Available"),
        ("Morgan Blake", "morgan.blake@company.internal", "IT", "Identity & Access", ["Access", "Accounts", "SSO", "Networking"], "Available"),
        ("Riley Kim", "riley.kim@company.internal", "Product", "Product Manager", ["Feature", "Roadmap", "UX"], "Available"),
        ("Casey Nguyen", "casey.nguyen@company.internal", "Engineering", "Full-stack Engineer", ["Bug", "React", "API"], "On Leave"),
    ]

    for name, email, dept, role, tags, avail in employees:
        import json
        emp_id = str(uuid.uuid4())
        cursor.execute("""
        INSERT INTO employees (id, name, email, department, role, skill_tags, availability, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (emp_id, name, email, dept, role, json.dumps(tags), avail, now))

    conn.commit()

if __name__ == "__main__":
    init_db()

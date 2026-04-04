import json
from datetime import datetime, timedelta
import uuid
from typing import List, Optional

# Constants for easy-to-understand routing logic
DEPARTMENTS = {
    "DB": "Engineering",
    "Server": "DevOps",
    "Networking": "IT",
    "Access": "IT",
    "HR": "HR",
    "Billing": "Finance",
    "Payroll": "Finance",
    "Bug": "Engineering",
    "Feature": "Product",
    "Other": "IT"
}

def get_routing_department(category: str) -> str:
    """Returns the department usually responsible for a given category."""
    return DEPARTMENTS.get(category, "IT")

def score_assignee(employee: dict, category: str, tags: List[str]) -> float:
    """
    Calculates a score (0.0 to 1.0) for an employee's fit for a ticket.
    Takes into account skill tags, current workload, and availability.
    """
    if employee["active"] == 0:
        return -1.0
    
    score = 0.0
    
    # Skill tag match (weighted heavily)
    emp_tags = json.loads(employee["skill_tags"])
    match_count = len(set(emp_tags) & set(tags))
    score += min(match_count * 0.4, 0.8)
    
    # Availability status
    if employee["availability"] == "Available":
        score += 0.2
    elif employee["availability"] == "Busy":
        score += 0.05
    else: # On Leave
        return -1.0
    
    # Load balancing (minor penalty for each open ticket)
    # This prevents the same person from being overloaded.
    load = employee.get("current_load", 0)
    score -= (load * 0.05)
    
    return max(score, 0.0)

def suggest_best_assignee(employees: List[dict], category: str, tags: List[str]):
    """Returns the employee with the highest score for the ticket's requirements."""
    scored = []
    for e in employees:
        s = score_assignee(e, category, tags)
        if s >= 0:
            scored.append((s, e))
    
    if not scored:
        return None
        
    # Sort by descending score
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]

def should_escalate(ticket: dict) -> bool:
    """
    Business rule: Reassign high-priority tickets that haven't been picked up within 2 hours.
    Used by the background escalation task.
    """
    if ticket["status"] != "Assigned" or ticket["picked_up"] == 1:
        return False
    
    if ticket["effective_severity"] not in ["High", "Critical"]:
        return False
        
    # Check if 2 hours have passed since assignment
    assigned_at = datetime.fromisoformat(ticket["assigned_at"])
    if datetime.utcnow() > assigned_at + timedelta(hours=2):
        return True
        
    return False

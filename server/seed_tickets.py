import requests
import json
import time

API_URL = "http://localhost:3001/api/tickets"

tickets = [
    {
        "subject": "Need access to GitHub repository",
        "body": "Hi, I just joined the frontend team and I need access to the main web-app repo on GitHub.",
        "requester_email": "new.hire@company.internal"
    },
    {
        "subject": "Missing last month's reimbursement",
        "body": "I submitted a travel expense report on the 10th of last month but it hasn't been paid out in this cycle.",
        "requester_email": "sales.rep@company.internal"
    },
    {
        "subject": "Figma license expired",
        "body": "My Figma design license has suddenly expired and I cannot edit any files for the upcoming sprint.",
        "requester_email": "ui.designer@company.internal"
    },
    {
        "subject": "Customer database backup failed",
        "body": "Alert from CRON: The nightly backup of the production PostgreSQL database failed due to disk space issues on the backup cluster.",
        "requester_email": "system.alert@company.internal"
    }
]

print("Injecting sample tickets. This may take 10-20 seconds because it is calling the real OpenAI triage engine...")

for i, t in enumerate(tickets):
    print(f"Submitting ticket {i+1}/4: {t['subject']}")
    try:
        response = requests.post(API_URL, json=t)
        if response.status_code == 200:
            print("  -> Success!")
        else:
            print(f"  -> Error: {response.text}")
    except Exception as e:
        print(f"  -> Exception: {e}")
    time.sleep(1)

print("Done! Check your browser.")

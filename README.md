# Advanced AI Ticketing System (Operations Desk)

An AI-driven triage and operational assignment platform designed to eliminate manual bottlenecks in internal support. This system intelligently analyzes, routes, and auto-resolves incoming requests using OpenAI, drastically reducing resolution times and ensuring optimal workload distribution across departments.

## 🚀 Project Overview
Internal operations teams often struggle with slow routing and a high volume of repetitive FAQs. This project solves that problem by sitting at the front line of incoming requests. It uses GPT-4o-mini to analyze every ticket, categorize it, and either auto-resolve it (if it's a known FAQ) or intelligently assign it to the most available, skilled employee.

---

## 📸 Core Features & Screenshots

### 1. Intelligent Intake & Quick Dispatch
Users submit requests in plain English or use one-click Quick Dispatch templates. The AI instantly extracts the subject, predicts severity, and assesses sentiment.
![New Request Setup]

### 2. Auto-Resolution Engine & Ticket Details
For common issues like password resets or policy queries, the AI generates an immediate solution, bypassing human agents completely and alerting the user via simulated email.
![Ticket Details & Auto-Resolve](file:///C:/Users/bhanu/.gemini\antigravity\brain\6baed34f-efc2-4568-b5dd-5804e170c1c4\ticket_detail_page_v2_1775476044654.png)

### 3. Real-Time Ticket Queue
A live-updating queue displaying all active tickets. Built with Server-Sent Events (SSE), the dashboard updates instantly without page reloads when new tickets arrive or statuses change.
![Ticket Queue](file:///C:/Users/bhanu/.gemini/antigravity/brain/6baed34f-efc2-4568-b5dd-5804e170c1c4/ticket_queue_page_1775475982077.png)

### 4. Load-Aware Staff Directory
Tickets aren't assigned randomly. The system tracks employee skill tags, current workload, and live availability to make the perfect assignment.
![Employee Directory](file:///C:/Users/bhanu/.gemini/antigravity/brain/6baed34f-efc2-4568-b5dd-5804e170c1c4/employee_directory_page_1775476091266.png)

### 5. Live Operational Analytics
Managers get a real-time overview of department loads, AI automation effectiveness (tickets resolved by AI vs Humans), and average resolution times.
![Analytics](file:///C:/Users/bhanu/.gemini/antigravity/brain/6baed34f-efc2-4568-b5dd-5804e170c1c4/operational_analytics_page_1775476115599.png)

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React.js (Vite), Tailwind CSS (v4), Recharts
- **Backend Architecture**: Python 3.x, FastAPI (Async), Uvicorn, SQLite
- **Automation & Integrations**: OpenAI GPT-4o-mini, Server-Sent Events (SSE) for Real-Time UI Sync
- **Data Modeling**: Pydantic schemas for reliable "Structured Contracts" with the LLM API

## ⚙️ Setup & Deployment Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- OpenAI API Key

### 1. Start the Backend
```bash
cd server
pip install -r requirements.txt
# Create a .env file and add your OPENAI_API_KEY
echo "OPENAI_API_KEY=your_key_here" > .env
python main.py
```
*The FastAPI server will boot up on `http://localhost:3001`.*

### 2. Start the Frontend
```bash
cd client
npm install
npm run dev
```
*The React app will boot up on `http://localhost:5173`.*

---

## 📈 Feature List

| Area | Feature | Description |
| :--- | :--- | :--- |
| **AI Workflows** | **Structured Triage** | Uses GPT-4o-mini to extract Category, Severity, Estimated Time, and Confidence metadata. |
| **AI Workflows** | **Auto-Resolve Agent** | Detects simple FAQs and instantly resolves them with a generated guide. |
| **Core App** | **Skill-based Routing** | Assigns issues dynamically by matching ticket context to employee tags/load. |
| **Core App** | **Live Metrics Tracker**| Tracks resolution speed, SLA breaches, and automation success. |
| **Under the Hood** | **SSE Engine** | Real-time push notifications ensure zero-latency UI updates. |
| **Under the Hood** | **Escalation Engine** | Background CRON-like task that elevates priority on delayed tickets automatically. |

---

## ⚠️ Known Limitations & Future Improvements

1. **Storage Subsystem**: The current version uses SQLite for simplicity and portability in testing.
   - *Fix with more time*: Migrate to a highly available PostgreSQL cluster on AWS RDS to support horizontal scaling and heavy concurrent read/writes.
2. **Authentication**: Auth is disabled to focus solely on the operational workflow.
   - *Fix with more time*: Implement OAuth 2.0 / JWT integration with Azure AD or Okta since this is an internal tool.
3. **LLM Dependency**: Relying completely on OpenAI can induce latency or costs.
   - *Fix with more time*: Build a local fallback model (like Llama 3) for basic categorization to handle peak loads and reduce token spend.

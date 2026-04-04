import os
import json
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import Optional

# AI Contract schema for structured output
class AIAnalysis(BaseModel):
    category: str = Field(description="One of: Server, Networking, Access, HR, Billing, DB, Performance, Bug, Feature, Other")
    ai_summary: str = Field(description="A concise 1-sentence summary of the issue")
    severity: str = Field(description="One of: Low, Medium, High, Critical")
    sentiment: str = Field(description="One of: Frustrated, Neutral, Polite")
    recommended_resolution_path: str = Field(description="A brief recommendation for the next step")
    confidence_score: float = Field(description="A number from 0-100 indicating AI confidence")
    estimated_resolution_minutes: int = Field(description="An estimate of how long this issue takes to resolve")
    auto_resolve: bool = Field(description="True if this is a simple FAQ or common request (like password reset) that can be handled automatically")
    auto_response: Optional[str] = Field(description="A professional, helpful response if auto_resolve is true")

def analyze_ticket(subject: str, body: str):
    """
    Analyzes ticket content using OpenAI. 
    If no API key is present, falls back to a mock analysis for demonstration.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return mock_analysis(subject, body)

    client = OpenAI(api_key=api_key)
    prompt = f"Subject: {subject}\nBody: {body}\n\nAnalyze this internal ticketing request and return the JSON analysis."

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional IT support triage assistant. Always return structured JSON."},
                {"role": "user", "content": prompt},
            ],
            response_format=AIAnalysis,
        )
        return response.choices[0].message.parsed
    except Exception as e:
        print(f"AI Error: {e}")
        return mock_analysis(subject, body)

def mock_analysis(subject: str, body: str):
    """Fallback logic when OpenAI is not available."""
    content = (subject + " " + body).lower()
    
    analysis = {
        "category": "Other",
        "ai_summary": "Issue detected: " + subject,
        "severity": "Low",
        "sentiment": "Neutral",
        "recommended_resolution_path": "Standard Triage",
        "confidence_score": 90.0,
        "estimated_resolution_minutes": 30,
        "auto_resolve": False,
        "auto_response": None
    }

    # Simple keyword-based triage logic for human-readable demonstration
    if "password" in content or "reset" in content:
        analysis.update({
            "category": "Access",
            "auto_resolve": True,
            "auto_response": "To reset your password, please go to the SSO portal at https://identity.company.internal and follow the 'Forgot Password' link."
        })
    elif "payroll" in content or "salary" in content:
        analysis.update({
            "category": "Finance",
            "severity": "High",
            "recommended_resolution_path": "Finance team review"
        })
    elif "server" in content or "down" in content or "latency" in content:
        analysis.update({
            "category": "Server",
            "severity": "Critical",
            "recommended_resolution_path": "On-call engineer investigation"
        })

    return AIAnalysis(**analysis)

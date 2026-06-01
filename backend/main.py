"""
HR Portal — FastAPI Backend

Endpoints for offer letter generation, experience letter generation,
LOR generation, email sending, PDF download, and template CRUD management.
"""

import os
import json
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from offer_letter_service import (
    generate_offer_letter,
    send_offer_letter_email,
    generate_experience_letter,
    send_experience_letter_email,
    generate_lor,
    send_lor_email,
    OUTPUT_DIR,
)

# =====================================================
# APP SETUP
# =====================================================

app = FastAPI(
    title="HR Portal Backend",
    description="Offer letter generation, template management, and email delivery",
    version="1.0.0",
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://hr.collegesimplified.in",
        "http://hr.collegesimplified.in",
        # Add your Hostinger domain here
        os.environ.get("FRONTEND_URL", ""),
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# LOCAL JSON STORAGE (Firestore alternative for backend)
# =====================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

TEMPLATES_FILE = os.path.join(DATA_DIR, 'templates.json')
LETTERS_FILE = os.path.join(DATA_DIR, 'letters.json')


def _load_json(filepath: str) -> list:
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_json(filepath: str, data: list):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# =====================================================
# PRE-BUILT TEMPLATES (Seed data)
# =====================================================

DEFAULT_TEMPLATES = [
    {
        "id": "tpl-growth-intern",
        "name": "Growth Intern",
        "roleTitle": "Growth Intern",
        "responsibilities": (
            "• Conduct market research and competitor analysis to identify growth opportunities\n"
            "• Assist in planning and executing digital marketing campaigns\n"
            "• Create engaging content for social media platforms and blogs\n"
            "• Track and analyze key performance metrics using analytics tools\n"
            "• Support the team in developing growth strategies and A/B testing\n"
            "• Collaborate with cross-functional teams to drive user acquisition"
        ),
        "salary": "15,000 Per Month",
        "duration": "6 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Growth Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We are confident this opportunity will be a valuable step in your career journey.\n\n"
            "Should you have any questions, feel free to contact us.\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": True,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-software-dev-intern",
        "name": "Software Development Intern",
        "roleTitle": "Software Development Intern",
        "responsibilities": (
            "• Develop and maintain features for web and mobile applications\n"
            "• Write clean, efficient, and well-documented code\n"
            "• Participate in code reviews and provide constructive feedback\n"
            "• Debug and resolve software defects and technical issues\n"
            "• Collaborate with the development team on system design and architecture\n"
            "• Write unit tests and contribute to CI/CD pipeline improvements"
        ),
        "salary": "15,000 Per Month",
        "duration": "6 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a\nSoftware Development Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We look forward to having you on board!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-graphic-design-intern",
        "name": "Graphic Design Intern",
        "roleTitle": "Graphic Design Intern",
        "responsibilities": (
            "• Design visual assets for digital and print media including banners, posters, and social media graphics\n"
            "• Maintain brand consistency across all design deliverables\n"
            "• Create UI mockups and wireframes for web and mobile applications\n"
            "• Collaborate with the marketing team on campaign creatives\n"
            "• Edit and enhance images and videos for various platforms\n"
            "• Stay updated with current design trends and tools"
        ),
        "salary": "12,000 Per Month",
        "duration": "3 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Graphic Design Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We are excited to see your creativity shine!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-content-writing-intern",
        "name": "Content Writing Intern",
        "roleTitle": "Content Writing Intern",
        "responsibilities": (
            "• Write engaging blog posts, articles, and website content\n"
            "• Develop compelling copy for marketing campaigns and advertisements\n"
            "• Create SEO-optimized content to improve organic search rankings\n"
            "• Draft social media posts and captions across platforms\n"
            "• Proofread and edit content for grammar, clarity, and tone consistency\n"
            "• Research industry topics and trends to generate content ideas"
        ),
        "salary": "10,000 Per Month",
        "duration": "3 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Content Writing Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We look forward to your creative contributions!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-hr-intern",
        "name": "Human Resources Intern",
        "roleTitle": "Human Resources Intern",
        "responsibilities": (
            "• Assist in the recruitment process including job postings, resume screening, and interview scheduling\n"
            "• Support the onboarding process for new employees\n"
            "• Maintain and update employee records and HR databases\n"
            "• Help organize employee engagement events and initiatives\n"
            "• Draft HR communications, policies, and internal documents\n"
            "• Assist in performance review tracking and reporting"
        ),
        "salary": "12,000 Per Month",
        "duration": "3 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Human Resources Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We look forward to working with you!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-marketing-intern",
        "name": "Marketing Intern",
        "roleTitle": "Marketing Intern",
        "responsibilities": (
            "• Plan, execute, and monitor digital marketing campaigns across channels\n"
            "• Analyze campaign performance data and prepare detailed reports\n"
            "• Manage email marketing workflows and drip campaigns\n"
            "• Conduct market research to identify trends and target audience insights\n"
            "• Assist in creating marketing collateral and promotional materials\n"
            "• Coordinate with external vendors and agencies for campaign execution"
        ),
        "salary": "12,000 Per Month",
        "duration": "3 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Marketing Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We are excited to have you on the team!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-social-media-intern",
        "name": "Social Media Intern",
        "roleTitle": "Social Media Intern",
        "responsibilities": (
            "• Manage and grow the company's presence on Instagram, LinkedIn, Twitter, and Facebook\n"
            "• Plan and schedule engaging social media content using scheduling tools\n"
            "• Monitor community engagement, respond to comments, and foster online conversations\n"
            "• Analyze platform-specific trends, hashtags, and algorithm updates\n"
            "• Develop hashtag strategies and optimize content for maximum reach\n"
            "• Identify and coordinate with influencers and brand ambassadors for collaborations"
        ),
        "salary": "10,000 Per Month",
        "duration": "3 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Social Media Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We can't wait to see your creative impact on our social channels!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
    {
        "id": "tpl-data-analyst-intern",
        "name": "Data Analyst Intern",
        "roleTitle": "Data Analyst Intern",
        "responsibilities": (
            "• Collect, clean, and preprocess data from multiple sources for analysis\n"
            "• Generate detailed reports and data summaries for business stakeholders\n"
            "• Build and maintain interactive dashboards using visualization tools\n"
            "• Write SQL queries to extract and transform data from databases\n"
            "• Perform statistical analysis to uncover patterns and actionable insights\n"
            "• Create compelling data visualizations and presentations to communicate findings"
        ),
        "salary": "15,000 Per Month",
        "duration": "6 months",
        "emailSubject": "Offer Letter - {{NAME}}",
        "emailBody": (
            "Dear {{NAME}},\n\n"
            "Congratulations!\n\n"
            "We are delighted to offer you an internship position as a Data Analyst Intern at Concept Simplified.\n\n"
            "Please find your detailed Offer Letter attached to this email.\n\n"
            "Acceptance Confirmation:\n"
            "Reply to this email with \"I accept the offer\".\n\n"
            "Important Notes:\n\n"
            "• This internship will be conducted remotely, with 6 working days per week.\n"
            "• The monthly stipend is ₹{{SALARY}}.\n"
            "• Internship Duration: {{START_DATE}} to {{END_DATE}}\n\n"
            "We are looking forward to your analytical contributions!\n\n"
            "Warm regards,\n\n"
            "Samkit Shah\n"
            "Founder, Concept Simplified"
        ),
        "isDefault": False,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": "2026-01-01T00:00:00Z",
    },
]


def _seed_templates():
    """Seed default templates if none exist."""
    templates = _load_json(TEMPLATES_FILE)
    if not templates:
        _save_json(TEMPLATES_FILE, DEFAULT_TEMPLATES)
        print(f"[Seed] Created {len(DEFAULT_TEMPLATES)} default templates.")
        return DEFAULT_TEMPLATES
    return templates


# =====================================================
# PYDANTIC MODELS
# =====================================================

class GenerateOfferLetterRequest(BaseModel):
    employeeId: str
    employeeName: str
    employeeEmail: str
    templateId: str
    date: str
    startDate: str
    endDate: str
    salary: str | None = None  # Override template default
    responsibilities: str | None = None  # Override template default


class SendOfferLetterRequest(BaseModel):
    employeeName: str
    employeeEmail: str
    salary: str
    startDate: str
    endDate: str
    pdfFilename: str
    pptxFilename: str
    emailSubject: str | None = None
    emailBody: str | None = None


class TemplateCreateRequest(BaseModel):
    name: str
    roleTitle: str
    responsibilities: str
    salary: str = "10,000 Per Month"
    duration: str = "3 months"
    emailSubject: str = "Offer Letter - {{NAME}}"
    emailBody: str = ""
    isDefault: bool = False


class TemplateUpdateRequest(BaseModel):
    name: str | None = None
    roleTitle: str | None = None
    responsibilities: str | None = None
    salary: str | None = None
    duration: str | None = None
    emailSubject: str | None = None
    emailBody: str | None = None
    isDefault: bool | None = None


# =====================================================
# STARTUP
# =====================================================

@app.on_event("startup")
async def startup():
    _seed_templates()
    print("[Server] HR Portal Backend started.")


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/health")
async def health():
    return {"status": "ok", "service": "HR Portal Backend"}


# =====================================================
# TEMPLATE ENDPOINTS
# =====================================================

@app.get("/templates")
async def list_templates():
    templates = _load_json(TEMPLATES_FILE)
    return {"success": True, "data": templates}


@app.post("/templates")
async def create_template(req: TemplateCreateRequest):
    templates = _load_json(TEMPLATES_FILE)
    now = datetime.now(timezone.utc).isoformat()

    new_template = {
        "id": f"tpl-{uuid.uuid4().hex[:8]}",
        "name": req.name,
        "roleTitle": req.roleTitle,
        "responsibilities": req.responsibilities,
        "salary": req.salary,
        "duration": req.duration,
        "emailSubject": req.emailSubject,
        "emailBody": req.emailBody or (
            f"Dear {{{{NAME}}}},\n\n"
            f"Congratulations!\n\n"
            f"We are delighted to offer you an internship position as a {req.roleTitle} at Concept Simplified.\n\n"
            f"Please find your detailed Offer Letter attached to this email.\n\n"
            f"Acceptance Confirmation:\n"
            f"Reply to this email with \"I accept the offer\".\n\n"
            f"Important Notes:\n\n"
            f"• This internship will be conducted remotely, with 6 working days per week.\n"
            f"• The monthly stipend is ₹{{{{SALARY}}}}.\n"
            f"• Internship Duration: {{{{START_DATE}}}} to {{{{END_DATE}}}}\n\n"
            f"Warm regards,\n\n"
            f"Samkit Shah\n"
            f"Founder, Concept Simplified"
        ),
        "isDefault": req.isDefault,
        "createdAt": now,
        "updatedAt": now,
    }

    templates.append(new_template)
    _save_json(TEMPLATES_FILE, templates)

    return {"success": True, "data": new_template, "message": "Template created successfully"}


@app.put("/templates/{template_id}")
async def update_template(template_id: str, req: TemplateUpdateRequest):
    templates = _load_json(TEMPLATES_FILE)

    for i, tpl in enumerate(templates):
        if tpl["id"] == template_id:
            update_data = req.model_dump(exclude_none=True)
            update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
            templates[i] = {**tpl, **update_data}
            _save_json(TEMPLATES_FILE, templates)
            return {"success": True, "data": templates[i], "message": "Template updated"}

    raise HTTPException(status_code=404, detail="Template not found")


@app.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    templates = _load_json(TEMPLATES_FILE)
    filtered = [t for t in templates if t["id"] != template_id]

    if len(filtered) == len(templates):
        raise HTTPException(status_code=404, detail="Template not found")

    _save_json(TEMPLATES_FILE, filtered)
    return {"success": True, "message": "Template deleted"}


# =====================================================
# OFFER LETTER ENDPOINTS
# =====================================================

@app.get("/offer-letters")
async def list_offer_letters():
    return {"success": True, "data": []}


@app.post("/generate-offer-letter")
async def generate_offer_letter_endpoint(req: GenerateOfferLetterRequest):
    """Generate an offer letter: fill PPTX template → convert to PDF."""
    # Find the template
    templates = _load_json(TEMPLATES_FILE)
    template = next((t for t in templates if t["id"] == req.templateId), None)

    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{req.templateId}' not found")

    salary = req.salary or template.get("salary", "10,000 Per Month")
    responsibilities = req.responsibilities or template.get("responsibilities", "")

    try:
        result = generate_offer_letter(
            employee_name=req.employeeName,
            employee_email=req.employeeEmail,
            employee_id=req.employeeId,
            role_title=template["roleTitle"],
            date=req.date,
            start_date=req.startDate,
            end_date=req.endDate,
            salary=salary,
            responsibilities=responsibilities,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    now = datetime.now(timezone.utc).isoformat()
    letter_id = f"OL-{uuid.uuid4().hex[:8]}"

    letter_record = {
        "id": letter_id,
        "employeeId": req.employeeId,
        "employeeName": req.employeeName,
        "employeeEmail": req.employeeEmail,
        "templateName": template["name"],
        "templateId": req.templateId,
        "roleTitle": template["roleTitle"],
        "date": req.date,
        "startDate": req.startDate,
        "endDate": req.endDate,
        "salary": salary,
        "generatedAt": now,
        "status": "Generated",
        "pdfFilename": os.path.basename(result["pdf_path"]),
        "pptxFilename": os.path.basename(result["pptx_path"]),
    }

    return {
        "success": True,
        "data": letter_record,
        "message": f"Offer letter generated for {req.employeeName}",
    }


@app.post("/offer-letters/{letter_id}/send")
async def send_offer_letter_endpoint(letter_id: str, req: SendOfferLetterRequest):
    """Send the generated offer letter PDF via Gmail and delete temporary files."""
    pdf_path = os.path.join(OUTPUT_DIR, req.pdfFilename)
    pptx_path = os.path.join(OUTPUT_DIR, req.pptxFilename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found. Please regenerate.")

    # Prepare email subject and body with placeholder replacement
    email_subject = req.emailSubject or f"Offer Letter - {req.employeeName}"
    email_body = req.emailBody or None

    # Replace placeholders in email subject and body
    placeholder_map = {
        "{{NAME}}": req.employeeName,
        "{{SALARY}}": req.salary,
        "{{START_DATE}}": req.startDate,
        "{{END_DATE}}": req.endDate,
    }

    if email_subject:
        for key, val in placeholder_map.items():
            email_subject = email_subject.replace(key, val)

    if email_body:
        for key, val in placeholder_map.items():
            email_body = email_body.replace(key, val)

    try:
        send_offer_letter_email(
            employee_name=req.employeeName,
            employee_email=req.employeeEmail,
            salary=req.salary,
            start_date=req.startDate,
            end_date=req.endDate,
            pdf_path=pdf_path,
            email_subject=email_subject,
            email_body=email_body,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    # Clean up and delete files after successful transmission
    for filepath in [pptx_path, pdf_path]:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                print(f"[Cleanup] Deleted temporary file: {filepath}")
            except Exception as del_err:
                print(f"[Cleanup] Error deleting file {filepath}: {del_err}")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "success": True,
        "data": {"status": "Sent", "sentAt": now},
        "message": f"Offer letter sent to {req.employeeEmail} and files deleted from disk.",
    }


@app.get("/offer-letters/{letter_id}/download")
async def download_offer_letter(letter_id: str, filename: str):
    """Download the generated PDF file using the filename passed in query parameters."""
    pdf_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found or already deleted after being sent.")

    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf",
    )


# =====================================================
# EXPERIENCE LETTER MODELS
# =====================================================

class GenerateExperienceLetterRequest(BaseModel):
    employeeId: str
    employeeName: str
    employeeEmail: str
    role: str
    joiningDate: str
    relievingDate: str
    duration: str
    date: str


class SendExperienceLetterRequest(BaseModel):
    employeeName: str
    employeeEmail: str
    role: str
    joiningDate: str
    relievingDate: str
    duration: str
    pdfFilename: str
    pptxFilename: str


# =====================================================
# EXPERIENCE LETTER ENDPOINTS
# =====================================================

@app.get("/experience-letters")
async def list_experience_letters():
    return {"success": True, "data": []}


@app.post("/generate-experience-letter")
async def generate_experience_letter_endpoint(req: GenerateExperienceLetterRequest):
    """Generate an experience letter: fill PPTX template → convert to PDF."""
    try:
        result = generate_experience_letter(
            employee_name=req.employeeName,
            employee_email=req.employeeEmail,
            employee_id=req.employeeId,
            role=req.role,
            joining_date=req.joiningDate,
            relieving_date=req.relievingDate,
            duration=req.duration,
            date=req.date,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    now = datetime.now(timezone.utc).isoformat()
    letter_id = f"EL-{uuid.uuid4().hex[:8]}"

    return {
        "success": True,
        "data": {
            "id": letter_id,
            "employeeId": req.employeeId,
            "employeeName": req.employeeName,
            "employeeEmail": req.employeeEmail,
            "role": req.role,
            "joiningDate": req.joiningDate,
            "relievingDate": req.relievingDate,
            "duration": req.duration,
            "generatedAt": now,
            "status": "Generated",
            "pdfFilename": os.path.basename(result["pdf_path"]),
            "pptxFilename": os.path.basename(result["pptx_path"]),
        },
        "message": f"Experience letter generated for {req.employeeName}",
    }


@app.post("/experience-letters/{letter_id}/send")
async def send_experience_letter_endpoint(letter_id: str, req: SendExperienceLetterRequest):
    """Send the generated experience letter PDF via Gmail and delete temporary files."""
    pdf_path = os.path.join(OUTPUT_DIR, req.pdfFilename)
    pptx_path = os.path.join(OUTPUT_DIR, req.pptxFilename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found. Please regenerate.")

    try:
        send_experience_letter_email(
            employee_name=req.employeeName,
            employee_email=req.employeeEmail,
            role=req.role,
            joining_date=req.joiningDate,
            relieving_date=req.relievingDate,
            duration=req.duration,
            pdf_path=pdf_path,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    # Cleanup temp files
    for filepath in [pptx_path, pdf_path]:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                print(f"[Cleanup] Deleted: {filepath}")
            except Exception as del_err:
                print(f"[Cleanup] Error deleting {filepath}: {del_err}")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "success": True,
        "data": {"status": "Sent", "sentAt": now},
        "message": f"Experience letter sent to {req.employeeEmail} and files deleted.",
    }


@app.get("/experience-letters/{letter_id}/download")
async def download_experience_letter(letter_id: str, filename: str):
    """Download the generated experience letter PDF."""
    pdf_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found or already deleted after sending.")

    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf",
    )


# =====================================================
# LOR MODELS
# =====================================================

class GenerateLORRequest(BaseModel):
    employeeId: str
    employeeName: str
    employeeEmail: str
    role: str
    date: str


class SendLORRequest(BaseModel):
    employeeName: str
    employeeEmail: str
    pdfFilename: str
    pptxFilename: str


# =====================================================
# LOR ENDPOINTS
# =====================================================

@app.get("/lors")
async def list_lors():
    return {"success": True, "data": []}


@app.post("/generate-lor")
async def generate_lor_endpoint(req: GenerateLORRequest):
    """Generate a Letter of Recommendation: fill PPTX template → convert to PDF."""
    try:
        result = generate_lor(
            employee_name=req.employeeName,
            employee_email=req.employeeEmail,
            employee_id=req.employeeId,
            role=req.role,
            date=req.date,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    now = datetime.now(timezone.utc).isoformat()
    lor_id = f"LOR-{uuid.uuid4().hex[:8]}"

    return {
        "success": True,
        "data": {
            "id": lor_id,
            "employeeId": req.employeeId,
            "employeeName": req.employeeName,
            "employeeEmail": req.employeeEmail,
            "role": req.role,
            "generatedAt": now,
            "status": "Generated",
            "pdfFilename": os.path.basename(result["pdf_path"]),
            "pptxFilename": os.path.basename(result["pptx_path"]),
        },
        "message": f"LOR generated for {req.employeeName}",
    }


@app.post("/lors/{lor_id}/send")
async def send_lor_endpoint(lor_id: str, req: SendLORRequest):
    """Send the generated LOR PDF via Gmail and delete temporary files."""
    pdf_path = os.path.join(OUTPUT_DIR, req.pdfFilename)
    pptx_path = os.path.join(OUTPUT_DIR, req.pptxFilename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found. Please regenerate.")

    try:
        send_lor_email(
            employee_name=req.employeeName,
            employee_email=req.employeeEmail,
            pdf_path=pdf_path,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    # Cleanup temp files
    for filepath in [pptx_path, pdf_path]:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
                print(f"[Cleanup] Deleted: {filepath}")
            except Exception as del_err:
                print(f"[Cleanup] Error deleting {filepath}: {del_err}")

    now = datetime.now(timezone.utc).isoformat()
    return {
        "success": True,
        "data": {"status": "Sent", "sentAt": now},
        "message": f"LOR sent to {req.employeeEmail} and files deleted.",
    }


@app.get("/lors/{lor_id}/download")
async def download_lor(lor_id: str, filename: str):
    """Download the generated LOR PDF."""
    pdf_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found or already deleted after sending.")

    return FileResponse(
        path=pdf_path,
        filename=filename,
        media_type="application/pdf",
    )

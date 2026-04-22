# Recruitment API Contract

This document defines the backend APIs required for the recruitment flow already wired in the Angular frontend.

## 1. Public Candidate Application

### `POST /api/candidate/public-job-posting`
Purpose: Load public job details from generated link.

Request:
```json
{
  "job_id": "JOB-102",
  "slug": "recruitment-executive",
  "token": "public-link-token"
}
```

Response:
```json
{
  "status": true,
  "data": {
    "id": "POST-102",
    "job_id": "JOB-102",
    "job_title": "Recruitment Executive",
    "department_name": "HR",
    "location": "Lucknow",
    "experience": 3,
    "budget_ctc": "6.5 LPA",
    "notice_period": 30,
    "skills": ["Screening", "Sourcing", "Coordination"],
    "job_description": "End to end recruitment execution",
    "status": "open"
  }
}
```

### `POST /api/candidate/check-duplicate-application`
Purpose: Prevent multiple submissions with same email for same job posting.

Request:
```json
{
  "email": "candidate@example.com",
  "job_posting_id": "POST-102",
  "job_id": "JOB-102",
  "slug": "recruitment-executive",
  "token": "public-link-token"
}
```

Response:
```json
{
  "status": true,
  "exists": false
}
```

### `POST /api/candidate/submit-application`
Purpose: Candidate submits form + resume.

Request:
- `multipart/form-data`
- Fields:
  - `name`
  - `email`
  - `phone`
  - `current_company`
  - `skills`
  - `experience`
  - `current_ctc`
  - `expected_ctc`
  - `notice_period`
  - `cover_letter`
  - `resume`
  - `job_posting_id`
  - `job_id`
  - `slug`
  - `token`
  - `trigger_ats_scan`
  - `send_confirmation_email`

Response:
```json
{
  "status": true,
  "message": "Application submitted successfully",
  "data": {
    "application_id": "APP-1001",
    "stage": "candidate_applied"
  }
}
```

## 2. Admin Candidate Pipeline

### `POST /api/candidate/admin-pipeline`
Purpose: Admin candidate list with ATS/manual score and stage.

Request:
```json
{
  "stage": "",
  "status": "",
  "search": "",
  "job_id": ""
}
```

Response:
```json
{
  "status": true,
  "data": [
    {
      "id": "APP-1001",
      "candidate_id": "CAND-101",
      "job_id": "JOB-102",
      "job_posting_id": "POST-102",
      "job_title": "Recruitment Executive",
      "department": "HR",
      "stage": "ats_screening",
      "status": "screening",
      "name": "Arjun Verma",
      "email": "arjun@example.com",
      "phone": "9123456780",
      "current_company": "PeopleNest",
      "experience": 3,
      "current_ctc": 5.1,
      "expected_ctc": 6.2,
      "notice_period": 15,
      "skills": ["Sourcing", "Screening"],
      "resume_url": "/uploads/resume.pdf",
      "resume_name": "resume.pdf",
      "createdAt": "2026-04-02T12:00:00.000Z",
      "ats": {
        "ats_score": 88,
        "manual_score": 91,
        "final_score": 90,
        "scanned_at": "2026-04-02T12:10:00.000Z",
        "scanned_by": "Admin",
        "notes": "Strong profile",
        "shortlisted": true
      },
      "interview_rounds": [
        {
          "round_id": "R1",
          "round_name": "HR Screening",
          "sequence": 1,
          "status": "completed"
        }
      ]
    }
  ]
}
```

### `POST /api/candidate/application-detail`
Purpose: Single application detail with interview rounds inherited from job requirement.

Request:
```json
{
  "application_id": "APP-1001"
}
```

### `POST /api/candidate/save-ats-score`
Purpose: ATS score or manual recruiter score save.

Request:
```json
{
  "application_id": "APP-1001",
  "ats_score": 82,
  "manual_score": 78,
  "notes": "Resume matches 7/9 skills",
  "shortlisted": false
}
```

Response:
```json
{
  "status": true,
  "message": "ATS score updated"
}
```

### `POST /api/candidate/update-stage`
Purpose: Move candidate to shortlisted, interview, offered, closed.

Request:
```json
{
  "application_id": "APP-1001",
  "stage": "shortlisted",
  "status": "shortlisted"
}
```

## 3. Interview Scheduling

### `POST /api/candidate/interview-schedule-detail`
Purpose: Load saved rounds for one candidate application.

Request:
```json
{
  "application_id": "APP-1001"
}
```

Response:
```json
{
  "status": true,
  "data": [
    {
      "round_id": "R1",
      "round_name": "HR Screening",
      "round_type": "HR",
      "sequence": 1,
      "interviewer_id": "EMP-12",
      "interviewer_name": "Neha Singh",
      "interviewer_email": "neha@example.com",
      "scheduled_at": "2026-04-04T11:30",
      "duration_minutes": 30,
      "mode": "virtual",
      "meeting_link": "https://meet.google.com/test",
      "status": "scheduled",
      "feedback_submitted": false
    }
  ]
}
```

### `POST /api/candidate/save-interview-schedule`
Purpose: Save planned rounds selected from job requirement.

Request:
```json
{
  "application_id": "APP-1001",
  "job_id": "JOB-102",
  "rounds": [
    {
      "round_id": "R1",
      "round_name": "HR Screening",
      "sequence": 1,
      "interviewer_name": "Neha Singh",
      "interviewer_email": "neha@example.com",
      "scheduled_at": "2026-04-04T11:30",
      "duration_minutes": 30,
      "mode": "virtual",
      "meeting_link": "https://meet.google.com/test",
      "status": "scheduled"
    }
  ]
}
```

## 4. Interview Feedback

### `POST /api/candidate/save-interview-feedback`
Purpose: Save round-wise interviewer feedback.

Request:
```json
{
  "application_id": "APP-1001",
  "round_id": "R1",
  "interviewer_name": "Neha Singh",
  "interviewer_email": "neha@example.com",
  "rating": 8,
  "recommendation": "selected",
  "strengths": "Good communication, strong domain basics",
  "concerns": "Needs deeper reporting knowledge",
  "notes": "Recommended for next round"
}
```

Response:
```json
{
  "status": true,
  "message": "Feedback saved"
}
```

### `POST /api/candidate/panel-feedback-detail`
Purpose: Fetch saved feedback detail for one interviewer round from `candidate_interview_feedback`.

Request:
```json
{
  "application_id": "APP-1001",
  "round_id": "R1"
}
```

Response:
```json
{
  "status": true,
  "data": {
    "application_id": "APP-1001",
    "round_id": "R1",
    "interviewer_name": "Neha Singh",
    "interviewer_email": "neha@example.com",
    "rating": 8,
    "recommendation": "selected",
    "strengths": "Good communication, strong domain basics",
    "concerns": "Needs deeper reporting knowledge",
    "notes": "Recommended for next round",
    "created_at": "2026-04-04T12:10:00.000Z",
    "updated_at": "2026-04-04T12:10:00.000Z"
  }
}
```

## 5. Suggested Tables / Collections

### `job_requirements`
- `id`
- `job_title`
- `department`
- `designation`
- `emp_type`
- `experience`
- `qualification`
- `notice_period`
- `budget_ctc`
- `no_of_opening`
- `location`
- `mode`
- `candidate_preference`
- `skills`
- `job_description`
- `interview_round_ids`
- `status`

### `job_postings`
- `id`
- `job_id`
- `slug`
- `public_token`
- `published_at`
- `expires_at`
- `status`

### `candidate_applications`
- `id`
- `job_id`
- `job_posting_id`
- `name`
- `email`
- `phone`
- `current_company`
- `skills`
- `experience`
- `current_ctc`
- `expected_ctc`
- `notice_period`
- `cover_letter`
- `resume_url`
- `resume_name`
- `stage`
- `status`
- `created_at`

### `candidate_ats_scores`
- `id`
- `application_id`
- `ats_score`
- `manual_score`
- `final_score`
- `notes`
- `shortlisted`
- `scanned_at`
- `scanned_by`

### `candidate_interview_rounds`
- `id`
- `application_id`
- `round_id`
- `round_name`
- `sequence`
- `interviewer_id`
- `interviewer_name`
- `interviewer_email`
- `scheduled_at`
- `duration_minutes`
- `mode`
- `meeting_link`
- `status`
- `feedback_submitted`

### `candidate_interview_feedback`
- `id`
- `application_id`
- `round_id`
- `interviewer_name`
- `interviewer_email`
- `rating`
- `recommendation`
- `strengths`
- `concerns`
- `notes`

## Notes

- Candidate applies only after job requirement and posting are done.
- Interview rounds must come from selected `interview_round_ids` in job requirement.
- ATS score can be system-generated or manually updated by admin.
- Candidate can be shortlisted only after scoring.
- Feedback is stored per round and per interviewer.

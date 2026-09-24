# HR Document Template Builder — Final Spec (Phase 1+)

## Goal
Company uploads letterhead, then creates reusable documents in a **Word-like rich editor** with `{{variables}}`. Selecting an employee fills variables from DB for preview / print / save. Existing hardcoded letters stay unchanged.

## Company setup
1. Upload **letterhead** (image) — Master → Letterhead, or from the template editor.
2. Create **template** — Master → HR Templates → Word-like Quill editor on an A4 page.
3. Optional: import HTML/TXT into the editor as a starting draft.
4. Insert variables via chips; choose letterhead mode:
   - **Use uploaded letterhead** — image as page background on edit + preview/print
   - **Blank top** — ~120mm empty for pre-printed paper

## Generation rules
- Formal corporate English for Indian companies.
- Keep `{{variable}}` tokens in the template; replace only at generate time.
- Never invent missing data — use `____________`.
- Dates: `DD/MM/YYYY`. Money: `Rs. X/-` (en-IN).
- A4, Times New Roman, 11–12pt.
- If `includeSalaryAnnexure = true`, append **Annexure A – Compensation Structure**.

## Variable catalog (Phase 1)

### Employee
`{{employee_name}}`, `{{employee_id}}`, `{{designation}}`, `{{department}}`,
`{{joining_date}}`, `{{employment_type}}`, `{{work_location}}`, `{{reporting_manager}}`,
`{{father_name}}`, `{{permanent_address}}`, `{{gender_title}}`, `{{relation}}`

### Salary
`{{basic_salary}}`, `{{hra}}`, `{{special_allowance}}`, `{{gross_salary}}`,
`{{annual_ctc}}`, `{{monthly_ctc}}`, `{{employee_pf}}`, `{{employer_pf}}`, `{{salary_table}}`

### Company
`{{company_name}}`, `{{company_address}}`, `{{hr_name}}`, `{{issue_date}}`

## UI
1. **Master → HR Templates** — list + Word-like editor + letterhead + variables
2. **Employee → Generate Letter** — employee + template → Preview → Print / Save

## Out of scope (later)
True `.docx` import/export, custom HR-defined variables, news popups, Form 16 / health-card vault.

## Acceptance
- [ ] Company uploads letterhead and sees it on the A4 editor page.
- [ ] HR edits body with bold/fonts/alignment like Word and inserts `{{employee_name}}`.
- [ ] Generate shows DB values (or blanks); print includes letterhead when selected.
- [ ] Old letter screens unchanged.

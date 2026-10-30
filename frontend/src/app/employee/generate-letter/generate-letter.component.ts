import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { EmployeeService } from '../../services/employee.service';
import { downloadHtmlAsPdf } from '../../shared/utils/html-to-pdf.util';

export interface GeneratedLetterRow {
  id: string;
  employeeId: string;
  templateId?: string;
  templateName?: string;
  createdAt?: string;
  dataSnapshot?: any;
  employeeLabel?: string;
  employeeCode?: string;
  issueDate?: string;
  busy?: boolean;
}

@Component({
  selector: 'app-generate-letter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgSelectModule],
  templateUrl: './generate-letter.component.html',
  styleUrl: './generate-letter.component.css',
})
export class GenerateLetterComponent implements OnInit, OnDestroy {
  notyf = new Notyf();
  templates: any[] = [];
  employees: any[] = [];
  templateId = '';
  employeeId: string | null = null;
  issueDate = new Date().toISOString().slice(0, 10);
  previewHtml = '';
  previewUrl: SafeResourceUrl | null = null;
  private objectUrl: string | null = null;
  loading = false;
  lastVariables: any = null;

  /** Values typed for the selected template's input fields ({{field:Name}}), by field name. */
  fieldValues: Record<string, string> = {};
  private fieldsCache: { template: any; names: string[] } | null = null;

  /** Add panel: Employee / Template / Issue Date / Preview */
  showAddForm = false;

  /** Saved / assigned letters — all docs for users */
  generatedList: GeneratedLetterRow[] = [];
  filteredList: GeneratedLetterRow[] = [];
  listLoading = false;
  listSearch = '';
  /** When true + employee selected → only that employee's docs */
  listFilterEmployeeOnly = false;
  pageSize = 25;
  currentPage = 1;

  constructor(
    private master: MasterService,
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
    this.loadEmployees();
    this.loadGeneratedList();
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  get totalDocs(): number {
    return this.generatedList.length;
  }

  /** Input field names in the selected template (body, header and footer), in order of appearance. */
  get templateFields(): string[] {
    const template = this.templates.find((t) => String(t.id) === String(this.templateId)) || null;
    if (this.fieldsCache?.template === template) return this.fieldsCache.names;
    const text = template ? `${template.bodyHtml || ''} ${JSON.stringify(template.headerFooter || {})}` : '';
    const names: string[] = [];
    for (const m of text.matchAll(/\{\{\s*field:([^}]+?)\s*\}\}/g)) {
      const name = m[1].replace(/\s+/g, ' ').trim();
      if (name && !names.includes(name)) names.push(name);
    }
    this.fieldsCache = { template, names };
    return names;
  }

  /** New template: keep values for fields it shares with the last one, drop the rest. */
  onTemplateChange(): void {
    const keep = this.templateFields;
    this.fieldValues = Object.fromEntries(Object.entries(this.fieldValues).filter(([k]) => keep.includes(k)));
  }

  get uniqueEmployees(): number {
    return new Set(this.generatedList.map((r) => r.employeeId).filter(Boolean)).size;
  }

  get pagedList(): GeneratedLetterRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredList.length / this.pageSize));
  }

  loadTemplates(): void {
    const branchId = localStorage.getItem('branchId') || undefined;
    this.master.listHrTemplates({ status: 'active', branchId }).subscribe({
      next: (res: any) => {
        if (res?.status) this.templates = res.data || [];
      },
      error: () => this.notyf.error('Failed to load templates'),
    });
  }

  loadEmployees(): void {
    this.employeeService.getEmp().subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          const list = res.data?.formattedActiveEmps || res.data?.formattedEmps || [];
          this.employees = list.map((e: any) => ({ ...e, label: this.empLabel(e) }));
          if (this.generatedList.length) this.applyListFilter();
        }
      },
      error: () => this.notyf.error('Failed to load employees'),
    });
  }

  empLabel(e: any): string {
    const name = `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Employee';
    const code = e.empCode || '';
    return code ? `${name} (${code})` : name;
  }

  employeeMeta(id: string, snapshot?: any): { label: string; code: string; initials: string } {
    const hit = this.employees.find((e) => e.id === id);
    if (hit) {
      const name = `${hit.firstName || ''} ${hit.lastName || ''}`.trim() || 'Employee';
      const code = hit.empCode || '';
      return {
        label: name,
        code,
        initials: this.initials(name),
      };
    }
    const snapName =
      snapshot?.employee_name ||
      snapshot?.employeeName ||
      [snapshot?.first_name, snapshot?.last_name].filter(Boolean).join(' ') ||
      'Employee';
    const code = snapshot?.employee_id || snapshot?.emp_code || '';
    return { label: String(snapName), code: String(code || ''), initials: this.initials(String(snapName)) };
  }

  initials(name: string): string {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  searchEmployee = (term: string, e: any): boolean => {
    const hay = [e.label, e.empCode, e.email, e.mobile].filter(Boolean).join(' ').toLowerCase();
    return term
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((w) => hay.includes(w));
  };

  onEmployeeChange(): void {
    if (this.listFilterEmployeeOnly) this.loadGeneratedList();
    else this.applyListFilter();
  }

  loadGeneratedList(): void {
    this.listLoading = true;
    const body: any = { limit: 2000 };
    if (this.listFilterEmployeeOnly && this.employeeId) {
      body.employeeId = this.employeeId;
    }
    this.master.listHrGenerated(body).subscribe({
      next: (res: any) => {
        this.listLoading = false;
        if (res?.status) {
          this.generatedList = (res.data || []).map((row: any) => this.mapGeneratedRow(row));
          this.applyListFilter();
        } else {
          this.notyf.error(res?.message || 'Failed to load assigned letters');
        }
      },
      error: (err) => {
        this.listLoading = false;
        this.notyf.error(err?.error?.message || 'Failed to load assigned letters');
      },
    });
  }

  private mapGeneratedRow(row: any): GeneratedLetterRow {
    const snap = row?.dataSnapshot || {};
    const meta = this.employeeMeta(row.employeeId, snap);
    return {
      id: row.id,
      employeeId: row.employeeId,
      templateId: row.templateId,
      templateName: row.templateName || 'Template',
      createdAt: row.createdAt,
      dataSnapshot: snap,
      employeeLabel: meta.label,
      employeeCode: meta.code,
      issueDate: snap.issue_date || snap.issueDate || '',
    };
  }

  applyListFilter(): void {
    const q = this.listSearch.trim().toLowerCase();
    let rows = this.generatedList.map((r) => {
      const meta = this.employeeMeta(r.employeeId, r.dataSnapshot);
      return {
        ...r,
        employeeLabel: meta.label,
        employeeCode: meta.code,
      };
    });
    if (this.listFilterEmployeeOnly && this.employeeId) {
      rows = rows.filter((r) => r.employeeId === this.employeeId);
    }
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.employeeLabel, r.employeeCode, r.templateName, r.issueDate]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    this.filteredList = rows;
    this.currentPage = 1;
  }

  goPage(p: number): void {
    this.currentPage = Math.min(this.totalPages, Math.max(1, p));
  }

  formatSavedAt(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private setPreview(html: string): void {
    this.previewHtml = html;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    const blob = new Blob([html], { type: 'text/html' });
    this.objectUrl = URL.createObjectURL(blob);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
  }

  private safeFileName(row: GeneratedLetterRow, ext: string): string {
    const emp = (row.employeeLabel || 'Employee').replace(/[^\w\-]+/g, '_').slice(0, 40);
    const doc = (row.templateName || 'Letter').replace(/[^\w\-]+/g, '_').slice(0, 40);
    return `${doc}_${emp}.${ext}`;
  }

  private fetchHtml(row: GeneratedLetterRow): Promise<string> {
    return new Promise((resolve, reject) => {
      this.master.getHrGenerated(row.id).subscribe({
        next: (res: any) => {
          const html = res?.data?.filledHtml;
          if (res?.status && html) resolve(html);
          else reject(new Error(res?.message || 'Document not found'));
        },
        error: (err) => reject(new Error(err?.error?.message || 'Failed to load document')),
      });
    });
  }

  openAddForm(): void {
    this.showAddForm = true;
  }

  closeAddForm(): void {
    this.showAddForm = false;
    this.previewHtml = '';
    this.previewUrl = null;
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  preview(): void {
    if (!this.templateId || !this.employeeId) {
      this.notyf.error('Select employee and template');
      return;
    }
    this.showAddForm = true;
    this.loading = true;
    this.master
      .previewHrTemplate({
        templateId: this.templateId,
        employeeId: this.employeeId,
        issueDate: this.issueDate,
        fieldValues: Object.fromEntries(this.templateFields.map((name) => [name, this.fieldValues[name] || ''])),
      })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res?.status) {
            this.setPreview(res.data?.html || '');
            this.lastVariables = res.data?.variables || null;
          } else {
            this.notyf.error(res?.message || 'Preview failed');
          }
        },
        error: (err) => {
          this.loading = false;
          this.notyf.error(err?.error?.message || 'Preview failed');
        },
      });
  }

  saveGenerated(): void {
    if (!this.previewHtml || !this.templateId || !this.employeeId) {
      this.notyf.error('Preview first, then save');
      return;
    }
    this.master
      .saveHrGenerated({
        templateId: this.templateId,
        employeeId: this.employeeId,
        filledHtml: this.previewHtml,
        variables: this.lastVariables,
      })
      .subscribe({
        next: (res: any) => {
          if (res?.status) {
            this.notyf.success(res.message || 'Saved');
            this.loadGeneratedList();
            this.closeAddForm();
          } else this.notyf.error(res?.message || 'Save failed');
        },
        error: (err) => this.notyf.error(err?.error?.message || 'Save failed'),
      });
  }

  viewSaved(row: GeneratedLetterRow): void {
    if (!row?.id) return;
    row.busy = true;
    this.fetchHtml(row)
      .then((html) => {
        this.employeeId = row.employeeId;
        this.templateId = row.templateId || this.templateId;
        this.showAddForm = true;
        this.setPreview(html);
        this.lastVariables = row.dataSnapshot || null;
        this.notyf.success('Loaded saved letter');
      })
      .catch((e) => this.notyf.error(e?.message || 'Could not open letter'))
      .finally(() => (row.busy = false));
  }

  printSaved(row: GeneratedLetterRow): void {
    if (!row?.id) return;
    row.busy = true;
    this.fetchHtml(row)
      .then((html) => {
        const w = window.open('', '_blank');
        if (!w) {
          this.notyf.error('Popup blocked');
          return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 300);
      })
      .catch((e) => this.notyf.error(e?.message || 'Could not print'))
      .finally(() => (row.busy = false));
  }

  async downloadPdf(row: GeneratedLetterRow): Promise<void> {
    if (!row?.id) return;
    row.busy = true;
    try {
      const html = await this.fetchHtml(row);
      await downloadHtmlAsPdf({
        html,
        filename: this.safeFileName(row, 'pdf'),
        widthMm: 210,
        heightMm: 297,
      });
      this.notyf.success('PDF downloaded');
    } catch (e: any) {
      console.error(e);
      this.notyf.error(e?.message || 'PDF download failed');
    } finally {
      row.busy = false;
    }
  }

  async downloadWord(row: GeneratedLetterRow): Promise<void> {
    if (!row?.id) return;
    row.busy = true;
    try {
      const html = await this.fetchHtml(row);
      // Word opens HTML saved as .doc (same approach as legacy letter downloads)
      const blob = new Blob(
        [
          `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
            `xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
            `<head><meta charset="utf-8"><title>${row.templateName || 'Letter'}</title></head>` +
            `<body>${html.replace(/^[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '') || html}</body></html>`,
        ],
        { type: 'application/msword' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.safeFileName(row, 'doc');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.notyf.success('Word downloaded');
    } catch (e: any) {
      this.notyf.error(e?.message || 'Word download failed');
    } finally {
      row.busy = false;
    }
  }

  print(): void {
    if (!this.previewHtml) {
      this.notyf.error('Preview first');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) {
      this.notyf.error('Popup blocked');
      return;
    }
    w.document.open();
    w.document.write(this.previewHtml);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }
}

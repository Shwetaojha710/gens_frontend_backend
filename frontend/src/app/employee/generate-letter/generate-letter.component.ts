import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-generate-letter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './generate-letter.component.html',
  styleUrl: './generate-letter.component.css',
})
export class GenerateLetterComponent implements OnInit {
  notyf = new Notyf();
  templates: any[] = [];
  employees: any[] = [];
  templateId = '';
  employeeId = '';
  issueDate = new Date().toISOString().slice(0, 10);
  previewHtml = '';
  previewUrl: SafeResourceUrl | null = null;
  private objectUrl: string | null = null;
  loading = false;
  lastVariables: any = null;

  constructor(
    private master: MasterService,
    private employeeService: EmployeeService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
    this.loadEmployees();
  }

  loadTemplates(): void {
    this.master.listHrTemplates({ status: 'active' }).subscribe({
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
          this.employees = res.data?.formattedActiveEmps || res.data?.formattedEmps || [];
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

  preview(): void {
    if (!this.templateId || !this.employeeId) {
      this.notyf.error('Select employee and template');
      return;
    }
    this.loading = true;
    this.master
      .previewHrTemplate({
        templateId: this.templateId,
        employeeId: this.employeeId,
        issueDate: this.issueDate,
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
          if (res?.status) this.notyf.success(res.message || 'Saved');
          else this.notyf.error(res?.message || 'Save failed');
        },
        error: (err) => this.notyf.error(err?.error?.message || 'Save failed'),
      });
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

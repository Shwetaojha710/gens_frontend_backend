import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { AiHrmsService } from '../../services/ai-hrms.service';
import { MasterService } from '../../services/master.service';
import { formatAiSummary } from '../format-ai-summary';

@Component({
  selector: 'app-attrition-prediction',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './attrition-prediction.component.html',
  styleUrl: './attrition-prediction.component.css',
})
export class AttritionPredictionComponent implements OnInit {
  private notyf = new Notyf();

  employeeOptions: { value: string; label: string }[] = [];

  mode: 'all' | 'single' = 'all';
  employeeId: string | null = null;
  loading = false;
  result: any = null;

  constructor(
    private aiHrms: AiHrmsService,
    private master: MasterService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.run();
  }

  private loadEmployees(): void {
    this.master.getemployeeList().subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) {
          this.employeeOptions = res.data.map((item: any) => ({
             value: item.value,
            label: item.label,
          }));
        }
      },
      error: () => {},
    });
  }

  formatSummary(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(formatAiSummary(text));
  }

  riskBadgeClass(level: string): string {
    if (level === 'high') return 'bg-label-danger';
    if (level === 'medium') return 'bg-label-warning';
    return 'bg-label-success';
  }

  riskFillClass(level: string): string {
    if (level === 'high') return 'ai-meter-fill--bad';
    if (level === 'medium') return 'ai-meter-fill--warn';
    return 'ai-meter-fill--good';
  }

  sortedPredictions(): any[] {
    if (!Array.isArray(this.result?.predictions)) return [];
    return [...this.result.predictions].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }

  run(): void {
    if (this.mode === 'single' && !this.employeeId) {
      this.notyf.error('Select an employee first');
      return;
    }
    this.loading = true;
    this.aiHrms
      .getAttritionPredictions(
        this.mode === 'single' ? { employee_id: this.employeeId! } : { active_only: true, limit: 20 },
      )
      .subscribe({
        next: (res: any) => {
          this.result = res;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notyf.error(err?.error?.detail || 'Could not load attrition predictions');
        },
      });
  }
}

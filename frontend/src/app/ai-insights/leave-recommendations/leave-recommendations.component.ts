import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { AiHrmsService } from '../../services/ai-hrms.service';
import { MasterService } from '../../services/master.service';

@Component({
  selector: 'app-leave-recommendations',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './leave-recommendations.component.html',
  styleUrl: './leave-recommendations.component.css',
})
export class LeaveRecommendationsComponent implements OnInit {
  private notyf = new Notyf();

  employeeOptions: { value: string; label: string }[] = [];

  employeeId: string | null = null;
  durationDays = 3;
  preferredFrom = '';
  loading = false;
  result: any = null;

  constructor(
    private aiHrms: AiHrmsService,
    private master: MasterService,
  ) {}

  ngOnInit(): void {
    this.preferredFrom = new Date().toISOString().slice(0, 10);
    this.loadEmployees();
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

  sortedSlots(): any[] {
    if (!Array.isArray(this.result?.ai_recommendations)) return [];
    return [...this.result.ai_recommendations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  run(): void {
    if (!this.employeeId || !this.durationDays || !this.preferredFrom) {
      this.notyf.error('Fill in employee, duration and preferred date');
      return;
    }
    this.loading = true;
    this.aiHrms
      .recommendLeave({
        employee_id: this.employeeId,
        duration_days: this.durationDays,
        preferred_from: this.preferredFrom,
      })
      .subscribe({
        next: (res: any) => {
          this.result = res;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notyf.error(err?.error?.detail || 'Could not load leave recommendations');
        },
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-demos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './aa-demos.component.html',
})
export class AaDemosComponent implements OnInit {
  private notyf = new Notyf();
  rows: any[] = [];
  status = '';
  upcomingOnly = false;
  loading = false;

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .listDemos({
        status: this.status || undefined,
        upcoming: this.upcomingOnly || undefined,
        order: 'asc',
      })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.rows = res?.status === true ? res.data || [] : [];
        },
        error: () => (this.loading = false),
      });
  }

  setStatus(row: any, status: string): void {
    if (!row?.id) return;
    this.api.updateDemo(row.id, status).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success(`Demo marked ${status}`);
        this.load();
      } else this.notyf.error(res?.message || 'Update failed');
    });
  }
}

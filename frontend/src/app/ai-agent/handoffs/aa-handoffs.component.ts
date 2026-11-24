import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-handoffs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './aa-handoffs.component.html',
})
export class AaHandoffsComponent implements OnInit {
  private notyf = new Notyf();
  rows: any[] = [];
  status = 'pending';
  selected: any = null;
  notes = '';
  resolving = false;

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listHandovers({ status: this.status || undefined }).subscribe((res: any) => {
      this.rows = res?.status === true ? res.data || [] : [];
    });
  }

  open(row: any): void {
    this.selected = row;
    this.notes = row?.notes || '';
  }

  close(): void {
    this.selected = null;
    this.notes = '';
  }

  resolve(status = 'resolved'): void {
    if (!this.selected?.id) return;
    this.resolving = true;
    this.api.resolveHandover(this.selected.id, status, this.notes).subscribe({
      next: (res: any) => {
        this.resolving = false;
        if (res?.status === true) {
          this.notyf.success(status === 'resolved' ? 'Handoff resolved' : `Marked ${status}`);
          this.close();
          this.load();
        } else this.notyf.error(res?.message || 'Failed');
      },
      error: () => (this.resolving = false),
    });
  }

}

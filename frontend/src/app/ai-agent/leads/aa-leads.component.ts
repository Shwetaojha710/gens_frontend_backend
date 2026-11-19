import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aa-leads.component.html',
})
export class AaLeadsComponent implements OnInit {
  private notyf = new Notyf();
  rows: any[] = [];
  selected: any = null;
  messages: any[] = [];
  q = '';
  leadPriority = '';
  leadStatus = '';

  constructor(private api: AiAgentService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listLeads({
      q: this.q || undefined,
      leadPriority: this.leadPriority || undefined,
      leadStatus: this.leadStatus || undefined,
    }).subscribe((res: any) => (this.rows = res?.data || []));
  }

  open(row: any): void {
    this.api.getLead(row.id).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Failed');
        return;
      }
      this.selected = { ...res.data.lead };
      this.messages = res.data.messages || [];
    });
  }

  save(): void {
    if (!this.selected?.id) return;
    this.api.updateLead(this.selected).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success('Lead updated');
        this.load();
      } else this.notyf.error(res?.message || 'Update failed');
    });
  }

  close(): void {
    this.selected = null;
    this.messages = [];
  }
}

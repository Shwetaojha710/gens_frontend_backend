import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-crm',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './aa-crm.component.html',
})
export class AaCrmComponent implements OnInit {
  data: any = null;

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    this.api.crmDashboard().subscribe((res: any) => {
      if (res?.status === true) this.data = res.data;
    });
  }

  dispClass(d: string | null): string {
    if (d === 'interested') return 'bg-success';
    if (d === 'not_ready') return 'bg-warning text-dark';
    if (d === 'declined') return 'bg-secondary';
    return 'bg-light text-dark';
  }

  dispLabel(d: string | null): string {
    if (d === 'interested') return 'Interested';
    if (d === 'not_ready') return 'Not ready';
    if (d === 'declined') return 'Declined';
    return '—';
  }
}

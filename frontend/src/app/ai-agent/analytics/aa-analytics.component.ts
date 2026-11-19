import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aa-analytics.component.html',
})
export class AaAnalyticsComponent implements OnInit {
  data: any = null;

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    this.api.analytics().subscribe((res: any) => {
      if (res?.status === true) this.data = res.data;
    });
  }
}

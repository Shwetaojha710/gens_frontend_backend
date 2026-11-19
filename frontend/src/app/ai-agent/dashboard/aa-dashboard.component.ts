import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './aa-dashboard.component.html',
})
export class AaDashboardComponent implements OnInit {
  data: any = null;

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    this.api.dashboard().subscribe((res: any) => {
      if (res?.status === true) this.data = res.data;
    });
  }
}

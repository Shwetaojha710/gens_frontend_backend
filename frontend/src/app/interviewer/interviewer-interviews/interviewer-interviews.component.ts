import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InterviewerSectionItem } from '../../services/interview.service';

@Component({
  selector: 'app-interviewer-interviews',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './interviewer-interviews.component.html',
  styleUrl: './interviewer-interviews.component.css'
})
export class InterviewerInterviewsComponent {
  @Input() items: InterviewerSectionItem[] = [];

  getItemIcon(label: string, index: number): string {
    const map: Record<string, string> = {
      'All Interviews': 'ri-stack-line',
      'Scheduled Interviews': 'ri-time-line',
      'Upcoming Interviews': 'ri-calendar-event-line',
      'Pending Interviews': 'ri-loader-2-line',
      "Today's Interviews": 'ri-sun-line',
      'Completed Interviews': 'ri-checkbox-circle-line'
    };

    return map[label] || (index === 0 ? 'ri-stack-line' : 'ri-bar-chart-box-line');
  }
}

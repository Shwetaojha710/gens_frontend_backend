import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InterviewerSectionItem } from '../../services/interview.service';

@Component({
  selector: 'app-interviewer-feedback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './interviewer-feedback.component.html',
  styleUrl: './interviewer-feedback.component.css'
})
export class InterviewerFeedbackComponent {
  @Input() items: InterviewerSectionItem[] = [];

  getItemIcon(label: string, index: number): string {
    const map: Record<string, string> = {
      'Pending Feedback': 'ri-file-warning-line',
      'Submitted Feedback': 'ri-draft-line',
      'Feedback History': 'ri-history-line'
    };

    return map[label] || (index === 0 ? 'ri-file-list-3-line' : 'ri-chat-check-line');
  }
}

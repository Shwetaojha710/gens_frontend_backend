import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InterviewerSectionItem } from '../../services/interview.service';

@Component({
  selector: 'app-interviewer-candidates',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './interviewer-candidates.component.html',
  styleUrl: './interviewer-candidates.component.css'
})
export class InterviewerCandidatesComponent {
  @Input() items: InterviewerSectionItem[] = [];

  getItemIcon(label: string, index: number): string {
    const map: Record<string, string> = {
      'All Candidates': 'ri-group-line',
      'Shortlisted Candidates': 'ri-user-star-line',
      'Selected Candidates': 'ri-user-follow-line',
      'Rejected Candidates': 'ri-user-unfollow-line'
    };

    return map[label] || (index === 0 ? 'ri-group-line' : 'ri-user-line');
  }
}

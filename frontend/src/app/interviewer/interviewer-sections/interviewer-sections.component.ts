import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { InterviewerSectionGroup } from '../../services/interview.service';

@Component({
  selector: 'app-interviewer-sections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interviewer-sections.component.html',
  styleUrl: './interviewer-sections.component.css'
})
export class InterviewerSectionsComponent {
  @Input() sections: InterviewerSectionGroup[] = [];

  getSectionId(title: string): string {
    return `${title.toLowerCase()}-overview`;
  }
}

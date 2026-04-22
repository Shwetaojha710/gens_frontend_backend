import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { InterviewerHeaderComponent } from './interviewer-header/interviewer-header.component';
import { InterviewerNavbarComponent } from './interviewer-navbar/interviewer-navbar.component';

@Component({
  selector: 'app-interviewer',
  standalone: true,
  imports: [InterviewerHeaderComponent, InterviewerNavbarComponent, RouterModule],
  templateUrl: './interviewer.component.html',
  styleUrl: './interviewer.component.css'
})
export class InterviewerComponent {

}

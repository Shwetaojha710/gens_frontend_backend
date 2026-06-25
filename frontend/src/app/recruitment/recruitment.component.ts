import { Component } from '@angular/core';
import { HeaderComponent } from "../include/header/header.component";
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { RecruitmentNavbarComponent } from './recruitment-navbar/recruitment-navbar.component';

@Component({
  selector: 'app-recruitment',
  imports: [HeaderComponent, NavbarComponent, RecruitmentNavbarComponent, RouterModule],
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.css'
})
export class RecruitmentComponent {

}

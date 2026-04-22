import { Component } from '@angular/core';
import { HeaderComponent } from "../include/header/header.component";
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { NewnavbarComponent } from '../newnavbar/newnavbar.component';
import { RecruitmentNavbarComponent } from './recruitment-navbar/recruitment-navbar.component';
// import { NgClass } from "../../../node_modules/@angular/common/common_module.d-NEF7UaHr";

@Component({
  selector: 'app-recruitment',
  imports: [HeaderComponent, NavbarComponent, NewnavbarComponent, RecruitmentNavbarComponent, RouterModule],
  templateUrl: './recruitment.component.html',
  styleUrl: './recruitment.component.css'
})
export class RecruitmentComponent {

}

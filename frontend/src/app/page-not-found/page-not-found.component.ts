import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-page-not-found',
 imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.css'
})
export class PageNotFoundComponent {
  constructor(public router:Router){

  }
  backtohome(){
    console.log("helooo");
    
    this.router.navigate(['layout/dashboard'])
  }
}

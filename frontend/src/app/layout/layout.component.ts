import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../include/header/header.component';
import { NewnavbarComponent } from '../newnavbar/newnavbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [NavbarComponent, NewnavbarComponent, HeaderComponent, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {

}

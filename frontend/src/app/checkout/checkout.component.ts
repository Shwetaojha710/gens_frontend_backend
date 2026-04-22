import { Component } from '@angular/core';
import { LandingFooterComponent } from '../landing-footer/landing-footer.component';
import { LandingHeaderComponent } from '../landing-header/landing-header.component';

@Component({
  selector: 'app-checkout',
  imports: [
    LandingHeaderComponent,
    LandingFooterComponent
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {

}

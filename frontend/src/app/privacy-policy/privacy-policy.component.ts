import { Component } from '@angular/core';
import { LandingHeaderComponent } from '../landing-header/landing-header.component';
import { LandingFooterComponent } from '../landing-footer/landing-footer.component';

@Component({
  selector: 'app-privacy-policy',
  imports: [LandingHeaderComponent, LandingFooterComponent],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css'
})
export class PrivacyPolicyComponent {

}

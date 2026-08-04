import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FOOTER_LINKS, SOCIAL_LINKS, CONTACT_INFO } from '../../../data/site-data';

@Component({
  selector: 'app-marketing-footer',
  imports: [RouterLink, FormsModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly footerLinks = FOOTER_LINKS;
  readonly socialLinks = SOCIAL_LINKS;
  readonly contactInfo = CONTACT_INFO;
  readonly year = new Date().getFullYear();

  email = '';
  subscribed = false;

  subscribe(): void {
    if (this.email) {
      this.subscribed = true;
      this.email = '';
    }
  }

  socialIconClass(icon: string): string {
    switch (icon) {
      case 'linkedin':
        return 'ri-linkedin-box-fill';
      case 'twitter':
        return 'ri-twitter-x-fill';
      case 'facebook':
        return 'ri-facebook-circle-fill';
      case 'youtube':
        return 'ri-youtube-fill';
      case 'instagram':
        return 'ri-instagram-fill';
      default:
        return 'ri-links-line';
    }
  }
}

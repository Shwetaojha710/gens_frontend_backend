import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { ContactFormComponent } from '../../shared/components/contact-form/contact-form.component';
import { SeoService } from '../../services/seo.service';
import { CONTACT_INFO } from '../../data/site-data';

@Component({
  selector: 'app-contact-page',
  imports: [RouterLink, PageHeroComponent, ContactFormComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly contactInfo = CONTACT_INFO;
  mapEmbedSafeUrl: SafeResourceUrl;

  constructor() {
    this.mapEmbedSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(CONTACT_INFO.mapEmbedUrl);
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Contact Us',
      description:
        "Get in touch with the GENS.Ai team — book a demo, ask about pricing, or reach our support team.",
    });
  }
}

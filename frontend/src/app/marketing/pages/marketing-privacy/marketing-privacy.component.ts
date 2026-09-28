import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { SeoService } from '../../services/seo.service';
import { CONTACT_INFO } from '../../data/site-data';

interface LegalSection {
  title: string;
  paragraphs: string[];
}

@Component({
  selector: 'app-marketing-privacy',
  imports: [PageHeroComponent],
  templateUrl: './marketing-privacy.component.html',
  styleUrl: './marketing-privacy.component.css'
})
export class MarketingPrivacyComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly sections: LegalSection[] = [
    {
      title: 'Information We Collect',
      paragraphs: [
        'We collect information you provide directly to us, such as your name, work email, company name, phone number, and any messages you send through our contact forms, demo requests, or support channels. When you use GENS as part of a subscribed organization, we also process employee, attendance, payroll, and other HR data that your organization submits into the platform on its own behalf.',
        'In addition, we automatically collect certain technical information when you visit our website or use our application, including IP address, browser type, device information, pages visited, and usage patterns, typically through cookies and similar technologies described below.',
      ],
    },
    {
      title: 'How We Use Your Information',
      paragraphs: [
        'We use the information we collect to provide, maintain, and improve the GENS platform, respond to inquiries and support requests, process transactions, send product updates and marketing communications (where you have consented), and personalize your experience with our services.',
        'We may also use aggregated or de-identified data to analyze usage trends, strengthen platform security, and inform product development, and to comply with applicable legal, regulatory, or contractual obligations.',
      ],
    },
    {
      title: 'Data Security',
      paragraphs: [
        'We implement industry-standard technical and organizational safeguards to protect your information, including encryption of data in transit and at rest, role-based access controls, regular security assessments, and secure, monitored hosting infrastructure.',
        'While we work hard to protect your data, no method of transmission or storage is completely secure. We continuously review and update our security practices to reduce risk and respond promptly to any identified vulnerabilities.',
      ],
    },
    {
      title: 'Data Sharing & Third Parties',
      paragraphs: [
        'We do not sell your personal information. We may share information with trusted third-party service providers who help us operate our website and deliver our services, such as cloud hosting, payment processing, analytics, and customer support tools, all of whom are bound by confidentiality and data protection obligations.',
        'We may also disclose information where required by law, to protect our legal rights, or in connection with a merger, acquisition, or sale of company assets, in which case we will take reasonable steps to ensure your information continues to be protected.',
      ],
    },
    {
      title: 'Your Rights & Choices',
      paragraphs: [
        'Depending on your location, you may have the right to access, correct, update, delete, or export your personal data, and to object to or restrict certain types of processing. You may also opt out of marketing communications at any time using the unsubscribe link in our emails or by contacting us directly.',
        'To exercise any of these rights, please reach out using the contact details below and we will respond within a reasonable timeframe in accordance with applicable law.',
      ],
    },
    {
      title: 'Cookies & Tracking',
      paragraphs: [
        'We use cookies and similar tracking technologies to keep you signed in, remember your preferences, understand how our website and application are used, and improve overall performance. Some cookies are essential to the functioning of our services, while others support analytics and marketing.',
        'You can manage or disable cookies through your browser settings at any time; please note that disabling certain cookies may affect the functionality of our website or application.',
      ],
    },
    {
      title: 'Contact Us',
      paragraphs: [
        `If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please reach out to our team at ${CONTACT_INFO.salesEmail} or call us at ${CONTACT_INFO.phone}. We are happy to help address any privacy-related concerns.`,
      ],
    },
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Privacy Policy',
      description: 'Read the GENS.Ai privacy policy to learn how we collect, use, protect, and share information across our HRMS platform and website.',
    });
  }
}

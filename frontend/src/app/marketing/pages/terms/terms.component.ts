import { Component, OnInit, inject } from '@angular/core';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { SeoService } from '../../services/seo.service';
import { CONTACT_INFO } from '../../data/site-data';

interface LegalSection {
  title: string;
  paragraphs: string[];
}

@Component({
  selector: 'app-terms',
  imports: [PageHeroComponent],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.css'
})
export class TermsComponent implements OnInit {
  private readonly seo = inject(SeoService);

  readonly sections: LegalSection[] = [
    {
      title: 'Acceptance of Terms',
      paragraphs: [
        'By accessing or using the GENS website, application, or any related services (collectively, the "Services"), you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree to these terms, please do not access or use the Services.',
        'These terms apply to all visitors, users, and organizations that access the Services, including those using the Services on behalf of an employer or client.',
      ],
    },
    {
      title: 'Description of Services',
      paragraphs: [
        'GENS provides a cloud-based Human Resource Management System (HRMS) offering modules such as employee management, attendance tracking, leave management, payroll processing, recruitment, and performance management. The specific features available to you depend on your subscribed plan.',
        'We continuously improve our Services and reserve the right to modify, add, or remove features, with reasonable notice provided for any changes that materially affect your use of the platform.',
      ],
    },
    {
      title: 'User Accounts & Responsibilities',
      paragraphs: [
        'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information when creating an account and to keep that information up to date.',
        'You must notify us immediately of any unauthorized use of your account or any other breach of security. We are not liable for any loss or damage arising from your failure to safeguard your account credentials.',
      ],
    },
    {
      title: 'Payment & Billing Terms',
      paragraphs: [
        'Subscription fees are billed on a monthly or annual basis, as selected at the time of purchase, and are based on the plan and number of employees or users covered. Unless otherwise required by law, fees already paid are non-refundable.',
        'We reserve the right to change our pricing, provided we give existing subscribers reasonable advance notice before any change takes effect. Continued use of the Services after a price change constitutes acceptance of the new pricing.',
      ],
    },
    {
      title: 'Intellectual Property',
      paragraphs: [
        'All content, features, trademarks, logos, and underlying technology of the GENS platform are the property of Quaere Etechnologies Pvt Ltd or its licensors and are protected by applicable intellectual property laws.',
        'You may not copy, modify, distribute, sell, or create derivative works based on any part of the Services without our prior written consent. Any data you or your organization submit to the platform remains your property.',
      ],
    },
    {
      title: 'Limitation of Liability',
      paragraphs: [
        'To the fullest extent permitted by law, GENS and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Services.',
        'Our total aggregate liability for any claim arising from these terms or the Services shall not exceed the total amount paid by you to GENS in the twelve (12) months preceding the event giving rise to the claim.',
      ],
    },
    {
      title: 'Governing Law',
      paragraphs: [
        'These Terms & Conditions are governed by and construed in accordance with the laws of India, without regard to its conflict of law principles. Any disputes arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the courts located in Lucknow, Uttar Pradesh.',
      ],
    },
    {
      title: 'Contact Us',
      paragraphs: [
        `If you have any questions about these Terms & Conditions, please contact our team at ${CONTACT_INFO.salesEmail} or call us at ${CONTACT_INFO.phone}. We're glad to help clarify anything related to your use of the Services.`,
      ],
    },
  ];

  ngOnInit(): void {
    this.seo.update({
      title: 'Terms & Conditions',
      description: 'Review the GENS.Ai terms and conditions governing your use of our website, application, and HRMS services.',
    });
  }
}

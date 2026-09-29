import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { environment } from '../../../environments/environment';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-e-insurance-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-portal-e-insurance-card.component.html',
  styleUrl: './employee-portal-e-insurance-card.component.css',
})
export class EmployeePortalEInsuranceCardComponent implements OnInit {
  loading = true;
  eCard: any = null;
  private notyf = new Notyf();

  constructor(private portalService: EmployeePortalService) {}

  ngOnInit(): void {
    this.portalService.getAppInsuranceDocs().subscribe({
      next: (res) => {
        this.loading = false;
        const list = Array.isArray(res?.data) ? res.data : [];
        const card = list.find(
          (d: any) => d.insuranceDocType === 'e_insurance_card' || d.typeLabel === 'E-Insurance Card',
        );
        if (card) {
          this.eCard = {
            ...card,
            fileUrl: this.buildUploadUrl(card.doc_name),
          };
        } else {
          this.eCard = null;
        }
      },
      error: () => {
        this.loading = false;
        this.eCard = null;
        this.notyf.error('Could not load E-Insurance Card.');
      },
    });
  }

  private buildUploadUrl(docName: string): string {
    if (!docName) return '';
    if (/^https?:\/\//i.test(docName)) return docName;
    const root = String(environment.apiUrl || '').replace(/\/api\/?$/, '/');
    return `${root}upload/${docName}`;
  }

  get isImage(): boolean {
    return !!this.eCard?.doc_type?.startsWith('image/');
  }
}

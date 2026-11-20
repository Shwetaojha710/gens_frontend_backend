import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aa-leads.component.html',
})
export class AaLeadsComponent implements OnInit {
  private notyf = new Notyf();
  rows: any[] = [];
  selected: any = null;
  messages: any[] = [];
  q = '';
  leadPriority = '';
  leadStatus = '';
  creating = false;
  outreaching = false;
  showCreate = false;
  newLead: any = {
    phone: '',
    fullName: '',
    companyName: '',
    email: '',
    productInterest: '',
    autoSend: true,
  };

  constructor(private api: AiAgentService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listLeads({
      q: this.q || undefined,
      leadPriority: this.leadPriority || undefined,
      leadStatus: this.leadStatus || undefined,
    }).subscribe((res: any) => (this.rows = res?.data || []));
  }

  open(row: any): void {
    this.api.getLead(row.id).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Failed');
        return;
      }
      this.selected = { ...res.data.lead };
      this.messages = res.data.messages || [];
    });
  }

  save(): void {
    if (!this.selected?.id) return;
    this.api.updateLead(this.selected).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success('Lead updated');
        this.load();
      } else this.notyf.error(res?.message || 'Update failed');
    });
  }

  create(): void {
    if (!this.newLead.phone?.trim()) {
      this.notyf.error('Phone (Meta allowlisted) is required');
      return;
    }
    this.creating = true;
    this.api.createLead({
      phone: this.newLead.phone.trim(),
      fullName: this.newLead.fullName?.trim() || undefined,
      companyName: this.newLead.companyName?.trim() || undefined,
      email: this.newLead.email?.trim() || undefined,
      productInterest: this.newLead.productInterest?.trim() || undefined,
      autoSend: this.newLead.autoSend !== false,
    }).subscribe({
      next: (res: any) => {
        this.creating = false;
        if (res?.status === true) {
          const delivered = res?.data?.delivery?.sent === true;
          if (this.newLead.autoSend && delivered) {
            this.notyf.success(res.message || 'Lead created + welcome sent');
          } else if (this.newLead.autoSend && !delivered) {
            this.notyf.error(res.message || 'Lead created; WhatsApp send failed');
          } else {
            this.notyf.success(res.message || 'Lead created');
          }
          this.showCreate = false;
          this.newLead = {
            phone: '',
            fullName: '',
            companyName: '',
            email: '',
            productInterest: '',
            autoSend: true,
          };
          this.load();
          const id = res?.data?.lead?.id;
          if (id) this.open({ id });
        } else this.notyf.error(res?.message || 'Create failed');
      },
      error: () => (this.creating = false),
    });
  }

  startOutreach(): void {
    if (!this.selected?.id) return;
    if (!this.selected.phone && !this.selected.waId) {
      this.notyf.error('Lead has no phone number');
      return;
    }
    this.outreaching = true;
    this.api.outreachLead(this.selected.id, true).subscribe({
      next: (res: any) => {
        this.outreaching = false;
        if (res?.status === true) {
          const delivered = res?.data?.delivery?.sent === true;
          if (delivered) this.notyf.success(res.message || 'Welcome template sent');
          else this.notyf.error(res?.message || 'Saved, WhatsApp delivery failed');
          this.open(this.selected);
          this.load();
        } else this.notyf.error(res?.message || 'Outreach failed');
      },
      error: () => (this.outreaching = false),
    });
  }

  close(): void {
    this.selected = null;
    this.messages = [];
  }
}

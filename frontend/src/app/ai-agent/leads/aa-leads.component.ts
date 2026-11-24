import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './aa-leads.component.html',
})
export class AaLeadsComponent implements OnInit {
  private notyf = new Notyf();
  rows: any[] = [];
  selected: any = null;
  messages: any[] = [];
  demos: any[] = [];
  pendingHandover: any = null;
  q = '';
  leadPriority = '';
  leadStatus = '';
  salesDisposition = '';
  creating = false;
  outreaching = false;
  handingOff = false;
  wiping = false;
  showCreate = false;
  handoffReason = 'Sales follow-up requested from CRM';
  newLead: any = {
    phone: '',
    fullName: '',
    companyName: '',
    email: '',
    productInterest: '',
    autoSend: true,
  };

  constructor(private api: AiAgentService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const disp = params.get('disposition') || '';
      const openId = params.get('open') || '';
      if (disp) this.salesDisposition = disp;
      this.load(() => {
        if (openId) this.open({ id: openId });
      });
    });
  }

  load(done?: () => void): void {
    this.api
      .listLeads({
        q: this.q || undefined,
        leadPriority: this.leadPriority || undefined,
        leadStatus: this.leadStatus || undefined,
        salesDisposition: this.salesDisposition || undefined,
      })
      .subscribe((res: any) => {
        this.rows = res?.data || [];
        if (done) done();
      });
  }

  open(row: any): void {
    this.api.getLead(row.id).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Failed');
        return;
      }
      this.selected = { ...res.data.lead };
      this.messages = res.data.messages || [];
      this.demos = res.data.demos || [];
      this.pendingHandover = res.data.pendingHandover || null;
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
    this.api
      .createLead({
        phone: this.newLead.phone.trim(),
        fullName: this.newLead.fullName?.trim() || undefined,
        companyName: this.newLead.companyName?.trim() || undefined,
        email: this.newLead.email?.trim() || undefined,
        productInterest: this.newLead.productInterest?.trim() || undefined,
        autoSend: this.newLead.autoSend !== false,
      })
      .subscribe({
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
    if (this.selected.doNotContact) {
      this.notyf.error('Lead opted out (do not contact)');
      return;
    }
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

  handoffToSales(): void {
    if (!this.selected?.conversationId) {
      this.notyf.error('No conversation linked to this lead yet');
      return;
    }
    this.handingOff = true;
    this.api.handover(this.selected.conversationId, this.handoffReason || 'Sales handoff').subscribe({
      next: (res: any) => {
        this.handingOff = false;
        if (res?.status === true) {
          this.notyf.success('Handed off to sales');
          this.open(this.selected);
        } else this.notyf.error(res?.message || 'Handoff failed');
      },
      error: () => (this.handingOff = false),
    });
  }

  wipeAll(): void {
    const ok = confirm(
      'Delete ALL leads and conversations for this company?\n\nThis cannot be undone. Agent config and knowledge are kept.'
    );
    if (!ok) return;
    this.wiping = true;
    this.api.wipeInbox().subscribe({
      next: (res: any) => {
        this.wiping = false;
        if (res?.status === true) {
          this.notyf.success(res.message || 'Inbox wiped');
          this.selected = null;
          this.messages = [];
          this.demos = [];
          this.pendingHandover = null;
          this.load();
        } else this.notyf.error(res?.message || 'Wipe failed');
      },
      error: () => (this.wiping = false),
    });
  }

  close(): void {
    this.selected = null;
    this.messages = [];
    this.demos = [];
    this.pendingHandover = null;
  }

  dispClass(d: string | null): string {
    if (d === 'interested') return 'bg-success';
    if (d === 'not_ready') return 'bg-warning text-dark';
    if (d === 'declined') return 'bg-secondary';
    return 'bg-light text-dark';
  }

  dispLabel(d: string | null): string {
    if (d === 'interested') return 'Interested';
    if (d === 'not_ready') return 'Not ready';
    if (d === 'declined') return 'Declined';
    return '—';
  }
}

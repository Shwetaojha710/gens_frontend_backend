import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aa-conversations.component.html',
  styles: [`
    .aa-shell { display: grid; grid-template-columns: 320px 1fr; gap: 1rem; min-height: 70vh; }
    @media (max-width: 992px) { .aa-shell { grid-template-columns: 1fr; } }
    .aa-list { max-height: 70vh; overflow: auto; }
    .aa-chat { max-height: 52vh; overflow: auto; background: #f7f8fa; }
    .aa-bubble-in { background: #fff; border-radius: 12px 12px 12px 4px; max-width: 85%; }
    .aa-bubble-out { background: #dcf8c6; border-radius: 12px 12px 4px 12px; max-width: 85%; margin-left: auto; }
    .aa-item.active { background: rgba(115, 103, 240, 0.08); }
  `],
})
export class AaConversationsComponent implements OnInit, OnDestroy {
  private notyf = new Notyf();
  private pollTimer: any = null;

  conversations: any[] = [];
  selectedId: string | null = null;
  detail: any = null;
  replyText = '';
  sending = false;
  statusFilter = '';
  simPhone = '';
  simText = '';
  simName = '';
  startPhone = '';
  startName = '';
  starting = false;
  welcomeTemplateName = 'hello_world';
  welcomeTemplateLanguage = 'en_US';
  welcomeTemplateBody =
    'Hello World\nWelcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.';

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    this.loadWelcomeTemplate();
    this.loadList();
    this.pollTimer = setInterval(() => {
      this.loadList(true);
      if (this.selectedId) this.open(this.selectedId, true);
    }, 8000);
  }

  loadWelcomeTemplate(): void {
    this.api.getConfig().subscribe({
      next: (res: any) => {
        const wt = res?.data?.welcomeTemplate || res?.data?.settings?.meta?.welcomeTemplate;
        if (!wt) return;
        if (wt.name) this.welcomeTemplateName = wt.name;
        if (wt.language) this.welcomeTemplateLanguage = wt.language;
        if (wt.body) this.welcomeTemplateBody = wt.body;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  loadList(silent = false): void {
    this.api.listConversations({ status: this.statusFilter || undefined }).subscribe((res: any) => {
      if (res?.status === true) this.conversations = res.data || [];
      else if (!silent) this.notyf.error(res?.message || 'Failed to load');
    });
  }

  open(id: string, silent = false): void {
    this.selectedId = id;
    this.api.getConversation(id).subscribe((res: any) => {
      if (res?.status === true) this.detail = res.data;
      else if (!silent) this.notyf.error(res?.message || 'Failed');
    });
  }

  toggleAi(): void {
    if (!this.detail?.conversation) return;
    const next = !this.detail.conversation.aiEnabled;
    this.api.toggleAi(this.detail.conversation.id, next).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success(next ? 'AI enabled' : 'AI disabled');
        this.open(this.detail.conversation.id);
        this.loadList(true);
      } else this.notyf.error(res?.message || 'Failed');
    });
  }

  handover(): void {
    if (!this.detail?.conversation) return;
    const reason = prompt('Handover reason', 'Customer needs human assistance') || '';
    if (!reason) return;
    this.api.handover(this.detail.conversation.id, reason).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success('Handed over');
        this.open(this.detail.conversation.id);
        this.loadList(true);
      } else this.notyf.error(res?.message || 'Failed');
    });
  }

  send(): void {
    if (!this.detail?.conversation || !this.replyText.trim()) return;
    this.sending = true;
    this.api.sendReply(this.detail.conversation.id, this.replyText.trim()).subscribe({
      next: (res: any) => {
        this.sending = false;
        if (res?.status === true) {
          this.replyText = '';
          const delivered = res?.data?.delivery?.sent === true;
          if (delivered) this.notyf.success(res.message || 'Sent');
          else this.notyf.error(res?.message || 'Saved in inbox, WhatsApp delivery failed');
          this.open(this.detail.conversation.id);
          this.loadList(true);
        } else this.notyf.error(res?.message || 'Send failed');
      },
      error: () => (this.sending = false),
    });
  }

  simulate(): void {
    if (!this.simPhone || !this.simText) {
      this.notyf.error('Phone and message required');
      return;
    }
    this.api.simulate(this.simText, this.simPhone, this.simName || undefined).subscribe((res: any) => {
      if (res?.status === true) {
        this.notyf.success('Simulated');
        this.simText = '';
        this.loadList();
        if (res.data?.conversationId) this.open(res.data.conversationId);
      } else this.notyf.error(res?.message || 'Simulation failed');
    });
  }

  /** Agent auto-sends Meta-approved welcome template to an allowlisted number. */
  startWithTemplate(): void {
    if (!this.startPhone.trim()) {
      this.notyf.error('Allowlisted WhatsApp number is required');
      return;
    }
    this.starting = true;
    this.api.startConversation(this.startPhone.trim(), this.startName.trim() || undefined).subscribe({
      next: (res: any) => {
        this.starting = false;
        if (res?.status === true) {
          const delivered = res?.data?.delivery?.sent === true;
          if (delivered) {
            this.notyf.success(res.message || `Agent welcome (${this.welcomeTemplateName}) sent`);
          } else {
            this.notyf.error(res?.message || 'Saved, but WhatsApp delivery failed');
          }
          this.loadList();
          const id = res?.data?.conversation?.id;
          if (id) this.open(id);
        } else this.notyf.error(res?.message || 'Failed to start conversation');
      },
      error: () => (this.starting = false),
    });
  }
}

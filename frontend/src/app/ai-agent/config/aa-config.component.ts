import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { environment } from '../../../environments/environment';
import { AiAgentService } from '../../services/ai-agent.service';

@Component({
  selector: 'app-aa-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aa-config.component.html',
})
export class AaConfigComponent implements OnInit {
  private notyf = new Notyf();
  loading = true;
  saving = false;
  form: any = {};
  settingsFlags: any = {};
  webhookUrl = '';
  webhookHint = '';

  constructor(private api: AiAgentService) {}

  ngOnInit(): void {
    // Prefer API host from environment (not Angular :4200 origin)
    const apiBase = String(environment.apiUrl || '').replace(/\/+$/, '');
    this.webhookUrl = `${apiBase}/whatsapp/webhook`;
    this.webhookHint = '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getConfig().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Failed to load');
          return;
        }
        const a = res.data.agent || {};
        const s = res.data.settings || {};
        this.settingsFlags = s;
        if (s?.meta?.publicWebhookUrl) {
          this.webhookUrl = s.meta.publicWebhookUrl;
          this.webhookHint = 'Public tunnel URL (Meta can reach this)';
        }
        const wt = s?.meta?.welcomeTemplate || {};
        this.form = {
          name: a.name,
          personality: a.personality,
          systemInstructions: a.systemInstructions,
          companyIntro: a.companyIntro,
          aiProvider: a.aiProvider || 'gemini',
          aiModel: a.aiModel,
          responseLength: a.responseLength || 'short',
          isEnabled: !!a.isEnabled,
          status: a.status || 'active',
          whatsappPhoneNumberId: s.whatsappPhoneNumberId || '',
          whatsappBusinessAccountId: s.whatsappBusinessAccountId || '',
          whatsappVerifyToken: s.whatsappVerifyToken || '',
          whatsappAccessToken: '',
          whatsappAppSecret: '',
          llmApiKey: '',
          notifyOnLead: s.notifyOnLead !== false,
          notifyOnHandover: s.notifyOnHandover !== false,
          salesNotifyEmail: s?.meta?.salesNotifyEmail || '',
          defaultAssigneeId: s.defaultAssigneeId || '',
          welcomeTemplateName: wt.name || 'hello_world',
          welcomeTemplateLanguage: wt.language || 'en_US',
          welcomeTemplateBody:
            wt.body ||
            'Hello World\nWelcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.',
          autoSendWelcomeTemplate: wt.autoSend !== false,
        };
      },
      error: () => (this.loading = false),
    });
  }

  save(): void {
    this.saving = true;
    const payload = { ...this.form };
    if (!payload.whatsappAccessToken) delete payload.whatsappAccessToken;
    if (!payload.whatsappAppSecret) delete payload.whatsappAppSecret;
    if (!payload.llmApiKey) delete payload.llmApiKey;
    if (!payload.defaultAssigneeId) payload.defaultAssigneeId = null;

    this.api.saveConfig(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message || 'Saved');
          this.load();
        } else this.notyf.error(res?.message || 'Unable to save');
      },
      error: () => (this.saving = false),
    });
  }
}

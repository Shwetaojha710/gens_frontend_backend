import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { WebsiteChatTriggerService } from '../../../services/website-chat-trigger.service';

interface WebsiteChatAction {
  label: string;
  type: string;
  url: string | null;
}

interface WebsiteChatResponse {
  success?: boolean;
  title?: string;
  answer?: string;
  suggestions?: string[];
  actions?: WebsiteChatAction[];
  chat_log_id?: number;
}

type ChatStage = 'closed' | 'prompt' | 'chat';

@Component({
  selector: 'app-website-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './website-chatbot.component.html',
  styleUrl: './website-chatbot.component.css',
})
export class WebsiteChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly CHAT_API = environment.websitechatApiUrl;
  private readonly chatTrigger = inject(WebsiteChatTriggerService);
  private shouldScroll = false;
  private triggerSub?: Subscription;

  stage: ChatStage = 'closed';
  chatMessages: { role: 'user' | 'bot'; text: string; title?: string }[] = [];
  chatInput = '';
  chatLoading = false;
  suggestions: string[] = [];
  actions: WebsiteChatAction[] = [];

  readonly starterHints = [
    'What is GENS HR Payroll?',
    'Book Demo',
    'Tell me about pricing',
    'Employee Management',
  ];

  @ViewChild('chatBody') chatBody?: ElementRef<HTMLElement>;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.triggerSub = this.chatTrigger.openChat$.subscribe(() => {
      this.openChatFromPrompt();
    });
  }

  ngOnDestroy(): void {
    this.triggerSub?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.chatBody?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      /* ignore */
    }
  }

  onFabClick(): void {
    if (this.stage === 'closed') {
      this.stage = 'prompt';
      return;
    }
    this.closeAll();
  }

  openChatFromPrompt(): void {
    this.stage = 'chat';
    if (this.chatMessages.length === 0) {
      this.chatMessages.push({
        role: 'bot',
        text: 'Hi! Ask me anything about GENS HR Payroll — features, pricing, or book a demo.',
      });
    }
    this.shouldScroll = true;
  }

  startWith(text: string): void {
    this.stage = 'chat';
    this.shouldScroll = true;
    this.sendMessage(text);
  }

  closeAll(): void {
    this.stage = 'closed';
    this.chatMessages = [];
    this.chatInput = '';
    this.suggestions = [];
    this.actions = [];
    this.chatLoading = false;
  }

  closeToPrompt(): void {
    this.stage = 'prompt';
  }

  sendChatMessage(): void {
    this.sendMessage(this.chatInput);
  }

  sendMessage(raw: string): void {
    const message = raw.trim();
    if (!message || this.chatLoading) return;

    this.chatMessages.push({ role: 'user', text: message });
    this.chatInput = '';
    this.chatLoading = true;
    this.suggestions = [];
    this.actions = [];
    this.shouldScroll = true;

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http
      .post<WebsiteChatResponse>(this.CHAT_API, { message }, { headers })
      .subscribe({
        next: (res) => {
          const reply =
            res.answer ||
            (res.success === false
              ? 'Sorry, I could not find an answer.'
              : 'Done!');
          this.chatMessages.push({
            role: 'bot',
            text: reply,
            title: res.title,
          });
          this.suggestions = res.suggestions || [];
          this.actions = res.actions || [];
          this.chatLoading = false;
          this.shouldScroll = true;
        },
        error: () => {
          this.chatMessages.push({
            role: 'bot',
            text: 'Sorry, something went wrong. Please try again.',
          });
          this.chatLoading = false;
          this.shouldScroll = true;
        },
      });
  }

  onSuggestionClick(suggestion: string): void {
    this.sendMessage(suggestion);
  }

  onActionClick(action: WebsiteChatAction): void {
    if (action.url) {
      window.open(action.url, '_blank', 'noopener');
      return;
    }
    this.sendMessage(action.label);
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
  }
}

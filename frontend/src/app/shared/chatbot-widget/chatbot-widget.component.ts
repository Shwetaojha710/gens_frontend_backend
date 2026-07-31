import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Notyf } from 'notyf';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrl: './chatbot-widget.component.css',
})
export class ChatbotWidgetComponent implements AfterViewChecked {
  private readonly CHAT_API = environment.chatApiUrl;
  private notyf = new Notyf();

  isChatOpen = false;
  chatMessages: { role: 'user' | 'bot'; text: string }[] = [];
  chatInput = '';
  chatLoading = false;
  isListening = false;
  micLang: 'hi-IN' | 'en-IN' = 'hi-IN';
  recordingLabel = '● Listening…';
  private recognition: any = null;
  private shouldScroll = false;

  @ViewChild('chatBody') chatBody!: ElementRef;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  formatText(text: string): SafeHtml {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const withBold = escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(withBold);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const element = this.chatBody.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {}
  }

  private getTenantId(): string {
    try {
      const raw = localStorage.getItem('tenant') || localStorage.getItem('empPortalTenant') || '{}';
      const t = JSON.parse(raw) as { id?: string; tenantId?: string; tenant_id?: string };
      return String(t.id ?? t.tenantId ?? t.tenant_id ?? '');
    } catch {
      return '';
    }
  }

  private getUserId(): string {
    try {
      const raw = localStorage.getItem('user') || localStorage.getItem('empPortalUser') || '{}';
      const u = JSON.parse(raw) as { id?: string; _id?: string; employeeId?: string };
      return String(u.id ?? u._id ?? u.employeeId ?? 'guest');
    } catch {
      return 'guest';
    }
  }

  private greetingText(): string {
    return this.micLang === 'hi-IN' ? 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?' : 'Hi! How can I help you today?';
  }

  toggleChat(): void {
    const wasOpen = this.isChatOpen;
    this.isChatOpen = !this.isChatOpen;

    if (wasOpen && !this.isChatOpen) {
      if (this.isListening) {
        this.toggleMic();
      }
      this.chatMessages = [];
      this.chatInput = '';
    }

    if (this.isChatOpen && this.chatMessages.length == 0) {
      this.chatMessages.push({ role: 'bot', text: this.greetingText() });
    }
    if (this.isChatOpen) {
      this.shouldScroll = true;
    }
  }

  switchLang(): void {
    this.micLang = this.micLang === 'hi-IN' ? 'en-IN' : 'hi-IN';
    // Only the untouched welcome message can be safely re-translated in place —
    // real bot replies already came back in whatever language was selected at the time.
    if (this.chatMessages.length === 1 && this.chatMessages[0].role === 'bot') {
      this.chatMessages[0] = { role: 'bot', text: this.greetingText() };
    }
  }

  sendChatMessage(): void {
    const text = this.chatInput.trim();
    if (!text || this.chatLoading) return;
    this.chatMessages.push({ role: 'user', text });
    this.chatInput = '';
    this.chatLoading = true;
    this.shouldScroll = true;

    const tenantId = this.getTenantId();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    });

    const lang = this.micLang == 'hi-IN' ? 'hi' : 'en';
    this.http.post<{ answer?: string; reply?: string; message?: string; response?: string }>(
        this.CHAT_API,
        { employee_id: this.getUserId(), message: text, lang },
        { headers },
      )
      .subscribe({
        next: (res) => {
          const fallback = this.micLang === 'hi-IN' ? 'हो गया!' : 'Done!';
          const reply = res.answer ?? res.reply ?? res.message ?? res.response ?? fallback;
          this.chatMessages.push({ role: 'bot', text: reply });
          this.chatLoading = false;
          this.shouldScroll = true;
        },
        error: () => {
          const errText = this.micLang === 'hi-IN'
            ? 'क्षमा करें, कुछ गड़बड़ हो गई। कृपया फिर से प्रयास करें।'
            : 'Sorry, something went wrong. Please try again.';
          this.chatMessages.push({ role: 'bot', text: errText });
          this.chatLoading = false;
          this.shouldScroll = true;
        },
      });
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
  }

  toggleMic(): void {
    if (this.isListening) {
      this.isListening = false;
      this.recordingLabel = this.micLang === 'hi-IN' ? '● सुन रहा हूँ…' : '● Listening…';
      this.recognition?.stop();
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.notyf.error('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = this.micLang;
    this.recognition.interimResults = true;
    this.recognition.continuous = true;
    this.recognition.maxAlternatives = 5;

    this.isListening = true;
    this.chatInput = '';
    this.recordingLabel = this.micLang === 'hi-IN' ? '● सुन रहा हूँ…' : '● Listening…';
    let finalText = '';
    let lowConfidenceWarned = false;
    const LOW_CONFIDENCE_THRESHOLD = 0.5;

    this.recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Pick the highest-confidence alternative instead of always [0] —
        // hi-IN in particular returns weak/garbled top picks for code-mixed speech.
        let best = result[0];
        for (let a = 1; a < result.length; a++) {
          if ((result[a].confidence || 0) > (best.confidence || 0)) best = result[a];
        }
        if (result.isFinal) {
          finalText += best.transcript + ' ';
          if (this.micLang === 'hi-IN' && best.confidence > 0 && best.confidence < LOW_CONFIDENCE_THRESHOLD && !lowConfidenceWarned) {
            lowConfidenceWarned = true;
            this.notyf.error('Hindi voice recognition sounded unclear — please check the text before sending.');
          }
        } else {
          interim = best.transcript;
        }
      }
      this.chatInput = (finalText + interim).trim();
      const listeningFallback = this.micLang === 'hi-IN' ? 'सुन रहा हूँ…' : 'Listening…';
      this.recordingLabel = `● ${this.chatInput || listeningFallback}`;
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'network') return;
      this.isListening = false;
      this.recordingLabel = this.micLang === 'hi-IN' ? '● सुन रहा हूँ…' : '● Listening…';
      if (event.error === 'not-allowed') {
        this.notyf.error('Microphone access denied. Allow mic in browser settings and reload.');
      } else {
        this.notyf.error('Mic error: ' + event.error);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        try { this.recognition.start(); } catch { /* ignore */ }
      }
    };

    try {
      this.recognition.start();
    } catch {
      this.isListening = false;
      this.notyf.error('Could not start microphone.');
    }
  }
}

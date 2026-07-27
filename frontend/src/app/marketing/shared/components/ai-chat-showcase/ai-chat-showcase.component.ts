import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AI_CHAT_DEMO } from '../../../data/site-data';
import { AiChatMessage } from '../../../data/site.models';

/** Animated fake chat UI that auto-plays the AI_CHAT_DEMO script on a timer loop. */
@Component({
  selector: 'app-ai-chat-showcase',
  imports: [CommonModule],
  templateUrl: './ai-chat-showcase.component.html',
  styleUrl: './ai-chat-showcase.component.css',
})
export class AiChatShowcaseComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly messages: AiChatMessage[] = AI_CHAT_DEMO;
  private readonly timeouts: ReturnType<typeof setTimeout>[] = [];

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly visibleMessages = signal<AiChatMessage[]>([]);
  readonly typing = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.playDemo();
  }

  ngOnDestroy(): void {
    this.timeouts.forEach(clearTimeout);
  }

  private playDemo(): void {
    this.messages.forEach((msg, i) => {
      const t = setTimeout(
        () => {
          if (msg.type === 'ai') {
            this.typing.set(true);
            this.scrollToBottom();
            const typingTimeout = setTimeout(() => {
              this.typing.set(false);
              this.visibleMessages.update((m) => [...m, msg]);
              this.scrollToBottom();
            }, 800);
            this.timeouts.push(typingTimeout);
          } else {
            this.visibleMessages.update((m) => [...m, msg]);
            this.scrollToBottom();
          }

          if (i === this.messages.length - 1) {
            const resetTimeout = setTimeout(() => {
              this.visibleMessages.set([]);
              this.playDemo();
            }, 5000);
            this.timeouts.push(resetTimeout);
          }
        },
        msg.delay ?? i * 2000,
      );
      this.timeouts.push(t);
    });
  }

  private scrollToBottom(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const scrollTimeout = setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
    this.timeouts.push(scrollTimeout);
  }
}

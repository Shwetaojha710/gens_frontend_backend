import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/** Lets marketing robot buddy open the website chatbot panel. */
@Injectable({ providedIn: 'root' })
export class WebsiteChatTriggerService {
  private readonly openSubject = new Subject<void>();
  readonly openChat$ = this.openSubject.asObservable();

  openChat(): void {
    this.openSubject.next();
  }
}

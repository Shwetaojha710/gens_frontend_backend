import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MobileMenuService {
  private _open = new BehaviorSubject<boolean>(false);
  open$ = this._open.asObservable();

  toggle(): void { this._open.next(!this._open.value); }
  close(): void  { this._open.next(false); }
}

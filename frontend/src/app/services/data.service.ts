import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor() { }
 private messageSource = new BehaviorSubject<any>(null); // 👈 Holds last emitted value
  currentMessage = this.messageSource.asObservable();

  changeMessage(msg: any) {
    console.log(msg,"called service")
    this.messageSource.next(msg);
  }
}

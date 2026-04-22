import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MessagingService {
  firebaseApp = initializeApp(environment.firebase);
  messaging: any;

  constructor() {
    this.initMessaging();
  }

  async initMessaging() {
    if (await isSupported()) {
      this.messaging = getMessaging(this.firebaseApp);
    } else {
      console.warn(' Firebase Messaging not supported in this browser.');
    }
  }

  async requestPermission() {
    if (!this.messaging) return null;

    try {
      const currentToken = await getToken(this.messaging, { vapidKey: environment.firebase.vapidKey });
      if (currentToken) {
        console.log(' FCM Token:', currentToken);
        return currentToken;
      } else {
        console.warn('No registration token available.');
        return null;
      }
    } catch (err) {
      console.error('Error retrieving FCM token', err);
      return null;
    }
  }

 async listen() {
    if (!this.messaging) return;
    onMessage(this.messaging, (payload:any) => {
      console.log('📩 Message received:', payload);
      alert(payload.notification?.title + '\n' + payload.notification?.body);
    });
  }
}

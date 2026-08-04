import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delete-account.component.html',
  styleUrls: ['./delete-account.component.css'],
})
export class DeleteAccountComponent {
  mobile = '';
  deleted = false;
  error = '';

  submit() {
    this.error = '';
    if (!this.mobile || this.mobile.trim().length < 10) {
      this.error = 'Please enter a valid 10-digit mobile number.';
      return;
    }
    this.deleted = true;
  }
}

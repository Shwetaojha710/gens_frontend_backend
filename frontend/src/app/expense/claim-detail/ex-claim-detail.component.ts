import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PAYMENT_MODES, claimStatusBadge, claimStatusLabel, fmtMoney, levelLabel, paymentModeLabel, receiptUrl } from '../expense-utils';

export interface ClaimDecision {
  action: 'approved' | 'rejected';
  comments: string;
  override: boolean;
}

/**
 * Claim view shared by HR and portal screens: items, receipts with OCR
 * cross-check, policy flags, approval trail, and the action panels the
 * caller's permissions allow. The parent performs the API calls.
 */
@Component({
  selector: 'app-ex-claim-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ex-claim-detail.component.html',
})
export class ExClaimDetailComponent implements OnChanges {
  @Input() detail: any = null;
  /** canAct, canOverride, canDecideLegacy, canPay, canCancel */
  @Input() permissions: any = {};
  @Input() busy = false;
  @Output() decide = new EventEmitter<ClaimDecision>();
  @Output() pay = new EventEmitter<any>();
  @Output() cancelClaim = new EventEmitter<void>();

  comments = '';
  override = false;
  payment: any = {};

  readonly paymentModes = PAYMENT_MODES;
  readonly fmtMoney = fmtMoney;
  readonly levelLabel = levelLabel;
  readonly statusLabel = claimStatusLabel;
  readonly statusBadge = claimStatusBadge;
  readonly paymentModeLabel = paymentModeLabel;
  readonly receiptUrl = receiptUrl;

  ngOnChanges(): void {
    this.comments = '';
    this.override = false;
    const now = new Date();
    this.payment = {
      paymentMode: 'bank_transfer',
      paymentReference: '',
      paidAt: now.toISOString().slice(0, 10),
      payrollMonth: now.getMonth() + 1,
      payrollYear: now.getFullYear(),
    };
  }

  get claim(): any { return this.detail?.claim; }

  get canDecide(): boolean {
    return !!(this.permissions?.canAct || this.permissions?.canDecideLegacy || (this.permissions?.canOverride && this.override));
  }

  /** OCR amount differs from what the employee typed — worth a second look. */
  ocrMismatch(item: any): boolean {
    const ocr = item.receipt?.ocrData?.amount;
    return ocr != null && Math.abs(Number(ocr) - Number(item.amount)) > 1;
  }

  levelState(i: number): string {
    if (this.claim.status === 'approved' || this.claim.status === 'paid') return 'bg-label-success';
    if (this.claim.status === 'rejected' && i === this.claim.currentLevel) return 'bg-label-danger';
    if (i < this.claim.currentLevel) return 'bg-label-success';
    if (i === this.claim.currentLevel && this.claim.status === 'pending') return 'bg-label-primary';
    return 'bg-label-secondary';
  }

  emitDecision(action: 'approved' | 'rejected'): void {
    this.decide.emit({ action, comments: this.comments, override: this.override });
  }
}

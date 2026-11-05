import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { AssetService } from '../../services/asset.service';
import { ackBadge, ackLabel, conditionLabel, fmtMoney } from '../../asset/asset-utils';

/** Employee portal: company assets I hold — acknowledge receipt, report problems, ask to return. */
@Component({
  selector: 'app-employee-portal-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './employee-portal-assets.component.html',
  styleUrl: './employee-portal-assets.component.css',
})
export class EmployeePortalAssetsComponent implements OnInit {
  private notyf = new Notyf();

  items: any[] = [];
  clearance: any = null;
  loading = false;
  busy = false;
  /** allocationId → open form: dispute comment or return note */
  form: { allocationId: string; kind: 'dispute' | 'return'; text: string } | null = null;

  readonly ackLabel = ackLabel;
  readonly ackBadge = ackBadge;
  readonly conditionLabel = conditionLabel;
  readonly fmtMoney = fmtMoney;

  constructor(private api: AssetService) {}

  ngOnInit(): void {
    this.load();
  }

  get current(): any[] {
    return this.items.filter((i) => i.status === 'active');
  }

  get past(): any[] {
    return this.items.filter((i) => i.status !== 'active');
  }

  get pendingAcks(): number {
    return this.current.filter((i) => i.ackStatus === 'pending').length;
  }

  load(): void {
    this.loading = true;
    this.api.myAssets().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.items = res?.data?.items || [];
        this.clearance = res?.data?.clearance || null;
      },
      error: () => (this.loading = false),
    });
  }

  private run(obs: any): void {
    this.busy = true;
    obs.subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.form = null;
          this.load();
        } else this.notyf.error(res?.message || 'Request failed');
      },
      error: () => {
        this.busy = false;
        this.notyf.error('Request failed');
      },
    });
  }

  acknowledge(i: any): void {
    this.run(this.api.acknowledge(i.allocationId, 'acknowledged'));
  }

  submitForm(): void {
    if (!this.form) return;
    if (this.form.kind === 'dispute') this.run(this.api.acknowledge(this.form.allocationId, 'disputed', this.form.text));
    else this.run(this.api.requestReturn(this.form.allocationId, this.form.text));
  }
}

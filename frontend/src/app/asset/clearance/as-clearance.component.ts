import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AssetService } from '../../services/asset.service';
import { exportExcel, exportPdf } from '../../shared/utils/table-export';
import { CLEARANCE_EXPORT_COLUMNS, fmtMoney } from '../asset-utils';

/**
 * HR: exit clearance — employees who are leaving (relieving letter, exit date
 * or deactivated) and the company assets they still hold.
 */
@Component({
  selector: 'app-as-clearance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './as-clearance.component.html',
})
export class AsClearanceComponent implements OnInit {
  onlyPending = true;
  rows: any[] = [];
  loading = false;

  readonly fmtMoney = fmtMoney;

  constructor(private api: AssetService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.clearance(this.onlyPending).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.rows = res?.status === true ? res.data : [];
      },
      error: () => (this.loading = false),
    });
  }

  get totals(): any {
    return {
      employees: this.rows.filter((r) => !r.cleared).length,
      assets: this.rows.reduce((s, r) => s + r.pendingCount, 0),
      value: this.rows.reduce((s, r) => s + r.pendingValue, 0),
      recovery: this.rows.reduce((s, r) => s + r.recoveryTotal, 0),
    };
  }

  sourceLabel(s: string): string {
    return { relieving_letter: 'Relieving letter', exit_date: 'Exit date', inactive: 'Deactivated' }[s] || s;
  }

  export(kind: 'excel' | 'pdf'): void {
    const sheets = [{ name: 'Asset clearance', columns: CLEARANCE_EXPORT_COLUMNS, rows: this.rows }];
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === 'excel') exportExcel(`Asset_Clearance_${stamp}`, sheets);
    else exportPdf(`Asset_Clearance_${stamp}`, 'Pending Asset Clearance', `${this.totals.employees} employees · ${this.totals.assets} assets outstanding`, sheets);
  }
}

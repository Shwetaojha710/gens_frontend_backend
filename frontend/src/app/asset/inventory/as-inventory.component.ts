import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { AssetService } from '../../services/asset.service';
import { MasterService } from '../../services/master.service';
import { exportExcel, exportPdf } from '../../shared/utils/table-export';
import {
  ASSET_EXPORT_COLUMNS,
  ASSET_STATUSES,
  CONDITIONS,
  ackBadge,
  ackLabel,
  conditionBadge,
  conditionLabel,
  fmtMoney,
  printLabels,
  statusBadge,
  statusLabel,
} from '../asset-utils';

/** HR: asset register — search, register, allocate, print QR labels, export. */
@Component({
  selector: 'app-as-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule],
  templateUrl: './as-inventory.component.html',
})
export class AsInventoryComponent implements OnInit {
  private notyf = new Notyf();

  filters: any = { status: '', categoryId: null, condition: '', warranty: '', search: '' };
  assets: any[] = [];
  categories: any[] = [];
  employeeOptions: any[] = [];
  loading = false;
  saving = false;
  selected = new Set<string>();

  registerForm: any = null;
  allocateForm: any = null;

  readonly statuses = ASSET_STATUSES;
  readonly conditions = CONDITIONS;
  readonly fmtMoney = fmtMoney;
  readonly statusLabel = statusLabel;
  readonly statusBadge = statusBadge;
  readonly conditionLabel = conditionLabel;
  readonly conditionBadge = conditionBadge;
  readonly ackLabel = ackLabel;
  readonly ackBadge = ackBadge;

  constructor(private api: AssetService, private master: MasterService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('status')) this.filters.status = q.get('status');
    if (q.get('warranty')) this.filters.warranty = q.get('warranty');
    this.api.listCategories().subscribe((res: any) => (this.categories = res?.data || []));
    this.master.getemployeeList().subscribe((res: any) => {
      this.employeeOptions = res?.status === true ? res.data.filter((o: any) => o.value && o.value !== 'All') : [];
    });
    this.load();
  }

  get activeCategories(): any[] {
    return this.categories.filter((c) => c.status === 'active');
  }

  load(): void {
    this.loading = true;
    const f = this.filters;
    this.api
      .list({ status: f.status || null, categoryId: f.categoryId, condition: f.condition || null, warranty: f.warranty || null, search: f.search || null })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.assets = res?.status === true ? res.data : [];
          this.selected.clear();
        },
        error: () => (this.loading = false),
      });
  }

  toggle(id: string, checked: boolean): void {
    checked ? this.selected.add(id) : this.selected.delete(id);
  }

  toggleAll(checked: boolean): void {
    this.selected = new Set(checked ? this.assets.map((a) => a.id) : []);
  }

  private run(obs: any, after: (res: any) => void): void {
    this.saving = true;
    obs.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          after(res);
          this.load();
        } else this.notyf.error(res?.message || 'Request failed');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Request failed');
      },
    });
  }

  openRegister(): void {
    this.registerForm = {
      categoryId: this.activeCategories[0]?.id || null,
      quantity: 1,
      name: '', brand: '', model: '', serialNumber: '', purchaseDate: '', purchaseCost: null,
      vendor: '', invoiceNo: '', warrantyExpiry: '', location: '', condition: 'new', notes: '',
    };
  }

  saveRegister(printAfter: boolean): void {
    this.run(this.api.register(this.registerForm), (res) => {
      this.registerForm = null;
      if (printAfter) this.print(res.data.map((a: any) => a.id));
    });
  }

  openAllocate(asset: any): void {
    this.allocateForm = { assetId: asset.id, assetTag: asset.assetTag, name: asset.name, employeeId: null, allocatedOn: new Date().toISOString().slice(0, 10), expectedReturnDate: '', notes: '' };
  }

  saveAllocate(): void {
    this.run(this.api.allocate(this.allocateForm), () => (this.allocateForm = null));
  }

  print(ids: string[] = [...this.selected]): void {
    if (!ids.length) return;
    const company = JSON.parse(localStorage.getItem('tenant') || '{}')?.companyName || '';
    this.api.labels(ids, window.location.origin).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Unable to create labels');
        return;
      }
      if (!printLabels(res.data, company)) this.notyf.error('Allow pop-ups to print labels');
    });
  }

  export(kind: 'excel' | 'pdf'): void {
    const sheets = [{ name: 'Assets', columns: ASSET_EXPORT_COLUMNS, rows: this.assets }];
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === 'excel') exportExcel(`Asset_Register_${stamp}`, sheets);
    else exportPdf(`Asset_Register_${stamp}`, 'Asset Register', `${this.assets.length} assets · ${stamp}`, sheets);
  }
}

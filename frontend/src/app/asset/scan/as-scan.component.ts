import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssetService } from '../../services/asset.service';

/** Landing page for a scanned asset QR code: resolves the token and opens the asset. */
@Component({
  selector: 'app-as-scan',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container-fluid mt-5">
      <div class="card"><div class="card-body text-center py-5">
        <div *ngIf="!error" class="text-muted">Looking up asset…</div>
        <ng-container *ngIf="error">
          <p class="text-danger mb-3">{{ error }}</p>
          <a routerLink="/layout/assets/inventory" class="btn btn-sm btn-outline-primary">Go to inventory</a>
        </ng-container>
      </div></div>
    </div>
  `,
})
export class AsScanComponent implements OnInit {
  error = '';

  constructor(private route: ActivatedRoute, private router: Router, private api: AssetService) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    this.api.scan(token).subscribe({
      next: (res: any) => {
        if (res?.status === true) this.router.navigate(['/layout/assets', res.data.id], { replaceUrl: true });
        else this.error = res?.message || 'Unknown QR code';
      },
      error: () => (this.error = 'Unable to look up this QR code'),
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AssetService } from '../../services/asset.service';
import { ASSET_STATUSES, CONDITIONS, fmtMoney } from '../asset-utils';

/** HR: inventory health — status, categories, condition, warranty, clearance. */
@Component({
  selector: 'app-as-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule],
  templateUrl: './as-dashboard.component.html',
})
export class AsDashboardComponent implements OnInit {
  data: any = null;
  statusChart: any = null;
  categoryChart: any = null;
  conditionChart: any = null;

  readonly fmtMoney = fmtMoney;

  constructor(private api: AssetService) {}

  ngOnInit(): void {
    this.api.dashboard().subscribe((res: any) => {
      if (res?.status !== true) return;
      this.data = res.data;
      const d = res.data;
      this.statusChart = {
        series: ASSET_STATUSES.map((s) => d.byStatus[s.value] || 0),
        chart: { type: 'donut', height: 260 },
        labels: ASSET_STATUSES.map((s) => s.label),
        colors: ['#28c76f', '#7367f0', '#ff9f43', '#a8aaae', '#ff4c51'],
        legend: { position: 'bottom' },
      };
      this.categoryChart = d.byCategory.length
        ? {
            series: [
              { name: 'Allocated', data: d.byCategory.map((c: any) => c.allocated) },
              { name: 'Available', data: d.byCategory.map((c: any) => c.available) },
              { name: 'In repair', data: d.byCategory.map((c: any) => c.inRepair) },
            ],
            chart: { type: 'bar', stacked: true, height: 260, toolbar: { show: false } },
            xaxis: { categories: d.byCategory.map((c: any) => c.category) },
            colors: ['#7367f0', '#28c76f', '#ff9f43'],
            dataLabels: { enabled: false },
          }
        : null;
      this.conditionChart = {
        series: [{ name: 'Assets', data: CONDITIONS.map((c) => d.byCondition[c.value] || 0) }],
        chart: { type: 'bar', height: 220, toolbar: { show: false } },
        xaxis: { categories: CONDITIONS.map((c) => c.label) },
        plotOptions: { bar: { distributed: true, borderRadius: 3 } },
        colors: ['#28c76f', '#4fd18b', '#00bad1', '#ff9f43', '#ff4c51'],
        legend: { show: false },
        dataLabels: { enabled: true },
      };
    });
  }
}

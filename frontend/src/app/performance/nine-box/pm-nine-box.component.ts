import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fmtRating, nineBoxTone } from '../performance-utils';

export interface NineBoxCell {
  performanceBand: number;
  potentialRating: number;
  label: string;
  count: number;
  employees: { reviewId: string; name: string; empCode: string; finalRating: number | null }[];
}

/** 3×3 talent grid: X = performance band, Y = potential (high at top). */
@Component({
  selector: 'app-pm-nine-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-nine-box.component.html',
  styleUrl: './pm-nine-box.component.css',
})
export class PmNineBoxComponent {
  /** Cells ordered potential high→low, performance low→high (as the API returns them). */
  @Input() cells: NineBoxCell[] = [];
  @Output() employeeClick = new EventEmitter<string>();

  selected: NineBoxCell | null = null;
  readonly fmtRating = fmtRating;
  readonly tone = nineBoxTone;
  readonly potentialRows = ['High', 'Moderate', 'Low'];

  get total(): number {
    return this.cells.reduce((s, c) => s + c.count, 0);
  }

  select(cell: NineBoxCell): void {
    this.selected = this.selected === cell ? null : cell;
  }
}

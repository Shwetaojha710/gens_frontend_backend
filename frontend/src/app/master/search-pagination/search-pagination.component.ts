import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-search-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-pagination.component.html',
  styleUrls: ['./search-pagination.component.css']
})

export class SearchPaginationComponent {
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 1;

  @Output() search = new EventEmitter<string>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Input() pageSizeOptions = [ 10,15, 25, 50, 100];
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  /** Clears the search box without emitting a search event (used by parents after data changes). */
  resetSearch(): void {
    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.value = '';
    }
  }


get pages() {
  return Array(Math.ceil(this.totalItems / this.pageSize)).fill(0).map((_, i) => i + 1);
}

/** Compact page list: 1 … 4 5 6 … 51 */
get visiblePages(): Array<number | '...'> {
  const total = this.totalPages;
  const current = Math.min(Math.max(this.currentPage, 1), total);
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  // Keep a bit more context near the ends
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | '...'> = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

onPageSizeChange(event: any): void {
  const newPageSize = Number(event.target.value) || 10;
  this.pageSize = newPageSize;
  this.pageSizeChange.emit(newPageSize);
}

  onSearch(event: any) {
    this.search.emit(event.target.value);
  }

  onPageChange(page: number) {
    this.pageChange.emit(page);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  goToPage(page: number | '...') {
    if (page === '...') return;
    if (page < 1 || page > this.totalPages) return;
    this.pageChange.emit(page);
  }

  getMin(a: number, b: number) {
    return a < b ? a : b;
  }

  trackPage(index: number, p: number | '...'): string {
    return `${index}-${p}`;
  }
}

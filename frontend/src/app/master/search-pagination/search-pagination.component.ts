import { Component, EventEmitter, Input, Output } from '@angular/core';
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


get pages() {
  return Array(Math.ceil(this.totalItems / this.pageSize)).fill(0).map((_, i) => i + 1);
}

onPageSizeChange(event: any): void {
  const newPageSize = event.target.value;
  this.pageSizeChange.emit(newPageSize);
  this.pageSize = newPageSize; // Update the page size if needed
}
  // get pages() {
  //   return Array(Math.ceil(this.totalItems / this.pageSize)).fill(0).map((_, i) => i + 1);
  // }

  onSearch(event: any) {
    this.search.emit(event.target.value);
  }

  onPageChange(page: number) {
    this.pageChange.emit(page);
  }

  // onPageSizeChange(event: any) {
  //   this.pageSizeChange.emit(+event.target.value);
  // }
  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize) || 1;
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.pageChange.emit(page);
  }

  getMin(a: number, b: number) {
    return a < b ? a : b;
  }
}

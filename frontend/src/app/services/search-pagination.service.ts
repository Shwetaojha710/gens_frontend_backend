import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class SearchPaginationService {

  constructor() { }
  private searchTermSource = new BehaviorSubject<string>('');
  searchTerm$ = this.searchTermSource.asObservable();

  private pageSource = new BehaviorSubject<number>(1);
  page$ = this.pageSource.asObservable();

  private pageSizeSource = new BehaviorSubject<number>(10);
  pageSize$ = this.pageSizeSource.asObservable();

  setSearchTerm(term: string) {
    this.searchTermSource.next(term);
  }

  setPage(page: number) {
    this.pageSource.next(page);
  }

  setPageSize(size: number) {
    this.pageSizeSource.next(size);
  }
}

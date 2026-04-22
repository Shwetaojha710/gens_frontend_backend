import { TestBed } from '@angular/core/testing';

import { SearchPaginationService } from './search-pagination.service';

describe('SearchPaginationService', () => {
  let service: SearchPaginationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchPaginationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

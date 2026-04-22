import { TestBed } from '@angular/core/testing';

import { GoogleroadService } from './googleroad.service';

describe('GoogleroadService', () => {
  let service: GoogleroadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleroadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

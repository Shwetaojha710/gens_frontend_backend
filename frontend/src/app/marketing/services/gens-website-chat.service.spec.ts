import { TestBed } from '@angular/core/testing';

import { GensWebsiteChatService } from './gens-website-chat.service';

describe('GensWebsiteChatService', () => {
  let service: GensWebsiteChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GensWebsiteChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { NbItemsService } from './nb-items.service';

describe('NbItemsService', () => {
  let service: NbItemsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NbItemsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

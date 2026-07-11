import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentSummaryDialog } from './assignment-summary-dialog';

describe('AssignmentSummaryDialog', () => {
  let component: AssignmentSummaryDialog;
  let fixture: ComponentFixture<AssignmentSummaryDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignmentSummaryDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignmentSummaryDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

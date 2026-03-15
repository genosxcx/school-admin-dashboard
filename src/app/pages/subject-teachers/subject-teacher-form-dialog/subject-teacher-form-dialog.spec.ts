import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectTeacherFormDialog } from './subject-teacher-form-dialog';

describe('SubjectTeacherFormDialog', () => {
  let component: SubjectTeacherFormDialog;
  let fixture: ComponentFixture<SubjectTeacherFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectTeacherFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubjectTeacherFormDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

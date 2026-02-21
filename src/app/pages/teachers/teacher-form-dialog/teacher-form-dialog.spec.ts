import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherFormDialog } from './teacher-form-dialog';

describe('TeacherFormDialog', () => {
  let component: TeacherFormDialog;
  let fixture: ComponentFixture<TeacherFormDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherFormDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherFormDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

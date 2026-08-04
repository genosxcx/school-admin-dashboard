import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Project {
  id: string;
  name: string;
  image: string;
  route: string;
  description: string;
}

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css'],
})
export class MainPageComponent {
  currentYear = new Date().getFullYear();

  projects: Project[] = [
    {
      id: 'hya-naqraa',
      name: 'Hya Naqra\'a',
      image: '/assets/hya-naqraa.jpeg',
      route: '/hya-naqraa',
      description: 'Arabic Reading Practice Platform',
    },

  ];

  constructor(private router: Router) {}

  navigateToProject(route: string): void {
    this.router.navigate([route]);
  }
}
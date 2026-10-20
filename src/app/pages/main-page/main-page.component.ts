import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Project {
  id: string;
  name: string;
  arabicName: string;
  image: string;
  route: string;
  description: string;
  parts: string[];
}

interface Step {
  title: string;
  text: string;
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
      arabicName: 'هيّا نقرأ',
      image: '/assets/hya-naqraa.jpeg',
      route: '/hya-naqraa',
      description:
        'A smart Arabic reading platform. Kids read sentences out loud, AI listens and scores their pronunciation, and teachers follow every student\'s progress.',
      parts: ['Student app', 'Teacher dashboard', 'Web admin'],
    },
  ];

  steps: Step[] = [
    {
      title: 'Read out loud',
      text: 'Students get a sentence on screen and hold the mic to read it in their own voice.',
    },
    {
      title: 'AI listens',
      text: 'Deep learning models trained on Arabic speech check pronunciation and fluency instantly.',
    },
    {
      title: 'Teachers see it all',
      text: 'Grades, minutes read and completion for every class, synced live to the dashboard.',
    },
  ];

  values = [
    { title: 'Arabic-first', text: 'Right-to-left, native script and real Arabic speech from day one.' },
    { title: 'Built with teachers', text: 'Shaped in real classrooms, around how teachers actually work.' },
    { title: 'Seriously fun', text: 'Friendly characters and tiny wins that keep kids coming back.' },
  ];

  constructor(private router: Router) {}

  navigateToProject(route: string): void {
    this.router.navigate([route]);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}

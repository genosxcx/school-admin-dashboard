import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Language {
  code: string;
  label: string;
}

interface ContentComponentItem {
  title: string;
  desc: string;
  link?: string;
  downloadLink?: string;
}

interface Content {
  title: string;
  subtitle: string;
  description: string;
  overview: string;
  overviewText: string;
  components: ContentComponentItem[];
  aiTitle: string;
  aiPoints: string[];
  featuresTitle: string;
  features: string[];
  techTitle: string;
  tech: string[];
  roleTitle: string;
  role: string;
  roleDesc: string;
  downloadBtn: string;
  downloadSubtext: string;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './iqraa.html',
  styleUrls: ['./iqraa.scss']
})
export class PortfolioComponent {
  language: string = 'en';

  languages: Language[] = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'AR' },
    { code: 'he', label: 'HE' }
  ];

  // ✅ NEW: Screenshots tabs + lists
  activeShotsTab: 'student' | 'teacher' = 'student';

  studentScreenshots: string[] = [
    'assets/screenshots/student/student1.jpg',
    'assets/screenshots/student/student2.jpg',
    'assets/screenshots/student/student3.jpg',
    'assets/screenshots/student/student4.jpg',
    'assets/screenshots/student/student5.jpg',
  ];

  teacherScreenshots: string[] = [
    'assets/screenshots/teacher1.jpg',
    'assets/screenshots/teacher2.jpg',
    'assets/screenshots/teacher3.jpg',
    'assets/screenshots/teacher4.jpg',
    'assets/screenshots/teacher6.jpg'

  ];

  get currentScreenshots(): string[] {
    return this.activeShotsTab === 'student'
      ? this.studentScreenshots
      : this.teacherScreenshots;
  }

  setShotsTab(tab: 'student' | 'teacher') {
    this.activeShotsTab = tab;
  }

  // ✅ NEW: Lightbox state
  lightboxOpen = false;
  lightboxIndex = 0;

  openLightbox(index: number) {
    this.lightboxIndex = index;
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.lightboxOpen = false;
    document.body.style.overflow = '';
  }

  nextShot() {
    const list = this.currentScreenshots;
    if (!list.length) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % list.length;
  }

  prevShot() {
    const list = this.currentScreenshots;
    if (!list.length) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + list.length) % list.length;
  }

  get lightboxSrc(): string {
    return this.currentScreenshots[this.lightboxIndex] ?? '';
  }

  // ✅ Your existing content (unchanged)
  content: Record<string, Content> = {
    en: {
      title: 'hya naqraa',
      subtitle: 'Smart Arabic Reading & Literacy System',
      description:
        'An intelligent educational platform that leverages AI to help students master Arabic reading with personalized feedback and progress tracking.',
      overview: 'Overview',
      overviewText:
        'hy naqraa is a comprehensive educational system designed to improve Arabic reading skills using deep learning and modern technology.',
      components: [
  { 
    title: 'Student App', 
    desc: 'Interactive learning with AI-powered real-time feedback',
    downloadLink: 'https://github.com/genosxcx/school-admin-dashboard/releases/download/hyanaqraa/app-release.apk'
    //
  },
  { 
    title: 'Admin Dashboard App', 
    desc: 'Comprehensive analytics and classroom management tools',
    downloadLink: 'https://github.com/genosxcx/nadasoft/releases/download/admin-v1.0.0/app-release-3.apk'
  },
  { 
    title: 'Admin Dashboard Web', 
    desc: 'Web-based admin panel for school management', 
    link: 'https://www.nadasoft.com/admin' 
  }
],
      aiTitle: 'How It Works',
      aiPoints: [
        'Deep learning models trained on Arabic speech data',
        'Automatic pronunciation accuracy analysis',
        'Real-time reading fluency tracking',
        'Continuous model improvement'
      ],
      featuresTitle: 'Key Features',
      features: [
        'Dedicated mobile application for students',
        'Role-based admin dashboard',
        'Automatic progress tracking and analytics',
        'Real-time cloud synchronization',
        'Secure authentication system',
        'Full Arabic RTL support'
      ],
      techTitle: 'Technology',
      tech: ['Flutter', 'Firebase', 'Deep Learning', 'Cloud Firestore', 'Material Design'],
      roleTitle: 'My Role',
      role: 'Full-Stack Developer',
      roleDesc:
        'Designed and developed the entire system from the ground up, including the student app, role-based dashboard, Firebase backend, and AI integration.',
      downloadBtn: 'Download APK',
      downloadSubtext: 'Android 8.0 or later'
    },

    ar: {
      title: 'هيا نقرأ',
      subtitle: 'نظام ذكي لتعليم القراءة بالعربية',
      description:
        'منصة تعليمية تستخدم الذكاء الاصطناعي لمساعدة الطلاب على إتقان القراءة بالعربية مع تعليقات فورية وتتبع التقدم.',
      overview: 'نبذة عامة',
      overviewText:
        'نظام هيا نقرأ هو منصة تعليمية شاملة لتحسين مهارات القراءة باللغة العربية باستخدام التعلم العميق والتقنيات الحديثة.',
      components: [
  { 
    title: 'تطبيق الطالب', 
    desc: 'تجربة تعليمية تفاعلية مع تعليقات مدعومة بالذكاء الاصطناعي',
    downloadLink: 'https://github.com/genosxcx/nadasoft/releases/download/v1.0.0/iqraa.apk'
  },
  { 
    title: 'تطبيق لوحة التحكم', 
    desc: 'إدارة شاملة للفصول والإحصائيات',
    downloadLink: 'https://github.com/genosxcx/nadasoft/releases/download/admin-v1.0.0/app-release-3.apk'
  },
  { 
    title: 'لوحة التحكم ويب', 
    desc: 'لوحة إدارة على الويب لإدارة المدرسة', 
    link: 'https://school-admin-dashboard.pages.dev/admin' 
  }
],
      aiTitle: 'كيف يعمل',
      aiPoints: [
        'نماذج تعلم عميق مدربة على بيانات النطق العربي',
        'تحليل تلقائي لدقة النطق',
        'تتبع فوري لطلاقة القراءة',
        'تحسن مستمر للنماذج'
      ],
      featuresTitle: 'المميزات الرئيسية',
      features: [
        'تطبيق جوال مخصص للطلاب',
        'لوحة تحكم بصلاحيات متعددة',
        'تتبع تلقائي للتقدم والإحصائيات',
        'مزامنة فورية عبر السحابة',
        'نظام مصادقة آمن',
        'دعم كامل للغة العربية'
      ],
      techTitle: 'التقنيات',
      tech: ['Flutter', 'Firebase', 'التعلم العميق', 'Cloud Firestore', 'Material Design'],
      roleTitle: 'دوري في المشروع',
      role: 'مطورة Full-Stack',
      roleDesc:
        'تطوير النظام بالكامل من البداية، بما في ذلك التطبيق ولوحة التحكم والبنية الخلفية وتكامل الذكاء الاصطناعي.',
      downloadBtn: 'تحميل التطبيق',
      downloadSubtext: 'Android 8.0 أو أحدث'
    },

    he: {
      title: 'hya naqraa',
      subtitle: 'מערכת חכמה להוראת קריאה בערבית',
      description:
        'פלטפורמה חינוכית המשתמשת בבינה מלאכותית לעזרה לתלמידים בשליטה בקריאה בערבית עם משוב בזמן אמת.',
      overview: 'סקירה כללית',
      overviewText:
        'hy naqraa היא מערכת חינוכית מקיפה לשיפור כישורי קריאה בערבית באמצעות למידה עמוקה וטכנולוגיה מודרנית.',
      components: [
  { 
    title: 'אפליקציית תלמיד', 
    desc: 'חוויה למידה אינטראקטיבית עם משוב בזמן אמת',
    downloadLink: 'https://github.com/genosxcx/nadasoft/releases/download/v1.0.0/iqraa.apk'
  },
  { 
    title: 'אפליקציית לוח בקרה', 
    desc: 'ניהול וניתוח נתונים של כיתות',
    downloadLink: 'https://github.com/genosxcx/nadasoft/releases/download/admin-v1.0.0/app-release-3.apk'
  },
  { 
    title: 'לוח בקרה ווב', 
    desc: 'פנל ניהול מבוסס אינטרנט', 
    link: 'https://school-admin-dashboard.pages.dev/admin' 
  }
],
      aiTitle: 'איך זה עובד',
      aiPoints: [
        'מודלים מאומנים על נתוני דיבור בערבית',
        'ניתוח אוטומטי של דיוק הגייה',
        'מעקב בזמן אמת על שטף קריאה',
        'שיפור מתמיד של המודלים'
      ],
      featuresTitle: 'יכולות עיקריות',
      features: [
        'אפליקציה ייעודית לתלמידים',
        'לוח בקרה עם הרשאות מתדרגות',
        'מעקב אוטומטי אחר התקדמות',
        'סנכרון בעננים בזמן אמת',
        'מערכת אימות מאובטחת',
        'תמיכה מלאה בערבית'
      ],
      techTitle: 'טכנולוגיות',
      tech: ['Flutter', 'Firebase', 'AI ו-ML', 'Cloud Firestore', 'Material Design'],
      roleTitle: 'התפקיד שלי',
      role: 'מפתחת Full-Stack',
      roleDesc:
        'פיתוח כל המערכת מקצה לקצה, כולל האפליקציה, לוח הבקרה, הבקאנד והשילוב של AI.',
      downloadBtn: 'הורד אפליקציה',
      downloadSubtext: 'Android 8.0 ואילך'
    }
  };

  get currentContent(): Content {
    return this.content[this.language];
  }

  get textDirection(): 'rtl' | 'ltr' {
    return this.language === 'ar' || this.language === 'he' ? 'rtl' : 'ltr';
  }

  get textAlignment(): 'right' | 'left' {
    return this.language === 'ar' || this.language === 'he' ? 'right' : 'left';
  }

  changeLanguage(lang: string): void {
    this.language = lang;
  }
  onComponentClick(comp: any) {
  if (comp.link) {
    window.open(comp.link, '_blank');
  }
}
downloadAPK() {
  window.open('https://github.com/genosxcx/nadasoft/releases/download/v1.0.0/iqraa.apk', '_blank');
}
}

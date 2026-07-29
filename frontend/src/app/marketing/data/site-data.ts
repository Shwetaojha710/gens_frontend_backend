import {
  BlogPost,
  Career,
  FaqItem,
  Feature,
  LocationFeature,
  Industry,
  NavLink,
  PricingPlan,
  ProductScreenshot,
  Solution,
  StatCounter,
  Testimonial,
  AiChatMessage,
} from './site.models';

/** Primary navigation links */
export const NAV_LINKS: NavLink[] = [
  { label: 'Home', path: '/Home' },
  { label: 'Features', path: '/features' },
  { label: 'Solutions', path: '/solutions' },
  { label: 'Industries', path: '/industries' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'About', path: '/about' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
];

/** Trusted company names (logo placeholders) */
export const TRUSTED_COMPANIES = [
  'TechCorp', 'HealthPlus', 'EduGlobal', 'FinServe', 'RetailMax',
  'BuildPro', 'LogiTrack', 'GovServe', 'NGO Alliance', 'ManuTech',
];

/** Animated stat counters */
export const STATS: StatCounter[] = [
  { value: 1000, suffix: '+', label: 'Employees Managed' },
  { value: 100, suffix: '+', label: 'Organizations' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
];

/** Why Choose GENS cards */
export const WHY_CHOOSE: Feature[] = [
  { icon: 'ri-brain-line', title: 'AI Insights', description: 'Predictive analytics and smart recommendations powered by machine learning.' },
  { icon: 'ri-time-line', title: 'Attendance Automation', description: 'Biometric, geo-fencing, and shift-based attendance with real-time sync.' },
  { icon: 'ri-money-dollar-circle-line', title: 'Payroll Management', description: 'Automated salary processing, tax compliance, and payslip generation.' },
  { icon: 'ri-calendar-close-line', title: 'Leave Management', description: 'Streamlined leave requests, approvals, and balance tracking.' },
  { icon: 'ri-user-search-line', title: 'Recruitment', description: 'End-to-end hiring pipeline from job posting to onboarding.' },
  { icon: 'ri-line-chart-line', title: 'Performance Reviews', description: '360° feedback, goal tracking, and performance analytics.' },
  { icon: 'ri-user-3-line', title: 'Employee Self-Service', description: 'Empower employees with a dedicated portal for all HR needs.' },
  { icon: 'ri-smartphone-line', title: 'Mobile Friendly', description: 'Native iOS and Android apps for on-the-go HR management.' },
  { icon: 'ri-cloud-line', title: 'Cloud Based', description: 'Secure cloud infrastructure with 99.9% uptime guarantee.' },
  { icon: 'ri-shield-check-line', title: 'Secure Platform', description: 'Enterprise-grade encryption, RBAC, and compliance standards.' },
];

/** Key features grid */
export const KEY_FEATURES: Feature[] = [
  { icon: 'ri-team-line', title: 'Employee Management', description: 'Centralized employee database with org charts and profiles.' },
  { icon: 'ri-fingerprint-line', title: 'Attendance Tracking', description: 'Multi-mode attendance with overtime and shift management.' },
  { icon: 'ri-plane-line', title: 'Leave Management', description: 'Configurable leave policies with automated accruals.' },
  { icon: 'ri-wallet-3-line', title: 'Payroll', description: 'One-click payroll runs with statutory compliance.' },
  { icon: 'ri-briefcase-line', title: 'Recruitment', description: 'ATS with resume parsing and interview scheduling.' },
  { icon: 'ri-star-line', title: 'Performance', description: 'OKRs, KPIs, and continuous performance management.' },
  { icon: 'ri-graduation-cap-line', title: 'Training', description: 'LMS integration for employee skill development.' },
  { icon: 'ri-archive-line', title: 'Asset Management', description: 'Track and assign company assets to employees.' },
  { icon: 'ri-bar-chart-box-line', title: 'Reports', description: '50+ pre-built reports with custom report builder.' },
  { icon: 'ri-pie-chart-line', title: 'Analytics', description: 'Real-time dashboards with drill-down capabilities.' },
  { icon: 'ri-smartphone-line', title: 'Mobile App', description: 'Full-featured mobile apps for employees and managers.' },
  { icon: 'ri-robot-line', title: 'AI Assistant', description: 'Natural language HR queries with instant insights.' },
];

/** Benefits list */
export const BENEFITS = [
  { icon: 'ri-speed-up-line', title: 'Reduce HR Workload', description: 'Automate 80% of repetitive HR tasks.' },
  { icon: 'ri-timer-line', title: 'Save Time', description: 'Cut payroll processing time by 70%.' },
  { icon: 'ri-rocket-line', title: 'Increase Productivity', description: 'Empower teams with self-service tools.' },
  { icon: 'ri-emotion-happy-line', title: 'Better Employee Experience', description: 'Modern, intuitive interface employees love.' },
  { icon: 'ri-lightbulb-line', title: 'Smarter Decisions with AI', description: 'Data-driven insights for strategic HR planning.' },
  { icon: 'ri-flashlight-line', title: 'Faster Payroll', description: 'Process payroll for 1000+ employees in minutes.' },
  { icon: 'ri-leaf-line', title: 'Paperless HR', description: 'Go fully digital with e-documents and e-signatures.' },
];

/** Industries */
export const INDUSTRIES: Industry[] = [
  { icon: 'ri-hospital-line', name: 'Healthcare', description: 'Shift scheduling, compliance tracking, and credential management for healthcare workforce.' },
  { icon: 'ri-graduation-cap-line', name: 'Education', description: 'Faculty management, academic calendars, and student-staff coordination.' },
  { icon: 'ri-computer-line', name: 'IT & Technology', description: 'Remote work tracking, project-based attendance, and skill matrix management.' },
  { icon: 'ri-tools-line', name: 'Manufacturing', description: 'Shift management, safety compliance, and production line workforce planning.' },
  { icon: 'ri-bank-line', name: 'Government', description: 'Public sector compliance, grade management, and transparent HR processes.' },
  { icon: 'ri-store-2-line', name: 'Retail', description: 'Multi-location staffing, seasonal hiring, and commission-based payroll.' },
  { icon: 'ri-money-dollar-circle-line', name: 'Finance', description: 'Regulatory compliance, audit trails, and secure employee data management.' },
  { icon: 'ri-hammer-line', name: 'Construction', description: 'Site-based attendance, contractor management, and safety certifications.' },
  { icon: 'ri-truck-line', name: 'Logistics', description: 'Fleet driver management, route-based tracking, and delivery workforce optimization.' },
  { icon: 'ri-heart-line', name: 'NGOs', description: 'Volunteer management, grant-based payroll, and multi-project workforce allocation.' },
];

/** Solutions */
export const SOLUTIONS: Solution[] = [
  {
    icon: 'ri-building-line',
    title: 'For HR Teams',
    description: 'Streamline every aspect of human resource management with intelligent automation.',
    benefits: ['Automated workflows', 'Compliance management', 'Employee lifecycle tracking', 'Advanced reporting'],
  },
  {
    icon: 'ri-team-line',
    title: 'For Managers',
    description: 'Empower team leads with tools for attendance, leave approvals, and performance reviews.',
    benefits: ['Team dashboards', 'One-click approvals', 'Performance insights', 'Goal tracking'],
  },
  {
    icon: 'ri-user-line',
    title: 'For Employees',
    description: 'Self-service portal for leave requests, payslips, profile updates, and more.',
    benefits: ['Mobile self-service', 'Instant payslips', 'Leave balance tracking', 'Document access'],
  },
  {
    icon: 'ri-building-4-line',
    title: 'For Enterprises',
    description: 'Scalable platform with multi-entity support, custom workflows, and API integrations.',
    benefits: ['Multi-company support', 'Custom workflows', 'API integrations', 'Dedicated support'],
  },
];

/** Static pricing copy shell — actual plan cards on /pricing and Home render
 *  live data from `PublicLandingService.getLanding()` (see pricing.component.ts),
 *  not this array. Kept only as illustrative fallback content. */
export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Basic',
    price: '₹99',
    period: '/employee/month',
    description: 'Core HR essentials to digitize attendance, leave, and employee records.',
    bestFor: 'Startups & small businesses',
    badge: 'Essentials',
    employees: 'Up to 50',
    support: 'Email support',
    options: [
      { label: 'Attendance', included: true },
      { label: 'GPS', included: true },
      { label: 'Payroll', included: false },
      { label: 'ATS', included: false },
      { label: 'AI Analytics', included: false },
    ],
    features: [
      'Employee Management', 'Employee Database', 'Attendance Management', 'GPS Attendance',
      'Leave Management', 'Holiday Calendar', 'Basic Reports', 'Employee Self Service',
      'Role Based Login', 'Email Support',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Most Popular',
    price: '₹149',
    period: '/employee/month',
    description: 'Add payroll, shifts, face recognition, and basic recruitment.',
    bestFor: 'Growing companies',
    badge: 'Growth',
    employees: '50 – 200',
    support: 'Priority support',
    options: [
      { label: 'Attendance', included: true },
      { label: 'GPS', included: true },
      { label: 'Payroll', included: true },
      { label: 'ATS', included: true },
      { label: 'AI Analytics', included: false },
    ],
    features: [
      'Everything in Basic', 'AI Face Recognition Attendance', 'Shift Management',
      'Attendance Regularization', 'Payroll Management', 'Payslip Generation',
      'PF / ESIC / TDS Support', 'Department Reports', 'Multi-Level Leave Approval',
      'Recruitment (Basic ATS)', 'Priority Support',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '₹199',
    period: '/employee/month',
    description: 'Full HR + AI analytics, ATS, performance, and multi-branch control.',
    bestFor: 'Mid & large organizations',
    badge: 'Most Popular',
    employees: '200 – 500',
    support: 'Dedicated AM',
    highlighted: true,
    options: [
      { label: 'Attendance', included: true },
      { label: 'GPS', included: true },
      { label: 'Payroll', included: true },
      { label: 'ATS', included: true },
      { label: 'AI Analytics', included: true },
    ],
    features: [
      'Everything in Standard', 'Complete Recruitment ATS', 'Interview Scheduling',
      'Candidate Pipeline', 'Performance Management', 'KPI Dashboard', 'AI Analytics',
      'Real-Time Dashboards', 'Geo-Fencing', 'Multi Branch Management', 'Company Branding',
      'API Integration', 'Dedicated Account Manager',
    ],
    cta: 'Book a Demo',
  },
  {
    name: 'Custom Enterprise Package',
    price: 'Custom Pricing',
    period: '',
    description: 'Everything in Professional, plus custom features and integrations.',
    bestFor: 'Enterprise (500+ employees)',
    badge: 'Enterprise Package',
    employees: '500+',
    support: 'Priority SLA Support Custom',
    features: [
      'White Label Solution',
      'Multi Company Management',
      'Advanced Workflow',
      'Automation',
      'Custom Modules',
      'ERP Integration',
      'Biometric Integration',
      'SAP/Tally Integration',
      'Third Party API Integration',
      'Dedicated Project Manager',
      'On-Premise Deployment',
      'Priority SLA Support Custom',
      'Reports & Dashboards',
      'Enterprise Security',
      'Unlimited Scalability',
    ],
    cta: 'Contact Sales',
  }
  // {
  //   name: 'Enterprise',
  //   price: '$1600',
  //   period: '/month',
  //   description: 'White-label, multi-company, on-prem, and custom enterprise integrations.',
  //   bestFor: 'Enterprise (500+ employees)',
  //   badge: 'Custom Scale',
  //   employees: '500+',
  //   support: 'Dedicated PM + SLA',
  //   options: [
  //     { label: 'White Label', included: true },
  //     { label: 'Multi-Co', included: true },
  //     { label: 'On-Prem', included: true },
  //     { label: 'ERP/SAP', included: true },
  //     { label: 'Custom SLA', included: true },
  //   ],
  //   features: [
  //     'Everything in Professional', 'White Label Solution', 'Multi Company Management',
  //     'Advanced Workflow Automation', 'Custom Modules', 'ERP Integration',
  //     'Biometric Integration', 'SAP/Tally Integration', 'Third Party API Integration',
  //     'Dedicated Project Manager', 'On-Premise Deployment', 'Priority SLA Support',
  //     'Custom Reports & Dashboards', 'Enterprise Security', 'Unlimited Scalability',
  //   ],
  //   cta: 'Contact Sales',
  // },
];

/** Testimonials */
export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Sarah Mitchell', role: 'HR Director', company: 'TechCorp Industries', avatar: 'SM', rating: 5,
    quote: 'GENS transformed our HR operations. Payroll that used to take 3 days now completes in 2 hours. The AI insights help us predict attrition before it happens.',
  },
  {
    name: 'Rajesh Kumar', role: 'CEO', company: 'HealthPlus Medical', avatar: 'RK', rating: 5,
    quote: 'Managing 500+ healthcare staff across shifts was a nightmare. GENS automated everything — attendance, leave, compliance. Our HR team can finally focus on people, not paperwork.',
  },
  {
    name: 'Emily Chen', role: 'Operations Manager', company: 'RetailMax Global', avatar: 'EC', rating: 5,
    quote: 'The mobile app is a game-changer for our retail workforce. Employees love the self-service features, and managers approve requests in seconds.',
  },
  {
    name: 'David Okafor', role: 'Head of People', company: 'FinServe Solutions', avatar: 'DO', rating: 5,
    quote: 'Security and compliance were our top concerns. GENS exceeded expectations with enterprise-grade encryption and audit-ready reports.',
  },
];

/** FAQ items */
export const FAQ_ITEMS: FaqItem[] = [
  { question: 'What is GENS HRMS?', answer: 'GENS (Global Employee Network System) is an AI-powered Human Resource Management System that helps organizations manage employees, attendance, payroll, recruitment, performance, and more from a single unified platform.' },
  { question: 'Is GENS suitable for small businesses?', answer: 'Absolutely! Our Basic plan starts at ₹99/employee/month for startups and small businesses. You can upgrade to Standard, Professional, or Enterprise as your organization grows.' },
  { question: 'How does the AI Assistant work?', answer: 'GENS AI Assistant uses natural language processing to answer HR queries, generate reports, predict trends, and automate routine tasks. Simply ask questions like "Who is absent today?" or "Generate payroll summary" and get instant answers.' },
  { question: 'Can I migrate data from my existing HR system?', answer: 'Yes, we provide free data migration assistance for all plans. Our team will help you import employee data, attendance records, and payroll history seamlessly.' },
  { question: 'Is my data secure with GENS?', answer: 'Security is our top priority. GENS uses AES-256 encryption, SOC 2 compliance, regular security audits, role-based access control, and automated backups to keep your data safe.' },
  { question: 'Do you offer a free trial?', answer: 'Yes! We offer a 14-day free trial with full access to all Professional plan features. No credit card required to get started.' },
  { question: 'What integrations does GENS support?', answer: 'GENS integrates with popular tools including Slack, Microsoft Teams, Google Workspace, accounting software (QuickBooks, Xero), and offers a REST API for custom integrations.' },
  { question: 'Is there a mobile app?', answer: 'Yes, GENS offers native mobile apps for both iOS and Android, allowing employees and managers to access HR features on the go.' },
];

/** Blog posts */
export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'The Future of HR: How AI is Transforming Workforce Management',
    excerpt: 'Discover how AI-powered HRMS software is revolutionizing attendance, payroll, recruitment, employee engagement, and workforce management with GENS.Ai.',
    category: 'AI HRMS', date: 'Jul 17, 2026', readTime: '8 min read', image: 'future-hr-ai',
    slug: 'future-of-hr-ai-transforming-workforce-management',
    metaTitle: 'AI HRMS Software | Future of HR Management | GENS.Ai',
    metaDescription: 'Discover how AI-powered HRMS software is revolutionizing attendance, payroll, recruitment, employee engagement, and workforce management with GENS.Ai.',
    keywords: 'AI HRMS, HRMS Software India, AI Attendance System, Face Recognition Attendance, GPS Attendance Software, Payroll Software, Employee Management System, HR Automation, AI Workforce Management, Cloud HRMS',
    content: [
      { type: 'paragraph', text: "In today's rapidly evolving business landscape, organizations are embracing digital transformation to improve productivity, reduce manual work, and create exceptional employee experiences. Human Resource Management is no exception. Artificial Intelligence (AI) is reshaping how businesses manage their workforce, making HR smarter, faster, and more efficient than ever before." },
      { type: 'paragraph', text: 'Traditional HR systems often rely on manual processes that consume valuable time and increase the chances of errors. AI-powered HRMS platforms like GENS.Ai are changing this by automating repetitive tasks, providing actionable insights, and helping HR professionals focus on strategic initiatives.' },
      { type: 'heading', text: 'Why Businesses Need an AI-Powered HRMS' },
      { type: 'paragraph', text: 'Managing employees involves multiple responsibilities, including attendance tracking, payroll processing, leave management, recruitment, performance monitoring, and compliance. As organizations grow, handling these tasks manually becomes increasingly challenging.' },
      { type: 'paragraph', text: 'An AI-driven HRMS centralizes all HR operations into a single intelligent platform, allowing organizations to:' },
      { type: 'list', items: ['Automate attendance tracking', 'Simplify payroll processing', 'Manage employee records securely', 'Improve workforce productivity', 'Enhance employee engagement', 'Generate real-time reports', 'Reduce operational costs'] },
      { type: 'heading', text: 'AI Features Revolutionizing HR' },
      { type: 'subheading', text: '1. Face Recognition Attendance' },
      { type: 'paragraph', text: 'Forget traditional biometric devices. Modern AI attendance systems use facial recognition technology through mobile devices or office cameras to verify employee attendance accurately while preventing buddy punching.' },
      { type: 'list', items: ['Contactless attendance', 'Accurate verification', 'GPS-enabled attendance', 'Faster check-in/check-out', 'Reduced payroll disputes'] },
      { type: 'subheading', text: '2. Smart Leave Management' },
      { type: 'paragraph', text: 'Employees can request leave through a mobile application while managers receive instant notifications for approval. AI also helps HR teams identify leave patterns, absenteeism trends, and workforce availability.' },
      { type: 'subheading', text: '3. Intelligent Payroll Processing' },
      { type: 'paragraph', text: 'Payroll becomes easier with automated calculations for salary, PF, ESI, Professional Tax, overtime, bonuses, and deductions. Automation minimizes errors and ensures compliance with labor regulations.' },
      { type: 'subheading', text: '4. AI-Based Employee Analytics' },
      { type: 'paragraph', text: 'HR leaders can make informed decisions using dashboards that provide insights into attendance trends, employee performance, attrition risks, department productivity, overtime analysis, and workforce utilization. Data-driven HR enables better planning and improved organizational performance.' },
      { type: 'subheading', text: '5. Location-Based Attendance' },
      { type: 'paragraph', text: 'For field employees, GPS-based attendance verifies location during check-in and check-out. This is particularly useful for sales teams, service engineers, delivery personnel, remote employees, and site supervisors.' },
      { type: 'heading', text: 'Benefits for HR Teams' },
      { type: 'list', items: ['Reduced administrative workload', 'Improved compliance', 'Faster decision-making', 'Increased employee satisfaction', 'Better workforce planning', 'Enhanced data security', 'Higher operational efficiency'] },
      { type: 'heading', text: 'Benefits for Employees' },
      { type: 'paragraph', text: 'Employees enjoy a seamless digital experience with features such as:' },
      { type: 'list', items: ['Mobile attendance', 'Leave applications', 'Salary slips', 'Tax documents', 'Performance tracking', 'Holiday calendar', 'Company announcements', 'Self-service portal'] },
      { type: 'heading', text: 'Why Choose GENS.Ai?' },
      { type: 'paragraph', text: 'GENS.Ai is a next-generation AI-powered Human Resource Management System designed to simplify workforce management for businesses of all sizes.' },
      { type: 'list', items: ['AI Face Attendance', 'GPS Attendance', 'Payroll Management', 'Leave Management', 'Employee Self-Service', 'Recruitment Management', 'Performance Management', 'Asset Management', 'Document Management', 'Reports & Analytics', 'Multi-Branch Support', 'Cloud-Based Platform', 'Mobile Application', 'Secure Role-Based Access'] },
      { type: 'paragraph', text: 'Whether you are a startup with 20 employees or an enterprise with thousands of employees, GENS.Ai scales effortlessly to meet your HR needs.' },
      { type: 'heading', text: 'Final Thoughts' },
      { type: 'paragraph', text: "Artificial Intelligence is no longer a luxury—it's becoming an essential part of modern workforce management. Organizations that adopt AI-powered HRMS solutions gain a competitive advantage through improved efficiency, better employee experiences, and smarter decision-making." },
      { type: 'paragraph', text: 'Investing in an intelligent HR platform like GENS.Ai helps businesses reduce operational costs, improve compliance, and build a more productive workforce for the future.' },
    ],
    faqs: [
      { question: 'What is an AI-powered HRMS?', answer: 'An AI-powered Human Resource Management System uses artificial intelligence to automate HR tasks such as attendance, payroll, leave management, recruitment, and employee analytics.' },
      { question: 'Can AI improve attendance accuracy?', answer: 'Yes. AI-powered facial recognition and GPS verification significantly reduce attendance fraud and improve accuracy.' },
      { question: 'Is GENS.Ai suitable for small businesses?', answer: 'Absolutely. GENS.Ai is scalable and designed for startups, SMEs, and large enterprises.' },
      { question: 'Does GENS.Ai support remote employees?', answer: 'Yes. Employees can securely mark attendance using facial recognition and GPS from authorized locations.' },
      { question: 'Is employee data secure?', answer: 'Yes. GENS.Ai incorporates secure authentication, role-based access control, and encrypted data storage to help protect employee information.' },
    ],
  },
  { id: '2', title: 'Face Recognition Attendance System: Benefits for Modern Businesses', excerpt: 'Learn how AI-powered face recognition attendance eliminates buddy punching and improves payroll accuracy.', category: 'Attendance', date: 'Jul 15, 2026', readTime: '6 min read', image: 'face-attendance', slug: 'face-recognition-attendance-system-benefits', metaTitle: 'Face Recognition Attendance System | GENS.Ai', metaDescription: 'Discover how AI face recognition attendance improves workforce productivity, attendance accuracy, and employee accountability.' },
  { id: '3', title: 'GPS Attendance Tracking: The Smart Solution for Remote Teams', excerpt: 'Manage remote employees with real-time GPS attendance, geofencing, and location verification.', category: 'Attendance', date: 'Jul 12, 2026', readTime: '5 min read', image: 'gps-attendance', slug: 'gps-attendance-tracking-for-remote-employees', metaTitle: 'GPS Attendance Tracking Software | GENS.Ai', metaDescription: 'Explore how GPS-based attendance tracking helps businesses manage field employees and remote teams effectively.' },
  { id: '4', title: 'Payroll Automation: Save Time and Reduce Compliance Errors', excerpt: 'Automate salary calculations, PF, ESI, taxes, and payroll compliance with an intelligent HRMS.', category: 'Payroll', date: 'Jul 8, 2026', readTime: '7 min read', image: 'payroll-automation', slug: 'payroll-automation-with-ai-hrms', metaTitle: 'Payroll Automation Software | AI HRMS | GENS.Ai', metaDescription: 'Learn how AI-powered payroll automation reduces errors, improves compliance, and saves HR teams valuable time.' },
  { id: '5', title: 'Employee Self-Service Portal: Empower Your Workforce', excerpt: 'Enable employees to manage attendance, leave, payslips, documents, and more from one secure portal.', category: 'Employee Experience', date: 'Jul 4, 2026', readTime: '5 min read', image: 'employee-self-service', slug: 'employee-self-service-portal-benefits', metaTitle: 'Employee Self Service Portal | GENS.Ai', metaDescription: 'Discover how employee self-service portals improve employee satisfaction while reducing HR workload.' },
  { id: '6', title: 'Why Every Growing Business Needs an AI-Powered HRMS', excerpt: 'Explore why startups, SMEs, and enterprises are adopting cloud-based AI HRMS platforms to streamline HR operations.', category: 'HR Technology', date: 'Jun 30, 2026', readTime: '9 min read', image: 'ai-hrms', slug: 'why-businesses-need-ai-powered-hrms', metaTitle: 'AI HRMS Software for Businesses | GENS.Ai', metaDescription: 'Discover the advantages of AI-powered HRMS software including attendance, payroll, recruitment, analytics, and employee management.' },
  { id: '7', title: '10 HR Challenges That AI Can Solve in 2026', excerpt: 'From attendance fraud to employee engagement, discover how AI helps HR teams overcome modern workforce challenges.', category: 'AI & HR', date: 'Jun 25, 2026', readTime: '8 min read', image: 'hr-challenges', slug: '10-hr-challenges-ai-can-solve', metaTitle: 'Top HR Challenges Solved by AI | GENS.Ai', metaDescription: 'See how AI is helping HR departments improve productivity, compliance, recruitment, payroll, and employee experience.' },
  { id: '8', title: 'Cloud HRMS vs Traditional HR Software: Which One Should You Choose?', excerpt: 'Compare cloud-based HRMS and traditional HR software to understand which solution fits your business.', category: 'Cloud HRMS', date: 'Jun 20, 2026', readTime: '7 min read', image: 'cloud-vs-traditional', slug: 'cloud-hrms-vs-traditional-hr-software', metaTitle: 'Cloud HRMS vs Traditional HR Software | GENS.Ai', metaDescription: 'Compare cloud HRMS with traditional HR software to choose the right solution for your organization.' },
];

/** AI chat demo messages */
export const AI_CHAT_DEMO: AiChatMessage[] = [
  { type: 'user', text: 'Who is absent today?', delay: 0 },
  { type: 'ai', text: '3 employees are absent today: John Smith (Sick Leave), Maria Garcia (Personal Leave), and Alex Turner (WFH). Attendance rate: 94.2%.', delay: 1500 },
  { type: 'user', text: 'Generate payroll summary for July.', delay: 3500 },
  { type: 'ai', text: 'July Payroll Summary: Total employees: 248 | Gross payroll: ₹12,45,000 | Deductions: ₹1,82,000 | Net payout: ₹10,63,000. Ready to process?', delay: 5000 },
  { type: 'user', text: 'Show attendance insights for this month.', delay: 7500 },
  { type: 'ai', text: 'Monthly attendance: Avg. 96.1% | Late arrivals down 12% | Most absent day: Monday | Top department: Engineering (98.5%).', delay: 9000 },
  { type: 'user', text: 'Predict employee attrition risk.', delay: 11500 },
  { type: 'ai', text: 'Attrition Risk Analysis: 4 employees flagged as high-risk (score > 75%). Primary factors: tenure < 1 year, no promotion in 18 months. Recommend 1-on-1 meetings.', delay: 13000 },
];

/** Product screenshots */
export const PRODUCT_SCREENSHOTS: ProductScreenshot[] = [
  { id: 'dashboard', title: 'Dashboard Preview', description: 'Real-time HR analytics at a glance' },
  { id: 'profile', title: 'Employee Profile', description: 'Comprehensive employee information hub' },
  { id: 'attendance', title: 'Attendance', description: 'Track attendance with multiple modes' },
  { id: 'payroll', title: 'Payroll', description: 'Automated payroll processing' },
  { id: 'reports', title: 'Reports', description: '50+ customizable HR reports' },
  { id: 'mobile', title: 'Mobile App', description: 'HR management on the go' },
];

/** Career openings */
export const CAREERS: Career[] = [
  { title: 'Senior Angular Developer', department: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'UX/UI Designer', department: 'Design', location: 'Lucknow, India', type: 'Full-time' },
  { title: 'HR Solutions Consultant', department: 'Sales', location: 'Lucknow, India', type: 'Full-time' },
  { title: 'DevOps Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Content Marketing Manager', department: 'Marketing', location: 'Lucknow, India', type: 'Full-time' },
  { title: 'Customer Success Manager', department: 'Support', location: 'Lucknow, India', type: 'Full-time' },
];

/** Location tracking module features */
export const LOCATION_FEATURES: LocationFeature[] = [
  { icon: 'ri-pulse-line', title: 'Live Team Pulse', description: 'See who is moving right now across the city — with live status, last ping, and route trail.', badge: 'New', stat: '12 field staff online', statHint: 'Real-time GPS pulse updates every few seconds.' },
  { icon: 'ri-radar-line', title: 'Smart Geofencing', description: 'Create office, client, and site zones. Get instant alerts when someone enters or leaves.', badge: 'New', stat: '4 active geo-zones', statHint: 'Entry & exit alerts for Lucknow client sites.' },
  { icon: 'ri-replay-line', title: 'Route Replay', description: 'Replay any day like a timeline — scrub through the full path, stays, and pinned visits.', badge: 'New', stat: 'Full-day playback', statHint: 'Review yesterday’s route in under a minute.' },
  { icon: 'ri-hourglass-line', title: 'Stay Intelligence', description: 'Auto-detect long stays with duration, address, and visit purpose for stronger accountability.', stat: '3h 20m longest stay', statHint: 'Vibhav Khand · Gomti Nagar detected automatically.' },
  { icon: 'ri-map-pin-line', title: 'Smart Pin Visits', description: 'Pin meetings with purpose, notes, and one-tap zoom — perfect for sales follow-ups.', stat: '3 pinned visits today', statHint: 'Purpose tags like Follow up keep reports clear.' },
  { icon: 'ri-bar-chart-line', title: 'Travel Insights', description: 'Track distance covered, active hours, and stop density to understand field productivity.', badge: 'New', stat: '42.6 km covered', statHint: 'Distance + active time for today’s field trip.' },
  { icon: 'ri-notification-3-line', title: 'Instant Alerts', description: 'Get notified on idle time, missed check-ins, or unexpected route deviations.', badge: 'New', stat: 'Alerts on autopilot', statHint: 'Managers know issues before the day ends.' },
  { icon: 'ri-stack-line', title: 'Map Modes & Filters', description: 'Switch Standard, Satellite, Dark, Terrain, or HOT — then filter All, Normal, or Pinned points.', stat: '5 map styles ready', statHint: 'Pick the view that makes routes easiest to read.' },
];

/** Location tracking marker legend */
export const LOCATION_MARKERS = [
  { code: 'S', label: 'Start' },
  { code: 'E', label: 'End' },
  { code: 'ST', label: 'Stay' },
  { code: 'P', label: 'Pinned' },
];

/** Company legal name */
export const COMPANY_NAME = 'Quaere Etechnologies Pvt Ltd';

/** Contact information — reconciled with the real business details already
 *  published on the public site (phone/sales/careers/address/hours). No
 *  WhatsApp quick-link for v1 (no confirmed real number for it). */
export const CONTACT_INFO = {
  company: COMPANY_NAME,
  phone: '+91-522 4066 7760',
  salesEmail: 'sales@quaeretech.com',
  careersEmail: 'hr@quaeretech.com',
  careersPhone: '+91-7268710055',
  address: '7th Floor, Cyber Tower, Vibhav Khand, Gomti Nagar, Lucknow 226010 (Uttar Pradesh)',
  hours: 'Mon-Fri: 09:30 Am – 06:30 Pm',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Cyber+Tower,+Vibhav+Khand,+Gomti+Nagar,+Lucknow,+Uttar+Pradesh+226010&hl=en&z=17&output=embed',
  mapLinkUrl:
    'https://www.google.com/maps/search/?api=1&query=Cyber+Tower,+Vibhav+Khand,+Gomti+Nagar,+Lucknow,+Uttar+Pradesh+226010',
  mapDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Cyber+Tower,+Vibhav+Khand,+Gomti+Nagar,+Lucknow,+Uttar+Pradesh+226010',
};

/** Social media links */
export const SOCIAL_LINKS = [
  { icon: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com' },
  { icon: 'twitter', label: 'Twitter', url: 'https://twitter.com' },
  { icon: 'facebook', label: 'Facebook', url: 'https://facebook.com' },
  { icon: 'youtube', label: 'YouTube', url: 'https://youtube.com' },
  { icon: 'instagram', label: 'Instagram', url: 'https://instagram.com' },
];

/** Footer link groups */
export const FOOTER_LINKS = {
  products: [
    { label: 'Features', path: '/features' },
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Industries', path: '/industries' },
    { label: 'AI Assistant', path: '/features#ai-assistant' },
  ],
  resources: [
    { label: 'Blog', path: '/blog' },
    { label: 'FAQs', path: '/faqs' },
    { label: 'Documentation', path: '/contact' },
    { label: 'API Reference', path: '/contact' },
  ],
  company: [
    { label: 'About Us', path: '/about' },
    { label: 'Careers', path: '/careers' },
    { label: 'Contact', path: '/contact' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms & Conditions', path: '/terms' },
  ],
  support: [
    { label: 'Help Center', path: '/faqs' },
    { label: 'Book a Demo', path: '/contact' },
    { label: 'Tenant Login', path: '/login' },
    { label: 'Employee Portal', path: '/employee-portal/login' },
  ],
};

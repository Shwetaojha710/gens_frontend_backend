/** Content shapes for the marketing site. `icon` fields hold Remix Icon
 *  class names (e.g. `ri-team-line`), matching the `ri ri-*` font already
 *  loaded globally for the rest of this app. */

export interface NavLink {
  label: string;
  path: string;
}

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface LocationFeature extends Feature {
  badge?: string;
  stat: string;
  statHint: string;
}

export interface PricingOption {
  label: string;
  included: boolean;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  bestFor?: string;
  badge?: string;
  employees?: string;
  support?: string;
  options?: PricingOption[];
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
  quote: string;
}

export interface BlogContentBlock {
  type: 'paragraph' | 'heading' | 'subheading' | 'list';
  text?: string;
  items?: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  content?: BlogContentBlock[];
  faqs?: FaqItem[];
  keywords?: string;
}

export interface Industry {
  icon: string;
  name: string;
  description: string;
}

export interface Solution {
  icon: string;
  title: string;
  description: string;
  benefits: string[];
}

export interface StatCounter {
  value: number;
  suffix: string;
  label: string;
}

export interface AiChatMessage {
  type: 'user' | 'ai';
  text: string;
  delay?: number;
}

export interface ProductScreenshot {
  id: string;
  title: string;
  description: string;
}

export interface Career {
  title: string;
  department: string;
  location: string;
  type: string;
}

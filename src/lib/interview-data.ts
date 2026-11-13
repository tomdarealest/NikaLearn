export type InterviewCategory = 'fullstack' | 'coding' | 'system';
export type ExperienceLevel = 'entry' | 'junior' | 'middle' | 'senior' | 'expert';

/** Min/max câu hỏi mỗi lần sinh AI cho một chủ đề */
export const INTERVIEW_QUESTION_MIN = 5;
export const INTERVIEW_QUESTION_MAX = 150;

export interface InterviewTechnology {
  id: string;
  name: string;
  count: number;
  icon: string;
  category: InterviewCategory;
}

export const CATEGORY_TABS: { id: InterviewCategory; label: string }[] = [
  { id: 'fullstack', label: 'Full-stack, Web & Mobile' },
  { id: 'coding', label: 'Coding & Data structures' },
  { id: 'system', label: 'System design & Architecture' },
];

export const LEVEL_FILTERS: {
  id: ExperienceLevel;
  label: string;
  borderColor: string;
  textColor: string;
}[] = [
  { id: 'entry', label: 'Entry', borderColor: 'border-sky-400', textColor: 'text-sky-600' },
  { id: 'junior', label: 'Junior', borderColor: 'border-teal-400', textColor: 'text-teal-600' },
  { id: 'middle', label: 'Middle', borderColor: 'border-orange-400', textColor: 'text-orange-600' },
  { id: 'senior', label: 'Senior', borderColor: 'border-pink-400', textColor: 'text-pink-600' },
  { id: 'expert', label: 'Expert', borderColor: 'border-violet-500', textColor: 'text-violet-600' },
];

export const TECHNOLOGIES: InterviewTechnology[] = [
  { id: 'java', name: 'Java', count: 0, icon: '☕', category: 'fullstack' },
  { id: 'javascript', name: 'Javascript', count: 0, icon: '🟨', category: 'fullstack' },
  { id: 'flutter', name: 'Flutter', count: 0, icon: '🦋', category: 'fullstack' },
  { id: 'frontend', name: 'Frontend Developer', count: 0, icon: '🎨', category: 'fullstack' },
  { id: 'ios', name: 'iOS', count: 0, icon: '📱', category: 'fullstack' },
  { id: 'uml', name: 'UML', count: 0, icon: '📐', category: 'fullstack' },
  { id: 'data-analytic', name: 'Data Analytic', count: 0, icon: '📊', category: 'fullstack' },
  { id: 'objective-c', name: 'Objective C', count: 0, icon: '🍎', category: 'fullstack' },
  { id: 'blockchain', name: 'Blockchain', count: 0, icon: '⛓️', category: 'fullstack' },
  { id: 'react', name: 'React', count: 0, icon: '⚛️', category: 'fullstack' },
  { id: 'angular', name: 'Angular', count: 0, icon: '🅰️', category: 'fullstack' },
  { id: 'vue', name: 'Vue.js', count: 0, icon: '💚', category: 'fullstack' },
  { id: 'nodejs', name: 'Node.js', count: 0, icon: '🟢', category: 'fullstack' },
  { id: 'python', name: 'Python', count: 0, icon: '🐍', category: 'fullstack' },
  { id: 'php', name: 'PHP', count: 0, icon: '🐘', category: 'fullstack' },
  { id: 'csharp', name: 'C#', count: 0, icon: '🔷', category: 'fullstack' },
  { id: 'android', name: 'Android', count: 0, icon: '🤖', category: 'fullstack' },
  { id: 'html-css', name: 'HTML & CSS', count: 0, icon: '🌐', category: 'fullstack' },
  { id: 'typescript', name: 'TypeScript', count: 0, icon: '🔷', category: 'fullstack' },
  { id: 'nextjs', name: 'Next.js', count: 0, icon: '▲', category: 'fullstack' },
  { id: 'arrays', name: 'Arrays', count: 0, icon: '📦', category: 'coding' },
  { id: 'linked-list', name: 'Linked List', count: 0, icon: '🔗', category: 'coding' },
  { id: 'tree', name: 'Tree', count: 0, icon: '🌳', category: 'coding' },
  { id: 'graph', name: 'Graph', count: 0, icon: '🕸️', category: 'coding' },
  { id: 'sorting', name: 'Sorting', count: 0, icon: '↕️', category: 'coding' },
  { id: 'dynamic-programming', name: 'Dynamic Programming', count: 0, icon: '🧩', category: 'coding' },
  { id: 'recursion', name: 'Recursion', count: 0, icon: '🔁', category: 'coding' },
  { id: 'hash-table', name: 'Hash Table', count: 0, icon: '#️⃣', category: 'coding' },
  { id: 'stack-queue', name: 'Stack & Queue', count: 0, icon: '📚', category: 'coding' },
  { id: 'binary-search', name: 'Binary Search', count: 0, icon: '🔍', category: 'coding' },
  { id: 'system-design', name: 'System Design', count: 0, icon: '🏗️', category: 'system' },
  { id: 'microservices', name: 'Microservices', count: 0, icon: '🔧', category: 'system' },
  { id: 'load-balancing', name: 'Load Balancing', count: 0, icon: '⚖️', category: 'system' },
  { id: 'caching', name: 'Caching', count: 0, icon: '💾', category: 'system' },
  { id: 'database-design', name: 'Database Design', count: 0, icon: '🗄️', category: 'system' },
  { id: 'api-design', name: 'API Design', count: 0, icon: '🔌', category: 'system' },
  { id: 'scalability', name: 'Scalability', count: 0, icon: '📈', category: 'system' },
  { id: 'distributed-systems', name: 'Distributed Systems', count: 0, icon: '🌍', category: 'system' },
];

export function getTechnologiesByCategory(category: InterviewCategory) {
  return TECHNOLOGIES.filter((tech) => tech.category === category);
}

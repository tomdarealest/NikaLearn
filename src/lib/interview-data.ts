export type InterviewCategory = 'fullstack' | 'coding' | 'system';
export type ExperienceLevel = 'entry' | 'junior' | 'middle' | 'senior' | 'expert';

export interface InterviewTechnology {
  id: string;
  name: string;
  count: number;
  icon: string;
  category: InterviewCategory;
}

export interface InterviewQuestion {
  id: number;
  technologyId: string;
  level: ExperienceLevel;
  question: string;
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
  { id: 'java', name: 'Java', count: 141, icon: '☕', category: 'fullstack' },
  { id: 'javascript', name: 'Javascript', count: 116, icon: '🟨', category: 'fullstack' },
  { id: 'flutter', name: 'Flutter', count: 99, icon: '🦋', category: 'fullstack' },
  { id: 'frontend', name: 'Frontend Developer', count: 99, icon: '🎨', category: 'fullstack' },
  { id: 'ios', name: 'iOS', count: 99, icon: '📱', category: 'fullstack' },
  { id: 'uml', name: 'UML', count: 97, icon: '📐', category: 'fullstack' },
  { id: 'data-analytic', name: 'Data Analytic', count: 95, icon: '📊', category: 'fullstack' },
  { id: 'objective-c', name: 'Objective C', count: 94, icon: '🍎', category: 'fullstack' },
  { id: 'blockchain', name: 'Blockchain', count: 90, icon: '⛓️', category: 'fullstack' },
  { id: 'react', name: 'React', count: 88, icon: '⚛️', category: 'fullstack' },
  { id: 'angular', name: 'Angular', count: 85, icon: '🅰️', category: 'fullstack' },
  { id: 'vue', name: 'Vue.js', count: 82, icon: '💚', category: 'fullstack' },
  { id: 'nodejs', name: 'Node.js', count: 80, icon: '🟢', category: 'fullstack' },
  { id: 'python', name: 'Python', count: 78, icon: '🐍', category: 'fullstack' },
  { id: 'php', name: 'PHP', count: 75, icon: '🐘', category: 'fullstack' },
  { id: 'csharp', name: 'C#', count: 72, icon: '🔷', category: 'fullstack' },
  { id: 'android', name: 'Android', count: 70, icon: '🤖', category: 'fullstack' },
  { id: 'html-css', name: 'HTML & CSS', count: 68, icon: '🌐', category: 'fullstack' },
  { id: 'typescript', name: 'TypeScript', count: 65, icon: '🔷', category: 'fullstack' },
  { id: 'nextjs', name: 'Next.js', count: 62, icon: '▲', category: 'fullstack' },
  { id: 'arrays', name: 'Arrays', count: 120, icon: '📦', category: 'coding' },
  { id: 'linked-list', name: 'Linked List', count: 98, icon: '🔗', category: 'coding' },
  { id: 'tree', name: 'Tree', count: 95, icon: '🌳', category: 'coding' },
  { id: 'graph', name: 'Graph', count: 88, icon: '🕸️', category: 'coding' },
  { id: 'sorting', name: 'Sorting', count: 85, icon: '↕️', category: 'coding' },
  { id: 'dynamic-programming', name: 'Dynamic Programming', count: 82, icon: '🧩', category: 'coding' },
  { id: 'recursion', name: 'Recursion', count: 78, icon: '🔁', category: 'coding' },
  { id: 'hash-table', name: 'Hash Table', count: 75, icon: '#️⃣', category: 'coding' },
  { id: 'stack-queue', name: 'Stack & Queue', count: 72, icon: '📚', category: 'coding' },
  { id: 'binary-search', name: 'Binary Search', count: 68, icon: '🔍', category: 'coding' },
  { id: 'system-design', name: 'System Design', count: 150, icon: '🏗️', category: 'system' },
  { id: 'microservices', name: 'Microservices', count: 120, icon: '🔧', category: 'system' },
  { id: 'load-balancing', name: 'Load Balancing', count: 95, icon: '⚖️', category: 'system' },
  { id: 'caching', name: 'Caching', count: 90, icon: '💾', category: 'system' },
  { id: 'database-design', name: 'Database Design', count: 88, icon: '🗄️', category: 'system' },
  { id: 'api-design', name: 'API Design', count: 85, icon: '🔌', category: 'system' },
  { id: 'scalability', name: 'Scalability', count: 82, icon: '📈', category: 'system' },
  { id: 'distributed-systems', name: 'Distributed Systems', count: 78, icon: '🌍', category: 'system' },
];

export const QUESTIONS: InterviewQuestion[] = [
  { id: 1, technologyId: 'java', level: 'entry', question: 'Hãy liệt kê một số IDE của Java?' },
  { id: 2, technologyId: 'java', level: 'entry', question: 'Java là gì? Tại sao nên dùng Java?' },
  { id: 3, technologyId: 'java', level: 'junior', question: 'Sự khác biệt giữa JDK, JRE và JVM là gì?' },
  { id: 4, technologyId: 'java', level: 'junior', question: 'Giải thích về OOP trong Java với 4 tính chất cơ bản?' },
  { id: 5, technologyId: 'java', level: 'middle', question: 'HashMap hoạt động như thế nào trong Java?' },
  { id: 6, technologyId: 'java', level: 'middle', question: 'Sự khác biệt giữa ArrayList và LinkedList?' },
  { id: 7, technologyId: 'java', level: 'senior', question: 'Giải thích Garbage Collection trong JVM?' },
  { id: 8, technologyId: 'java', level: 'senior', question: 'ConcurrentHashMap khác HashMap thế nào?' },
  { id: 9, technologyId: 'java', level: 'expert', question: 'Thiết kế hệ thống xử lý hàng triệu request với Java Spring?' },
  { id: 10, technologyId: 'java', level: 'expert', question: 'Tối ưu hiệu năng JVM cho ứng dụng production?' },
  { id: 11, technologyId: 'javascript', level: 'entry', question: 'JavaScript là gì? Chạy ở đâu?' },
  { id: 12, technologyId: 'javascript', level: 'junior', question: 'Sự khác biệt giữa var, let và const?' },
  { id: 13, technologyId: 'javascript', level: 'middle', question: 'Giải thích Event Loop trong JavaScript?' },
  { id: 14, technologyId: 'javascript', level: 'senior', question: 'Closure là gì? Cho ví dụ thực tế?' },
  { id: 15, technologyId: 'react', level: 'junior', question: 'Virtual DOM hoạt động như thế nào?' },
  { id: 16, technologyId: 'react', level: 'middle', question: 'useEffect và useMemo khác nhau thế nào?' },
  { id: 17, technologyId: 'arrays', level: 'entry', question: 'Độ phức tạp thời gian của duyệt mảng là bao nhiêu?' },
  { id: 18, technologyId: 'arrays', level: 'middle', question: 'Giải bài Two Sum bằng Hash Map?' },
  { id: 19, technologyId: 'system-design', level: 'senior', question: 'Thiết kế hệ thống URL shortener như bit.ly?' },
  { id: 20, technologyId: 'system-design', level: 'expert', question: 'Thiết kế hệ thống chat real-time cho 1 triệu user?' },
];

export function getTotalQuestionCount() {
  return TECHNOLOGIES.reduce((sum, tech) => sum + tech.count, 0);
}

export function getTechnologiesByCategory(category: InterviewCategory) {
  return TECHNOLOGIES.filter((tech) => tech.category === category);
}

export function getQuestions(technologyId: string, level: ExperienceLevel | null) {
  return QUESTIONS.filter(
    (q) =>
      q.technologyId === technologyId && (level === null || q.level === level)
  );
}

export interface SummaryOptions {
  length: 'short' | 'medium' | 'detailed';
  style: 'simple' | 'professional' | 'academic' | 'bullets';
  focus: 'general' | 'exam' | 'research' | 'business' | 'legal' | 'news' | 'meeting';
}

export interface Entity {
  name: string;
  type: 'person' | 'company' | 'place' | 'date' | 'concept' | 'other';
  context: string;
}

export interface QualityScore {
  coverage: number;
  faithfulness: number;
  redundancy: number;
  overall: number;
}

export interface NodeAnnotation {
  id: string;
  node_id: string;
  node_label: string;
  viz_type: 'mindmap' | 'treemap' | 'timeline' | 'flashcards' | 'general';
  content: string;
  created_at: string;
}

export interface BookmarkedItem {
  id: string;
  target_id: string;
  target_type: 'document' | 'mindmap_node' | 'treemap_node' | 'timeline_step' | 'flashcard' | 'key_point';
  label: string;
  detail?: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface QuizAttempt {
  id: string;
  attempted_at: string;
  score: number;
  total_questions: number;
  user_answers: Record<string, number>; // questionId -> selected option index
}

export interface Quiz {
  id: string;
  created_at: string;
  title: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  highest_score?: number;
}

export interface Citation {
  document_id: string;
  document_title: string;
  source_type: string;
  section_title?: string;
  viz_type?: 'mindmap' | 'treemap' | 'timeline' | 'summary';
  viz_node_id?: string;
  snippet: string;
}

export interface GlobalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Note {
  id: string;
  user_id?: string;
  title: string;
  subject: string;
  source_type: "text" | "pdf" | "youtube" | "article" | "docx" | "txt";
  created_at: string;
  tags: string[];
  
  // Core summary
  bullet_summary: string[];
  tldr?: string;
  key_points?: string[];
  action_items?: string[];
  keywords?: string[];
  entities?: Entity[];
  
  // Summary metadata
  summary_options?: SummaryOptions;
  document_type?: string;
  quality_score?: QualityScore;
  original_content?: string;
  
  // Visualizations
  treemap: {
    main_topic: string;
    subtopics: { name: string; points: string[]; weight: number }[];
  };
  mindmap: {
    nodes: { id: string; label: string; details?: string[] }[];
    edges: { source: string; target: string }[];
  };
  flashcards: { question: string; answer: string }[];
  timeline: { step: string; description: string }[];
  suggested_videos: {
    title: string;
    thumbnail_url: string;
    channel: string;
    video_url: string;
  }[];

  // Annotations, Bookmarks & Quizzes
  node_annotations?: NodeAnnotation[];
  bookmarks?: BookmarkedItem[];
  quizzes?: Quiz[];
}

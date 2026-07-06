export interface Note {
  id: string;
  user_id?: string;
  title: string;
  subject: string;
  source_type: "text" | "pdf" | "youtube" | "article";
  created_at: string;
  tags: string[];
  bullet_summary: string[];
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
}

import { Note, SummaryOptions, NodeAnnotation, BookmarkedItem, Quiz, QuizAttempt, Citation } from "./types";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "./supabase";

export const api = {
  getNotes: async (): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching notes:", error);
      throw error;
    }
    
    return (data || []) as Note[];
  },
  
  getNoteById: async (id: string): Promise<Note | undefined> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching note ${id}:`, error);
      return undefined;
    }
    
    return data as Note;
  },

  askFollowUp: async (noteId: string, question: string, noteContent: any): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('chat-with-note', {
      body: { note_id: noteId, question, note_content: noteContent }
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error("Failed to get answer");
    }

    return data;
  },

  askGlobalKnowledge: async (
    question: string, 
    history: { role: 'user' | 'assistant', content: string }[] = []
  ): Promise<{ answer: string; citations: Citation[] }> => {
    // 1. Fetch user's knowledge base notes
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, subject, source_type, tags, tldr, bullet_summary, key_points, action_items, keywords, mindmap, treemap, node_annotations')
      .order('created_at', { ascending: false })
      .limit(20);

    if (notesError) {
      console.error("Error fetching knowledge context:", notesError);
    }

    // 2. Invoke ask-knowledge edge function
    const { data, error } = await supabase.functions.invoke('ask-knowledge', {
      body: {
        question,
        notes_context: notes || [],
        history
      }
    });

    if (error) {
      console.error("Ask knowledge edge function error:", error);
      throw new Error("Failed to search knowledge base");
    }

    return {
      answer: data?.answer || "I could not find an answer in your knowledge base.",
      citations: data?.citations || []
    };
  },
  
  createNote: async (
    sourceType: Note["source_type"], 
    subject: string, 
    content: any,
    summaryOptions?: SummaryOptions
  ): Promise<Note> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error("User must be logged in to create a note.");
    }

    // Fetch existing subjects for the user to pass to AI
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select('subject');
      
    let existing_subjects: string[] = [];
    if (!notesError && notesData) {
      existing_subjects = Array.from(new Set(notesData.map(n => n.subject).filter(Boolean)));
    }

    // Call process-content edge function
    const { data: functionData, error: functionError } = await supabase.functions.invoke('process-content', {
      body: { 
        content: content, 
        source_type: sourceType, 
        title: subject, 
        existing_subjects,
        summary_options: summaryOptions || { length: 'medium', style: 'simple', focus: 'general' }
      }
    });

    if (functionError) {
      console.error("Edge function error:", functionError);
      throw new Error("Failed to process content, please try again");
    }

    if (functionData.error) {
      console.error("Edge function returned error:", functionData.error);
      throw new Error(functionData.error || "Failed to process content, please try again");
    }

    // Structured note payload
    const noteData = {
      user_id: user.id,
      title: functionData.title || subject || "Untitled Note",
      subject: subject || functionData.subject || "Uncategorized",
      source_type: sourceType,
      tags: functionData.tags || [],
      bullet_summary: functionData.bullet_summary || [],
      tldr: functionData.tldr || "",
      key_points: functionData.key_points || [],
      action_items: functionData.action_items || [],
      keywords: functionData.keywords || [],
      entities: functionData.entities || [],
      document_type: functionData.document_type || "general",
      quality_score: functionData.quality_score || null,
      summary_options: summaryOptions || null,
      original_content: typeof content === 'string' ? content.substring(0, 10000) : null,
      treemap: functionData.treemap || { main_topic: "", subtopics: [] },
      mindmap: functionData.mindmap || { nodes: [], edges: [] },
      flashcards: functionData.flashcards || [],
      timeline: functionData.timeline || [],
      suggested_videos: functionData.suggested_videos || [],
      node_annotations: [],
      bookmarks: [],
      quizzes: []
    };

    // Insert into Supabase
    const { data: insertData, error: insertError } = await supabase
      .from('notes')
      .insert(noteData)
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to save the note to the database.");
    }

    return insertData as Note;
  },

  regenerateNoteSummary: async (noteId: string, options: SummaryOptions): Promise<Note> => {
    const existingNote = await api.getNoteById(noteId);
    if (!existingNote) throw new Error("Note not found");

    const content = existingNote.original_content || existingNote.bullet_summary.join('\n\n') || existingNote.title;

    const { data: functionData, error: functionError } = await supabase.functions.invoke('process-content', {
      body: { 
        content: content, 
        source_type: existingNote.source_type, 
        title: existingNote.title, 
        existing_subjects: [existingNote.subject],
        summary_options: options
      }
    });

    if (functionError || functionData?.error) {
      throw new Error(functionError?.message || functionData?.error || "Failed to regenerate summary");
    }

    const updates: Partial<Note> = {
      summary_options: options,
      bullet_summary: functionData.bullet_summary || existingNote.bullet_summary,
      tldr: functionData.tldr || existingNote.tldr,
      key_points: functionData.key_points || existingNote.key_points,
      action_items: functionData.action_items || existingNote.action_items,
      keywords: functionData.keywords || existingNote.keywords,
      entities: functionData.entities || existingNote.entities,
      treemap: functionData.treemap || existingNote.treemap,
      mindmap: functionData.mindmap || existingNote.mindmap,
      flashcards: functionData.flashcards || existingNote.flashcards,
      timeline: functionData.timeline || existingNote.timeline,
      quality_score: functionData.quality_score || existingNote.quality_score,
    };

    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedNote as Note;
  },

  // === Node Annotations ===
  addNodeAnnotation: async (
    noteId: string, 
    annotation: Omit<NodeAnnotation, 'id' | 'created_at'>
  ): Promise<NodeAnnotation> => {
    const note = await api.getNoteById(noteId);
    if (!note) throw new Error("Note not found");

    const newAnnotation: NodeAnnotation = {
      ...annotation,
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString()
    };

    const updatedAnnotations = [...(note.node_annotations || []), newAnnotation];

    const { error } = await supabase
      .from('notes')
      .update({ node_annotations: updatedAnnotations })
      .eq('id', noteId);

    if (error) throw error;
    return newAnnotation;
  },

  deleteNodeAnnotation: async (noteId: string, annotationId: string): Promise<void> => {
    const note = await api.getNoteById(noteId);
    if (!note) throw new Error("Note not found");

    const updatedAnnotations = (note.node_annotations || []).filter(a => a.id !== annotationId);

    const { error } = await supabase
      .from('notes')
      .update({ node_annotations: updatedAnnotations })
      .eq('id', noteId);

    if (error) throw error;
  },

  // === Bookmarks ===
  toggleBookmark: async (
    noteId: string, 
    item: Omit<BookmarkedItem, 'id' | 'created_at'>
  ): Promise<boolean> => {
    const note = await api.getNoteById(noteId);
    if (!note) throw new Error("Note not found");

    const existingBookmarks = note.bookmarks || [];
    const isBookmarked = existingBookmarks.some(b => b.target_id === item.target_id);

    let updatedBookmarks: BookmarkedItem[];
    if (isBookmarked) {
      updatedBookmarks = existingBookmarks.filter(b => b.target_id !== item.target_id);
    } else {
      updatedBookmarks = [
        ...existingBookmarks,
        {
          ...item,
          id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date().toISOString()
        }
      ];
    }

    const { error } = await supabase
      .from('notes')
      .update({ bookmarks: updatedBookmarks })
      .eq('id', noteId);

    if (error) throw error;
    return !isBookmarked;
  },

  // === Quizzes ===
  generateQuiz: async (
    noteId: string, 
    title: string, 
    content: any, 
    count: number = 5,
    difficulty: string = 'medium'
  ): Promise<Quiz> => {
    const note = await api.getNoteById(noteId);
    if (!note) throw new Error("Note not found");

    const { data, error } = await supabase.functions.invoke('generate-quiz', {
      body: { note_title: title, note_content: content, count, difficulty }
    });

    if (error || data?.error) {
      throw new Error(error?.message || data?.error || "Failed to generate quiz");
    }

    const newQuiz: Quiz = {
      id: `quiz_${Date.now()}`,
      created_at: new Date().toISOString(),
      title: data.title || `${title} Quiz`,
      questions: data.questions || [],
      attempts: []
    };

    const updatedQuizzes = [newQuiz, ...(note.quizzes || [])];

    const { error: updateError } = await supabase
      .from('notes')
      .update({ quizzes: updatedQuizzes })
      .eq('id', noteId);

    if (updateError) throw updateError;
    return newQuiz;
  },

  saveQuizAttempt: async (
    noteId: string, 
    quizId: string, 
    attempt: Omit<QuizAttempt, 'id' | 'attempted_at'>
  ): Promise<Quiz> => {
    const note = await api.getNoteById(noteId);
    if (!note) throw new Error("Note not found");

    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `att_${Date.now()}`,
      attempted_at: new Date().toISOString()
    };

    const updatedQuizzes = (note.quizzes || []).map(quiz => {
      if (quiz.id === quizId) {
        const attempts = [newAttempt, ...(quiz.attempts || [])];
        const highest_score = Math.max(quiz.highest_score || 0, attempt.score);
        return { ...quiz, attempts, highest_score };
      }
      return quiz;
    });

    const { error } = await supabase
      .from('notes')
      .update({ quizzes: updatedQuizzes })
      .eq('id', noteId);

    if (error) throw error;
    return updatedQuizzes.find(q => q.id === quizId)!;
  },

  updateNote: async (noteId: string, updates: Partial<Note>): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId);

    if (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  },

  renameSubject: async (oldName: string, newName: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error("Must be logged in");

    const { error } = await supabase
      .from('notes')
      .update({ subject: newName })
      .eq('subject', oldName)
      .eq('user_id', user.id);
      
    if (error) throw error;
  },

  deleteSubject: async (subjectName: string): Promise<void> => {
    const user = useAuthStore.getState().user;
    let query = supabase
      .from('notes')
      .update({ subject: 'Uncategorized' })
      .eq('subject', subjectName);
      
    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;
    if (error) throw error;
  },

  deleteNote: async (noteId: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  }
};

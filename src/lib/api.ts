import { Note } from "./types";
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
    
    return data as Note[];
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
  
  createNote: async (sourceType: Note["source_type"], subject: string, content: any): Promise<Note> => {
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

    // Call the real edge function
    const { data: functionData, error: functionError } = await supabase.functions.invoke('process-content', {
      body: { content: content, source_type: sourceType, title: subject, existing_subjects }
    });

    if (functionError) {
      console.error("Edge function error:", functionError);
      throw new Error("Failed to process content, please try again");
    }

    if (functionData.error) {
      console.error("Edge function returned error:", functionData.error);
      throw new Error(functionData.error || "Failed to process content, please try again");
    }

    // The edge function returns the note content structure
    const noteData = {
      user_id: user.id,
      title: functionData.title || subject || "Untitled Note",
      subject: subject || functionData.subject || "Uncategorized",
      source_type: sourceType,
      tags: functionData.tags || [],
      bullet_summary: functionData.bullet_summary || [],
      treemap: functionData.treemap || { main_topic: "", subtopics: [] },
      mindmap: functionData.mindmap || { nodes: [], edges: [] },
      flashcards: functionData.flashcards || [],
      timeline: functionData.timeline || [],
      suggested_videos: functionData.suggested_videos || []
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
    if (!user) throw new Error("Must be logged in");

    const { error } = await supabase
      .from('notes')
      .update({ subject: 'Uncategorized' })
      .eq('subject', subjectName)
      .eq('user_id', user.id);
      
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

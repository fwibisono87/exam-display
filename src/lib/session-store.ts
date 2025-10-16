import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { nanoid } from 'nanoid';
import { supabase, isSupabaseConfigured } from './supabase';

// Client ID management
function getClientId(): string {
  if (!browser) return '';
  
  let clientId = localStorage.getItem('exam_display_client_id');
  if (!clientId) {
    clientId = nanoid();
    localStorage.setItem('exam_display_client_id', clientId);
  }
  return clientId;
}

// Session sharing types
export interface SessionState {
  sessionCode: string;
  displayName: string;
  isHost: boolean;
  isFollower: boolean;
  isConnected: boolean;
  followerCount: number;
  sessionId: string | null;
  lastUpdated: Date | null;
  subscription: any | null;
}

export interface CheckpointData {
  id: string;
  name: string;
  color: string;
  emoji: string;
  time: string;
  timestamp: number;
}

export interface ExamState {
  serverTime: string;
  serverDate: string;
  timezone: string;
  activeCheckpoint: CheckpointData | null;
  nextCheckpoint: CheckpointData | null;
  allCheckpoints: CheckpointData[];
  highContrastMode: boolean;
  examProgress: number;
  nextCheckpointProgress: number;
  announcements: string;
  is24Hour: boolean;
  customTitle: string;
  showDate: boolean;
  showTimezone: boolean;
  announcementPosition: 'top' | 'left';
  announcementFontSize: number;
  showAnnouncements: boolean;
}

// Create session store
function createSessionStore() {
  // Initialize with default state
  const { subscribe, set, update } = writable<SessionState>({
    sessionCode: '',
    displayName: '',
    isHost: false,
    isFollower: false,
    isConnected: false,
    followerCount: 0,
    sessionId: null,
    lastUpdated: null,
    subscription: null
  });

  // Store actions and methods
  return {
    subscribe,
    
    // Initialize the session store and check for any stored session
    init: () => {
      if (!browser || !isSupabaseConfigured()) return;
      
      // Check for stored session in localStorage
      const storedSession = localStorage.getItem('exam_display_session');
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          const now = new Date();
          const sessionDate = new Date(sessionData.timestamp);
          
          // Only restore if session is less than 24 hours old
          if (now.getTime() - sessionDate.getTime() < 24 * 60 * 60 * 1000) {
            // Validate if session still exists
            if (sessionData.sessionCode) {
              // Revalidate with Supabase later
              update(state => ({
                ...state,
                sessionCode: sessionData.sessionCode,
                displayName: sessionData.displayName,
                isHost: sessionData.isHost,
                isFollower: sessionData.isFollower,
                isConnected: false, // Will be set to true after revalidation
              }));
            }
          } else {
            // Clear expired session
            localStorage.removeItem('exam_display_session');
          }
        } catch (e) {
          console.error('Failed to parse stored session:', e);
          localStorage.removeItem('exam_display_session');
        }
      }
    },
    
    // Create a new master session
    createMasterSession: async (displayName: string, initialState: Partial<ExamState>) => {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Supabase is not configured' };
      }
      
      try {
        // Call Supabase function to create a session
        const { data, error } = await supabase.rpc('create_shared_session', {
          client_id: getClientId(),
          initial_data: initialState
        });
        
        if (error) throw error;
        
        const sessionCode = data as string;
        
        // Get the session ID from the code
        const { data: sessionData, error: sessionError } = await supabase
          .from('shared_sessions')
          .select('id')
          .eq('session_code', sessionCode)
          .single();
          
        if (sessionError) throw sessionError;
        
        // Store session info in localStorage
        const sessionInfo = {
          sessionCode,
          displayName,
          isHost: true,
          isFollower: false,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('exam_display_session', JSON.stringify(sessionInfo));
        
        // Update store state
        update(state => ({
          ...state,
          sessionCode,
          displayName,
          isHost: true,
          isFollower: false,
          isConnected: true,
          sessionId: sessionData.id,
          lastUpdated: new Date()
        }));
        
        // Subscribe to follower count updates
        subscribeToFollowers(sessionData.id);
        
        return { success: true, sessionCode };
      } catch (error) {
        console.error('Error creating master session:', error);
        return { success: false, message: 'Failed to create session' };
      }
    },
    
    // Join an existing session as a follower
    joinSession: async (sessionCode: string) => {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Supabase is not configured' };
      }
      
      try {
        // First, validate that the session exists
        const { data: session, error } = await supabase
          .from('shared_sessions')
          .select('id, session_data')
          .eq('session_code', sessionCode)
          .eq('is_active', true)
          .single();
          
        if (error || !session) {
          return { success: false, message: 'Session not found or inactive' };
        }
        
        // Register as a follower
        const { error: followerError } = await supabase
          .from('session_followers')
          .insert({
            session_id: session.id,
            follower_client_id: getClientId()
          });
          
        if (followerError) throw followerError;
        
        // Extract display name from session data
        const displayName = session.session_data?.customTitle || 'Exam Display';
        
        // Store session info
        const sessionInfo = {
          sessionCode,
          displayName,
          isHost: false,
          isFollower: true,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('exam_display_session', JSON.stringify(sessionInfo));
        
        // Update store
        update(state => ({
          ...state,
          sessionCode,
          displayName,
          isHost: false,
          isFollower: true,
          isConnected: true,
          sessionId: session.id,
          lastUpdated: new Date()
        }));
        
        // Subscribe to session updates
        subscribeToSessionUpdates(session.id);
        
        return { success: true, initialState: session.session_data };
      } catch (error) {
        console.error('Error joining session:', error);
        return { success: false, message: 'Failed to join session' };
      }
    },
    
    // Disconnect from the current session
    disconnect: async () => {
      try {
        const state = get({ subscribe });
        
        if (state.isConnected && state.sessionId) {
          // If we're a follower, remove from followers table
          if (state.isFollower) {
            await supabase
              .from('session_followers')
              .delete()
              .eq('session_id', state.sessionId)
              .eq('follower_client_id', getClientId());
          }
          
          // If we're a host, mark session as inactive
          if (state.isHost) {
            await supabase
              .from('shared_sessions')
              .update({ is_active: false })
              .eq('id', state.sessionId)
              .eq('master_client_id', getClientId());
          }
          
          // Remove any subscriptions
          if (state.subscription) {
            state.subscription.unsubscribe();
          }
        }
        
        // Clear local storage
        localStorage.removeItem('exam_display_session');
        
        // Reset store state
        set({
          sessionCode: '',
          displayName: '',
          isHost: false,
          isFollower: false,
          isConnected: false,
          followerCount: 0,
          sessionId: null,
          lastUpdated: null,
          subscription: null
        });
        
        return true;
      } catch (error) {
        console.error('Error disconnecting from session:', error);
        return false;
      }
    },
    
    // Update session state (host only)
    updateSessionState: async (examState: Partial<ExamState>) => {
      const state = get({ subscribe });
      
      if (!state.isHost || !state.isConnected || !state.sessionId) {
        return false;
      }
      
      try {
        const { error } = await supabase
          .from('shared_sessions')
          .update({ 
            session_data: examState,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', state.sessionId)
          .eq('master_client_id', getClientId());
          
        if (error) throw error;
        
        update(s => ({ ...s, lastUpdated: new Date() }));
        return true;
      } catch (error) {
        console.error('Error updating session state:', error);
        return false;
      }
    },
    
    // Heartbeat to keep session alive
    heartbeat: async () => {
      const state = get({ subscribe });
      
      if (!state.isConnected || !state.sessionId) return false;
      
      try {
        if (state.isHost) {
          // Update the expires_at field to keep session active
          await supabase
            .from('shared_sessions')
            .update({ expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
            .eq('id', state.sessionId)
            .eq('master_client_id', getClientId());
        } else if (state.isFollower) {
          // Update last_seen_at for follower
          await supabase
            .from('session_followers')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('session_id', state.sessionId)
            .eq('follower_client_id', getClientId());
        }
        return true;
      } catch (error) {
        console.error('Error sending heartbeat:', error);
        return false;
      }
    }
  };
  
  // Helper function to subscribe to follower updates
  function subscribeToFollowers(sessionId: string) {
    const subscription = supabase
      .channel(`public:session_followers:session_id=eq.${sessionId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'session_followers',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        // When follower list changes, update count
        updateFollowerCount(sessionId);
      })
      .subscribe();
    
    // Store the subscription
    update(state => ({ ...state, subscription }));
    
    // Initial follower count
    updateFollowerCount(sessionId);
  }
  
  // Helper to update follower count
  async function updateFollowerCount(sessionId: string) {
    try {
      const { count, error } = await supabase
        .from('session_followers')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId);
        
      if (!error && typeof count === 'number') {
        update(state => ({ ...state, followerCount: count }));
      }
    } catch (e) {
      console.error('Error counting followers:', e);
    }
  }
  
  // Helper function to subscribe to session updates (for followers)
  function subscribeToSessionUpdates(sessionId: string) {
    const subscription = supabase
      .channel(`public:shared_sessions:id=eq.${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'shared_sessions',
        filter: `id=eq.${sessionId}`
      }, payload => {
        // When session is updated, trigger event
        const newState = payload.new?.session_data;
        if (newState) {
          // Dispatch custom event with updated state
          if (browser) {
            window.dispatchEvent(new CustomEvent('session:state-updated', { 
              detail: newState
            }));
          }
          
          // Update lastUpdated in store
          update(state => ({ ...state, lastUpdated: new Date() }));
        }
      })
      .subscribe();
    
    // Store the subscription
    update(state => ({ ...state, subscription }));
  }
}

// Create and export the session store instance
export const sessionStore = createSessionStore();

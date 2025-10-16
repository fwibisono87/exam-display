<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionStore, type ExamState } from './session-store';
  import { isSupabaseConfigured } from './supabase';
  
  // Props
  export let showModal = false;
  export let currentExamState: ExamState;
  export let onStateUpdate: (newState: Partial<ExamState>) => void;
  
  // Internal state
  let mode: 'create' | 'join' | null = null;
  let displayName = '';
  let sessionCode = '';
  let error = '';
  let loading = false;
  let heartbeatInterval: ReturnType<typeof setInterval>;
  let supabaseConfigured = false;
  
  onMount(() => {
    // Check if Supabase is configured
    supabaseConfigured = isSupabaseConfigured();
    
    // Initialize the session store
    sessionStore.init();
    
    // Set up heartbeat interval to keep session alive
    heartbeatInterval = setInterval(async () => {
      if ($sessionStore.isConnected) {
        await sessionStore.heartbeat();
      }
    }, 60000); // Every minute
    
    // Set up event listener for state updates from master (when in follower mode)
    window.addEventListener('session:state-updated', handleStateUpdate);
  });
  
  onDestroy(() => {
    // Clean up resources
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    window.removeEventListener('session:state-updated', handleStateUpdate);
  });
  
  // Handle incoming state updates when in follower mode
  function handleStateUpdate(event: CustomEvent) {
    if ($sessionStore.isFollower && event.detail) {
      onStateUpdate(event.detail);
    }
  }
  
  // Make the modal closable
  function closeModal() {
    showModal = false;
    mode = null;
    error = '';
  }
  
  // Create a new master session
  async function createSession() {
    if (!displayName) {
      error = 'Please enter a display name for this session';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      // Add custom title to the exam state
      const stateToShare = {
        ...currentExamState,
        customTitle: displayName
      };
      
      const result = await sessionStore.createMasterSession(displayName, stateToShare);
      
      if (result.success) {
        // Success! Close the modal
        closeModal();
      } else {
        error = result.message || 'Failed to create session';
      }
    } catch (e) {
      console.error('Error creating session:', e);
      error = 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }
  
  // Join an existing session as a follower
  async function joinSession() {
    if (!sessionCode) {
      error = 'Please enter a session code';
      return;
    }
    
    // Format session code (uppercase, remove spaces)
    const formattedCode = sessionCode.toUpperCase().replace(/\s/g, '');
    if (formattedCode.length !== 6) {
      error = 'Session code must be 6 characters';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const result = await sessionStore.joinSession(formattedCode);
      
      if (result.success && result.initialState) {
        // Apply the master session's state to our local state
        onStateUpdate(result.initialState);
        closeModal();
      } else {
        error = result.message || 'Failed to join session';
      }
    } catch (e) {
      console.error('Error joining session:', e);
      error = 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }
  
  // Disconnect from the current session
  async function disconnect() {
    loading = true;
    
    try {
      await sessionStore.disconnect();
      closeModal();
    } catch (e) {
      console.error('Error disconnecting:', e);
      error = 'Failed to disconnect from session';
    } finally {
      loading = false;
    }
  }
  
  // Update session state (for host)
  $: {
    if ($sessionStore.isHost && $sessionStore.isConnected) {
      sessionStore.updateSessionState(currentExamState);
    }
  }
</script>

{#if showModal}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-modal-title"
  >
    <!-- Invisible backdrop for accessibility -->
    <div class="absolute inset-0" aria-hidden="true">
      <button 
        class="w-full h-full bg-transparent border-0" 
        on:click={closeModal}
        aria-label="Close modal"
      ></button>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl relative z-10">
      <h2 id="session-modal-title" class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        {#if $sessionStore.isConnected}
          {$sessionStore.isHost ? 'Share Session' : 'Connected Session'}
        {:else if mode === 'create'}
          Create Session
        {:else if mode === 'join'}
          Join Session
        {:else}
          Session Sharing
        {/if}
      </h2>
      
      {#if !supabaseConfigured}
        <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>Supabase is not properly configured. Please update your environment variables.</p>
        </div>
      {:else if error}
        <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      {/if}
      
      {#if $sessionStore.isConnected}
        <!-- Connected session info -->
        <div class="mb-4">
          <p class="font-medium text-gray-700 dark:text-gray-300">Session Code:</p>
          <div class="flex items-center mt-1">
            <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md font-mono text-xl tracking-wide flex-1 text-center text-gray-800 dark:text-gray-200">
              {$sessionStore.sessionCode}
            </div>
            <button 
              class="ml-2 p-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              on:click={() => {
                navigator.clipboard.writeText($sessionStore.sessionCode);
              }}
              aria-label="Copy session code"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="mb-4">
          <p class="font-medium text-gray-700 dark:text-gray-300">Display Name:</p>
          <p class="text-gray-900 dark:text-gray-100">{$sessionStore.displayName}</p>
        </div>
        
        <div class="mb-4">
          <p class="font-medium text-gray-700 dark:text-gray-300">Session Type:</p>
          <div class="flex items-center">
            {#if $sessionStore.isHost}
              <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-sm">Master (Host)</span>
              <span class="ml-3 text-gray-700 dark:text-gray-300">
                {$sessionStore.followerCount} {$sessionStore.followerCount === 1 ? 'follower' : 'followers'} connected
              </span>
            {:else}
              <span class="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm">Follower</span>
            {/if}
          </div>
        </div>
        
        {#if $sessionStore.lastUpdated}
          <div class="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Last updated: {$sessionStore.lastUpdated.toLocaleTimeString()}
          </div>
        {/if}
        
        <div class="mt-6 flex justify-end">
          <button 
            class="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            on:click={disconnect}
            disabled={loading}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      {:else if mode === null}
        <!-- Initial selection options -->
        <div class="flex flex-col space-y-4">
          <button 
            class="px-4 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            on:click={() => mode = 'create'}
            disabled={!supabaseConfigured}
          >
            Create Master Session
          </button>
          <button 
            class="px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            on:click={() => mode = 'join'}
            disabled={!supabaseConfigured}
          >
            Join Existing Session
          </button>
          <button 
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 mt-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            on:click={closeModal}
          >
            Cancel
          </button>
        </div>
      {:else if mode === 'create'}
        <!-- Create master session form -->
        <form on:submit|preventDefault={createSession} class="space-y-4">
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
            <input 
              type="text" 
              id="displayName" 
              bind:value={displayName} 
              placeholder="e.g., CS101 Final Exam"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={loading}
            />
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This name will be shown at the top of all connected displays.
            </p>
          </div>
          
          <div class="flex justify-end space-x-2 pt-4">
            <button 
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              on:click={() => mode = null}
              disabled={loading}
            >
              Back
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading || !displayName || !supabaseConfigured}
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      {:else if mode === 'join'}
        <!-- Join session form -->
        <form on:submit|preventDefault={joinSession} class="space-y-4">
          <div>
            <label for="sessionCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Session Code</label>
            <input 
              type="text" 
              id="sessionCode" 
              bind:value={sessionCode} 
              placeholder="Enter 6-digit code"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white tracking-wider font-mono"
              maxlength="6"
              pattern="[A-Za-z0-9]{6}"
              style="text-transform: uppercase;"
              disabled={loading}
            />
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enter the 6-digit code provided by the session host.
            </p>
          </div>
          
          <div class="flex justify-end space-x-2 pt-4">
            <button 
              type="button"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              on:click={() => mode = null}
              disabled={loading}
            >
              Back
            </button>
            <button 
              type="submit"
              class="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={loading || !sessionCode || !supabaseConfigured}
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

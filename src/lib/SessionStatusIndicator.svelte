<script lang="ts">
  import { sessionStore } from './session-store';
  
  // Props
  export let onClick: () => void;
  export let compact = false;
</script>

{#if $sessionStore.isConnected}
  <button 
    class="flex items-center rounded-md {compact ? 'p-1' : 'p-2'} hover:bg-black hover:bg-opacity-10 transition-colors"
    on:click={onClick}
    aria-label="Manage session"
  >
    <div class="flex items-center">
      <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
      <span class="text-sm font-medium">
        {$sessionStore.isHost ? 'Master' : 'Follower'}
        {#if !compact}
         : {$sessionStore.sessionCode}
        {/if}
      </span>
      
      {#if $sessionStore.isHost && !compact}
        <span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded ml-2">
          {$sessionStore.followerCount}
        </span>
      {/if}
    </div>
    
    {#if !compact}
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    {/if}
  </button>
{:else}
  <button 
    class="flex items-center text-sm {compact ? 'px-2 py-1' : 'px-3 py-1.5'} bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-full transition-colors"
    on:click={onClick}
    aria-label="Share session"
  >
    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
    {#if !compact}
      <span>Share</span>
    {/if}
  </button>
{/if}

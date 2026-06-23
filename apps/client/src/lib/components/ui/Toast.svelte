<script lang="ts">
  /**
   * bits-ui Toast wrapper.
   *
   * This is a thin re-export wrapper so pages can import from '$lib/components/ui/Toast.svelte'
   * instead of needing to know bits-ui internals. The actual rendering is done by
   * ToastContainer.svelte in the root layout.
   *
   * Usage: import { toast } from '$lib/stores/toast.svelte';
   *        toast.success('Key added successfully');
   *        toast.error('Failed to save');
   *        toast.warning('Rate limit approaching');
   *        toast.info('Models updated');
   */
</script>
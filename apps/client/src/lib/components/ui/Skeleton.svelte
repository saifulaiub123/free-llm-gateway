<script lang="ts">
  interface Props {
    class?: string;
    /** Approximate shape: 'text' (single line), 'card' (rect with rounded corners), 'circle', 'avatar' (round) */
    shape?: 'text' | 'card' | 'circle' | 'avatar';
    /** Width override (e.g. 'w-24', 'w-full') */
    width?: string;
    /** Height override (e.g. 'h-4', 'h-24') */
    height?: string;
  }

  let { class: klass = '', shape = 'text', width, height }: Props = $props();

  const shapes: Record<string, string> = {
    text: 'h-4 rounded',
    card: 'h-24 rounded-xl',
    circle: 'h-10 w-10 rounded-full',
    avatar: 'h-10 w-10 rounded-full',
  };
</script>

<div
  class="animate-shimmer {width ?? (shape === 'text' ? 'w-full' : '')} {height ?? shapes[shape]} {shapes[shape].includes('rounded-full') ? '' : 'rounded-lg'} {klass}"
  aria-hidden="true"
></div>
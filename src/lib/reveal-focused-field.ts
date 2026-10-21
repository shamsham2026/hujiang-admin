/** Pull a focused control into the visual viewport, including after the mobile keyboard opens. */
export function revealFocusedField(target: HTMLElement) {
  const run = () => {
    if (!target.isConnected || document.activeElement !== target) return;
    const rect = target.getBoundingClientRect();
    const view = window.visualViewport;
    const viewTop = view?.offsetTop ?? 0;
    const viewHeight = view?.height ?? window.innerHeight;
    const margin = 20;
    if (rect.top >= viewTop + margin && rect.bottom <= viewTop + viewHeight - margin) return;

    const scroller = nearestScroller(target);
    if (scroller) {
      const host = scroller.getBoundingClientRect();
      const delta = rect.top - host.top - (host.height - rect.height) / 2;
      scroller.scrollTop += delta;
      return;
    }
    const next = window.scrollY + rect.top - viewTop - (viewHeight - rect.height) / 2;
    window.scrollTo({ top: Math.max(0, next), left: 0 });
  };
  window.setTimeout(run, 60);
  window.setTimeout(run, 420);
}

function nearestScroller(target: HTMLElement): HTMLElement | null {
  let node = target.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const scrolls = /(auto|scroll)/.test(style.overflowY);
    if (scrolls && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

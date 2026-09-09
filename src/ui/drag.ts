// Pointer-based drag-to-reorder for a list of cards. Shared by the Flows
// component list and the chat composer's message list — the geometry handling
// here is subtle enough (see the rect snapshot below, BUGFIXES) that duplicating
// it would be a bug waiting to happen.

/**
 * Start dragging `card` within `host`. `items` is the model array to reorder —
 * it must be the live array, since this splices it in place — and `onDone` runs
 * only when the order actually changed.
 */
export function startDrag<T>(
  e: PointerEvent,
  card: HTMLElement,
  host: HTMLElement,
  items: T[],
  onDone: () => void,
): void {
  e.preventDefault();
  const cards = Array.from(host.children) as HTMLElement[];
  const from = cards.indexOf(card);
  if (from < 0) return;

  // Snapshot the geometry up front: the dragged card gets a transform, so live
  // rects would follow the pointer and poison the midpoint test. Nothing else
  // reflows during the drag, so these stay accurate.
  const rects = cards.map((el) => el.getBoundingClientRect());
  const startY = e.clientY;
  let insertAt = from; // index in the current list to insert *before*

  host.classList.add("dragging");
  card.classList.add("dragging");
  const line = document.createElement("div");
  line.className = "drop-line";
  host.appendChild(line);

  // Vertical center of the gap that precedes card `idx` (or follows the last one).
  const hostTop = host.getBoundingClientRect().top;
  const slotY = (idx: number): number => {
    if (idx <= 0) return rects[0].top - hostTop - 4;
    if (idx >= rects.length) return rects[rects.length - 1].bottom - hostTop + 3;
    return (rects[idx - 1].bottom + rects[idx].top) / 2 - hostTop - 1;
  };
  const paint = (): void => { line.style.top = `${slotY(insertAt)}px`; };
  paint();

  const onMove = (ev: PointerEvent): void => {
    card.style.transform = `translateY(${ev.clientY - startY}px)`;
    let idx = rects.length;
    for (let k = 0; k < rects.length; k++) {
      if (ev.clientY < rects[k].top + rects[k].height / 2) { idx = k; break; }
    }
    if (idx !== insertAt) { insertAt = idx; paint(); }
  };
  const onUp = (): void => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    line.remove();
    host.classList.remove("dragging");
    card.classList.remove("dragging");
    card.style.transform = "";
    // Inserting after its own slot shifts the target left by one once removed.
    const to = insertAt > from ? insertAt - 1 : insertAt;
    if (to === from) return; // dropped back where it started
    items.splice(to, 0, ...items.splice(from, 1));
    onDone();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

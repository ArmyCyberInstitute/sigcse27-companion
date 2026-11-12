// Curated final-slide IDs connect related content across the rendered snapshots.
const keysFor = slide => (slide?.closest('section[data-sync-id]')?.dataset.syncId || '').split(/\s+/).filter(Boolean);
const titleFor = slide => slide?.querySelector('h1,h2,h3')?.textContent || 'this slide';

export class SlideSync {
  constructor({onPosition, onRelated, preferredKeys, variants}) {
    Object.assign(this, {onPosition, onRelated, preferredKeys, variants});
    this.entries = new Map();this.enabled = false;this.key = '';this.lastDriver = null;
  }
  reset({enabled, key, allowedKeys, preferredStage}) {
    this.clear();this.enabled = enabled;this.key = key || '';
    this.allowedKeys = new Set(allowedKeys);this.preferredStage = preferredStage;
  }
  clear() {
    for (const stage of [...this.entries.keys()]) this.detach(stage);
    this.lastDriver = null;
  }
  detach(stage) {
    const entry = this.entries.get(stage);
    if (!entry) return;
    entry.reveal.off('slidechanged', entry.changed);
    this.entries.delete(stage);
    if (this.lastDriver === entry) this.lastDriver = null;
  }
  status(entry, message = '') {
    entry.badge.textContent = message;entry.badge.hidden = !message;
    entry.card.dataset.syncStatus = message ? 'unmatched' : 'matched';
  }
  attach(entry) {
    if (this.entries.get(entry.stage)?.reveal === entry.reveal) return;
    this.detach(entry.stage);
    entry.nodes = [...entry.frame.contentDocument.querySelectorAll('.slides section[data-sync-id]')];
    entry.changed = event => {
      const slide = event.currentSlide;
      const parent = slide?.closest('section[id]');
      if (parent && [...entry.select.options].some(o => o.value === parent.id)) entry.select.value = parent.id;
      if (entry.expected === slide) {entry.expected = null;return;}
      this.lastDriver = entry;
      if (this.enabled) this.drive(entry, slide);
    };
    this.entries.set(entry.stage, entry);
    entry.reveal.on('slidechanged', entry.changed);
    if (this.enabled) {
      if (this.key) this.align(entry, this.key);
      else if (entry.stage === this.preferredStage) this.drive(entry, entry.reveal.getCurrentSlide());
    }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      for (const entry of this.entries.values()) {this.status(entry);entry.note.textContent = '';}
      return;
    }
    const driver = this.lastDriver || this.entries.get('final') || this.entries.values().next().value;
    if (driver) this.drive(driver, driver.reveal.getCurrentSlide());
  }
  drive(entry, slide) {
    const keys = keysFor(slide).filter(key => this.allowedKeys.has(key));
    const preferred = new Set(this.preferredKeys());
    const key = keys.includes(this.key) ? this.key : keys.find(k => preferred.has(k)) || keys[0] || '';
    this.lastDriver = entry;this.key = key;this.onPosition(key);
    this.status(entry, key ? '' : 'No final counterpart');
    entry.note.textContent = key ? 'Matched slide: ' + titleFor(slide) : 'No mapped counterpart in the final decks.';
    for (const target of [...this.entries.values()]) {
      if (target === entry) continue;
      if (key) this.align(target, key);
      else {
        this.status(target, 'No matching slide');
        target.note.textContent = 'No mapped counterpart for “' + titleFor(slide) + '”.';
      }
    }
  }
  align(entry, key) {
    const candidates = entry.nodes.filter(node => keysFor(node).includes(key));
    const current = entry.reveal.getCurrentSlide();
    const target = candidates.find(node => node === current || node.contains(current)) ||
      candidates.find(node => keysFor(node)[0] === key) || candidates[0];
    if (!target) {
      const related = this.variants(entry.stage).find(a => a.format === 'Quarto' && a.sync_keys?.includes(key));
      if (related) {this.onRelated(entry.stage, related);return;}
      this.status(entry, 'No matching slide');
      entry.note.textContent = 'No mapped slide in this stage for ' + key + '.';
      return;
    }
    this.status(entry);
    entry.note.textContent = 'Matched slide: ' + titleFor(target);
    entry.select.value = target.id;
    if (target === current || target.contains(current)) return;
    const indices = entry.reveal.getIndices(target);
    entry.expected = target;
    entry.reveal.slide(indices.h, indices.v);
    // Reveal dispatches slidechanged synchronously; clear a no-op target too.
    entry.expected = null;
  }
}

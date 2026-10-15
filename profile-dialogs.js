(() => {
  const root = document.querySelector('[data-profile-dialogs]');
  if (!root || root.dataset.enhanced) return;
  const dialogs = [...root.querySelectorAll('dialog')];
  if (dialogs.some((dialog) => typeof dialog.showModal !== 'function')) return;
  root.dataset.enhanced = 'true';
  const openers = new Map();
  const languageLinks = [...document.querySelectorAll('[data-language-switch]')];
  const languagePaths = new Map(languageLinks.map((link) => [link, link.getAttribute('href')]));
  const modules = [...document.querySelectorAll('[data-profile-module]')];
  let introTransitionUntil = 0;

  const progress = document.querySelector('[data-reading-progress]');
  const marks = [...document.querySelectorAll('[data-reading-section]')];
  if (progress && marks.length) {
    const sections = marks.map((mark) => document.getElementById(mark.dataset.readingSection));
    let framePending = false;
    function updateReadingProgress() {
      framePending = false;
      if (dialogs.some((dialog) => dialog.open)) return;
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const readingLine = offset + Math.min(120, Math.max(0, window.innerHeight - offset) * 0.2);
      const tops = sections.map((section) => section.getBoundingClientRect().top);
      let current = -1;
      tops.forEach((top, index) => { if (top <= readingLine) current = index; });
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atEnd) current = marks.length - 1;
      let fraction = 0;
      if (current >= 0) {
        const next = tops[current + 1];
        const within = next === undefined ? 0 : Math.min(1, Math.max(0, (readingLine - tops[current]) / (next - tops[current])));
        fraction = (current + within) / (marks.length - 1);
      }
      progress.style.setProperty('--reading-progress', String(fraction));
      progress.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
      progress.setAttribute('aria-valuetext', current < 0 ? progress.getAttribute('aria-label') : marks[current].getAttribute('aria-label'));
      marks.forEach((mark, index) => {
        if (index === current) mark.setAttribute('aria-current', 'location');
        else mark.removeAttribute('aria-current');
      });
    }
    function scheduleReadingProgress() {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(updateReadingProgress);
    }
    window.addEventListener('scroll', scheduleReadingProgress, { passive: true });
    window.addEventListener('resize', scheduleReadingProgress, { passive: true });
    window.addEventListener('pageshow', scheduleReadingProgress);
    window.addEventListener('load', scheduleReadingProgress);
    dialogs.forEach((dialog) => dialog.addEventListener('close', scheduleReadingProgress));
    document.fonts?.ready.then(scheduleReadingProgress);
    scheduleReadingProgress();
  }

  // Treat the first downward wheel gesture as a transition into the profile.
  // Keep its remaining momentum from immediately skipping the work section.
  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX) || dialogs.some((dialog) => dialog.open)) return;
    if (event.deltaY <= 0) { introTransitionUntil = 0; return; }
    if (performance.now() < introTransitionUntil) { event.preventDefault(); return; }
    const first = modules[0];
    if (!first) return;
    // Allow oversized introductions to be read before making the transition.
    if (document.querySelector('.hero').getBoundingClientRect().bottom > window.innerHeight + 1) return;
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
    if (first.getBoundingClientRect().top <= offset + 1) return;
    event.preventDefault();
    introTransitionUntil = performance.now() + 650;
    first.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, { passive: false });

  function dialogForHash(hash) {
    const id = hash.slice(1);
    return dialogs.find((dialog) => dialog.id === id || (dialog.id === 'build' && id.startsWith('build-')));
  }
  function updateLanguageLink() {
    const active = dialogs.find((dialog) => dialog.open);
    languageLinks.forEach((link) => { link.href = languagePaths.get(link) + (active ? `#${active.id}` : location.hash); });
  }
  function openDialog(dialog, opener, anchor) {
    if (dialog.open) return;
    openers.set(dialog, opener);
    dialog.showModal();
    const preview = dialog.querySelector('[data-resume-preview]');
    if (preview && !preview.hasAttribute('src')) {
      const viewer = new URL('../resume-viewer.html', dialog.querySelector('[data-resume-file]').href);
      viewer.searchParams.set('lang', document.documentElement.lang.startsWith('en') ? 'en' : 'zh');
      viewer.searchParams.set('v', preview.dataset.resumeVersion || String(Date.now()));
      preview.src = viewer.href;
    }
    document.documentElement.classList.add('has-open-dialog');
    dialog.querySelector('.detail-dialog-scroll').scrollTop = 0;
    if (anchor && anchor !== `#${dialog.id}`) {
      const target = document.getElementById(anchor.slice(1));
      if (target && dialog.contains(target)) target.scrollIntoView({ block: 'start' });
    }
    updateLanguageLink();
  }
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-dialog-trigger], a[href^="#"]');
    if (!trigger || event.defaultPrevented) return;
    const id = trigger.dataset.dialogTrigger;
    const hash = trigger.getAttribute('href');
    const dialog = id ? dialogs.find((item) => item.id === id) : dialogForHash(hash || '');
    if (!dialog) return;
    event.preventDefault();
    openDialog(dialog, trigger, hash);
  });
  window.addEventListener('message', (event) => {
    const resume = dialogs.find((dialog) => dialog.id === 'resume');
    if (event.origin !== location.origin || event.source !== resume?.querySelector('iframe')?.contentWindow) return;
    if (event.data?.type === 'resume-close') resume.close();
    if (event.data?.type === 'resume-state') {
      const { pages, zoom } = event.data;
      if (!Number.isFinite(pages) || !Number.isFinite(zoom)) return;
      resume.querySelector('[data-resume-pages]').textContent = document.documentElement.lang.startsWith('en') ? `${pages} pages` : `${pages} 页`;
      resume.querySelector('[data-resume-zoom]').textContent = `${Math.round(zoom * 100)}%`;
      resume.querySelectorAll('[data-resume-action]').forEach((button) => {
        button.disabled = button.dataset.resumeAction === 'out' ? zoom <= 0.6 : button.dataset.resumeAction === 'in' ? zoom >= 2 : false;
      });
    }
  });
  document.querySelectorAll('[data-resume-action]').forEach((button) => button.addEventListener('click', () => {
    root.querySelector('[data-resume-preview]').contentWindow.postMessage({ type: 'resume-action', action: button.dataset.resumeAction }, location.origin);
  }));
  dialogs.forEach((dialog) => {
    let pointerStartedOutside = false;
    function outside(event) {
      const rect = dialog.getBoundingClientRect();
      return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
    }
    dialog.addEventListener('pointerdown', (event) => { pointerStartedOutside = outside(event); });
    dialog.addEventListener('click', (event) => {
      if (pointerStartedOutside && outside(event)) dialog.close();
      pointerStartedOutside = false;
    });
    dialog.addEventListener('close', () => {
      if (!dialogs.some((item) => item.open)) document.documentElement.classList.remove('has-open-dialog');
      if (dialogForHash(location.hash) === dialog) {
        history.replaceState(null, '', `${location.pathname}${location.search}#${dialog.dataset.returnTo}`);
      }
      const opener = openers.get(dialog) || document.querySelector(`[data-dialog-trigger="${dialog.id}"]`);
      opener?.focus({ preventScroll: true });
      updateLanguageLink();
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, a[href], iframe, [tabindex="0"]')].filter((item) => item.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    dialog.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.getElementById(link.hash.slice(1));
        if (!target || !dialog.contains(target)) return;
        event.preventDefault();
        target.scrollIntoView({ block: 'start' });
      });
    });
  });
  function readHash() {
    const dialog = dialogForHash(location.hash);
    if (dialog) openDialog(dialog, null, location.hash);
    updateLanguageLink();
  }
  window.addEventListener('hashchange', readHash);
  readHash();
})();

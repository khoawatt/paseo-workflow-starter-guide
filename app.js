(function () {
  'use strict';

  var CHECKLIST_KEY = 'paseo-starter-checklist-v1';
  var VALID_KEYS = ['preflight', 'a', 'b', 'c', 'd', 'e', 'f', 'g'];

  function prefersReducedMotion() {
    if (typeof window.matchMedia !== 'function') {
      return false;
    }
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function announce(message) {
    if (typeof message !== 'string' || message === '') {
      return;
    }
    var announcer = document.querySelector('div#announcer[aria-live]');
    if (!announcer) {
      return;
    }
    // Clear then set so repeated messages are re-announced.
    announcer.textContent = '';
    window.setTimeout(function () {
      announcer.textContent = message;
    }, 30);
  }

  function copyText(text, done) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { fallbackCopy(text, done); }
      );
      return;
    }
    fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      done(!!ok);
    } catch (e) {
      done(false);
    }
  }

  function initCopyButtons() {
    var buttons = document.querySelectorAll('button.copy-btn[data-copy]');
    if (!buttons || buttons.length === 0) {
      return;
    }
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        if (text === null || text === undefined) {
          return;
        }
        copyText(text, function (ok) {
          if (ok) {
            announce('Copied to clipboard.');
            flashLabel(btn, 'Copied');
          } else {
            announce('Copy failed. Select the text manually.');
            flashLabel(btn, 'Copy failed');
          }
        });
      });
    });
  }

  function flashLabel(btn, label) {
    if (!btn || !btn.textContent) {
      return;
    }
    var original = btn.getAttribute('data-label') || btn.textContent;
    if (!btn.getAttribute('data-label')) {
      btn.setAttribute('data-label', original);
    }
    btn.textContent = label;
    window.setTimeout(function () {
      btn.textContent = btn.getAttribute('data-label') || original;
    }, 1500);
  }

  function initTabs() {
    var groups = document.querySelectorAll('.tabs[data-tabs]');
    if (!groups || groups.length === 0) {
      return;
    }
    Array.prototype.forEach.call(groups, function (group) {
      var tablist = group.querySelector('div[role="tablist"]');
      if (!tablist) {
        return;
      }
      var tabs = tablist.querySelectorAll('button[role="tab"]');
      if (!tabs || tabs.length === 0) {
        return;
      }
      var panels = group.querySelectorAll('div[role="tabpanel"]');
      var tabArray = Array.prototype.slice.call(tabs);

      function selectTab(next, moveFocus) {
        if (!next) {
          return;
        }
        tabArray.forEach(function (tab) {
          var selected = tab === next;
          tab.setAttribute('aria-selected', selected ? 'true' : 'false');
          tab.setAttribute('tabindex', selected ? '0' : '-1');
          var panelId = tab.getAttribute('aria-controls');
          var panel = null;
          if (panelId) {
            panel = group.querySelector('#' + CSS.escape(panelId));
          }
          if (panel) {
            if (selected) {
              panel.removeAttribute('hidden');
            } else {
              panel.setAttribute('hidden', '');
            }
          }
        });
        if (moveFocus && typeof next.focus === 'function') {
          next.focus();
        }
      }

      tabArray.forEach(function (tab, index) {
        // Ensure roving tabindex matches initial aria-selected state.
        var selected = tab.getAttribute('aria-selected') === 'true';
        tab.setAttribute('tabindex', selected ? '0' : '-1');

        tab.addEventListener('click', function () {
          selectTab(tab, false);
        });

        tab.addEventListener('keydown', function (event) {
          var key = event.key;
          var targetIndex = -1;
          if (key === 'ArrowRight') {
            targetIndex = (index + 1) % tabArray.length;
          } else if (key === 'ArrowLeft') {
            targetIndex = (index - 1 + tabArray.length) % tabArray.length;
          } else if (key === 'Home') {
            targetIndex = 0;
          } else if (key === 'End') {
            targetIndex = tabArray.length - 1;
          } else {
            return;
          }
          event.preventDefault();
          selectTab(tabArray[targetIndex], true);
        });
      });

      // If no tab is pre-selected, select the first (no focus steal).
      var anySelected = tabArray.some(function (t) {
        return t.getAttribute('aria-selected') === 'true';
      });
      if (!anySelected) {
        selectTab(tabArray[0], false);
      } else {
        // Sync panels to the pre-selected tab on load.
        var current = tabArray.filter(function (t) {
          return t.getAttribute('aria-selected') === 'true';
        })[0];
        selectTab(current, false);
      }

      // Hide panels NodeList warning: panels without matching tab stay as authored.
      if (panels && panels.length === 0) {
        return;
      }
    });
  }

  function loadChecklistState() {
    try {
      var raw = window.localStorage.getItem(CHECKLIST_KEY);
      if (!raw) {
        return {};
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }
      var clean = {};
      VALID_KEYS.forEach(function (k) {
        if (parsed[k] === true) {
          clean[k] = true;
        }
      });
      return clean;
    } catch (e) {
      return {};
    }
  }

  function saveChecklistState(state) {
    try {
      window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
    } catch (e) {
      // Safe-fail: private mode / quota / unavailable. Progress still updates in-memory.
    }
  }

  function initChecklist() {
    var boxes = document.querySelectorAll('ul.checklist input[type="checkbox"][data-check]');
    var progress = document.querySelector('div#smoke-progress');
    var resetBtn = document.querySelector('button#reset-progress');
    if ((!boxes || boxes.length === 0) && !progress && !resetBtn) {
      return;
    }

    var state = loadChecklistState();
    var list = boxes ? Array.prototype.slice.call(boxes) : [];

    function render() {
      var total = list.length;
      var checkedCount = list.filter(function (box) {
        return box.checked;
      }).length;

      if (progress) {
        var bar = progress.querySelector('[role="progressbar"], .bar, .progress-bar');
        var text = progress.querySelector('.progress-text, p, span');
        var label = total === 0
          ? 'No checklist items found.'
          : checkedCount + ' of ' + total + ' complete';
        progress.setAttribute('data-checked', String(checkedCount));
        progress.setAttribute('data-total', String(total));
        if (bar && bar.setAttribute) {
          var pct = total === 0 ? 0 : Math.round((checkedCount / total) * 100);
          bar.setAttribute('aria-valuenow', String(pct));
          bar.setAttribute('aria-valuemin', '0');
          bar.setAttribute('aria-valuemax', '100');
          if (bar.style) {
            bar.style.width = pct + '%';
          }
        }
        if (text) {
          text.textContent = label;
        } else if (!bar) {
          progress.textContent = label;
        }
      }
    }

    list.forEach(function (box) {
      var key = box.getAttribute('data-check');
      if (key && state[key] === true) {
        box.checked = true;
      }
      box.addEventListener('change', function () {
        var k = box.getAttribute('data-check');
        if (!k) {
          render();
          return;
        }
        if (box.checked) {
          state[k] = true;
        } else {
          delete state[k];
        }
        saveChecklistState(state);
        render();
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (typeof window.confirm === 'function' && !window.confirm('Reset local smoke-test progress?')) {
          return;
        }
        state = {};
        try {
          window.localStorage.removeItem(CHECKLIST_KEY);
        } catch (e) {
          // Safe-fail: private mode / quota / unavailable. Continue with in-memory reset.
        }
        saveChecklistState(state);
        list.forEach(function (box) {
          box.checked = false;
        });
        render();
        announce('Checklist progress has been reset.');
      });
    }

    render();
  }

  function initNavHighlight() {
    var nav = document.querySelector('nav#site-nav');
    if (!nav) {
      return;
    }
    var links = nav.querySelectorAll('a[href^="#"]');
    if (!links || links.length === 0) {
      return;
    }
    var linkArray = Array.prototype.slice.call(links);
    var sections = linkArray
      .map(function (link) {
        var href = link.getAttribute('href');
        if (!href || href === '#') {
          return null;
        }
        var id = href.slice(1);
        if (!id) {
          return null;
        }
        var section = null;
        try {
          section = document.getElementById(id);
        } catch (e) {
          section = null;
        }
        return section ? { id: id, el: section, link: link } : null;
      })
      .filter(function (entry) {
        return entry !== null;
      });
    if (sections.length === 0) {
      return;
    }

    function setActive(id) {
      linkArray.forEach(function (link) {
        var href = link.getAttribute('href');
        var isActive = href === '#' + id;
        if (isActive) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'true');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
    }

    if ('IntersectionObserver' in window && typeof window.IntersectionObserver === 'function') {
      try {
        var visible = {};
        var observer = new window.IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
            });
            var bestId = null;
            var bestRatio = 0;
            Object.keys(visible).forEach(function (id) {
              if (visible[id] > bestRatio) {
                bestRatio = visible[id];
                bestId = id;
              }
            });
            if (bestId) {
              setActive(bestId);
            }
          },
          { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.1, 0.25, 0.5, 1] }
        );
        sections.forEach(function (s) {
          observer.observe(s.el);
        });
        return;
      } catch (e) {
        // Fall through to scroll fallback.
      }
    }

    // Fallback: scroll listener, rAF-throttled, reduced-motion agnostic.
    var ticking = false;
    function onScrollFallback() {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY || window.pageYOffset || 0;
        var current = sections[0].id;
        sections.forEach(function (s) {
          var top = 0;
          try {
            top = s.el.getBoundingClientRect().top + y;
          } catch (e) {
            top = 0;
          }
          if (top - 120 <= y) {
            current = s.id;
          }
        });
        setActive(current);
      });
    }
    window.addEventListener('scroll', onScrollFallback, { passive: true });
    onScrollFallback();
  }

  function initReadingProgress() {
    var bar = document.querySelector('div#reading-progress[role="progressbar"]');
    if (!bar) {
      return;
    }
    var main = document.querySelector('main#main');
    var reduceMotion = prefersReducedMotion();
    var ticking = false;

    function update() {
      ticking = false;
      var doc = document.documentElement;
      var scrollTop = window.scrollY || window.pageYOffset || doc.scrollTop || 0;
      var max = (doc.scrollHeight || 0) - (window.innerHeight || doc.clientHeight || 0);
      var pct = 0;
      if (max > 0) {
        pct = Math.min(100, Math.max(0, (scrollTop / max) * 100));
      }
      var rounded = Math.round(pct);
      bar.style.width = rounded + '%';
      bar.setAttribute('aria-valuenow', String(rounded));
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
    }

    function onScroll() {
      if (reduceMotion) {
        update();
        return;
      }
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    if (main && !bar.getAttribute('aria-label')) {
      bar.setAttribute('aria-label', 'Reading progress');
    }
  }

  function init() {
    initCopyButtons();
    initTabs();
    initChecklist();
    initNavHighlight();
    initReadingProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

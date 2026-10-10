(function () {
  'use strict';

  let openInstance = null;
  let nextId = 0;

  function enhance(select) {
    if (select._styledDropdown) return select._styledDropdown;

    const wrapper = document.createElement('div');
    wrapper.className = 'site-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add('site-select-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'site-select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.dataset.label || '选择');
    const valueLabel = document.createElement('span');
    valueLabel.className = 'site-select-value';
    const chevron = document.createElement('span');
    chevron.className = 'site-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    trigger.append(valueLabel, chevron);
    wrapper.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'site-select-menu';
    menu.id = 'site-select-list-' + (++nextId);
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', trigger.getAttribute('aria-label'));
    menu.hidden = true;
    trigger.setAttribute('aria-controls', menu.id);
    document.body.appendChild(menu);

    let signature = null;
    let activeIndex = 0;
    let choices = [];

    function focusChoice(index) {
      if (!choices.length) return;
      activeIndex = Math.max(0, Math.min(index, choices.length - 1));
      if (choices[activeIndex].disabled) {
        const available = choices.findIndex((opt) => !opt.disabled);
        if (available < 0) return;
        activeIndex = available;
      }
      choices.forEach((node, i) => node.classList.toggle('highlighted', i === activeIndex));
      trigger.setAttribute('aria-activedescendant', choices[activeIndex].id);
      choices[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function sync() {
      const options = Array.from(select.options);
      const sig = options.map((opt) => [opt.value, opt.textContent, opt.disabled].join('|')).join('::');
      if (signature !== sig) {
        signature = sig;
        menu.replaceChildren();
        choices = options.map((opt, i) => {
          const node = document.createElement('button');
          node.type = 'button';
          node.className = 'site-select-option';
          node.id = menu.id + '-option-' + i;
          node.setAttribute('role', 'option');
          node.textContent = opt.textContent;
          node.dataset.index = String(i);
          node.disabled = opt.disabled;
          menu.appendChild(node);
          return node;
        });
      }
      const selected = select.selectedIndex;
      valueLabel.textContent = selected >= 0 ? options[selected].textContent : '请选择';
      choices.forEach((node, i) => {
        const isSelected = i === selected;
        node.classList.toggle('selected', isSelected);
        node.setAttribute('aria-selected', String(isSelected));
      });
      if (menu.hidden) activeIndex = Math.max(0, selected);
    }

    function positionMenu() {
      const rect = trigger.getBoundingClientRect();
      const maxHeight = Math.min(340, window.innerHeight - 24);
      menu.style.maxHeight = maxHeight + 'px';
      menu.style.width = Math.min(rect.width, window.innerWidth - 16) + 'px';
      const wanted = Math.min(menu.scrollHeight, maxHeight);
      const below = window.innerHeight - rect.bottom - 8;
      const above = rect.top - 8;
      const goAbove = below < Math.min(wanted, 180) && above > below;
      const top = goAbove ? Math.max(8, rect.top - wanted - 6) : Math.min(window.innerHeight - wanted - 8, rect.bottom + 6);
      menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)) + 'px';
      menu.style.top = Math.max(8, top) + 'px';
    }

    function close(restoreFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      wrapper.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      if (openInstance === api) openInstance = null;
      if (restoreFocus) trigger.focus();
    }

    function open() {
      if (openInstance && openInstance !== api) openInstance.close(false);
      sync();
      menu.hidden = false;
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      openInstance = api;
      positionMenu();
      focusChoice(Math.max(0, select.selectedIndex));
    }

    function choose(index) {
      const opt = select.options[index];
      if (!opt || opt.disabled) return;
      select.value = opt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      close(true);
    }

    trigger.addEventListener('click', () => menu.hidden ? open() : close(false));
    trigger.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key === 'Escape') {
        if (menu.hidden) return;
        close(true);
      } else if (key === 'ArrowDown' || key === 'ArrowUp') {
        if (menu.hidden) open();
        else {
          const step = key === 'ArrowDown' ? 1 : -1;
          let n = activeIndex;
          for (let i = 0; i < choices.length; i++) {
            n = (n + step + choices.length) % choices.length;
            if (!choices[n].disabled) { focusChoice(n); break; }
          }
        }
      } else if (key === 'Home' || key === 'End') {
        if (menu.hidden) open();
        focusChoice(key === 'Home' ? 0 : choices.length - 1);
      } else if (key === 'Enter' || key === ' ') {
        if (menu.hidden) open(); else choose(activeIndex);
      } else if (key === 'Tab') {
        close(false);
        return;
      } else return;
      event.preventDefault();
      event.stopPropagation();
    });
    menu.addEventListener('click', (event) => {
      const node = event.target.closest('.site-select-option');
      if (node) choose(Number(node.dataset.index));
    });
    menu.addEventListener('pointermove', (event) => {
      const node = event.target.closest('.site-select-option');
      if (node && !node.disabled) {
        activeIndex = Number(node.dataset.index);
        choices.forEach((choice, index) => choice.classList.toggle('highlighted', index === activeIndex));
      }
    });
    select.addEventListener('change', sync);
    const api = { sync, close, positionMenu, trigger, menu };
    select._styledDropdown = api;
    sync();
    return api;
  }

  document.addEventListener('pointerdown', (event) => {
    if (openInstance && !openInstance.trigger.contains(event.target) && !openInstance.menu.contains(event.target)) {
      openInstance.close(false);
    }
  });
  window.addEventListener('resize', () => openInstance && openInstance.positionMenu());
  document.addEventListener('scroll', () => openInstance && openInstance.positionMenu(), true);
  window.StyledDropdown = {
    init() { document.querySelectorAll('select[data-styled]').forEach(enhance); },
    sync(select) { const instance = select._styledDropdown; if (instance) instance.sync(); },
    syncAll() { document.querySelectorAll('select[data-styled]').forEach((select) => enhance(select).sync()); },
  };
})();

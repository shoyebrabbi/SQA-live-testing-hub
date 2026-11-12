(function () {
  window.SQA = window.SQA || {};
  const SQA = window.SQA;
      const allVisibleTabs = ['registration', 'orders', 'ui', 'suite', 'api', 'database', 'security', 'bugs', 'automation'];
      let siteSettings = {
        default_theme: 'arctic-light',
        lock_theme: false,
        default_language: 'bn',
        lock_language: false,
        guest_enabled: true,
        allow_guest_export: true,
        visible_tabs: allVisibleTabs,
        content_overrides: { bn: {}, en: {} },
        button_overrides: {},
        show_announcement: false,
        announcement_bn: '',
        announcement_en: ''
      };
      const contentOverridesStorageKey = SQA.config.CONTENT_CMS_STORAGE_KEY;
      const contentOverridesPendingKey = `${contentOverridesStorageKey}-pending-sync`;
      const buttonOverridesStorageKey = SQA.config.BUTTON_CMS_STORAGE_KEY;
      const buttonOverridesPendingKey = `${buttonOverridesStorageKey}-pending-sync`;
      const buttonStyleFields = [
        { key: 'background', input: 'button-style-background', enabled: 'button-style-background-enabled', kind: 'color' },
        { key: 'text', input: 'button-style-text', enabled: 'button-style-text-enabled', kind: 'color' },
        { key: 'border', input: 'button-style-border', enabled: 'button-style-border-enabled', kind: 'color' },
        { key: 'hover', input: 'button-style-hover', enabled: 'button-style-hover-enabled', kind: 'color' },
        { key: 'radius', input: 'button-style-radius', enabled: 'button-style-radius-enabled', kind: 'radius' }
      ];
      const emptyContentOverrides = () => ({ bn: Object.create(null), en: Object.create(null) });
      let contentOverrides = emptyContentOverrides();
      let buttonOverrides = Object.create(null);
      let contentTargets = [];
      let buttonStyleTargets = [];
      let contentOverridesInitialized = false;
      let buttonOverridesInitialized = false;
      let localCacheLoaded = false;
      let localCache = null;
      let localCacheError = null;
      let localCacheErrorReported = false;
      let buttonCacheLoaded = false;
      let buttonCache = null;
      let buttonCacheError = null;
      let activeInlineTarget = null;
      let inlineEditEnabled = false;
      let contentCmsInitialized = false;
      let buttonRefreshScheduled = false;

      function normalizeContentOverrides(value) {
        const normalized = emptyContentOverrides();
        if (value == null) return normalized;
        if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Content overrides must be a JSON object.');
        for (const language of ['bn', 'en']) {
          const entries = value[language] == null ? {} : value[language];
          if (typeof entries !== 'object' || Array.isArray(entries)) throw new Error(`Content overrides for ${language} must be an object.`);
          for (const [key, text] of Object.entries(entries)) {
            if (!/^cms-[A-Za-z0-9._-]+$/.test(key) || typeof text !== 'string' || text.length > 2000) {
              throw new Error(`Invalid ${language} content override.`);
            }
            normalized[language][key] = text;
          }
        }
        return normalized;
      }

      function readLocalContentOverrides() {
        if (localCacheLoaded) return localCache;
        localCacheLoaded = true;
        try {
          const value = localStorage.getItem(contentOverridesStorageKey);
          localCache = value === null ? null : normalizeContentOverrides(JSON.parse(value));
        } catch (error) {
          localCacheError = error;
          localCache = null;
        }
        return localCache;
      }

      function isLocalContentOverridePending() {
        try { return localStorage.getItem(contentOverridesPendingKey) === 'true'; }
        catch (error) {
          localCacheError = error;
          return false;
        }
      }

      function writeLocalContentOverrides(overrides, pending) {
        const normalized = normalizeContentOverrides(overrides);
        localStorage.setItem(contentOverridesStorageKey, JSON.stringify(normalized));
        if (pending) localStorage.setItem(contentOverridesPendingKey, 'true');
        else localStorage.removeItem(contentOverridesPendingKey);
        localCache = normalized;
        localCacheLoaded = true;
        localCacheError = null;
        return normalized;
      }

      function normalizeButtonOverrides(value) {
        const normalized = Object.create(null);
        if (value == null) return normalized;
        if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Button overrides must be a JSON object.');
        for (const [key, settings] of Object.entries(value)) {
          if (!/^btn-[A-Za-z0-9._-]+$/.test(key) || !settings || typeof settings !== 'object' || Array.isArray(settings)) {
            throw new Error('Invalid button style override.');
          }
          const normalizedSettings = Object.create(null);
          for (const [property, setting] of Object.entries(settings)) {
            if (['background', 'text', 'border', 'hover'].includes(property)) {
              if (typeof setting !== 'string' || !/^#[0-9a-f]{6}$/i.test(setting)) throw new Error(`Invalid ${property} color for button style.`);
              normalizedSettings[property] = setting.toLowerCase();
            } else if (property === 'radius') {
              if (typeof setting !== 'number' || !Number.isFinite(setting) || setting < 0 || setting > 48) {
                throw new Error('Button corner radius must be between 0 and 48 pixels.');
              }
              normalizedSettings.radius = setting;
            } else {
              throw new Error('Unsupported button style property.');
            }
          }
          if (Object.keys(normalizedSettings).length) normalized[key] = normalizedSettings;
        }
        return normalized;
      }

      function readLocalButtonOverrides() {
        if (buttonCacheLoaded) return buttonCache;
        buttonCacheLoaded = true;
        try {
          const value = localStorage.getItem(buttonOverridesStorageKey);
          buttonCache = value === null ? null : normalizeButtonOverrides(JSON.parse(value));
        } catch (error) {
          buttonCacheError = error;
          buttonCache = null;
        }
        return buttonCache;
      }

      function isLocalButtonOverridePending() {
        try { return localStorage.getItem(buttonOverridesPendingKey) === 'true'; }
        catch (error) {
          buttonCacheError = error;
          return false;
        }
      }

      function writeLocalButtonOverrides(overrides, pending) {
        const normalized = normalizeButtonOverrides(overrides);
        localStorage.setItem(buttonOverridesStorageKey, JSON.stringify(normalized));
        if (pending) localStorage.setItem(buttonOverridesPendingKey, 'true');
        else localStorage.removeItem(buttonOverridesPendingKey);
        buttonCache = normalized;
        buttonCacheLoaded = true;
        buttonCacheError = null;
        return normalized;
      }

      function cmsLanguage() {
        return SQA.activeLanguage === 'en' || document.documentElement.lang === 'en' ? 'en' : 'bn';
      }

      function nearestCmsLabel(element) {
        const parent = element.closest('h1, h2, h3, .tab-button, #connection-label, .auth-badge, .feature-badge');
        return String(parent?.textContent || element.textContent).trim().slice(0, 100);
      }

      function stableCmsKey(element, section) {
        if (element.id) return `cms-${section}-${element.id}`.replace(/[^A-Za-z0-9._-]/g, '-');
        const anchor = element.closest('#auth-screen, #app-shell, footer') || document.body;
        const parts = [];
        let current = element;
        while (current && current !== anchor) {
          const parent = current.parentElement;
          if (!parent) break;
          const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === current.tagName);
          parts.unshift(`${current.tagName.toLowerCase()}-${siblings.indexOf(current) + 1}`);
          current = parent;
        }
        const root = anchor.id || anchor.tagName.toLowerCase();
        return `cms-${section}-${root}-${parts.join('-')}`.replace(/[^A-Za-z0-9._-]/g, '-');
      }

      function addTextNodeSpans(element) {
        if (element.dataset.bn && element.dataset.en && !element.children.length) return;
        Array.from(element.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const span = document.createElement('span');
            span.textContent = node.textContent;
            element.replaceChild(span, node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            addTextNodeSpans(node);
          }
        });
      }

      function ensureContentTargets() {
        const roots = [
          ['branding', '#auth-screen .auth-badge, #auth-screen .auth-showcase-title, #auth-screen .auth-showcase-subtitle, #auth-screen .feature-badge, #auth-screen .auth-showcase-credit, #app-shell > header h1, #app-shell > header h2, #app-shell > header h3, #app-shell > header p, #connection-label'],
          ['stats', '#app-shell > section[aria-label] > div > p:first-child'],
          ['tabs', '#app-shell nav .tab-button:not(#tab-admin)'],
          ['modules', '#auth-heading, #auth-description, #share-panel h1, #share-panel h2, #share-panel h3, #share-panel > div > p, #share-preview-card > div:nth-child(1), #share-preview-card > div:nth-child(2), #share-preview-card > div:nth-child(3), #app-shell > section.tab-panel:not(#panel-admin) h1, #app-shell > section.tab-panel:not(#panel-admin) h2, #app-shell > section.tab-panel:not(#panel-admin) h3, #app-shell > section.tab-panel:not(#panel-admin) > div.mb-6 p'],
          ['footer', 'footer p']
        ];
        const candidates = new Map();
        roots.forEach(([section, selector]) => {
          document.querySelectorAll(selector).forEach((root) => {
            addTextNodeSpans(root);
            const visit = (element) => {
              if (!element.children.length) {
                if (element.textContent.trim() && !candidates.has(element)) candidates.set(element, section);
                return;
              }
              Array.from(element.children).forEach(visit);
            };
            visit(root);
          });
        });

        const usedKeys = new Set();
        contentTargets = Array.from(candidates, ([element, section], index) => {
          const key = element.dataset.cmsKey || stableCmsKey(element, section) || `cms-${section}-${index + 1}`;
          let uniqueKey = key;
          let suffix = 2;
          while (usedKeys.has(uniqueKey)) uniqueKey = `${key}-${suffix++}`;
          usedKeys.add(uniqueKey);
          element.dataset.cmsKey = uniqueKey;
          element.dataset.cmsSection = section;
          if (!element.dataset.bn && !element.dataset.en) {
            const text = element.textContent;
            const language = cmsLanguage();
            if (language === 'en') {
              element.dataset.en = text;
              element.dataset.bn = Object.entries(SQA.config.TRANSLATIONS).find(([, english]) => english === text)?.[0] || text;
            } else {
              element.dataset.bn = text;
              element.dataset.en = SQA.config.TRANSLATIONS[text] || text;
            }
          } else {
            if (!element.dataset.bn) {
              const englishText = element.dataset.en || element.textContent;
              element.dataset.bn = Object.entries(SQA.config.TRANSLATIONS).find(([, english]) => english === englishText)?.[0] || element.textContent;
            }
            if (!element.dataset.en) {
              element.dataset.en = SQA.config.TRANSLATIONS[element.dataset.bn] || (cmsLanguage() === 'en' ? element.textContent : element.dataset.bn);
            }
          }
          if (!element.dataset.cmsDefaultBn) element.dataset.cmsDefaultBn = element.dataset.bn;
          if (!element.dataset.cmsDefaultEn) element.dataset.cmsDefaultEn = element.dataset.en;
          if (!element.dataset.cmsLabel) element.dataset.cmsLabel = nearestCmsLabel(element);
          return { element, key: uniqueKey, section };
        });
        const usedSemanticKeys = new Set(contentTargets.map((target) => target.key));
        roots.forEach(([section, selector]) => {
          document.querySelectorAll(selector).forEach((element) => {
            if (element.dataset.cmsKey) return;
            const key = stableCmsKey(element, section);
            let uniqueKey = key;
            let suffix = 2;
            while (usedSemanticKeys.has(uniqueKey)) uniqueKey = `${key}-${suffix++}`;
            usedSemanticKeys.add(uniqueKey);
            element.dataset.cmsKey = uniqueKey;
            element.dataset.cmsContainer = 'true';
          });
        });
      }

      function hasContentOverride(language, key) {
        return Object.prototype.hasOwnProperty.call(contentOverrides[language], key);
      }

      function contentValue(language, target) {
        return hasContentOverride(language, target.key)
          ? contentOverrides[language][target.key]
          : target.element.dataset[language === 'bn' ? 'cmsDefaultBn' : 'cmsDefaultEn'];
      }

      function applyContentOverrides() {
        ensureContentTargets();
        if (!contentOverridesInitialized) {
          const cached = readLocalContentOverrides();
          contentOverrides = cached || normalizeContentOverrides(siteSettings.content_overrides);
          contentOverridesInitialized = true;
        }
        siteSettings.content_overrides = contentOverrides;
        const language = cmsLanguage();
        contentTargets.forEach(({ element, key }) => {
          element.dataset.bn = contentValue('bn', { element, key });
          element.dataset.en = contentValue('en', { element, key });
          element.textContent = element.dataset[language];
        });
        return contentOverrides;
      }

      function buttonToken(value) {
        return String(value || '').replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'button';
      }

      function buttonStyleKey(button) {
        if (button.id) return `btn-${buttonToken(button.id)}`;
        const context = button.closest('[id]')?.id || 'page';
        const utilityClass = /^(rounded|border|bg-|px-|py-|p-|m-|text-|font-|hover:|w-|h-|inline-|flex$|items-|justify-|shadow|leading|tracking|uppercase|cursor-|disabled:|focus:|sm:|md:|lg:|xl:)/;
        const role = Array.from(button.classList).find((name) => !utilityClass.test(name)) || button.type || 'button';
        let identity = '';
        if (button.dataset.id) identity = `record-${button.dataset.id}`;
        else if (button.dataset.index && button.dataset.result) identity = `case-${button.dataset.index}-${button.dataset.result}`;
        else if (button.dataset.value) identity = `preset-${button.dataset.value}`;
        else if (button.dataset.target) identity = `target-${button.dataset.target}`;
        else if (button.dataset.module) identity = `module-${button.dataset.module}`;
        else {
          const siblings = Array.from(button.parentElement?.children || []).filter((element) => element.tagName === 'BUTTON');
          identity = `position-${siblings.indexOf(button) + 1}`;
        }
        return `btn-${buttonToken(context)}-${buttonToken(role)}-${buttonToken(identity)}`;
      }

      function buttonStyleLabel(button) {
        const text = String(button.getAttribute('aria-label') || button.title || button.textContent || button.id || 'Button').trim().replace(/\s+/g, ' ').slice(0, 80);
        const row = button.closest('tr');
        const rowName = row?.querySelector('td')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 50);
        const panel = button.closest('section.tab-panel');
        const panelHeading = panel
          ? document.getElementById(panel.getAttribute('aria-labelledby'))?.textContent.trim()
          : '';
        const scope = panelHeading || (button.closest('#auth-screen') ? 'Authentication' : button.closest('nav') ? 'Navigation' : '');
        return [scope, rowName, text].filter(Boolean).join(' · ');
      }

      function ensureButtonStyleTargets() {
        const usedKeys = new Set();
        buttonStyleTargets = Array.from(document.querySelectorAll('button'))
          .filter((button) => !button.closest('#content-cms-customizer, #button-style-customizer, #cms-inline-dialog'))
          .map((element) => {
            const baseKey = element.dataset.buttonCmsKey || buttonStyleKey(element);
            let key = baseKey;
            let suffix = 2;
            while (usedKeys.has(key)) key = `${baseKey}-${suffix++}`;
            usedKeys.add(key);
            element.dataset.buttonCmsKey = key;
            return { element, key, label: buttonStyleLabel(element) };
          });
      }

      function applyButtonStyleOverrides() {
        ensureButtonStyleTargets();
        if (!buttonOverridesInitialized) {
          const cached = readLocalButtonOverrides();
          buttonOverrides = cached || normalizeButtonOverrides(siteSettings.button_overrides);
          buttonOverridesInitialized = true;
        }
        siteSettings.button_overrides = buttonOverrides;
        const rules = [];
        buttonStyleTargets.forEach(({ key }) => {
          const settings = buttonOverrides[key];
          if (!settings) return;
          const selector = `button[data-button-cms-key="${key}"]`;
          const declarations = [];
          if (settings.background) declarations.push(`background:${settings.background}!important`);
          if (settings.text) declarations.push(`color:${settings.text}!important`);
          if (settings.border) declarations.push(`border-color:${settings.border}!important`);
          if (typeof settings.radius === 'number') declarations.push(`border-radius:${settings.radius}px!important`);
          if (declarations.length) rules.push(`${selector}{${declarations.join(';')}}`);
          if (settings.hover) rules.push(`${selector}:hover{background:${settings.hover}!important}`);
        });
        const style = document.getElementById('button-style-overrides');
        if (rules.length || style) {
          const styleElement = style || document.createElement('style');
          styleElement.id = 'button-style-overrides';
          if (styleElement.textContent !== rules.join('\n')) styleElement.textContent = rules.join('\n');
          if (!styleElement.isConnected) document.head.appendChild(styleElement);
        }
        return buttonOverrides;
      }

      function colorInputValue(color, fallback) {
        const rgb = String(color || '').match(/[\d.]+/g);
        if (!rgb || rgb.length < 3) return fallback;
        return `#${rgb.slice(0, 3).map((value) => Math.max(0, Math.min(255, Math.round(Number(value)))).toString(16).padStart(2, '0')).join('')}`;
      }

      function selectedButtonStyleTarget() {
        const key = SQA.$('#button-style-selector').value;
        return buttonStyleTargets.find((target) => target.key === key) || null;
      }

      function renderButtonStyleForm() {
        const target = selectedButtonStyleTarget();
        if (!target) {
          buttonStyleFields.forEach((field) => {
            SQA.$(`#${field.enabled}`).checked = false;
            SQA.$(`#${field.input}`).disabled = true;
          });
          return;
        }
        const settings = buttonOverrides[target.key] || {};
        const computed = window.getComputedStyle(target.element);
        const defaults = {
          background: colorInputValue(computed.backgroundColor, '#ffffff'),
          text: colorInputValue(computed.color, '#000000'),
          border: colorInputValue(computed.borderTopColor, '#000000'),
          hover: colorInputValue(computed.backgroundColor, '#ffffff'),
          radius: String(Math.max(0, Math.min(48, Math.round(parseFloat(computed.borderTopLeftRadius) || 0))))
        };
        SQA.$('#button-style-context').textContent = target.label;
        buttonStyleFields.forEach((field) => {
          const enabled = Object.prototype.hasOwnProperty.call(settings, field.key);
          const checkbox = SQA.$(`#${field.enabled}`);
          const input = SQA.$(`#${field.input}`);
          checkbox.checked = enabled;
          input.disabled = !enabled;
          input.value = enabled ? settings[field.key] : defaults[field.key];
        });
      }

      function renderButtonStyleOptions() {
        ensureButtonStyleTargets();
        const select = SQA.$('#button-style-selector');
        const selectedKey = select.value;
        const fragment = document.createDocumentFragment();
        buttonStyleTargets.forEach(({ key, label }) => {
          const option = document.createElement('option');
          option.value = key;
          option.textContent = label;
          fragment.appendChild(option);
        });
        select.replaceChildren(fragment);
        if (buttonStyleTargets.some((target) => target.key === selectedKey)) select.value = selectedKey;
        else if (buttonStyleTargets.length) select.value = buttonStyleTargets[0].key;
        renderButtonStyleForm();
      }

      function updateSelectedButtonStyleDraft() {
        const target = selectedButtonStyleTarget();
        if (!target) return false;
        const settings = { ...(buttonOverrides[target.key] || {}) };
        buttonStyleFields.forEach((field) => {
          const enabled = SQA.$(`#${field.enabled}`).checked;
          const input = SQA.$(`#${field.input}`);
          input.disabled = !enabled;
          if (!enabled) {
            delete settings[field.key];
            return;
          }
          if (field.kind === 'radius') {
            const radius = Number(input.value);
            if (!input.value.trim() || !Number.isFinite(radius) || radius < 0 || radius > 48) {
              setButtonStyleMessage('কোণের বক্রতা ০ থেকে ৪৮ পিক্সেলের মধ্যে দিন।', 'Enter a corner radius between 0 and 48 pixels.', true);
              return;
            }
            settings[field.key] = radius;
          } else {
            settings[field.key] = input.value;
          }
        });
        const radiusInput = SQA.$('#button-style-radius');
        if (SQA.$('#button-style-radius-enabled').checked &&
            (!radiusInput.value.trim() || !Number.isFinite(Number(radiusInput.value)) || Number(radiusInput.value) < 0 || Number(radiusInput.value) > 48)) return false;
        const next = { ...buttonOverrides };
        if (Object.keys(settings).length) next[target.key] = settings;
        else delete next[target.key];
        buttonOverrides = normalizeButtonOverrides(next);
        siteSettings.button_overrides = buttonOverrides;
        applyButtonStyleOverrides();
        return true;
      }

      function setButtonStyleMessage(bengali, english, isError = false) {
        const message = SQA.$('#button-style-message');
        SQA.setLocalizedText(message, bengali, english);
        message.classList.toggle('text-rose-300', isError);
        message.classList.toggle('text-emerald-300', !isError);
      }

      async function saveButtonOverrides() {
        if (!canManageContent()) return;
        if (!updateSelectedButtonStyleDraft()) return;
        const snapshot = normalizeButtonOverrides(buttonOverrides);
        let localSaved = false;
        let localError = null;
        try {
          writeLocalButtonOverrides(snapshot, true);
          localSaved = true;
        } catch (error) {
          localError = error;
        }
        try {
          const { data, error } = await SQA.ensureDb()
            .from('sqa_site_settings')
            .update({ button_overrides: snapshot })
            .eq('id', 1)
            .select('id')
            .single();
          if (error) throw error;
          if (data?.id !== 1) throw new Error('Site settings row id=1 was not updated.');
          siteSettings.button_overrides = snapshot;
          buttonOverrides = snapshot;
          let cacheError = null;
          try { writeLocalButtonOverrides(snapshot, false); }
          catch (error) { cacheError = error; }
          if (localError || cacheError) {
            const detail = localError || cacheError;
            setButtonStyleMessage('ক্লাউডে সংরক্ষিত হয়েছে, তবে স্থানীয় ক্যাশে সমস্যা হয়েছে।', 'Saved to the cloud, but the local cache failed.', true);
            SQA.showToast(`Local button style cache failed: ${detail.message}`, 'error');
          } else {
            setButtonStyleMessage('বাটন স্টাইল সংরক্ষিত হয়েছে।', 'Button styles have been saved.');
            SQA.showToast('বাটন স্টাইল সংরক্ষিত হয়েছে।', 'success', 'Button styles saved.');
          }
          applyButtonStyleOverrides();
          renderButtonStyleForm();
        } catch (error) {
          const messageBn = localSaved
            ? `এই ডিভাইসে সংরক্ষিত হয়েছে, কিন্তু Supabase-এ সিঙ্ক হয়নি: ${error.message}`
            : `বাটন স্টাইল সংরক্ষণ করা যায়নি: ${localError?.message || error.message}`;
          const messageEn = localSaved
            ? `Saved on this device, but Supabase sync failed: ${error.message}`
            : `Could not save button styles: ${localError?.message || error.message}`;
          setButtonStyleMessage(messageBn, messageEn, true);
          SQA.showToast(messageBn, 'error', messageEn);
        }
      }

      async function resetSelectedButtonStyle() {
        if (!canManageContent()) return;
        const target = selectedButtonStyleTarget();
        if (!target) return;
        const prompt = cmsLanguage() === 'bn'
          ? 'এই বাটনের কাস্টম স্টাইল মুছে ডিফল্টে ফিরিয়ে দেবেন?'
          : 'Remove this button’s custom style and restore its default appearance?';
        if (!window.confirm(prompt)) return;
        const next = { ...buttonOverrides };
        delete next[target.key];
        buttonOverrides = normalizeButtonOverrides(next);
        siteSettings.button_overrides = buttonOverrides;
        applyButtonStyleOverrides();
        renderButtonStyleForm();
        await saveButtonOverrides();
      }

      function loadFetchedButtonOverrides(value) {
        const remote = normalizeButtonOverrides(value);
        const cached = readLocalButtonOverrides();
        buttonOverrides = isLocalButtonOverridePending() && cached ? cached : remote;
        siteSettings.button_overrides = buttonOverrides;
        buttonOverridesInitialized = true;
        if (!isLocalButtonOverridePending()) {
          try { writeLocalButtonOverrides(remote, false); }
          catch (error) {
            buttonCacheError = error;
            if (SQA.showToast) SQA.showToast(`Could not cache remote button styles: ${error.message}`, 'error');
          }
        }
        applyButtonStyleOverrides();
        if (contentCmsInitialized) renderButtonStyleOptions();
      }

      function initButtonStyleCms() {
        applyButtonStyleOverrides();
        renderButtonStyleOptions();
        SQA.$('#button-style-selector').addEventListener('change', renderButtonStyleForm);
        buttonStyleFields.forEach((field) => {
          SQA.$(`#${field.enabled}`).addEventListener('change', updateSelectedButtonStyleDraft);
          SQA.$(`#${field.input}`).addEventListener('input', updateSelectedButtonStyleDraft);
        });
        SQA.$('#button-style-save').addEventListener('click', saveButtonOverrides);
        SQA.$('#button-style-reset').addEventListener('click', resetSelectedButtonStyle);
        if (buttonCacheError) SQA.showToast(`Could not read the local button style cache: ${buttonCacheError.message}`, 'error');
        const observer = new MutationObserver((records) => {
          const hasButtonChanges = records.some((record) => {
            const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
            if (target?.closest('#content-cms-customizer, #button-style-customizer, #cms-inline-dialog')) return false;
            return [...record.addedNodes, ...record.removedNodes].some((node) =>
              node.nodeType === Node.ELEMENT_NODE && (node.matches('button') || node.querySelector('button'))
            );
          });
          if (!hasButtonChanges || buttonRefreshScheduled) return;
          buttonRefreshScheduled = true;
          window.setTimeout(() => {
            buttonRefreshScheduled = false;
            applyButtonStyleOverrides();
            renderButtonStyleOptions();
          }, 0);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }

      function setContentCmsMessage(bengali, english, isError = false) {
        const message = SQA.$('#cms-save-message');
        SQA.setLocalizedText(message, bengali, english);
        message.classList.toggle('text-rose-300', isError);
        message.classList.toggle('text-emerald-300', !isError);
      }

      function canManageContent() {
        return isAdminUser() && !SQA.isGuestMode;
      }

      function updateContentCmsAccess() {
        const controls = SQA.$('#content-cms-customizer');
        const buttonControls = SQA.$('#button-style-customizer');
        const allowed = canManageContent();
        controls.hidden = !allowed;
        buttonControls.hidden = !allowed;
        if (!allowed) setInlineEditMode(false);
      }

      function setInlineEditMode(enabled) {
        inlineEditEnabled = Boolean(enabled) && canManageContent();
        document.body.classList.toggle('cms-inline-edit', inlineEditEnabled);
        const button = SQA.$('#toggle-inline-cms');
        button.setAttribute('aria-pressed', String(inlineEditEnabled));
        SQA.setLocalizedText(
          button.querySelector('span'),
          inlineEditEnabled ? 'লাইভ ভিজ্যুয়াল এডিট মোড বন্ধ করুন' : 'লাইভ ভিজ্যুয়াল এডিট মোড চালু করুন',
          inlineEditEnabled ? 'Disable Live Visual Edit Mode' : 'Enable Live Visual Edit Mode'
        );
      }

      function renderContentEditor() {
        ensureContentTargets();
        const language = cmsLanguage();
        const selectedSection = SQA.$('#cms-section-selector').value;
        const list = SQA.$('#cms-content-list');
        const fragment = document.createDocumentFragment();
        const targets = contentTargets.filter((target) => target.section === selectedSection);
        targets.forEach((target) => {
          const card = document.createElement('div');
          card.className = 'cms-content-card grid gap-3 rounded-xl p-4';
          const heading = document.createElement('h5');
          heading.className = 'text-sm font-semibold';
          heading.dataset.bn = target.element.dataset.bn || target.element.dataset.cmsLabel || target.key;
          heading.dataset.en = target.element.dataset.en || target.element.dataset.cmsLabel || target.key;
          heading.textContent = language === 'bn' ? heading.dataset.bn : heading.dataset.en;
          const fields = document.createElement('div');
          fields.className = 'grid gap-3 md:grid-cols-2';
          [['bn', 'বাংলা লেখা', 'Bengali text'], ['en', 'ইংরেজি লেখা', 'English text']].forEach(([code, bnLabel, enLabel]) => {
            const label = document.createElement('label');
            label.className = 'grid gap-2 text-xs font-semibold';
            const caption = document.createElement('span');
            caption.dataset.bn = bnLabel;
            caption.dataset.en = enLabel;
            caption.textContent = language === 'bn' ? bnLabel : enLabel;
            const textarea = document.createElement('textarea');
            textarea.rows = 2;
            textarea.maxLength = 2000;
            textarea.className = 'rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-normal';
            textarea.value = contentValue(code, target);
            textarea.dataset.cmsKey = target.key;
            textarea.dataset.cmsLanguage = code;
            textarea.addEventListener('input', () => {
              contentOverrides[code][target.key] = textarea.value;
              applyContentOverrides();
            });
            label.append(caption, textarea);
            fields.appendChild(label);
          });
          card.append(heading, fields);
          fragment.appendChild(card);
        });
        list.replaceChildren(fragment);
      }

      function refreshContentEditor() {
        if (contentCmsInitialized) renderContentEditor();
      }

      function refreshButtonStyleEditor() {
        if (contentCmsInitialized) renderButtonStyleOptions();
      }

      async function saveContentOverrides() {
        if (!canManageContent()) return;
        const snapshot = normalizeContentOverrides(contentOverrides);
        let localSaved = false;
        let localError = null;
        try {
          writeLocalContentOverrides(snapshot, true);
          localSaved = true;
        } catch (error) {
          localError = error;
        }
        applyContentOverrides();
        try {
          const { data, error } = await SQA.ensureDb()
            .from('sqa_site_settings')
            .update({ content_overrides: snapshot })
            .eq('id', 1)
            .select('id')
            .single();
          if (error) throw error;
          if (data?.id !== 1) throw new Error('Site settings row id=1 was not updated.');
          siteSettings.content_overrides = snapshot;
          contentOverrides = snapshot;
          let cacheFinalizeError = null;
          try { writeLocalContentOverrides(snapshot, false); }
          catch (cacheError) { cacheFinalizeError = cacheError; }
          if (localError || cacheFinalizeError) {
            const detail = localError || cacheFinalizeError;
            setContentCmsMessage('ক্লাউডে সংরক্ষিত হয়েছে, তবে স্থানীয় ক্যাশে সমস্যা হয়েছে।', 'Saved to the cloud, but the local cache failed.', true);
            SQA.showToast(`Local content cache failed: ${detail.message}`, 'error');
          } else {
            setContentCmsMessage('সব কনটেন্ট পরিবর্তন সংরক্ষিত হয়েছে।', 'All content changes have been saved.');
            SQA.showToast('কনটেন্ট ও মডিউল টেক্সট সংরক্ষিত হয়েছে।', 'success', 'Content and module text saved.');
          }
          applyContentOverrides();
          renderContentEditor();
        } catch (error) {
          const messageBn = localSaved
            ? `এই ডিভাইসে সংরক্ষিত হয়েছে, কিন্তু Supabase-এ সিঙ্ক হয়নি: ${error.message}`
            : `কনটেন্ট সংরক্ষণ করা যায়নি: ${localError?.message || error.message}`;
          const messageEn = localSaved
            ? `Saved on this device, but Supabase sync failed: ${error.message}`
            : `Could not save content: ${localError?.message || error.message}`;
          setContentCmsMessage(messageBn, messageEn, true);
          SQA.showToast(messageBn, 'error', messageEn);
        }
      }

      function exportContentConfig() {
        if (!canManageContent()) return;
        try {
          const payload = {
            exported_at: new Date().toISOString(),
            content_overrides: normalizeContentOverrides(contentOverrides),
            button_overrides: normalizeButtonOverrides(buttonOverrides),
            site_settings: {
              ...siteSettings,
              content_overrides: normalizeContentOverrides(contentOverrides),
              button_overrides: normalizeButtonOverrides(buttonOverrides)
            }
          };
          const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
          const link = document.createElement('a');
          link.href = url;
          link.download = `sqa-content-config-${new Date().toISOString().slice(0, 10)}.json`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
          SQA.showToast('কনফিগ JSON রপ্তানি হয়েছে।', 'success', 'Config JSON exported.');
        } catch (error) {
          SQA.showToast(`কনফিগ JSON রপ্তানি করা যায়নি: ${error.message}`, 'error', `Could not export config JSON: ${error.message}`);
        }
      }

      async function resetContentOverrides() {
        if (!canManageContent()) return;
        const prompt = cmsLanguage() === 'bn'
          ? 'সব কাস্টম লেখা মুছে ডিফল্ট টেক্সটে ফিরিয়ে দেবেন?'
          : 'Remove all custom text and restore the default content?';
        if (!window.confirm(prompt)) return;
        contentOverrides = emptyContentOverrides();
        applyContentOverrides();
        renderContentEditor();
        await saveContentOverrides();
      }

      function openInlineContentEditor(element) {
        activeInlineTarget = contentTargets.find((target) => target.key === element.dataset.cmsKey);
        if (!activeInlineTarget) {
          const descendant = element.querySelector('[data-cms-key]:not([data-cms-container])');
          if (descendant) activeInlineTarget = contentTargets.find((target) => target.key === descendant.dataset.cmsKey);
        }
        if (!activeInlineTarget) return;
        SQA.$('#cms-inline-bn').value = contentValue('bn', activeInlineTarget);
        SQA.$('#cms-inline-en').value = contentValue('en', activeInlineTarget);
        SQA.$('#cms-inline-dialog').showModal();
      }

      function initContentCms() {
        if (contentCmsInitialized) return;
        contentCmsInitialized = true;
        ensureContentTargets();
        applyContentOverrides();
        const cache = readLocalContentOverrides();
        if (localCacheError && !localCacheErrorReported) {
          localCacheErrorReported = true;
          SQA.showToast(`Could not read the local content cache: ${localCacheError.message}`, 'error');
        }
        SQA.$('#cms-section-selector').addEventListener('change', renderContentEditor);
        SQA.$('#toggle-inline-cms').addEventListener('click', () => setInlineEditMode(!inlineEditEnabled));
        SQA.$('#cms-save-all').addEventListener('click', saveContentOverrides);
        SQA.$('#cms-export-config').addEventListener('click', exportContentConfig);
        SQA.$('#cms-reset-text').addEventListener('click', resetContentOverrides);
        SQA.$('#cms-inline-cancel').addEventListener('click', () => SQA.$('#cms-inline-dialog').close());
        SQA.$('#cms-inline-form').addEventListener('submit', (event) => {
          event.preventDefault();
          if (!canManageContent() || !activeInlineTarget) return;
          contentOverrides.bn[activeInlineTarget.key] = SQA.$('#cms-inline-bn').value;
          contentOverrides.en[activeInlineTarget.key] = SQA.$('#cms-inline-en').value;
          applyContentOverrides();
          renderContentEditor();
          SQA.$('#cms-inline-dialog').close();
        });
        document.addEventListener('click', (event) => {
          if (!inlineEditEnabled || !(event.target instanceof Element)) return;
          const target = event.target.closest('[data-cms-key]');
          if (!target || target.closest('#panel-admin, #cms-inline-dialog') || !canManageContent()) return;
          event.preventDefault();
          event.stopPropagation();
          openInlineContentEditor(target);
        }, true);
        renderContentEditor();
        initButtonStyleCms();
        updateContentCmsAccess();
        if (!cache && localCacheError && !localCacheErrorReported) {
          localCacheErrorReported = true;
          SQA.showToast(`Could not read the local content cache: ${localCacheError.message}`, 'error');
        }
      }

      function loadFetchedContentOverrides(value) {
        const remote = normalizeContentOverrides(value);
        const cached = readLocalContentOverrides();
        contentOverrides = isLocalContentOverridePending() && cached ? cached : remote;
        siteSettings.content_overrides = contentOverrides;
        contentOverridesInitialized = true;
        if (!isLocalContentOverridePending()) {
          try { writeLocalContentOverrides(remote, false); }
          catch (error) {
            localCacheError = error;
            if (SQA.showToast) SQA.showToast(`Could not cache remote content overrides: ${error.message}`, 'error');
          }
        }
        applyContentOverrides();
      }
      const isAdminUser = () => SQA.activeAuthUser?.email?.toLowerCase() === SQA.config.ADMIN_EMAIL;
      function populateSiteSettingsForm() {
        SQA.$('#settings-default-theme').value = siteSettings.default_theme;
        SQA.$('#settings-lock-theme').checked = Boolean(siteSettings.lock_theme);
        SQA.$('#settings-default-language').value = siteSettings.default_language;
        SQA.$('#settings-lock-language').checked = Boolean(siteSettings.lock_language);
        SQA.$('#settings-guest-enabled').checked = siteSettings.guest_enabled !== false;
        SQA.$('#settings-guest-export').checked = siteSettings.allow_guest_export !== false;
        SQA.$('#settings-show-announcement').checked = Boolean(siteSettings.show_announcement);
        SQA.$('#settings-announcement-bn').value = siteSettings.announcement_bn || '';
        SQA.$('#settings-announcement-en').value = siteSettings.announcement_en || '';
        SQA.$$('.visible-tab-setting').forEach((input) => { input.checked = siteSettings.visible_tabs.includes(input.value); });
      }
      function setSiteAnnouncement() {
        const announcementText = SQA.activeLanguage === 'bn' ? siteSettings.announcement_bn : siteSettings.announcement_en;
        const shouldShow = siteSettings.show_announcement && Boolean(announcementText);
        const authAnnouncement = SQA.$('#site-announcement-auth');
        authAnnouncement.textContent = announcementText || '';
        authAnnouncement.hidden = !shouldShow;
        const appAnnouncement = SQA.$('#site-announcement-app');
        appAnnouncement.textContent = announcementText || '';
        appAnnouncement.hidden = Boolean(SQA.activeAuthUser) || !shouldShow;
      }
      function applySiteSettings(populateForm = false) {
        const admin = isAdminUser();
        const hasSavedLanguage = Boolean(SQA.readPreference('sqa-language', ''));
        const hasLanguageUrlOverride = SQA.pageParameters.has('lang');
        const allowed = new Set(Array.isArray(siteSettings.visible_tabs) ? siteSettings.visible_tabs : allVisibleTabs);
        SQA.$('#tab-admin').hidden = !admin;
        if (!admin) SQA.$('#panel-admin').hidden = true;
        SQA.tabs.forEach((tab) => {
          if (tab.id === 'tab-admin') return;
          const tabKey = tab.id.replace(/^tab-/, '');
          tab.hidden = !admin && !allowed.has(tabKey);
          if (tab.hidden) document.getElementById(tab.getAttribute('aria-controls')).hidden = true;
        });
        if (!SQA.getVisibleTabs().length) {
          SQA.tabs.forEach((tab) => { document.getElementById(tab.getAttribute('aria-controls')).hidden = true; });
        } else if (!admin && !SQA.getVisibleTabs().some((tab) => tab.getAttribute('aria-selected') === 'true')) {
          const firstTab = SQA.getVisibleTabs()[0];
          if (firstTab) SQA.activateTab(firstTab);
        }
        SQA.$('#guest-mode-button').hidden = siteSettings.guest_enabled === false;
        SQA.$('#export-test-report').disabled = SQA.isGuestMode && siteSettings.allow_guest_export === false;
        SQA.$('#export-test-report').title = SQA.$('#export-test-report').disabled
          ? (SQA.activeLanguage === 'bn' ? 'অ্যাডমিন গেস্ট CSV এক্সপোর্ট বন্ধ রেখেছেন।' : 'Guest CSV export is disabled by the administrator.')
          : '';
        const themeLocked = Boolean(siteSettings.lock_theme) && !admin;
        SQA.$$('.theme-picker, .theme-toggle').forEach((control) => { control.disabled = themeLocked; });
        SQA.$$('.language-toggle').forEach((control) => { control.disabled = Boolean(siteSettings.lock_language) && !admin; });
        if ((siteSettings.default_language === 'bn' || siteSettings.default_language === 'en') &&
            (siteSettings.lock_language || (!hasSavedLanguage && !hasLanguageUrlOverride))) {
          SQA.activeLanguage = siteSettings.default_language;
          SQA.translatePage();
          SQA.updateOrderTotal();
          SQA.updateSuiteSummary();
          SQA.renderChecklist();
          SQA.renderTestCases();
          SQA.renderRbacSimulator();
          SQA.renderRtm();
          SQA.renderAutomationLog();
          SQA.measureNavigationMetrics();
        }
        const hasLocalThemeOverride = SQA.hasTheme(SQA.readPreference('sqa-color-theme', ''));
        if (SQA.hasTheme(siteSettings.default_theme) && (siteSettings.lock_theme || !hasLocalThemeOverride)) {
          SQA.setColorTheme(siteSettings.default_theme, false);
        }
        setSiteAnnouncement();
        applyContentOverrides();
        applyButtonStyleOverrides();
        updateContentCmsAccess();
        if (populateForm) populateSiteSettingsForm();
      }
      async function fetchSiteSettings() {
        const response = await fetch(`${SQA.config.SUPABASE_URL}/rest/v1/sqa_site_settings?id=eq.1&select=*`, {
          headers: { apikey: SQA.config.SUPABASE_KEY, Authorization: `Bearer ${SQA.config.SUPABASE_KEY}` }
        });
        if (!response.ok) throw new Error(`Site settings request failed (HTTP ${response.status}).`);
        const rows = await response.json();
        if (!Array.isArray(rows) || !rows.length) throw new Error('Site settings row id=1 was not found or is not readable.');
        const row = rows[0];
        const visibleTabs = Array.isArray(row.visible_tabs)
          ? row.visible_tabs.filter((key) => allVisibleTabs.includes(key))
          : allVisibleTabs;
        siteSettings = {
          default_theme: SQA.hasTheme(row.default_theme) ? row.default_theme : 'arctic-light',
          lock_theme: row.lock_theme === true,
          default_language: row.default_language === 'en' ? 'en' : 'bn',
          lock_language: row.lock_language === true,
          guest_enabled: row.guest_enabled !== false,
          allow_guest_export: row.allow_guest_export !== false,
          visible_tabs: visibleTabs,
          content_overrides: emptyContentOverrides(),
          button_overrides: {},
          show_announcement: row.show_announcement === true,
          announcement_bn: typeof row.announcement_bn === 'string' ? row.announcement_bn : '',
          announcement_en: typeof row.announcement_en === 'string' ? row.announcement_en : ''
        };
        loadFetchedContentOverrides(row.content_overrides);
        loadFetchedButtonOverrides(row.button_overrides);
        applySiteSettings(true);
      }
      function initAdminForm() {
      SQA.$('#site-settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isAdminUser()) return;
        const values = {
          default_theme: SQA.$('#settings-default-theme').value,
          lock_theme: SQA.$('#settings-lock-theme').checked,
          default_language: SQA.$('#settings-default-language').value,
          lock_language: SQA.$('#settings-lock-language').checked,
          guest_enabled: SQA.$('#settings-guest-enabled').checked,
          allow_guest_export: SQA.$('#settings-guest-export').checked,
          visible_tabs: SQA.$$('.visible-tab-setting:checked').map((input) => input.value),
          show_announcement: SQA.$('#settings-show-announcement').checked,
          announcement_bn: SQA.$('#settings-announcement-bn').value.trim(),
          announcement_en: SQA.$('#settings-announcement-en').value.trim()
        };
        try {
          const { data, error } = await SQA.ensureDb().from('sqa_site_settings').update(values).eq('id', 1).select('id').single();
          if (error) throw error;
          if (data?.id !== 1) throw new Error('Site settings row id=1 was not updated.');
          siteSettings = { ...siteSettings, ...values };
          applySiteSettings(true);
          SQA.setLocalizedText(SQA.$('#site-settings-message'), 'সাইট সেটিংস সংরক্ষিত হয়েছে।', 'Site settings saved successfully.');
          SQA.showToast('সাইট সেটিংস সংরক্ষিত হয়েছে।', 'success', 'Site settings saved successfully.');
        } catch (error) {
          const messageBn = `সাইট সেটিংস সংরক্ষণ করা যায়নি: ${error.message}`;
          const messageEn = `Could not save site settings: ${error.message}`;
          SQA.setLocalizedText(SQA.$('#site-settings-message'), messageBn, messageEn);
          SQA.showToast(messageBn, 'error', messageEn);
        }
      });
      }

  SQA.admin = { allVisibleTabs, get siteSettings() { return siteSettings; }, set siteSettings(value) { siteSettings = value; }, isAdminUser, populateSiteSettingsForm, setSiteAnnouncement, applySiteSettings, fetchSiteSettings, initAdminForm, applyContentOverrides, initContentCms, refreshContentEditor, refreshButtonStyleEditor };
})();

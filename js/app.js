window.SQA = window.SQA || {};
const SQA = window.SQA;
function startApp() {
      "use strict";
      const SUPABASE_URL = SQA.config.SUPABASE_URL;
      const SUPABASE_KEY = SQA.config.SUPABASE_KEY;
      const AUTH_REDIRECT_URL = SQA.config.AUTH_REDIRECT_URL;
      const themes = SQA.config.THEMES;
      const translations = SQA.config.TRANSLATIONS;
      const rbacPermissions = SQA.config.RBAC_PERMISSIONS;
      const rbacLabels = SQA.config.RBAC_LABELS;
      const suiteCases = SQA.config.SUITE_CASES;
      const requirementMatrix = SQA.config.REQUIREMENT_MATRIX;
      const testCases = SQA.config.TEST_CASES;
      const $ = (selector) => document.querySelector(selector);
      const $$ = (selector) => Array.from(document.querySelectorAll(selector));
      SQA.$ = $;
      SQA.$$ = $$;
      let activeLanguage = 'bn';
      const t = (key) => activeLanguage === 'bn' ? key : (translations[key] || key);
      const dynamicTranslations = Object.entries(translations)
        .filter(([bengali]) => bengali)
        .sort(([a], [b]) => b.length - a.length);
      const englishTranslations = Object.entries(translations)
        .filter(([, english]) => english)
        .sort(([, a], [, b]) => b.length - a.length);
      const englishToBengali = new Map(englishTranslations.map(([bengali, english]) => [english, bengali]));
      const dynamicTranslationPattern = new RegExp(dynamicTranslations.map(([text]) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
      const englishTranslationPattern = new RegExp(englishTranslations.map(([, text]) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
      const translateDynamicText = (value) => String(value).replace(dynamicTranslationPattern, (match) => translations[match] || match);
      const translateToBengali = (value) => String(value).replace(englishTranslationPattern, (match) => englishToBengali.get(match) || match);
      const toBengaliDigits = (value) => String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)]);
      const toWesternDigits = (value) => String(value).replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
      function setLocalizedText(element, bengaliText, englishText = null) {
        const bengali = englishText !== null
          ? toBengaliDigits(bengaliText)
          : toBengaliDigits(translateToBengali(bengaliText));
        element.dataset.bn = bengali;
        element.dataset.en = englishText !== null
          ? toWesternDigits(englishText)
          : toWesternDigits(translateDynamicText(bengali));
        element.textContent = activeLanguage === 'bn' ? element.dataset.bn : element.dataset.en;
      }
      SQA.setLocalizedText = setLocalizedText;
      function translatePage() {
        $$('option[data-bn][data-en]').forEach((option) => {
          option.textContent = activeLanguage === 'bn' ? option.dataset.bn : option.dataset.en;
        });
        $$('[data-bn][data-en]:not(option)').forEach((element) => {
          element.textContent = activeLanguage === 'bn' ? element.dataset.bn : element.dataset.en;
        });
        ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
          $$(`[data-bn-${attribute}][data-en-${attribute}]`).forEach((element) => {
            const datasetKey = attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            const keySuffix = datasetKey[0].toUpperCase() + datasetKey.slice(1);
            element.setAttribute(attribute, activeLanguage === 'bn'
              ? element.dataset[`bn${keySuffix}`]
              : element.dataset[`en${keySuffix}`]);
          });
        });
        document.documentElement.lang = activeLanguage;
        document.title = t('SQA এ টু জেড লাইভ টেস্টিং হাব (Complete SQA Enterprise Sandbox)');
        $$('.language-toggle').forEach((button) => button.setAttribute('aria-label', activeLanguage === 'bn' ? 'Switch language to English' : 'বাংলা ভাষায় পরিবর্তন করুন'));
        updateThemeLabel();
        renderSharePreview();
        updateShareLink();
        if (!$('#share-panel').hidden) renderShareQRCode();
        SQA.admin.applyContentOverrides();
        SQA.admin.refreshContentEditor();
        SQA.admin.refreshButtonStyleEditor();
      }
      function readPreference(key, fallback) {
        try { return localStorage.getItem(key) || fallback; }
        catch { return fallback; }
      }
      function writePreference(key, value) {
        try { localStorage.setItem(key, value); }
        catch { showToast(activeLanguage === 'bn' ? 'এই ব্রাউজারে পছন্দ সংরক্ষণ করা যায়নি।' : 'Could not save this preference in the browser.', 'error'); }
      }
      const pageParameters = new URLSearchParams(window.location.search);
      const requestedLanguage = pageParameters.get('lang');
      activeLanguage = requestedLanguage === 'en' || requestedLanguage === 'bn'
        ? requestedLanguage
        : readPreference('sqa-language', 'bn') === 'en' ? 'en' : 'bn';
      const requestedTheme = pageParameters.get('theme');
      const requestedAppearance = pageParameters.get('mode');
      const storedTheme = readPreference('sqa-color-theme', 'arctic-light');
      const hasTheme = (name) => Object.prototype.hasOwnProperty.call(themes, name);
      let activeTheme = hasTheme(requestedTheme) ? requestedTheme : hasTheme(storedTheme) ? storedTheme : 'aurora';
      function updateThemeLabel() {
        const themeLabel = activeLanguage === 'bn'
          ? (document.body.classList.contains('light-mode') ? '🌙 রাত মোড' : '☀️ দিন মোড')
          : (document.body.classList.contains('light-mode') ? '🌙 Dark mode' : '☀️ Light mode');
        const languageLabel = activeLanguage === 'bn' ? 'English' : 'বাংলা';
        $$('.theme-toggle').forEach((button) => {
          if (button.textContent !== themeLabel) button.textContent = themeLabel;
        });
        $$('.language-toggle').forEach((button) => {
          if (button.textContent !== languageLabel) button.textContent = languageLabel;
        });
      }
      function setTheme(theme, persist = true) {
        const light = theme === 'light';
        document.body.classList.toggle('light-mode', light);
        document.documentElement.style.colorScheme = light ? 'light' : 'dark';
        $$('.theme-toggle').forEach((button) => button.setAttribute('aria-pressed', String(light)));
        updateThemeLabel();
        if (persist) writePreference('sqa-theme', light ? 'light' : 'dark');
      }
      function setColorTheme(theme, persist = true, appearance = themes[theme]?.mode) {
        if (!hasTheme(theme)) return;
        activeTheme = theme;
        document.body.dataset.theme = theme;
        const selectedAppearance = appearance === 'light' ? 'light' : 'dark';
        setTheme(selectedAppearance, persist);
        $$('.theme-picker').forEach((select) => { select.value = theme; });
        if (persist) writePreference('sqa-color-theme', theme);
        renderSharePreview();
        updateShareLink();
        if (!$('#share-panel').hidden) renderShareQRCode();
      }
      const initialAppearance = requestedAppearance === 'light' || requestedAppearance === 'dark'
        ? requestedAppearance
        : (hasTheme(requestedTheme) ? themes[requestedTheme].mode : null) ||
          (readPreference('sqa-theme', themes[activeTheme].mode) === 'light' ? 'light' : 'dark');
      setColorTheme(activeTheme, false, initialAppearance);
      $$('.theme-toggle').forEach((button) => button.addEventListener('click', () => {
        setTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
        updateShareLink();
        if (!$('#share-panel').hidden) renderShareQRCode();
      }));
      $$('.theme-picker').forEach((select) => select.addEventListener('change', () => setColorTheme(select.value)));
      $$('.language-toggle').forEach((button) => button.addEventListener('click', () => {
        activeLanguage = activeLanguage === 'bn' ? 'en' : 'bn';
        writePreference('sqa-language', activeLanguage);
        translatePage();
        updateOrderTotal();
        updateSuiteSummary();
        renderChecklist();
        renderTestCases();
        renderRbacSimulator();
        renderRtm();
        renderAutomationLog();
        setSiteAnnouncement();
        measureNavigationMetrics();
        if (activeAuthUser || isGuestMode) {
          loadStats();
          refreshDatabase();
        }
      }));
      translatePage();
      const bnNumber = (number) => {
        const formatted = new Intl.NumberFormat(activeLanguage === 'bn' ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2, useGrouping: true }).format(Number(number) || 0);
        return activeLanguage === 'bn' ? toBengaliDigits(formatted) : toWesternDigits(formatted);
      };
      SQA.bnNumber = bnNumber;
      const money = (number) => `৳${bnNumber(number)}`;
      const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      const playwrightSnippet = [
        "const { test, expect } = require('@playwright/test');",
        '',
        "test('login, guest mode, and theme toggle', async ({ page }) => {",
        "  await page.goto('https://shoyebrabbi.github.io/SQA-live-testing-hub/');",
        "  await expect(page.locator('#auth-screen')).toBeVisible();",
        "  await page.locator('#auth-screen .language-toggle').click();",
        "  await page.getByRole('button', { name: /Test Without Login/i }).click();",
        "  await expect(page.locator('#app-shell')).toBeVisible();",
        "  await expect(page.locator('#guest-mode-banner')).toBeVisible();",
        "  const wasLight = await page.locator('body').evaluate((body) => body.classList.contains('light-mode'));",
        "  await page.locator('#app-shell .theme-toggle').click();",
        "  await expect.poll(() => page.locator('body').evaluate((body) => body.classList.contains('light-mode'))).toBe(!wasLight);",
        '});'
      ].join('\n');
      const restRequestSnippet = [
        'curl --request GET \\',
        "  --url 'https://YOUR_PROJECT.supabase.co/rest/v1/sqa_users?select=id,full_name,email,age,status' \\",
        "  --header 'apikey: YOUR_SUPABASE_ANON_KEY' \\",
        "  --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \\",
        "  --header 'Accept: application/json'",
        '',
        'Postman: use GET with the same URL and headers.'
      ].join('\n');
      setLocalizedText($('#playwright-snippet'), playwrightSnippet);
      setLocalizedText($('#rest-snippet'), restRequestSnippet);
      function renderSharePreview() {
        const theme = themes[activeTheme];
        if (!theme) return;
        const label = $('#share-preview-theme');
        label.dataset.bn = theme.bn;
        label.dataset.en = theme.en;
        label.textContent = activeLanguage === 'bn' ? theme.bn : theme.en;
      }
      function updateShareLink() {
        const localHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname) || window.location.protocol === 'file:';
        const url = new URL(localHost ? AUTH_REDIRECT_URL : window.location.href);
        url.search = '';
        url.hash = '';
        url.username = '';
        url.password = '';
        url.searchParams.set('theme', activeTheme);
        url.searchParams.set('lang', activeLanguage);
        url.searchParams.set('mode', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        $('#share-url').value = url.toString();
        return url.toString();
      }
      function renderShareQRCode() {
        const image = $('#share-qr');
        const placeholder = $('#share-qr-placeholder');
        image.hidden = true;
        placeholder.hidden = false;
        setLocalizedText(placeholder, 'QR তৈরি হচ্ছে…');
        image.onload = () => {
          image.hidden = false;
          placeholder.hidden = true;
        };
        image.onerror = () => {
          image.hidden = true;
          placeholder.hidden = false;
          setLocalizedText(placeholder, 'QR কোড লোড করা যায়নি। লিংকটি কপি করে শেয়ার করুন।');
        };
        image.referrerPolicy = 'no-referrer';
        image.src = `https://api.qrserver.com/v1/create-qr-code/?size=192x192&format=png&data=${encodeURIComponent(updateShareLink())}`;
      }
      function setShareStatus(message, isError = false) {
        const status = $('#share-status');
        setLocalizedText(status, message);
        status.classList.toggle('text-rose-300', isError);
        status.classList.toggle('text-slate-300', !isError);
      }
      async function copyShareLink() {
        const link = updateShareLink();
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(link);
          } else {
            const temporaryInput = document.createElement('textarea');
            temporaryInput.value = link;
            temporaryInput.setAttribute('readonly', '');
            temporaryInput.style.position = 'fixed';
            temporaryInput.style.opacity = '0';
            document.body.appendChild(temporaryInput);
            try {
              temporaryInput.select();
              const copied = document.execCommand('copy');
              if (!copied) throw new Error('Clipboard access is unavailable.');
            } finally {
              temporaryInput.remove();
            }
          }
          setShareStatus('শেয়ার লিংক কপি হয়েছে।');
        } catch (error) {
          $('#share-url').focus();
          $('#share-url').select();
          setShareStatus(activeLanguage === 'bn'
            ? `লিংক কপি করা যায়নি: ${error.message}`
            : `Could not copy the link: ${error.message}`, true);
        }
      }
      async function shareLink() {
        const link = updateShareLink();
        if (!navigator.share) {
          await copyShareLink();
          return;
        }
        try {
          await navigator.share({
            title: activeLanguage === 'bn' ? 'SQA এ টু জেড লাইভ টেস্টিং হাব' : 'SQA A to Z Live Testing Hub',
            text: activeLanguage === 'bn' ? 'আমার নির্বাচিত থিমসহ SQA Testing Hub দেখুন।' : 'Explore the SQA Testing Hub with my selected theme.',
            url: link
          });
          setShareStatus('শেয়ার মেনু খোলা হয়েছে।');
        } catch (error) {
          if (error?.name !== 'AbortError') {
            setShareStatus(activeLanguage === 'bn'
              ? `লিংক শেয়ার করা যায়নি: ${error.message}`
              : `Could not share the link: ${error.message}`, true);
          }
        }
      }
      function downloadShareCard() {
        const theme = themes[activeTheme];
        const isLight = document.body.classList.contains('light-mode');
        const title = activeLanguage === 'bn' ? 'SQA এ টু জেড' : 'SQA A to Z';
        const subtitle = activeLanguage === 'bn'
          ? 'পরীক্ষা করুন। শিখুন। উন্নত করুন।'
          : 'Test. Learn. Improve.';
        const themeName = activeLanguage === 'bn' ? theme.bn : theme.en;
        const link = updateShareLink();
        const accent = getComputedStyle(document.body).getPropertyValue('--theme-accent').trim() || '#45e0b0';
        const canvasColor = {
          aurora: { light: '#f2fbf8', dark: '#050d1a' },
          'midnight-violet': { light: '#f7f4ff', dark: '#0b0718' },
          'arctic-light': { light: '#f6fbff', dark: '#06131f' }
        }[activeTheme][isLight ? 'light' : 'dark'];
        const ink = isLight ? '#0f172a' : '#f8fafc';
        const mutedInk = isLight ? '#475569' : '#cbd5e1';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" rx="36" fill="${canvasColor}"/><circle cx="1010" cy="80" r="290" fill="${accent}" opacity=".13"/><path d="M80 80h1040v2H80z" fill="${accent}" opacity=".65"/><text x="90" y="160" fill="${accent}" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5">SQA · LIVE TESTING HUB</text><text x="90" y="310" fill="${ink}" font-family="Arial,sans-serif" font-size="82" font-weight="800">${escapeHTML(title)}</text><text x="94" y="375" fill="${mutedInk}" font-family="Arial,sans-serif" font-size="32">${escapeHTML(subtitle)}</text><text x="94" y="470" fill="${accent}" font-family="Arial,sans-serif" font-size="24">${escapeHTML(themeName)}</text><text x="94" y="555" fill="${mutedInk}" font-family="Arial,sans-serif" font-size="20">${escapeHTML(link.slice(0, 90))}</text></svg>`;
        try {
          const downloadUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = 'sqa-testing-hub-share-card.svg';
          anchor.click();
          window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
          setShareStatus('প্রিভিউ কার্ড ডাউনলোড হয়েছে।');
        } catch (error) {
          setShareStatus(activeLanguage === 'bn'
            ? `প্রিভিউ কার্ড ডাউনলোড করা যায়নি: ${error.message}`
            : `Could not download the preview card: ${error.message}`, true);
        }
      }
      function closeSharePanel() {
        const panel = $('#share-panel');
        if (panel.hidden) return;
        panel.hidden = true;
        $('#share-toggle').setAttribute('aria-expanded', 'false');
      }
      $('#close-share-panel').addEventListener('click', () => {
        closeSharePanel();
        $('#share-toggle').focus();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !$('#share-panel').hidden) {
          closeSharePanel();
          $('#share-toggle').focus();
        }
      });
      $('#share-toggle').addEventListener('click', () => {
        const panel = $('#share-panel');
        panel.hidden = !panel.hidden;
        $('#share-toggle').setAttribute('aria-expanded', String(!panel.hidden));
        if (!panel.hidden) renderShareQRCode();
      });
      $('#copy-share-link').addEventListener('click', copyShareLink);
      $('#native-share-link').addEventListener('click', shareLink);
      $('#download-share-card').addEventListener('click', downloadShareCard);
      const showToast = (message, type = 'success', englishMessage = null) => {
        const toast = document.createElement('div');
        toast.className = `toast max-w-sm rounded-xl border px-4 py-3 text-sm shadow-xl ${type === 'error' ? 'border-rose-400/30 bg-rose-950 text-rose-100' : 'border-emerald-400/30 bg-emerald-950 text-emerald-100'}`;
        setLocalizedText(toast, message, englishMessage);
        $('#toast-container').appendChild(toast);
        window.setTimeout(() => toast.remove(), 4500);
      };
      SQA.showToast = showToast;
      const setConnection = (connected, text) => {
        $('#connection-dot').className = `h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`;
        const connectionText = $('#connection-label span');
        const englishText = translations[text] || translations[text.normalize('NFC')] || translations[text.normalize('NFD')] || text;
        setLocalizedText(connectionText, text, englishText);
      };
      let db = null;
      const dbReady = new Promise((resolve, reject) => {
        const makeClient = () => {
          if (!window.supabase?.createClient) return reject(new Error('Supabase লাইব্রেরি লোড হয়নি।'));
          try {
            db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
              auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
            });
            resolve(db);
          } catch (error) {
            reject(error);
          }
        };
        if (window.supabase?.createClient) return makeClient();
        const loader = document.createElement('script');
        loader.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        loader.async = true;
        const loadTimeout = window.setTimeout(() => reject(new Error('Supabase লাইব্রেরি লোড হতে সময়সীমা অতিক্রম করেছে।')), 12000);
        loader.onload = () => { window.clearTimeout(loadTimeout); makeClient(); };
        loader.onerror = () => {
          window.clearTimeout(loadTimeout);
          reject(new Error('Supabase লাইব্রেরি লোড হয়নি।'));
        };
        document.head.appendChild(loader);
      });
      dbReady.catch(() => {
        setConnection(false, 'শোয়েবের QA ল্যাব · সংযোগ ব্যর্থ');
        setLocalizedText($('#auth-message'), activeLanguage === 'bn'
          ? 'Supabase Auth লাইব্রেরি লোড হয়নি। ইন্টারনেট সংযোগ যাচাই করে পৃষ্ঠাটি আবার খুলুন।'
          : 'Supabase Auth could not load. Check your internet connection and reopen the page.');
      });

      const dbError = (error) => {
        const message = error?.message || 'অজানা ডেটাবেস ত্রুটি';
        setConnection(false, 'শোয়েবের QA ল্যাব · সংযোগ সমস্যা');
        return translateDynamicText(`ডেটাবেস ত্রুটি: ${message}। টেবিলের স্কিমা, নেটওয়ার্ক এবং Supabase Row Level Security (RLS) নীতি যাচাই করুন।`);
      };
      const ensureDb = () => {
        if (!db) throw new Error('Supabase সংযোগ প্রস্তুত নয়।');
        return db;
      };
      async function getAuthHeaders() {
        const client = await dbReady;
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${data.session?.access_token || SUPABASE_KEY}`
        };
      }
      const loadStats = async () => {
        if (isGuestMode) {
          setLocalizedText($('#stat-users'), bnNumber(loadedUsers.length));
          setLocalizedText($('#stat-orders'), bnNumber(loadedOrders.length));
          setLocalizedText($('#stat-bugs'), bnNumber(loadedBugReports.filter((bug) => ['Open', 'In Progress'].includes(bug.status)).length));
          setConnection(true, 'শোয়েবের QA ল্যাব · গেস্ট ডেমো');
          return;
        }
        if (!db) return;
        try {
          const [users, orders, bugs] = await Promise.all([
            db.from('sqa_users').select('id', { count: 'exact', head: true }),
            db.from('sqa_orders').select('order_id', { count: 'exact', head: true }),
            db.from('sqa_bug_reports').select('bug_id', { count: 'exact', head: true }).in('status', ['Open', 'In Progress'])
          ]);
          for (const result of [users, orders, bugs]) if (result.error) throw result.error;
          setLocalizedText($('#stat-users'), bnNumber(users.count));
          setLocalizedText($('#stat-orders'), bnNumber(orders.count));
          setLocalizedText($('#stat-bugs'), bnNumber(bugs.count));
          setConnection(true, 'শোয়েবের QA ল্যাব · লাইভ');
        } catch (error) {
          setConnection(false, 'শোয়েবের QA ল্যাব · সংযোগ সমস্যা');
        }
      };

      SQA.loadStats = loadStats;

      // Accessible tab navigation with arrow-key support.
      const tabs = $$('.tab-button');
      const getVisibleTabs = () => tabs.filter((tab) => !tab.hidden);
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => activateTab(tab));
        tab.addEventListener('keydown', (event) => {
          if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const visibleTabs = getVisibleTabs();
          const index = visibleTabs.indexOf(tab);
          if (index < 0 || !visibleTabs.length) return;
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length - 1
            : (index + (event.key === 'ArrowRight' ? 1 : -1) + visibleTabs.length) % visibleTabs.length;
          activateTab(visibleTabs[next]);
          visibleTabs[next].focus();
        });
      });
      function activateTab(selectedTab) {
        tabs.forEach((tab, i) => {
          const active = tab === selectedTab;
          tab.setAttribute('aria-selected', String(active));
          tab.tabIndex = active ? 0 : -1;
          document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
        });
      }
      $('.fill-buggy-sample').addEventListener('click', () => {
        $('#reg-name').value = 'QA Sample';
        $('#reg-email').value = `qa-${Date.now()}@example.test`;
        $('#reg-password').value = 'Sample123';
        $('#reg-age').value = '17';
        activateTab($('#tab-registration'));
      });
      $('#negative-qty-sample').addEventListener('click', () => {
        $('#order-quantity').value = '-1';
        updateOrderTotal();
      });
      $$('.log-bug-shortcut').forEach((button) => button.addEventListener('click', () => {
        const requirementId = button.dataset.module.match(/^REQ-\d+/)?.[0] || '';
        $('#bug-requirement').value = requirementId;
        $('#bug-module').value = button.dataset.module.replace(/^REQ-\d+\s*·\s*/, '');
        $('#bug-title').value = activeLanguage === 'bn' ? button.dataset.bnTitle : button.dataset.title;
        $('#bug-severity').value = button.dataset.severity;
        $('#bug-steps').value = activeLanguage === 'bn' ? button.dataset.bnSteps : button.dataset.steps;
        $('#bug-expected').value = activeLanguage === 'bn' ? button.dataset.bnExpected : button.dataset.expected;
        $('#bug-actual').value = activeLanguage === 'bn' ? button.dataset.bnActual : button.dataset.actual;
        activateTab($('#tab-bugs'));
        $('#bug-title').focus();
      }));

      function isRegistrationAgeValid(age) {
        return Number.isInteger(age) && age >= 17 && age <= 60;
      }
      $('#registration-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = $('#reg-name').value.trim();
        const email = $('#reg-email').value.trim();
        const password = $('#reg-password').value;
        const age = Number($('#reg-age').value);
        if (password.length < 6 || password.length > 12) return showToast('পাসওয়ার্ড ৬ থেকে ১২ অক্ষরের মধ্যে হতে হবে।', 'error');
        // Intentional test defect: age 17 is allowed through this client-side check.
        if (!isRegistrationAgeValid(age)) return showToast('বয়স ১৭ থেকে ৬০-এর মধ্যে দিন।', 'error');
        try {
          const userPayload = {
            id: createLocalId(),
            full_name: name,
            email,
            password: `AUTH_MANAGED_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            age,
            status: $('#reg-role').value,
            created_at: new Date().toISOString()
          };
          let savedUser = userPayload;
          if (isGuestMode) {
            const nextUsers = [userPayload, ...loadedUsers];
            saveGuestData('users', nextUsers);
            loadedUsers = nextUsers;
          } else {
            const { data, error } = await ensureDb().from('sqa_users').insert({
              full_name: name, email, password: userPayload.password, age, status: userPayload.status
            }).select('id, full_name, email, age').single();
            if (error) throw error;
            savedUser = data;
          }
          setLocalizedText(
            $('#registration-result'),
            `ব্যবহারকারী সংরক্ষিত হয়েছে। আইডি: ${savedUser.id} · ভূমিকা/status: ${$('#reg-role').value}`,
            `User saved. ID: ${savedUser.id} · Role/status: ${$('#reg-role').value}`
          );
          showToast('ব্যবহারকারী সফলভাবে সংরক্ষিত হয়েছে।', 'success', 'User saved successfully.');
          await refreshDatabase();
        } catch (error) {
          const message = isGuestMode ? error.message : dbError(error);
          setLocalizedText($('#registration-result'), message);
          showToast(message, 'error');
        }
      });
      // Intentional test defect: the reset button deliberately leaves form values unchanged.
      $('#reset-registration').addEventListener('click', () => {
        setLocalizedText($('#registration-result'), 'ইচ্ছাকৃত বাগ: রিসেট বোতাম চাপলেও ফর্মের তথ্য অপরিবর্তিত রয়েছে।');
      });
      function renderRbacSimulator() {
        const role = $('#rbac-role').value;
        const allowed = activeLanguage === 'bn' ? 'অনুমোদিত' : 'Allowed';
        const denied = activeLanguage === 'bn' ? 'অনুমোদিত নয়' : 'Not allowed';
        $('#rbac-result').innerHTML = rbacPermissions.map(([permission, roles]) => {
          const can = roles.includes(role);
          const label = activeLanguage === 'bn' ? rbacLabels[permission] : permission;
          return `<div class="flex items-start justify-between gap-3"><span>${escapeHTML(label)}</span><b class="${can ? 'text-emerald-300' : 'text-rose-300'}">${can ? '✓' : '×'} ${can ? allowed : denied}</b></div>`;
        }).join('');
      }
      $('#rbac-role').addEventListener('change', renderRbacSimulator);
      renderRbacSimulator();

      const product = () => $('#order-product').selectedOptions[0];
      function calculateOrderAmounts(price, quantity, coupon) {
        const subtotal = Number(price) * Number(quantity);
        const discount = String(coupon).trim().toUpperCase() === 'SAVE20' ? subtotal * .2 : 0;
        const tax = (subtotal - discount) * .1;
        return { subtotal, discount, tax, total: subtotal - discount + tax };
      }
      function updateOrderTotal() {
        const quantity = Number($('#order-quantity').value) || 0;
        const totals = calculateOrderAmounts(product().dataset.price, quantity, $('#order-coupon').value);
        $('#subtotal').textContent = money(totals.subtotal);
        $('#discount').textContent = money(totals.discount);
        $('#tax').textContent = money(totals.tax);
        $('#total').textContent = money(totals.total);
        return totals.total;
      }
      ['#order-quantity', '#order-product', '#order-coupon'].forEach((selector) => $(selector).addEventListener('input', updateOrderTotal));
      $('#qty-minus').addEventListener('click', () => { $('#order-quantity').value = Number($('#order-quantity').value || 0) - 1; updateOrderTotal(); });
      $('#qty-plus').addEventListener('click', () => { $('#order-quantity').value = Number($('#order-quantity').value || 0) + 1; updateOrderTotal(); });
      $('#order-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          const quantity = Number($('#order-quantity').value);
          const order = {
            order_id: createLocalId(),
            user_id: $('#order-user-id').value.trim(),
            product_name: product().value,
            quantity,
            total_price: updateOrderTotal(),
            order_status: 'Pending',
            ordered_at: new Date().toISOString()
          };
          if (isGuestMode) {
            if (!loadedUsers.some((user) => String(user.id) === String(order.user_id))) throw new Error(activeLanguage === 'bn' ? 'এই ID-এর ব্যবহারকারী guest data-তে নেই।' : 'No guest user has this ID.');
            const nextOrders = [order, ...loadedOrders];
            saveGuestData('orders', nextOrders);
            loadedOrders = nextOrders;
          } else {
            const { error } = await ensureDb().from('sqa_orders').insert({
              user_id: order.user_id,
              product_name: order.product_name,
              quantity: order.quantity,
              total_price: order.total_price,
              order_status: order.order_status
            });
            if (error) throw error;
          }
          setLocalizedText($('#order-result'), 'অর্ডারটি ডেটাবেসে সংরক্ষিত হয়েছে।', 'The order was saved to the database.');
          showToast('অর্ডার সংরক্ষিত হয়েছে।', 'success', 'Order saved.');
          await refreshDatabase();
        } catch (error) {
          const message = isGuestMode ? error.message : dbError(error);
          setLocalizedText($('#order-result'), message);
          showToast(message, 'error');
        }
      });
      updateOrderTotal();

      $$('.viewport-toggle').forEach((button) => button.addEventListener('click', () => {
        const mobile = button.dataset.viewport === 'mobile';
        $('#audit-frame').classList.toggle('max-w-sm', mobile);
        $('#audit-frame').classList.toggle('max-w-full', !mobile);
        setLocalizedText($('#viewport-label'), mobile ? 'মোবাইল' : 'ডেস্কটপ');
      }));

      const suiteResults = new Map();
      SQA.suiteResults = suiteResults;
      function renderChecklist() {
        $('#checklist').innerHTML = suiteCases.map(([name, type], index) => `<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div><p class="text-sm font-medium">${escapeHTML(t(name))}</p><p class="mt-1 text-xs text-slate-500">${escapeHTML(t(type))} · ${escapeHTML(t('কেস '))}${bnNumber(index + 1)}</p></div><div class="flex gap-2"><button class="suite-toggle rounded-lg border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200" data-index="${index}" data-result="pass">${escapeHTML(t('পাশ'))}</button><button class="suite-toggle rounded-lg border border-rose-400/30 px-3 py-2 text-xs text-rose-200" data-index="${index}" data-result="fail">${escapeHTML(t('ব্যর্থ'))}</button></div></div>`).join('');
      }
      renderChecklist();
      $('#checklist').addEventListener('click', (event) => {
        const button = event.target.closest('.suite-toggle');
        if (!button) return;
        suiteResults.set(Number(button.dataset.index), button.dataset.result);
        persistGuestProgress();
        updateSuiteSummary();
      });
      function updateSuiteSummary() {
        const total = suiteResults.size;
        const passed = [...suiteResults.values()].filter((value) => value === 'pass').length;
        const failed = total - passed;
        const passRate = total ? Math.round((passed / total) * 100) : 0;
        const failRate = total ? Math.round((failed / total) * 100) : 0;
        setLocalizedText($('#pass-rate'), `${bnNumber(passRate)}%`);
        setLocalizedText($('#fail-rate'), `${bnNumber(failRate)}%`);
        setLocalizedText($('#suite-summary'), total ? `${bnNumber(total)}টির মধ্যে ${bnNumber(passed)}টি পাশ এবং ${bnNumber(failed)}টি ব্যর্থ। ${total < suiteCases.length ? `আরও ${bnNumber(suiteCases.length - total)}টি পরীক্ষার ফল বাকি।` : 'সব পরীক্ষার ফল নথিভুক্ত হয়েছে।'}` : 'এখনো কোনো পরীক্ষা সম্পন্ন হয়নি।');
        setLocalizedText($('#stat-checks'), `${bnNumber(total)} / ${bnNumber(suiteCases.length)} সম্পন্ন`);
      }
      updateSuiteSummary();
      $('#reset-suite').addEventListener('click', () => { suiteResults.clear(); persistGuestProgress(); updateSuiteSummary(); });

      function restUrl(resource) { return `${SUPABASE_URL}/rest/v1/${encodeURIComponent(resource)}`; }
      let lastApiResponse = null;
      let lastApiStatus = null;
      let lastApiResource = null;
      function displayApi(status, latency, body, responseStatus = null, resource = $('#api-resource').value) {
        lastApiResponse = body;
        lastApiStatus = responseStatus;
        lastApiResource = resource;
        setLocalizedText($('#api-status'), status);
        setLocalizedText($('#api-latency'), `${bnNumber(latency)} ms`);
        $('#api-output').textContent = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      }
      function validateApiResponseSchema() {
        const result = $('#api-schema-result');
        result.classList.remove('text-amber-300', 'text-rose-300', 'text-emerald-300');
        if (lastApiStatus !== 200 || lastApiResponse === null) {
          setLocalizedText(result, activeLanguage === 'bn'
            ? 'প্রথমে API ট্যাবে সফল GET (HTTP 200) চালান।'
            : 'Run a successful GET (HTTP 200) request first.');
          result.classList.add('text-amber-300');
          return;
        }
        let body = lastApiResponse;
        if (typeof body === 'string') {
          try { body = JSON.parse(body); }
          catch {
            setLocalizedText(result, activeLanguage === 'bn' ? 'প্রতিক্রিয়াটি বৈধ JSON নয়।' : 'The response is not valid JSON.');
            result.classList.add('text-rose-300');
            return;
          }
        }
        const records = Array.isArray(body) ? body : [body];
        if (!records.length) {
          setLocalizedText(result, activeLanguage === 'bn'
            ? 'কোনো রেকর্ড ফেরেনি—স্কিমা যাচাই করার মতো ডেটা নেই।'
            : 'No records returned. There is no data to validate against the schema.');
          result.classList.add('text-amber-300');
          return;
        }
        const isIdentifier = (value) => (typeof value === 'number' && Number.isFinite(value)) ||
          (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
        const failures = [];
        records.forEach((record, index) => {
          const label = `row ${index + 1}`;
          if (!record || typeof record !== 'object' || Array.isArray(record)) {
            failures.push(`${label}: expected an object`);
            return;
          }
          const required = lastApiResource === 'sqa_users'
            ? ['id', 'full_name', 'email', 'age', 'status']
            : ['order_id', 'user_id', 'product_name', 'quantity', 'total_price', 'order_status'];
          required.forEach((field) => {
            if (record[field] === null || record[field] === undefined) failures.push(`${label}: ${field} is null or missing`);
          });
          const idField = lastApiResource === 'sqa_users' ? 'id' : 'order_id';
          if (record[idField] != null && !isIdentifier(record[idField])) failures.push(`${label}: ${idField} must be a number or UUID`);
          if (lastApiResource === 'sqa_users' && record.email != null &&
            (typeof record.email !== 'string' || !record.email.trim())) failures.push(`${label}: email must be a non-empty string`);
        });
        if (failures.length) {
          setLocalizedText(result, activeLanguage === 'bn'
            ? `স্কিমা যাচাই ব্যর্থ: ${failures.slice(0, 4).map((failure) => failure.charAt(0).toUpperCase() + failure.slice(1)).join('। ')}${failures.length > 4 ? `। আরও ${failures.length - 4}টি ত্রুটি` : ''}`
            : `Schema validation failed: ${failures.slice(0, 4).map((failure) => failure.charAt(0).toUpperCase() + failure.slice(1)).join('. ')}${failures.length > 4 ? `. And ${failures.length - 4} more` : ''}`);
          result.classList.add('text-rose-300');
        } else {
          setLocalizedText(result, activeLanguage === 'bn'
            ? `${bnNumber(records.length)}টি রেকর্ডের JSON schema যাচাই সফল হয়েছে।`
            : `JSON schema validated for ${bnNumber(records.length)} record(s).`);
          result.classList.add('text-emerald-300');
        }
      }
      $('#validate-api-schema').addEventListener('click', validateApiResponseSchema);
      $('#run-api').addEventListener('click', async () => {
        const method = $('#api-method').value;
        const resource = $('#api-resource').value;
        if (method === 'BAD_REQUEST') return displayApi('৪০০ · ভুল অনুরোধ (অনুকৃত)', 0, { code: 'PGRST100', message: 'অনুরোধের পরামিতি অবৈধ — নিরাপদ স্থানীয় অনুকরণ।' }, 400, resource);
        if (method === 'UNAUTHORIZED') return displayApi('৪০১ · অননুমোদিত (অনুকৃত)', 0, { code: '401', message: 'প্রমাণীকরণ প্রয়োজন — নিরাপদ স্থানীয় অনুকরণ।' }, 401, resource);
        if (isGuestMode) {
          const startedAt = performance.now();
          try {
            let status = 200;
            let body = resource === 'sqa_users' ? loadedUsers : loadedOrders;
            const recordId = $('#api-record-id').value.trim();
            if (method === 'POST' && resource === 'sqa_users') {
              const record = { id: createLocalId(), full_name: 'API Demo Tester', email: `api-${Date.now()}@example.test`, age: 25, status: 'QA', created_at: new Date().toISOString() };
              const nextUsers = [record, ...loadedUsers];
              saveGuestData('users', nextUsers);
              loadedUsers = nextUsers;
              body = [record];
              status = 201;
            } else if (method === 'POST') {
              const userId = recordId || loadedUsers[0]?.id;
              if (!loadedUsers.some((user) => String(user.id) === String(userId))) throw new Error(activeLanguage === 'bn' ? 'অর্ডারের জন্য guest user ID দিন।' : 'Provide a guest user ID for this order.');
              const record = { order_id: createLocalId(), user_id: userId, product_name: 'API Demo Product', quantity: 1, total_price: 100, order_status: 'Pending', ordered_at: new Date().toISOString() };
              const nextOrders = [record, ...loadedOrders];
              saveGuestData('orders', nextOrders);
              loadedOrders = nextOrders;
              body = [record];
              status = 201;
            } else if (method === 'DELETE') {
              if (!recordId) return showToast('DELETE-এর জন্য রেকর্ড আইডি আবশ্যক।', 'error');
              if (!window.confirm(activeLanguage === 'bn' ? `গেস্ট ডেটা থেকে ${recordId} রেকর্ডটি মুছবেন?` : `Delete record ${recordId} from guest data?`)) return;
              if (resource === 'sqa_users') {
                const nextUsers = loadedUsers.filter((item) => String(item.id) !== recordId);
                saveGuestData('users', nextUsers);
                loadedUsers = nextUsers;
              } else {
                const nextOrders = loadedOrders.filter((item) => String(item.order_id) !== recordId);
                saveGuestData('orders', nextOrders);
                loadedOrders = nextOrders;
              }
              body = null;
              status = 204;
            }
            displayApi(`${status} ${status === 204 ? 'No Content' : status === 201 ? 'Created' : 'OK'} · Guest Demo`, performance.now() - startedAt, body, status, resource);
            showToast(activeLanguage === 'bn' ? `Guest API অনুরোধ সফল: HTTP ${bnNumber(status)}।` : `Guest API request succeeded: HTTP ${bnNumber(status)}.`);
            await refreshDatabase();
          } catch (error) {
            displayApi(activeLanguage === 'bn' ? 'গেস্ট ডেমো ত্রুটি' : 'Guest Demo Error', performance.now() - startedAt, { message: error.message }, 400, resource);
            showToast(error.message, 'error');
          }
          return;
        }
        let url = restUrl(resource);
        const startedAt = performance.now();
        try {
          const headers = await getAuthHeaders();
          const options = { method, headers };
          if (method === 'GET') url += resource === 'sqa_users'
            ? '?select=id,full_name,email,age,status&limit=100'
            : '?select=order_id,user_id,product_name,quantity,total_price,order_status&limit=100';
          if (method === 'POST') {
            headers['Content-Type'] = 'application/json';
            headers.Prefer = 'return=representation';
            options.body = JSON.stringify(resource === 'sqa_users'
              ? { full_name: 'API পরীক্ষণ ব্যবহারকারী', email: `api-${Date.now()}@example.test`, password: `AUTH_MANAGED_${Date.now()}`, age: 25, status: 'Active' }
              : { user_id: $('#api-record-id').value.trim(), product_name: 'API পরীক্ষণ পণ্য', quantity: 1, total_price: 100, order_status: 'Pending' });
          }
          if (method === 'DELETE') {
            const recordId = $('#api-record-id').value.trim();
            if (!recordId) return showToast('DELETE-এর জন্য রেকর্ড আইডি আবশ্যক।', 'error');
            if (!window.confirm(`আপনি কি ${resource} থেকে ${recordId} রেকর্ডটি স্থায়ীভাবে মুছতে চান?`)) return;
            const key = resource === 'sqa_users' ? 'id' : 'order_id';
            url += `?${key}=eq.${encodeURIComponent(recordId)}`;
            headers.Prefer = 'return=minimal';
          }
          const response = await fetch(url, options);
          const latency = performance.now() - startedAt;
          const raw = response.status === 204 ? '(খালি প্রতিক্রিয়া — HTTP ২০৪)' : await response.text();
          let body = raw;
          try { body = raw ? JSON.parse(raw) : null; } catch { /* সার্ভারের অ-JSON প্রতিক্রিয়া অপরিবর্তিত দেখান। */ }
          displayApi(`${response.status} ${response.statusText}`, latency, body, response.status, resource);
          if (!response.ok) showToast(`API অনুরোধ ব্যর্থ হয়েছে: HTTP ${bnNumber(response.status)}।`, 'error');
          else {
            showToast(`API অনুরোধ সফল: HTTP ${bnNumber(response.status)}।`);
            refreshDatabase();
          }
        } catch (error) {
          displayApi('নেটওয়ার্ক ত্রুটি', performance.now() - startedAt, { message: error.message }, null, resource);
          showToast('API-তে সংযোগ করা যায়নি। নেটওয়ার্ক ও CORS সেটিংস যাচাই করুন।', 'error');
        }
      });

      let automationEntries = [];
      Object.defineProperty(SQA, 'automationEntries', { get: () => automationEntries, set: (value) => { automationEntries = value; } });
      function renderAutomationLog() {
        const log = $('#automation-log');
        log.innerHTML = automationEntries.length
          ? automationEntries.map((entry) => `<p class="${entry.passed ? 'text-emerald-300' : 'text-rose-300'}">${entry.passed ? 'PASS' : 'FAIL'} · ${escapeHTML(activeLanguage === 'bn' ? entry.nameBn : entry.nameEn)} · ${escapeHTML(bnNumber(entry.duration))} ms${entry.detail ? ` · ${escapeHTML(entry.detail)}` : ''}</p>`).join('')
          : `<p class="text-slate-500">${activeLanguage === 'bn' ? 'পরীক্ষা চালালে ফল এখানে দেখা যাবে।' : 'Run checks to see results here.'}</p>`;
        if (!automationEntries.length) {
          $('#automation-summary').textContent = '';
          return;
        }
        const passed = automationEntries.filter((entry) => entry.passed).length;
        const failed = automationEntries.length - passed;
        $('#automation-summary').textContent = activeLanguage === 'bn'
          ? `${bnNumber(automationEntries.length)}টি পরীক্ষা সম্পন্ন · ${bnNumber(passed)}টি সফল · ${bnNumber(failed)}টি ব্যর্থ`
          : `${bnNumber(automationEntries.length)} checks completed · ${bnNumber(passed)} passed · ${bnNumber(failed)} failed`;
      }
      $('#run-automated-checks').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        automationEntries = [];
        persistGuestProgress();
        renderAutomationLog();
        const runCheck = async (nameBn, nameEn, assertion) => {
          const startedAt = performance.now();
          try {
            const detail = await assertion();
            automationEntries.push({ nameBn, nameEn, passed: true, duration: performance.now() - startedAt, detail: detail || '' });
          } catch (error) {
            automationEntries.push({ nameBn, nameEn, passed: false, duration: performance.now() - startedAt, detail: error.message || String(error) });
          }
          persistGuestProgress();
          renderAutomationLog();
        };
        try {
          await runCheck('নিবন্ধনের সীমামান (১৭, ১৮, ৬০, ৬১)', 'Registration BVA (17, 18, 60, 61)', () => {
            const cases = [[17, false], [18, true], [60, true], [61, false]];
            const failures = cases.filter(([age, expected]) => isRegistrationAgeValid(age) !== expected);
            if (failures.length) {
              const accepted = failures.filter(([age]) => isRegistrationAgeValid(age)).map(([age]) => age);
              throw new Error(activeLanguage === 'bn'
                ? `১৮–৬০ প্রত্যাশিত। ${accepted.join(', ')} বছর বয়সও গ্রহণ করছে।`
                : `Expected age range 18–60. Age ${accepted.join(', ')} is also accepted.`);
            }
            return activeLanguage === 'bn' ? 'সব boundary value ঠিক আছে' : 'All boundary values are correct';
          });
          await runCheck('অর্ডারের হিসাব ও SAVE20 ছাড়', 'Order math & SAVE20 discount', () => {
            const actual = calculateOrderAmounts(1200, 1, 'SAVE20');
            const expected = { subtotal: 1200, discount: 240, tax: 96, total: 1056 };
            const mismatch = Object.keys(expected).filter((key) => Math.abs(actual[key] - expected[key]) > 0.001);
            if (mismatch.length) throw new Error(`Unexpected ${mismatch.join(', ')}: ${JSON.stringify(actual)}`);
            return activeLanguage === 'bn' ? '৳১,২০০ − ৳২৪০ ছাড় + ৳৯৬ কর = ৳১,০৫৬' : '1200 - 240 discount + 96 tax = 1056';
          });
          await runCheck('Supabase REST API GET · HTTP 200', 'Supabase REST API GET · HTTP 200', async () => {
            if (isGuestMode) return activeLanguage === 'bn' ? 'Guest session REST mock সফল · কোনো নেটওয়ার্ক অনুরোধ নয়' : 'Guest session REST mock succeeded · no network request';
            const response = await fetch(`${restUrl('sqa_users')}?select=id&limit=1`, { headers: await getAuthHeaders() });
            if (response.status !== 200) throw new Error(`Expected HTTP 200, received HTTP ${response.status}`);
            return activeLanguage === 'bn' ? 'read-only অনুরোধ সফল' : 'Read-only request succeeded';
          });
          await runCheck('Supabase ডেটাবেস সংযোগ', 'Supabase database connection', async () => {
            if (isGuestMode) {
              if (!Array.isArray(loadedUsers) || !Array.isArray(loadedOrders) || !Array.isArray(loadedBugReports)) throw new Error('গেস্ট সেশনের ডেটা পাওয়া যায়নি।');
              return activeLanguage === 'bn' ? 'Guest session storage সংযুক্ত' : 'Guest session storage is ready';
            }
            const { error } = await ensureDb().from('sqa_users').select('id', { head: true, count: 'exact' }).limit(1);
            if (error) throw error;
            return activeLanguage === 'bn' ? 'ডেটাবেস query সফল' : 'Database query succeeded';
          });
        } finally {
          button.disabled = false;
          renderAutomationLog();
        }
      });

      let isGuestMode = false;
      Object.defineProperty(SQA, 'activeLanguage', { get: () => activeLanguage, set: (value) => { activeLanguage = value; } });
      try { isGuestMode = sessionStorage.getItem('sqa-guest-mode') === 'true'; }
      catch (error) { console.error('Guest session storage is unavailable.', error); }
      let loadedUsers = [];
      let loadedOrders = [];
      let loadedBugReports = [];
      Object.defineProperties(SQA, {
        isGuestMode: { get: () => isGuestMode, set: (value) => { isGuestMode = value; } },
        loadedUsers: { get: () => loadedUsers, set: (value) => { loadedUsers = value; } },
        loadedOrders: { get: () => loadedOrders, set: (value) => { loadedOrders = value; } },
        loadedBugReports: { get: () => loadedBugReports, set: (value) => { loadedBugReports = value; } }
      });
      const { createLocalId, saveGuestData, readGuestData, loadGuestData, persistGuestProgress, updateGuestVisibility, enterGuestMode, leaveGuestMode } = SQA.guest;
      async function refreshDatabase() {
        if (isGuestMode) {
          renderUsers();
          renderOrders(loadedOrders, loadedUsers);
          renderBugs(loadedBugReports);
          renderRtm();
          setLocalizedText($('#database-message'), `${bnNumber(loadedUsers.length)} জন ডেমো ব্যবহারকারী, ${bnNumber(loadedOrders.length)}টি ডেমো অর্ডার এবং ${bnNumber(loadedBugReports.length)}টি ডেমো বাগ লোড হয়েছে।`);
          await loadStats();
          return;
        }
        if (!db) return;
        setLocalizedText($('#database-message'), 'ডেটাবেস থেকে তথ্য লোড হচ্ছে…');
        try {
          const [usersResult, ordersResult, bugsResult] = await Promise.all([
            db.from('sqa_users').select('id, full_name, email, age, status, created_at').order('created_at', { ascending: false }).limit(200),
            db.from('sqa_orders').select('order_id, user_id, product_name, quantity, total_price, order_status, ordered_at').order('ordered_at', { ascending: false }).limit(200),
            db.from('sqa_bug_reports').select('bug_id, module_name, bug_title, severity, priority, status, steps_to_reproduce, expected_result, actual_result, reported_at').order('reported_at', { ascending: false }).limit(100)
          ]);
          for (const result of [usersResult, ordersResult, bugsResult]) if (result.error) throw result.error;
          loadedUsers = usersResult.data || [];
          loadedOrders = ordersResult.data || [];
          loadedBugReports = bugsResult.data || [];
          renderUsers();
          renderOrders(loadedOrders, loadedUsers);
          renderBugs(loadedBugReports);
          renderRtm();
          setLocalizedText($('#database-message'), `${bnNumber(loadedUsers.length)} জন ব্যবহারকারী, ${bnNumber((ordersResult.data || []).length)}টি অর্ডার এবং ${bnNumber((bugsResult.data || []).length)}টি বাগ প্রতিবেদন লোড হয়েছে (প্রতি তালিকায় সর্বোচ্চ সীমা প্রযোজ্য)।`);
          await loadStats();
        } catch (error) {
          setLocalizedText($('#database-message'), dbError(error));
          showToast(dbError(error), 'error');
        }
      }
      SQA.refreshDatabase = refreshDatabase;
      function renderUsers() {
        const query = $('#table-search').value.trim().toLowerCase();
        const matches = loadedUsers.filter((user) => [user.full_name, user.email, user.id].some((value) => String(value || '').toLowerCase().includes(query)));
        $('#users-table').innerHTML = matches.map((user) => `<tr><td class="p-3"><div>${escapeHTML(user.full_name)}</div><div class="text-xs text-slate-500">${escapeHTML(user.email)}</div></td><td class="p-3">${bnNumber(user.age)}</td><td class="max-w-28 truncate p-3 text-xs text-slate-500" title="${escapeHTML(user.id)}">${escapeHTML(user.id)}</td><td class="p-3"><div class="flex flex-wrap gap-2"><button class="edit-user rounded-lg border border-cyan-400/30 px-2 py-1 text-xs text-cyan-200" data-id="${escapeHTML(user.id)}"><span data-bn="সম্পাদনা" data-en="Edit">${escapeHTML(t('সম্পাদনা'))}</span></button><button class="delete-user rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-200" data-id="${escapeHTML(user.id)}"><span data-bn="মুছুন" data-en="Delete">${escapeHTML(t('মুছুন'))}</span></button></div></td></tr>`).join('') || `<tr><td colspan="4" class="p-4 text-slate-500">${escapeHTML(t('কোনো ব্যবহারকারী মেলেনি।'))}</td></tr>`;
      }
      function renderOrders(orders, users) {
        const names = new Map(users.map((user) => [String(user.id), user.full_name]));
        const statuses = [['Pending', 'অপেক্ষমাণ (Pending)', 'Pending'], ['Processing', 'প্রক্রিয়াধীন (Processing)', 'Processing'], ['Shipped', 'পাঠানো হয়েছে (Shipped)', 'Shipped'], ['Delivered', 'পৌঁছেছে (Delivered)', 'Delivered'], ['Cancelled', 'বাতিল (Cancelled)', 'Cancelled']];
        $('#orders-table').innerHTML = orders.map((order) => `<tr><td class="p-3">${escapeHTML(t(order.product_name))}</td><td class="p-3">${bnNumber(order.quantity)} / ${money(order.total_price)}</td><td class="p-3">${escapeHTML(names.get(String(order.user_id)) || String(order.user_id).slice(0, 12))}</td><td class="p-3"><select class="order-status rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs" data-id="${escapeHTML(order.order_id)}" aria-label="${escapeHTML(activeLanguage === 'bn' ? 'অর্ডারের অবস্থা' : 'Order status')}" data-bn-aria-label="অর্ডারের অবস্থা" data-en-aria-label="Order status">${statuses.map(([value, bn, en]) => `<option value="${value}" data-bn="${bn}" data-en="${en}" ${order.order_status === value ? 'selected' : ''}>${activeLanguage === 'bn' ? bn : en}</option>`).join('')}</select></td><td class="p-3"><button class="delete-order rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-200" data-id="${escapeHTML(order.order_id)}"><span data-bn="মুছুন" data-en="Delete">${escapeHTML(t('মুছুন'))}</span></button></td></tr>`).join('') || `<tr><td colspan="5" class="p-4 text-slate-500">${escapeHTML(t('কোনো অর্ডার পাওয়া যায়নি।'))}</td></tr>`;
      }
      function renderBugs(bugs) {
        const severityLabel = { Critical: 'সংকটজনক (Critical)', Major: 'গুরুতর (Major)', Minor: 'কম গুরুতর (Minor)', Trivial: 'সামান্য (Trivial)' };
        const bugStatus = [['Open', 'খোলা (Open)'], ['In Progress', 'চলমান (In Progress)'], ['Fixed', 'সংশোধিত (Fixed)'], ['Closed', 'বন্ধ (Closed)']];
        const rows = bugs.map((bug) => {
          const statusAriaBn = `${bug.bug_title} বাগের অবস্থা`;
          const statusAriaEn = translateDynamicText(statusAriaBn);
          const severityClass = `severity-${String(bug.severity || 'trivial').toLowerCase()}`;
          const statusClass = `status-${String(bug.status || 'open').toLowerCase().replace(/\s+/g, '-')}`;
          return `<tr><td class="p-3"><div class="font-medium">${escapeHTML(bug.bug_title)}</div><div class="text-xs text-slate-500">${escapeHTML(bug.module_name)} · ${escapeHTML(bug.bug_id)}</div></td><td class="p-3"><span class="severity-pill ${severityClass}">${escapeHTML(t(severityLabel[bug.severity] || bug.severity))}</span></td><td class="p-3"><select class="bug-status bug-status-pill ${statusClass} rounded-lg bg-slate-900 px-2 py-2 text-xs" data-id="${escapeHTML(bug.bug_id)}" aria-label="${escapeHTML(activeLanguage === 'bn' ? statusAriaBn : statusAriaEn)}" data-bn-aria-label="${escapeHTML(statusAriaBn)}" data-en-aria-label="${escapeHTML(statusAriaEn)}">${bugStatus.map(([value, label]) => `<option value="${escapeHTML(value)}" data-bn="${escapeHTML(label)}" data-en="${escapeHTML(translations[label] || label)}" ${bug.status === value ? 'selected' : ''}>${escapeHTML(t(label))}</option>`).join('')}</select></td><td class="p-3"><div class="flex gap-2"><button class="edit-bug rounded-lg border border-cyan-400/30 px-2 py-1 text-xs text-cyan-200" data-id="${escapeHTML(bug.bug_id)}"><span data-bn="সম্পাদনা" data-en="Edit">${escapeHTML(t('সম্পাদনা'))}</span></button><button class="delete-bug rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-200" data-id="${escapeHTML(bug.bug_id)}"><span data-bn="মুছুন" data-en="Delete">${escapeHTML(t('মুছুন'))}</span></button></div></td></tr>`;
        });
        const total = bugs.length;
        const resolved = bugs.filter((bug) => ['Fixed', 'Closed'].includes(bug.status)).length;
        setLocalizedText($('#metric-total-bugs'), bnNumber(total));
        setLocalizedText($('#metric-critical-bugs'), bnNumber(bugs.filter((bug) => bug.severity === 'Critical').length));
        setLocalizedText($('#metric-major-bugs'), bnNumber(bugs.filter((bug) => bug.severity === 'Major').length));
        setLocalizedText($('#metric-resolution-rate'), `${bnNumber(total ? Math.round((resolved / total) * 100) : 0)}%`);
        $('#bugs-table').innerHTML = rows.join('') || `<tr><td colspan="4" class="p-4 text-slate-500">${escapeHTML(t('এখনো কোনো বাগ প্রতিবেদন নেই।'))}</td></tr>`;
      }
      SQA.renderUsers = renderUsers;
      SQA.renderOrders = renderOrders;
      SQA.renderBugs = renderBugs;
      $('#table-search').addEventListener('input', renderUsers);
      $('#refresh-data').addEventListener('click', refreshDatabase);
      $('#users-table').addEventListener('click', async (event) => {
        const button = event.target.closest('.delete-user');
        if (!button) return;
        const prompt = activeLanguage === 'bn'
          ? `ব্যবহারকারী ${button.dataset.id} স্থায়ীভাবে মুছবেন? সংশ্লিষ্ট অর্ডারের ওপর ডেটাবেস নীতির প্রভাব পড়তে পারে।`
          : `Permanently delete user ${button.dataset.id}? Database rules may affect related orders.`;
        if (!window.confirm(prompt)) return;
        try {
          if (isGuestMode) {
            const nextUsers = loadedUsers.filter((user) => String(user.id) !== button.dataset.id);
            saveGuestData('users', nextUsers);
            loadedUsers = nextUsers;
          } else {
            const { error } = await ensureDb().from('sqa_users').delete().eq('id', button.dataset.id);
            if (error) throw error;
          }
          showToast('ব্যবহারকারী মুছে ফেলা হয়েছে।');
          await refreshDatabase();
        } catch (error) { showToast(isGuestMode ? error.message : dbError(error), 'error'); }
      });
      $('#users-table').addEventListener('click', (event) => {
        const button = event.target.closest('.edit-user');
        if (!button) return;
        const user = loadedUsers.find((item) => String(item.id) === button.dataset.id);
        if (!user) return showToast(activeLanguage === 'bn' ? 'ব্যবহারকারী আর তালিকায় নেই।' : 'This user is no longer in the list.', 'error');
        $('#edit-user-id').value = user.id;
        $('#edit-user-name').value = user.full_name || '';
        $('#edit-user-age').value = user.age ?? '';
        const statusSelect = $('#edit-user-status');
        statusSelect.querySelector('[data-existing-status]')?.remove();
        if (user.status && !['User', 'QA', 'Admin'].includes(user.status)) {
          const currentStatus = document.createElement('option');
          currentStatus.value = user.status;
          currentStatus.dataset.existingStatus = 'true';
          currentStatus.dataset.bn = `বর্তমান: ${user.status}`;
          currentStatus.dataset.en = `Current: ${user.status}`;
          currentStatus.textContent = activeLanguage === 'bn' ? currentStatus.dataset.bn : currentStatus.dataset.en;
          statusSelect.appendChild(currentStatus);
        }
        statusSelect.value = user.status || 'User';
        $('#user-edit-message').textContent = '';
        $('#user-edit-dialog').showModal();
      });
      $('#user-edit-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = $('#edit-user-id').value;
        const original = loadedUsers.find((item) => String(item.id) === id);
        const originalValues = original ? { ...original } : null;
        const changes = { full_name: $('#edit-user-name').value.trim(), age: Number($('#edit-user-age').value), status: $('#edit-user-status').value };
        try {
          if (isGuestMode) {
            const user = loadedUsers.find((item) => String(item.id) === id);
            if (!user) throw new Error('ব্যবহারকারীর রেকর্ড পাওয়া যায়নি।');
            Object.assign(user, changes);
            saveGuestData('users', loadedUsers);
          } else {
            const { error } = await ensureDb().from('sqa_users').update(changes).eq('id', id);
            if (error) throw error;
          }
          $('#user-edit-dialog').close();
          showToast('ব্যবহারকারীর তথ্য হালনাগাদ হয়েছে।', 'success', 'User updated.');
          await refreshDatabase();
        } catch (error) {
          if (isGuestMode && original && originalValues) Object.assign(original, originalValues);
          setLocalizedText($('#user-edit-message'), isGuestMode ? error.message : dbError(error));
          showToast(isGuestMode ? error.message : dbError(error), 'error');
        }
      });
      $('#orders-table').addEventListener('change', async (event) => {
        const select = event.target.closest('.order-status');
        if (!select) return;
        const order = loadedOrders.find((item) => String(item.order_id) === select.dataset.id);
        const previous = order?.order_status;
        try {
          if (isGuestMode) {
            if (!order) throw new Error('অর্ডারের রেকর্ড পাওয়া যায়নি।');
            order.order_status = select.value;
            saveGuestData('orders', loadedOrders);
          } else {
            const { error } = await ensureDb().from('sqa_orders').update({ order_status: select.value }).eq('order_id', select.dataset.id);
            if (error) throw error;
          }
          showToast('অর্ডারের অবস্থা হালনাগাদ হয়েছে।');
          if (!isGuestMode) await refreshDatabase();
          else renderOrders(loadedOrders, loadedUsers);
        } catch (error) {
          if (order) order.order_status = previous;
          showToast(isGuestMode ? error.message : dbError(error), 'error');
          await refreshDatabase();
        }
      });
      $('#orders-table').addEventListener('click', async (event) => {
        const button = event.target.closest('.delete-order');
        if (!button) return;
        if (!window.confirm(activeLanguage === 'bn' ? `অর্ডার ${button.dataset.id} স্থায়ীভাবে মুছবেন?` : `Permanently delete order ${button.dataset.id}?`)) return;
        try {
          if (isGuestMode) {
            const nextOrders = loadedOrders.filter((order) => String(order.order_id) !== button.dataset.id);
            saveGuestData('orders', nextOrders);
            loadedOrders = nextOrders;
          } else {
            const { error } = await ensureDb().from('sqa_orders').delete().eq('order_id', button.dataset.id);
            if (error) throw error;
          }
          showToast('অর্ডার মুছে ফেলা হয়েছে।');
          await refreshDatabase();
        } catch (error) { showToast(isGuestMode ? error.message : dbError(error), 'error'); }
      });
      $('#bulk-users').addEventListener('click', async () => {
        if (!window.confirm(activeLanguage === 'bn'
          ? (isGuestMode ? 'গেস্ট সেশনে ৫০টি পরীক্ষণ ব্যবহারকারী তৈরি করবেন?' : '৫০টি পরীক্ষণ ব্যবহারকারী বাস্তব ডেটাবেসে তৈরি করবেন?')
          : (isGuestMode ? 'Generate 50 test users in this guest session?' : 'Generate 50 test users in the live database?'))) return;
        const stamp = Date.now();
        const rows = Array.from({ length: 50 }, (_, index) => ({
          ...(isGuestMode ? { id: createLocalId(), created_at: new Date().toISOString() } : {}),
          full_name: `পরীক্ষণ ব্যবহারকারী ${index + 1}`,
          email: `sqa-load-${stamp}-${index + 1}@example.test`,
          ...(isGuestMode ? {} : { password: `AUTH_MANAGED_${stamp}_${index + 1}` }),
          age: 18 + (index % 43),
          status: 'Active'
        }));
        try {
          if (isGuestMode) {
            const nextUsers = [...rows, ...loadedUsers];
            saveGuestData('users', nextUsers);
            loadedUsers = nextUsers;
          } else {
            const { error } = await ensureDb().from('sqa_users').insert(rows);
            if (error) throw error;
          }
          showToast('৫০টি পরীক্ষণ ব্যবহারকারী সফলভাবে তৈরি হয়েছে।');
          await refreshDatabase();
        } catch (error) { showToast(isGuestMode ? error.message : dbError(error), 'error'); }
      });
      $('#cleanup-dummy-users').addEventListener('click', async () => {
        const confirmed = window.confirm(activeLanguage === 'bn'
          ? 'শুধু @example.test দিয়ে শেষ হওয়া পরীক্ষণ ইমেইল মুছবেন? বাস্তব ইমেইল পরিবর্তিত হবে না।'
          : 'Delete only test emails ending in @example.test? Real email addresses will not be changed.');
        if (!confirmed) return;
        try {
          if (isGuestMode) {
            const nextUsers = loadedUsers.filter((user) => !String(user.email || '').toLowerCase().endsWith('@example.test'));
            saveGuestData('users', nextUsers);
            loadedUsers = nextUsers;
          } else {
            const { error } = await ensureDb().from('sqa_users').delete().ilike('email', '%@example.test');
            if (error) throw error;
          }
          showToast('ডামি পরীক্ষণ ব্যবহারকারী মুছে ফেলা হয়েছে।');
          await refreshDatabase();
        } catch (error) { showToast(isGuestMode ? error.message : dbError(error), 'error'); }
      });
      $('#bugs-table').addEventListener('change', async (event) => {
        const select = event.target.closest('.bug-status');
        if (!select) return;
        try {
          if (isGuestMode) {
            const bug = loadedBugReports.find((item) => item.bug_id === select.dataset.id);
            if (!bug) throw new Error('বাগ রেকর্ড পাওয়া যায়নি।');
            const previousStatus = bug.status;
            bug.status = select.value;
            try { saveGuestData('bugs', loadedBugReports); }
            catch (error) { bug.status = previousStatus; throw error; }
            renderBugs(loadedBugReports);
            renderRtm();
          } else {
            const { error } = await ensureDb().from('sqa_bug_reports').update({ status: select.value }).eq('bug_id', select.dataset.id);
            if (error) throw error;
            await refreshDatabase();
          }
          showToast('বাগের অবস্থা হালনাগাদ হয়েছে।');
          await loadStats();
        } catch (error) { showToast(isGuestMode ? error.message : dbError(error), 'error'); refreshDatabase(); }
      });
      $('#bugs-table').addEventListener('click', async (event) => {
        const editButton = event.target.closest('.edit-bug');
        const deleteButton = event.target.closest('.delete-bug');
        if (editButton) {
          const bug = loadedBugReports.find((item) => item.bug_id === editButton.dataset.id);
          if (!bug) return showToast(activeLanguage === 'bn' ? 'বাগ প্রতিবেদনটি আর তালিকায় নেই।' : 'This bug report is no longer in the list.', 'error');
          $('#edit-bug-id').value = bug.bug_id;
          $('#edit-bug-title').value = bug.bug_title || '';
          $('#edit-bug-severity').value = bug.severity || 'Major';
          $('#edit-bug-priority').value = bug.priority || 'Medium';
          $('#edit-bug-steps').value = bug.steps_to_reproduce || '';
          $('#edit-bug-expected').value = bug.expected_result || '';
          $('#edit-bug-actual').value = bug.actual_result || '';
          $('#bug-edit-message').textContent = '';
          $('#bug-edit-dialog').showModal();
          return;
        }
        if (!deleteButton) return;
        if (!window.confirm(activeLanguage === 'bn' ? `বাগ ${deleteButton.dataset.id} স্থায়ীভাবে মুছবেন?` : `Permanently delete bug ${deleteButton.dataset.id}?`)) return;
        try {
          if (isGuestMode) {
            const nextBugs = loadedBugReports.filter((bug) => bug.bug_id !== deleteButton.dataset.id);
            saveGuestData('bugs', nextBugs);
            loadedBugReports = nextBugs;
          } else {
            const { error } = await ensureDb().from('sqa_bug_reports').delete().eq('bug_id', deleteButton.dataset.id);
            if (error) throw error;
          }
          showToast('বাগ প্রতিবেদন মুছে ফেলা হয়েছে।');
          await refreshDatabase();
        } catch (error) { showToast(isGuestMode ? error.message : dbError(error), 'error'); }
      });
      $('#bug-edit-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = $('#edit-bug-id').value;
        const original = loadedBugReports.find((item) => item.bug_id === id);
        const originalValues = original ? { ...original } : null;
        const changes = {
          bug_title: $('#edit-bug-title').value.trim(),
          severity: $('#edit-bug-severity').value,
          priority: $('#edit-bug-priority').value,
          steps_to_reproduce: $('#edit-bug-steps').value.trim(),
          expected_result: $('#edit-bug-expected').value.trim(),
          actual_result: $('#edit-bug-actual').value.trim()
        };
        try {
          if (isGuestMode) {
            const bug = loadedBugReports.find((item) => item.bug_id === id);
            if (!bug) throw new Error('বাগ রেকর্ড পাওয়া যায়নি।');
            Object.assign(bug, changes);
            saveGuestData('bugs', loadedBugReports);
          } else {
            const { error } = await ensureDb().from('sqa_bug_reports').update(changes).eq('bug_id', id);
            if (error) throw error;
          }
          $('#bug-edit-dialog').close();
          showToast('বাগ প্রতিবেদন হালনাগাদ হয়েছে।', 'success', 'Bug report updated.');
          await refreshDatabase();
        } catch (error) {
          if (isGuestMode && original && originalValues) Object.assign(original, originalValues);
          setLocalizedText($('#bug-edit-message'), isGuestMode ? error.message : dbError(error));
          showToast(isGuestMode ? error.message : dbError(error), 'error');
        }
      });
      $$('.edit-dialog-cancel').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));

      function renderTestCases() {
        $('#test-cases').innerHTML = testCases.map((test) => `<tr>${test.map((cell) => `<td class="p-3">${escapeHTML(t(cell))}</td>`).join('')}</tr>`).join('');
      }
      renderTestCases();
      function renderRtm() {
        const rows = requirementMatrix.map((requirement) => {
          const bugs = loadedBugReports.filter((bug) => String(bug.module_name || '').includes(requirement.id));
          const bugLabels = bugs.length
            ? bugs.map((bug) => `${bug.bug_id}: ${bug.bug_title}`).join(', ')
            : (activeLanguage === 'bn' ? 'কোনো সংযুক্ত বাগ নেই' : 'No linked bugs');
          const requirementName = activeLanguage === 'bn' ? requirement.bn : requirement.en;
          return `<tr><td class="p-3"><b>${requirement.id}</b><div class="mt-1 text-xs text-slate-400">${escapeHTML(requirementName)}</div></td><td class="p-3">${requirement.tests.map(escapeHTML).join(', ')}</td><td class="p-3">${escapeHTML(bugLabels)}</td></tr>`;
        }).join('');
        $('#rtm-table-suite').innerHTML = rows;
        $('#rtm-table-bugs').innerHTML = rows;
      }
      renderRtm();

      function csvCell(value) {
        let text = String(value ?? '');
        if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      }
      $('#export-test-report').addEventListener('click', async () => {
        try {
          let data;
          if (isGuestMode) {
            data = loadedBugReports;
          } else {
            const result = await ensureDb().from('sqa_bug_reports')
              .select('bug_id, module_name, bug_title, severity, priority, status, steps_to_reproduce, expected_result, actual_result, reported_at')
              .order('reported_at', { ascending: false }).limit(1000);
            if (result.error) throw result.error;
            data = result.data || [];
          }
          const header = ['Record Type', 'ID', 'Requirement', 'Title / Test Case', 'Result / Status', 'Duration (ms)', 'Module', 'Severity', 'Priority', 'Steps to Reproduce', 'Expected Result', 'Actual Result', 'Timestamp'];
          const executionRows = suiteCases.map(([name], index) => {
            const testId = `TC-${String(index + 1).padStart(3, '0')}`;
            const requirement = requirementMatrix.find((item) => item.tests.includes(testId));
            const result = suiteResults.get(index) || 'Not Run';
            return ['Test Execution', testId, requirement?.id || '', activeLanguage === 'bn' ? name : t(name), result, '', '', '', '', '', '', '', ''];
          });
          const automationRows = automationEntries.map((entry, index) => {
            const requirementId = ['REQ-01', 'REQ-02', 'REQ-03', 'REQ-03'][index] || '';
            const testId = `AUTO-${String(index + 1).padStart(3, '0')}`;
            return ['Automated Check', testId, requirementId, activeLanguage === 'bn' ? entry.nameBn : entry.nameEn, entry.passed ? 'PASS' : 'FAIL', entry.duration.toFixed(2), '', '', '', entry.detail, '', '', new Date().toISOString()];
          });
          const bugRows = data.map((bug) => {
            const requirement = requirementMatrix.find((item) => String(bug.module_name || '').includes(item.id));
            return ['Bug Report', bug.bug_id, requirement?.id || '', bug.bug_title, bug.status, '', bug.module_name, bug.severity, bug.priority, bug.steps_to_reproduce, bug.expected_result, bug.actual_result, bug.reported_at || ''];
          });

          const csv = [header, ...executionRows, ...automationRows, ...bugRows].map((row) => row.map(csvCell).join(',')).join('\r\n');
          const downloadUrl = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = `sqa-test-report-${new Date().toISOString().slice(0, 10)}.csv`;
          anchor.click();
          window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
          showToast('টেস্ট রিপোর্ট CSV ডাউনলোড হয়েছে।', 'success', 'Test report CSV downloaded.');
        } catch (error) {
          const messageBn = `CSV রিপোর্ট তৈরি করা যায়নি: ${error.message}`;
          const messageEn = `Could not create CSV report: ${error.message}`;
          showToast(messageBn, 'error', messageEn);
        }
      });

      $('#copy-automation-snippets').addEventListener('click', async () => {
        const content = `${$('#playwright-snippet').textContent}\n\n${$('#rest-snippet').textContent}`;
        const status = $('#snippet-copy-status');
        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(content);
          } else {
            const input = document.createElement('textarea');
            input.value = content;
            input.setAttribute('readonly', '');
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            try {
              input.select();
              if (!document.execCommand('copy')) throw new Error('Clipboard access is unavailable.');
            } finally { input.remove(); }
          }
          setLocalizedText(status, 'অটোমেশন ও API নমুনা কপি হয়েছে।');
        } catch (error) {
          setLocalizedText(status, activeLanguage === 'bn'
            ? `কোড নমুনা কপি করা যায়নি: ${error.message}`
            : `Could not copy code snippets: ${error.message}`);
          showToast(status.textContent, 'error');
        }
      });

      $$('.security-preset').forEach((button) => button.addEventListener('click', () => { $('#security-input').value = button.dataset.value; }));
      function measureNavigationMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const metricValues = navigation ? {
          load: navigation.loadEventEnd > 0 ? navigation.loadEventEnd - navigation.startTime : performance.now() - navigation.startTime,
          interactive: navigation.domInteractive - navigation.startTime,
          ttfb: navigation.responseStart - navigation.requestStart
        } : null;
        ['load', 'interactive', 'ttfb'].forEach((key) => {
          const element = $(`#performance-metrics [data-metric="${key}"]`);
          const value = metricValues?.[key];
          element.textContent = Number.isFinite(value) && value >= 0
            ? bnNumber(Math.round(value * 100) / 100)
            : (activeLanguage === 'bn' ? 'পাওয়া যায়নি' : 'Unavailable');
        });
      }
      $('#remeasure-page-metrics').addEventListener('click', measureNavigationMetrics);
      measureNavigationMetrics();
      $('#inspect-input').addEventListener('click', () => {
        const value = $('#security-input').value;
        const sqlLike = /('|--|;|\b(OR|SELECT|DROP|UNION)\b)/i.test(value);
        const hasMarkup = /<\/?[a-z][\s\S]*?>/i.test(value);
        setLocalizedText($('#security-result'), `ইনপুট দৈর্ঘ্য: ${bnNumber(value.length)} অক্ষর। ${sqlLike ? 'সম্ভাব্য SQL-সদৃশ চিহ্ন পাওয়া গেছে। প্যারামিটারযুক্ত কুয়েরি ব্যবহার করুন। ' : ''}${hasMarkup ? 'HTML ট্যাগ সদৃশ অংশ পাওয়া গেছে। আউটপুটকে টেক্সট হিসেবে এস্কেপ করুন। ' : ''}${!sqlLike && !hasMarkup ? 'সাধারণ স্ট্রিং হিসেবে চিহ্নিত। ' : ''}কোনো ইনপুট সার্ভারে পাঠানো হয়নি।`);
      });
      let failedLogins = 0;
      let lockedUntil = 0;
      $('#brute-force').addEventListener('click', () => {
        const now = Date.now();
        if (now < lockedUntil) return showToast(`লগইন সাময়িকভাবে বন্ধ। ${bnNumber(Math.ceil((lockedUntil - now) / 1000))} সেকেন্ড অপেক্ষা করুন।`, 'error');
        failedLogins += 1;
        if (failedLogins >= 5) {
          lockedUntil = now + 30000;
          failedLogins = 0;
          setLocalizedText($('#security-result'), 'সিমুলেশন: পাঁচটি ব্যর্থ চেষ্টার পর স্থানীয় পরীক্ষণ লগইন ৩০ সেকেন্ডের জন্য বন্ধ।');
        } else {
          setLocalizedText($('#security-result'), `সিমুলেশন: ব্যর্থ প্রচেষ্টা ${bnNumber(failedLogins)} / ৫।`);
        }
      });
      $('#run-load-test').addEventListener('click', async () => {
        const result = $('#load-result');
        const started = performance.now();
        const jobs = Array.from({ length: 100 }, (_, index) => Promise.resolve().then(() => index));
        const settled = await Promise.allSettled(jobs);
        const localMs = performance.now() - started;
        if (isGuestMode) {
          setLocalizedText(result, activeLanguage === 'bn'
            ? `Guest session-এ স্থানীয় নমুনা: ${bnNumber(settled.length)} / ১০০ সম্পন্ন · ${bnNumber(localMs)} ms। কোনো Supabase অনুরোধ পাঠানো হয়নি।`
            : `Local guest-session sample: ${bnNumber(settled.length)} / 100 completed · ${bnNumber(localMs)} ms. No Supabase request was sent.`);
          return;
        }
        setLocalizedText(result, `স্থানীয় নমুনা: ${bnNumber(settled.length)} / ১০০ সম্পন্ন · মোট সময় ${bnNumber(localMs)} ms। বাস্তব API-র হালকা পাঠ-পরীক্ষা চলছে…`);
        const apiStarted = performance.now();
        try {
          const response = await fetch(`${restUrl('sqa_users')}?select=id&limit=1`, { headers: await getAuthHeaders() });
          setLocalizedText(result, `স্থানীয় নমুনা: ${bnNumber(settled.length)} / ১০০ সম্পন্ন · ${bnNumber(localMs)} ms। বাস্তব API পাঠ-অনুরোধ: HTTP ${bnNumber(response.status)} · ${bnNumber(performance.now() - apiStarted)} ms।`);
        } catch (error) {
          setLocalizedText(result, `স্থানীয় নমুনা: ${bnNumber(settled.length)} / ১০০ সম্পন্ন · ${bnNumber(localMs)} ms। বাস্তব API পাঠ-অনুরোধ ব্যর্থ: ${error.message}`);
        }
      });

      $('#bug-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
          const requirementId = $('#bug-requirement').value;
          const rawModule = $('#bug-module').value.trim();
          const bugId = `BUG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
          const moduleName = requirementId ? `${requirementId} · ${rawModule}`.slice(0, 100) : rawModule;
          const bug = {
            bug_id: bugId,
            module_name: moduleName,
            bug_title: $('#bug-title').value.trim(),
            severity: $('#bug-severity').value,
            priority: $('#bug-priority').value,
            status: 'Open',
            steps_to_reproduce: $('#bug-steps').value.trim(),
            expected_result: $('#bug-expected').value.trim(),
            actual_result: $('#bug-actual').value.trim(),
            reported_at: new Date().toISOString()
          };
          if (isGuestMode) {
            const nextBugs = [bug, ...loadedBugReports];
            saveGuestData('bugs', nextBugs);
            loadedBugReports = nextBugs;
          } else {
            const databaseBug = { ...bug };
            delete databaseBug.reported_at;
            const { error } = await ensureDb().from('sqa_bug_reports').insert(databaseBug);
            if (error) throw error;
          }
          setLocalizedText($('#bug-result'), 'বাগ প্রতিবেদন সংরক্ষিত হয়েছে।', 'Bug report saved.');
          $('#bug-form').reset();
          showToast('বাগ প্রতিবেদন জমা হয়েছে।', 'success', 'Bug report submitted.');
          await refreshDatabase();
        } catch (error) {
          const message = isGuestMode ? error.message : dbError(error);
          setLocalizedText($('#bug-result'), message);
          showToast(message, 'error');
        }
      });

      let authMode = 'login';
      let activeAuthUser = null;
      Object.defineProperty(SQA, 'activeAuthUser', { get: () => activeAuthUser, set: (value) => { activeAuthUser = value; } });
      const isAdminUser = SQA.admin.isAdminUser;
      const applySiteSettings = SQA.admin.applySiteSettings;
      const fetchSiteSettings = SQA.admin.fetchSiteSettings;
      SQA.applySiteSettings = applySiteSettings;
      SQA.readPreference = readPreference;
      SQA.pageParameters = pageParameters;
      SQA.tabs = tabs;
      SQA.getVisibleTabs = getVisibleTabs;
      SQA.activateTab = activateTab;
      SQA.translatePage = translatePage;
      SQA.updateOrderTotal = updateOrderTotal;
      SQA.updateSuiteSummary = updateSuiteSummary;
      SQA.renderChecklist = renderChecklist;
      SQA.renderTestCases = renderTestCases;
      SQA.renderRbacSimulator = renderRbacSimulator;
      SQA.renderRtm = renderRtm;
      SQA.renderAutomationLog = renderAutomationLog;
      SQA.measureNavigationMetrics = measureNavigationMetrics;
      SQA.hasTheme = hasTheme;
      SQA.setColorTheme = setColorTheme;
      SQA.ensureDb = ensureDb;
      SQA.admin.initAdminForm();
      function setAuthMessage(message, isError = false, englishMessage = null) {
        const element = $('#auth-message');
        setLocalizedText(element, message, englishMessage);
        element.classList.toggle('text-rose-200', isError);
        element.classList.toggle('text-slate-300', !isError);
      }
      function setAuthErrorMessage(bengaliPrefix, englishPrefix, detail) {
        const detailBn = toBengaliDigits(translateToBengali(detail || ''));
        const detailEn = toWesternDigits(translateDynamicText(detailBn));
        setAuthMessage(`${bengaliPrefix}${detailBn}`, true, `${englishPrefix}${detailEn}`);
      }
      SQA.setAuthMessage = setAuthMessage;
      function setAuthMode(mode) {
        authMode = mode;
        const signingUp = mode === 'signup';
        setLocalizedText($('#auth-heading'), signingUp ? 'নতুন অ্যাকাউন্ট' : 'অ্যাকাউন্টে প্রবেশ');
        setLocalizedText($('#auth-description'), signingUp
          ? 'নিরাপদ প্রবেশের জন্য আপনার নতুন অ্যাকাউন্ট তৈরি করুন।'
          : 'আপনার অ্যাকাউন্ট দিয়ে SQA পরীক্ষণ হাবে প্রবেশ করুন।');
        $('#auth-name-wrap').classList.toggle('hidden', !signingUp);
        $('#auth-name').required = signingUp;
        $('#auth-password').autocomplete = signingUp ? 'new-password' : 'current-password';
        setLocalizedText($('#auth-submit'), signingUp ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন');
        setLocalizedText($('#auth-mode-toggle'), signingUp ? 'ফিরে লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন');
        $('#auth-reset').hidden = signingUp;
        $('#auth-resend-confirmation').hidden = signingUp;
        setAuthMessage('');
      }
      function updateAuthVisibility(session) {
        if (isGuestMode) {
          activeAuthUser = null;
          updateGuestVisibility();
          applySiteSettings();
          if (!SQA.guest.isLoaded()) {
            try { loadGuestData(); }
            catch (error) { showToast(error.message, 'error'); }
          }
          return;
        }
        const user = session?.user || null;
        const nextId = user?.id || null;
        const previousId = activeAuthUser?.id || null;
        const authenticated = Boolean(user);
        $('#auth-screen').hidden = authenticated;
        $('#app-shell').hidden = !authenticated;
        $('#guest-mode-banner').hidden = true;
        activeAuthUser = user;
        applySiteSettings();
        if (user) {
          const logoutLabel = $('#logout-button').querySelector('span') || $('#logout-button');
          setLocalizedText(logoutLabel, 'লগআউট');
          const userLabel = user.email || user.user_metadata?.full_name || user.id;
          $('#signed-in-user').dataset.bn = userLabel;
          $('#signed-in-user').dataset.en = userLabel;
          $('#signed-in-user').textContent = userLabel;
          if (nextId !== previousId) {
            window.setTimeout(() => {
              refreshDatabase();
              loadStats();
            }, 0);
          }
        } else {
          $('#signed-in-user').textContent = '';
        }
      }
      $('#guest-mode-button').addEventListener('click', enterGuestMode);
      $('#auth-mode-toggle').addEventListener('click', () => setAuthMode(authMode === 'login' ? 'signup' : 'login'));
      $('#auth-resend-confirmation').addEventListener('click', async () => {
        const email = $('#auth-email').value.trim();
        if (!email) {
          setAuthMessage(activeLanguage === 'bn'
            ? 'নিশ্চিতকরণ ইমেইল পাঠানোর জন্য প্রথমে ইমেইল লিখুন।'
            : 'Enter your email first to resend the confirmation link.', true);
          return;
        }
        try {
          const client = await dbReady;
          const { error } = await client.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: AUTH_REDIRECT_URL }
          });
          if (error) throw error;
          setAuthMessage(activeLanguage === 'bn'
            ? 'নতুন নিশ্চিতকরণ লিংক পাঠানো হয়েছে। আপনার ইমেইল দেখুন।'
            : 'A new confirmation link was sent. Check your email.');
        } catch (error) {
          setAuthErrorMessage('নিশ্চিতকরণ ইমেইল পাঠানো যায়নি: ', 'Could not resend confirmation email: ', error.message);
        }
      });
      $('#auth-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = $('#auth-email').value.trim();
        const password = $('#auth-password').value;
        const fullName = $('#auth-name').value.trim();
        if (!email || !password) return setAuthMessage('ইমেইল ও পাসওয়ার্ড দিন।', true);
        if (authMode === 'signup' && !fullName) return setAuthMessage('পূর্ণ নাম দিন।', true);
        if (authMode === 'signup' && password.length < 6) return setAuthMessage('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।', true);
        const submitButton = $('#auth-submit');
        submitButton.disabled = true;
        try {
          const client = await dbReady;
          if (authMode === 'signup') {
            const { data, error } = await client.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: fullName },
                emailRedirectTo: AUTH_REDIRECT_URL
              }
            });
            if (error) throw error;
            if (data.session) {
              setAuthMessage('অ্যাকাউন্ট তৈরি হয়েছে। এখন প্রবেশ করা যাচ্ছে…');
            } else {
              setAuthMessage('ইমেইল নিশ্চিতকরণ লিংক পাঠানো হয়েছে। ইমেইল নিশ্চিত করে লগইন করুন।');
            }
          } else {
            const { error } = await client.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setAuthMessage('লগইন সফল হয়েছে।');
          }
        } catch (error) {
          const message = error.message || '';
          let messageBn;
          let messageEn;
          if (/invalid login credentials/i.test(message)) {
            messageBn = 'লগইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড যাচাই করুন।';
            messageEn = 'Sign-in failed. Check your email and password.';
          } else if (/already registered|user already exists/i.test(message)) {
            messageBn = 'এই ইমেইল দিয়ে অ্যাকাউন্ট আছে। লগইন করুন অথবা পাসওয়ার্ড পুনরুদ্ধার করুন।';
            messageEn = 'An account already exists for this email. Sign in or reset your password.';
          } else if (/email not confirmed/i.test(message)) {
            messageBn = 'ইমেইল নিশ্চিত করা হয়নি। নিশ্চিতকরণ ইমেইল আবার পাঠান।';
            messageEn = 'Email has not been confirmed. Resend the confirmation email.';
          } else {
            setAuthErrorMessage('প্রবেশ করা যায়নি: ', 'Authentication failed: ', message);
            return;
          }
          setAuthMessage(messageBn, true, messageEn);
        } finally {
          submitButton.disabled = false;
        }
      });
      $('#auth-reset').addEventListener('click', async () => {
        const email = $('#auth-email').value.trim();
        if (!email) return setAuthMessage('পাসওয়ার্ড পুনরুদ্ধারের জন্য প্রথমে ইমেইল লিখুন।', true);
        try {
          const client = await dbReady;
          const { error } = await client.auth.resetPasswordForEmail(email);
          if (error) throw error;
          setAuthMessage('পাসওয়ার্ড পুনরুদ্ধারের লিংক পাঠানো হয়েছে। আপনার ইমেইল দেখুন।');
        } catch (error) {
          setAuthErrorMessage('পাসওয়ার্ড পুনরুদ্ধার করা যায়নি: ', 'Password reset failed: ', error.message);
        }
      });
      $('#logout-button').addEventListener('click', async () => {
        if (isGuestMode) {
          leaveGuestMode();
          return;
        }
        try {
          const client = await dbReady;
          const { error } = await client.auth.signOut();
          if (error) throw error;
          setAuthMessage('অ্যাকাউন্ট থেকে বের হয়ে গেছেন।');
        } catch (error) {
          showToast(activeLanguage === 'bn' ? `লগআউট করা যায়নি: ${error.message}` : `Sign out failed: ${error.message}`, 'error');
        }
      });
      if (isGuestMode) {
        try { updateAuthVisibility(null); }
        catch (error) { showToast(error.message, 'error'); }
      }
      dbReady.then(async (client) => {
        client.auth.onAuthStateChange((_event, session) => updateAuthVisibility(session));
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        updateAuthVisibility(data.session);
      }).catch((error) => {
        setAuthErrorMessage('লগইন করার জন্য Supabase Auth-এ সংযোগ করা যাচ্ছে না। ', 'Could not connect to Supabase Auth. ', error.message);
      });
      SQA.admin.initContentCms();
      fetchSiteSettings().catch((settingsError) => {
        const message = activeLanguage === 'bn'
          ? `সাইট সেটিংস লোড করা যায়নি: ${settingsError.message}`
          : `Could not load site settings: ${settingsError.message}`;
        showToast(message, 'error');
      });
    }
SQA.startApp = startApp;
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', startApp) : startApp();

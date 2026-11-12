(function () {
  window.SQA = window.SQA || {};
  const SQA = window.SQA;
      const guestStorageKeys = {
        mode: 'sqa-guest-mode',
        users: 'sqa-guest-users',
        orders: 'sqa-guest-orders',
        bugs: 'sqa-guest-bugs',
        suite: 'sqa-guest-suite-results',
        automation: 'sqa-guest-automation-results'
      };
      let guestDataLoaded = false;
      function createLocalId() {
        return globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
          const random = Math.random() * 16 | 0;
          return (char === 'x' ? random : (random & 3 | 8)).toString(16);
        });
      }
      function saveGuestData(kind, value) {
        if (!SQA.isGuestMode) return;
        try { sessionStorage.setItem(guestStorageKeys[kind], JSON.stringify(value)); }
        catch (error) {
          throw new Error(SQA.activeLanguage === 'bn'
            ? `গেস্ট সেশন ডেটা সংরক্ষণ করা যায়নি: ${error.message}`
            : `Could not save guest session data: ${error.message}`);
        }
      }
      function readGuestData(kind, initialValue) {
        const key = guestStorageKeys[kind];
        const stored = sessionStorage.getItem(key);
        if (stored === null) {
          sessionStorage.setItem(key, JSON.stringify(initialValue));
          return initialValue;
        }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) throw new Error(SQA.activeLanguage === 'bn'
          ? `গেস্ট সেশন ডেটা "${kind}" সঠিক নয়।`
          : `Guest session data "${kind}" is invalid.`);
        return parsed;
      }
      function loadGuestData() {
        const stamp = new Date().toISOString();
        const userOne = { id: createLocalId(), full_name: 'Ayesha Rahman', email: 'ayesha@example.test', age: 24, status: 'QA', created_at: stamp };
        const userTwo = { id: createLocalId(), full_name: 'Tanvir Hasan', email: 'tanvir@example.test', age: 31, status: 'User', created_at: stamp };
        const sampleUsers = [userOne, userTwo];
        const sampleOrders = [
          { order_id: createLocalId(), user_id: userOne.id, product_name: 'পরীক্ষণ কিবোর্ড', quantity: 1, total_price: 1320, order_status: 'Processing', ordered_at: stamp },
          { order_id: createLocalId(), user_id: userTwo.id, product_name: 'QA নোটবুক', quantity: 2, total_price: 770, order_status: 'Pending', ordered_at: stamp }
        ];
        const sampleBugs = [
          { bug_id: `DEMO-${Date.now().toString(36).toUpperCase()}-01`, module_name: 'REQ-01 · Registration', bug_title: 'Validation message is not announced to screen readers', severity: 'Major', priority: 'High', status: 'Open', steps_to_reproduce: 'Submit the form with an invalid email.', expected_result: 'An accessible validation message is announced.', actual_result: 'The error is only shown visually.', reported_at: stamp },
          { bug_id: `DEMO-${Date.now().toString(36).toUpperCase()}-02`, module_name: 'REQ-02 · Orders', bug_title: 'Order summary does not refresh after editing quantity', severity: 'Minor', priority: 'Medium', status: 'In Progress', steps_to_reproduce: 'Change the quantity on the order form.', expected_result: 'The order summary updates immediately.', actual_result: 'The displayed total remains unchanged.', reported_at: stamp }
        ];
        SQA.loadedUsers = readGuestData('users', sampleUsers);
        SQA.loadedOrders = readGuestData('orders', sampleOrders);
        SQA.loadedBugReports = readGuestData('bugs', sampleBugs);
        guestDataLoaded = true;
        if (typeof SQA.suiteResults !== 'undefined') {
          SQA.suiteResults.clear();
          readGuestData('suite', []).forEach(([index, result]) => {
            if (Number.isInteger(index) && ['pass', 'fail'].includes(result)) SQA.suiteResults.set(index, result);
          });
        }
        if (typeof SQA.automationEntries !== 'undefined') SQA.automationEntries = readGuestData('automation', []);
        SQA.renderUsers();
        SQA.renderOrders(SQA.loadedOrders, SQA.loadedUsers);
        SQA.renderBugs(SQA.loadedBugReports);
        SQA.renderRtm();
        if (typeof SQA.renderChecklist === 'function') SQA.renderChecklist();
        if (typeof SQA.updateSuiteSummary === 'function') SQA.updateSuiteSummary();
        if (typeof SQA.renderAutomationLog === 'function') SQA.renderAutomationLog();
        SQA.loadStats();
        SQA.setLocalizedText(SQA.$('#database-message'), `${SQA.bnNumber(SQA.loadedUsers.length)} জন ডেমো ব্যবহারকারী, ${SQA.bnNumber(SQA.loadedOrders.length)}টি ডেমো অর্ডার এবং ${SQA.bnNumber(SQA.loadedBugReports.length)}টি ডেমো বাগ লোড হয়েছে।`);
      }
      function persistGuestProgress() {
        if (!SQA.isGuestMode) return true;
        try {
          saveGuestData('suite', [...SQA.suiteResults.entries()]);
          saveGuestData('automation', SQA.automationEntries);
          return true;
        } catch (error) {
          SQA.showToast(error.message, 'error');
          return false;
        }
      }
      function updateGuestVisibility() {
        SQA.$('#auth-screen').hidden = true;
        SQA.$('#app-shell').hidden = false;
        SQA.$('#guest-mode-banner').hidden = false;
        SQA.$('#signed-in-user').dataset.bn = 'Guest Tester (Demo)';
        SQA.$('#signed-in-user').dataset.en = 'Guest Tester (Demo)';
        SQA.$('#signed-in-user').textContent = 'Guest Tester (Demo)';
        const logoutLabel = SQA.$('#logout-button').querySelector('span') || SQA.$('#logout-button');
        SQA.setLocalizedText(logoutLabel, 'গেস্ট মোড বন্ধ করুন');
        SQA.applySiteSettings();
      }
      function enterGuestMode() {
        try {
          sessionStorage.setItem(guestStorageKeys.mode, 'true');
          SQA.isGuestMode = true;
          updateGuestVisibility();
          loadGuestData();
        } catch (error) {
          SQA.isGuestMode = false;
          try { sessionStorage.removeItem(guestStorageKeys.mode); }
          catch (storageError) { console.error('Could not clear the guest mode flag.', storageError); }
          SQA.showToast(error.message || (SQA.activeLanguage === 'bn' ? 'গেস্ট মোড শুরু করা যায়নি।' : 'Could not start Guest Mode.'), 'error');
        }
      }
      function leaveGuestMode() {
        try {
          Object.values(guestStorageKeys).forEach((key) => sessionStorage.removeItem(key));
          SQA.isGuestMode = false;
          SQA.$('#guest-mode-banner').hidden = true;
          SQA.$('#app-shell').hidden = true;
          SQA.$('#auth-screen').hidden = false;
          SQA.activeAuthUser = null;
          SQA.$('#signed-in-user').textContent = '';
          const logoutLabel = SQA.$('#logout-button').querySelector('span') || SQA.$('#logout-button');
          SQA.setLocalizedText(logoutLabel, 'লগআউট');
          SQA.setAuthMessage('গেস্ট সেশন বন্ধ করা হয়েছে।');
        } catch (error) {
          SQA.showToast(SQA.activeLanguage === 'bn'
            ? `গেস্ট সেশন পরিষ্কার করা যায়নি: ${error.message}`
            : `Could not clear the guest session: ${error.message}`, 'error');
        }
      }

  SQA.guest = { createLocalId, saveGuestData, readGuestData, loadGuestData, persistGuestProgress, updateGuestVisibility, enterGuestMode, leaveGuestMode, isLoaded: () => guestDataLoaded };
})();

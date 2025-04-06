/**
 * @file exercise-script.js
 * @description Handles the logic for the typing exercise page with UI/UX improvements.
 * @requires util.js (for SessionStorageUtil)
 * @requires tongwen-ts.js (for toSimp) - Assuming toSimp is globally available
 */

(function () {
    "use strict";

    // --- Configuration ---
    const config = {
        api: {
            submitExercise: "https://script.google.com/macros/s/AKfycbweAN6d6s9HmZLfWsigcb6eteHRxHcTPb-fy7nsgP7-TY2cP1JnLI4_x10M7inaYWeU5w/exec",
            updateUserRecord: "https://script.google.com/macros/s/AKfycbwNZeJW5Kv8qPdJq2BD24-NSTFJbDWVYhB4ZYlD4ORgrAmcGuqCkAODXmO_BvGJiSS4Hw/exec",
        },
        selectors: {
            username: "#username",
            userrole: "#userrole",
            correctCount: "#correctCount",
            incorrectCount: "#incorrectCount",
            accuracy: "#accuracy",
            currentWordCount: "#currentWordCount",
            totalWordCount: "#totalWordCount",
            exerciseText: "#exerciseText",
            inputField: "#inputField",
            submitBtn: "#submitBtn",
            loadingIcon: "#loading-icon",
            submissionFeedback: "#submission-feedback",
            inputSymbolButtons: ".input-symbol",
            characterElements: "#exerciseText .character", // Selector for ALL character divs
            logoutButton: "#logout-button",
            keyTableSidebar: "#keyTableSidebar",
            keyTableToggleButton: "#keyTableToggleButton",
            inputButtonsContainer: "#inputButtons",
            statItems: ".stat-item" // Selector for stat containers for animation
        },
        cssClasses: {
            characterCorrect: "correct",
            characterIncorrect: "incorrect",
            sidebarOpen: "open",
            activeCharacter: "active-char", // Class for the next character to type
            statUpdated: "updated" // Class for stat update animation
        },
        scrollOffset: 100,
        scrollDuration: 300,
        feedbackTimeout: 3500, // Slightly longer feedback display
        prohibitedKeys: { // Keeping user's preference
            ctrl: [67, 86, 88, 65], alt: true, fKeys: true,
            special: [9], functionKeysToAllow: [116, 122], debugKey: 123
        }
    };

    // --- DOM Element Cache ---
    const domElements = {};
    function cacheDOMElements() {
        let success = true;
        for (const key in config.selectors) {
            const elements = document.querySelectorAll(config.selectors[key]);
            if (elements.length === 0) {
                if (['inputField', 'exerciseText', 'submitBtn'].includes(key)) {
                    console.error(`Essential DOM element not found: ${config.selectors[key]}`);
                    success = false;
                }
                domElements[key] = null;
            } else if (elements.length === 1 && !key.endsWith('Buttons') && !key.endsWith('Elements') && !key.endsWith('Items')) { // Adjusted condition
                domElements[key] = elements[0];
            } else {
                domElements[key] = elements; // Store NodeList
            }
        }
         if (!domElements.inputButtonsContainer) {
             console.warn("Input buttons container (#inputButtons) not found.");
         }
        return success;
    }

    // --- State Management ---
    const state = {
        user: null,
        exercises: [],
        currentExercise: null,
        exerciseId: null,
        correctCount: 0,
        incorrectCount: 0,
        totalWordCount: 0,
        isSubmitting: false,
        lastScrollTarget: 0,
        feedbackTimeoutId: null,
        currentInputIndex: 0, // Track current typing position
        statUpdateTimeoutIds: {}, // Store timeouts for removing stat update class
        previousInputLength: 0
    };

    // --- Utility Functions ---
    /**
     * Gets data safely from Session Storage using SessionStorageUtil.
     * Ensures the data is parsed into an object/array.
     * @param {string} key The key to retrieve.
     * @returns {object | array | null} The parsed data or null if not found/invalid/parsing error.
     */
    function getDataFromSessionStorage(key) {
        try {
            const rawValue = SessionStorageUtil.getItem(key); // Util might return string or object
            if (rawValue !== null && rawValue !== undefined) {
                if (typeof rawValue === 'object') {
                    return rawValue; // Already parsed by util
                } else if (typeof rawValue === 'string') {
                    try {
                        return JSON.parse(rawValue); // Parse if it's a string
                    } catch (parseError) {
                        console.error(`Error parsing JSON string from Session Storage item "${key}":`, parseError, "\nString was:", rawValue);
                        return null;
                    }
                } else {
                    console.warn(`Value for "${key}" has unexpected type (${typeof rawValue}):`, rawValue);
                    return null;
                }
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error during SessionStorageUtil.getItem call for key "${key}":`, error);
            return null;
        }
    }

    function scrollToElement(targetElement, containerElement) {
        if (!targetElement || !containerElement) return;
        const containerRect = containerElement.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const desiredScrollTop = containerElement.scrollTop + targetRect.top - containerRect.top - config.scrollOffset;
        if (Math.abs(containerElement.scrollTop - desiredScrollTop) < 10) return;
        containerElement.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
    }

    function showFeedback(message, isError = false) {
        if (!domElements.submissionFeedback) return;
        domElements.submissionFeedback.textContent = message;
        // Use assertive for errors, polite for success
        domElements.submissionFeedback.setAttribute('aria-live', isError ? 'assertive' : 'polite');
        domElements.submissionFeedback.className = isError ? 'text-danger me-3' : 'text-success me-3';
        if (state.feedbackTimeoutId) clearTimeout(state.feedbackTimeoutId);
        state.feedbackTimeoutId = setTimeout(() => {
            if (domElements.submissionFeedback) domElements.submissionFeedback.textContent = "";
            state.feedbackTimeoutId = null;
        }, config.feedbackTimeout);
    }

    // --- API Interaction (No functional changes) ---
    async function submitExercise() {
        if (state.isSubmitting || !state.currentExercise || !state.user || !domElements.inputField) return;
        setSubmitButtonState(true); showFeedback("");
        const submissionData = {
            email: state.user.email, name: state.user.name, id: state.exerciseId,
            title: state.currentExercise.title, content: domElements.inputField.value,
            correctCount: state.correctCount, incorrectCount: state.incorrectCount,
            accuracy: calculateAccuracyPercentage(state.correctCount, state.incorrectCount, state.totalWordCount).toFixed(2),
            total: state.totalWordCount, time: new Date().toLocaleString("zh-HK")
        };
        try {
            const response = await fetch(config.api.submitExercise, {
                method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(submissionData)
            });
            if (!response.ok) {
                 let e = `HTTP status: ${response.status}`; try { const d=await response.json();e+=` - ${JSON.stringify(d)}`}catch(err){} throw new Error(`Network response was not ok. ${e}`);
            }
            await response.json(); // Process result if needed, currently ignored
            showFeedback("進度已成功儲存！", false);
            updateUserRecord(state.user.email).catch(err => console.warn("BG record update failed:", err));
        } catch (error) {
            console.error("Error submitting exercise progress:", error);
            showFeedback("儲存失敗，請稍後再試。", true);
        } finally {
            setSubmitButtonState(false);
        }
    }

    async function updateUserRecord(email) {
        // Keeping user's version
        if (!email) return;
        try {
            const response = await fetch(config.api.updateUserRecord, {
                method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ email })
            });
            if (!response.ok) throw new Error(`Update record failed: ${response.status}`);
            const data = await response.json();
            SessionStorageUtil.setItem("records", JSON.stringify(data)); // Potential double stringify
            console.log("User records updated successfully via background task.");
        } catch (error) {
            console.error("Error updating user records in background:", error);
        }
    }

    // --- UI Update Functions ---

    /**
     * Updates the statistics display elements and adds animation class.
     */
    function updateStatsDisplay() {
        const statsMap = {
            correctCount: state.correctCount,
            incorrectCount: state.incorrectCount,
            accuracy: formatAccuracy(state.correctCount, state.incorrectCount, state.totalWordCount),
            currentWordCount: domElements.inputField ? domElements.inputField.value.length : 0,
            totalWordCount: state.totalWordCount
        };

        for (const id in statsMap) {
            const element = domElements[id]; // Get cached element by ID
            if (element) {
                const newValue = String(statsMap[id]); // Ensure it's a string for comparison
                if (element.textContent !== newValue) {
                    element.textContent = newValue;
                    // --- Add animation class to parent ---
                    const statItem = element.closest('.stat-item');
                    if (statItem) {
                        statItem.classList.add(config.cssClasses.statUpdated);
                        // Clear previous timeout for this specific stat item if exists
                        if (state.statUpdateTimeoutIds[id]) {
                            clearTimeout(state.statUpdateTimeoutIds[id]);
                        }
                        // Remove the class after animation duration (e.g., 600ms)
                        state.statUpdateTimeoutIds[id] = setTimeout(() => {
                            statItem.classList.remove(config.cssClasses.statUpdated);
                            delete state.statUpdateTimeoutIds[id]; // Clean up timeout ID
                        }, 600);
                    }
                    // ------------------------------------
                }
            }
        }
        // Handle combined progress display separately if needed (already covered by currentWordCount/totalWordCount)
    }


    function setSubmitButtonState(isLoading) {
        state.isSubmitting = isLoading;
        if (!domElements.submitBtn || !domElements.loadingIcon || !domElements.inputField) return;
        domElements.loadingIcon.style.display = isLoading ? "inline-block" : "none";
        domElements.submitBtn.disabled = isLoading;
        domElements.inputField.disabled = isLoading;
        const icon = domElements.submitBtn.querySelector('i');
        const textSpan = domElements.submitBtn.querySelector('.button-text'); // Target the span
        if (isLoading) {
            if(icon) icon.className = 'bi bi-hourglass-split me-1';
            if(textSpan) textSpan.textContent = '儲存中...';
        } else {
            if(icon) icon.className = 'bi bi-save me-1';
            if(textSpan) textSpan.textContent = '儲存進度';
        }
    }

    function displayExercise(text1, text2) {
        if (!domElements.exerciseText) return;
        domElements.exerciseText.innerHTML = "";
        const keystrokes = text2 ? text2.split(" ") : [];
        const fragment = document.createDocumentFragment();
        if (!text1) {
            domElements.exerciseText.textContent = "練習內容為空。"; return;
        }
        text1.split("").forEach((char, index) => {
            const keyStroke = keystrokes[index] || "";
            const charContainer = document.createElement("div");
            charContainer.classList.add("character");
            const charSpan = document.createElement("span"); charSpan.textContent = char;
            const keyStrokeSub = document.createElement("sub"); keyStrokeSub.textContent = keyStroke;
            charContainer.appendChild(charSpan); charContainer.appendChild(keyStrokeSub);
            fragment.appendChild(charContainer);
        });
        domElements.exerciseText.appendChild(fragment);
        domElements.characterElements = domElements.exerciseText.querySelectorAll('.character'); // Re-cache
        updateActiveCharIndicator(0); // Set initial active character
    }

    /**
     * Updates character highlighting (correct/incorrect classes).
     */
    function updateCharacterHighlighting(inputChars, exerciseChars) {
        if (!domElements.characterElements || domElements.characterElements.length === 0) return;
        const converter = typeof OpenCC !== 'undefined' ? OpenCC.Converter({ from: 'hk', to: 'cn' }) : null;
        const compareChars = (char1, char2) => {
            if (!char1 || !char2) return false; if (char1 === char2) return true;
            if (converter) return converter(char1) === converter(char2); return false;
        };
        domElements.characterElements.forEach((element, i) => {
            const inputChar = inputChars[i];
            const exerciseChar = exerciseChars[i];
            element.classList.remove(config.cssClasses.characterCorrect, config.cssClasses.characterIncorrect);
            if (i < inputChars.length) {
                if (exerciseChar !== undefined) {
                    element.classList.add(compareChars(inputChar, exerciseChar) ? config.cssClasses.characterCorrect : config.cssClasses.characterIncorrect);
                }
                // No specific class for extra typed chars in the display area itself
            }
        });
    }

    /**
     * --- NEW: Updates the visual indicator for the next character to type ---
     * @param {number} index - The index of the character to highlight as active.
     */
    function updateActiveCharIndicator(index) {
        if (!domElements.characterElements) return;
        // Remove class from all characters first
        domElements.characterElements.forEach(el => el.classList.remove(config.cssClasses.activeCharacter));
        // Add class to the character at the current input index
        if (domElements.characterElements[index]) {
            domElements.characterElements[index].classList.add(config.cssClasses.activeCharacter);
        }
    }
    // --------------------------------------------------------------------

    // --- Calculation Functions ---
    function calculateAccuracyPercentage(correct, incorrect, totalTarget) {
        if (totalTarget <= 0) return 0;
        return Math.max(0, (correct / totalTarget) * 100);
    }
    function formatAccuracy(correct, incorrect, totalTarget) {
        const percentage = calculateAccuracyPercentage(correct, incorrect, totalTarget);
        return percentage > 0 ? percentage.toFixed(1) + "%" : "0%";
    }

    // --- Event Handlers ---
    function handleInput() {
        // --- 將檢測邏輯移到最前面 ---
        const currentInputLength = domElements.inputField.value.length;
        const changeInLength = currentInputLength - state.previousInputLength;
        const PASTE_THRESHOLD = 10;

        if (changeInLength > PASTE_THRESHOLD) {
            console.warn(`Potential paste/injection detected. Length changed by ${changeInLength}. Reverting.`);
            showFeedback("檢測到大量文本輸入，請逐字輸入。", true);
            // 使用 slice 恢復到上一次的狀態
            domElements.inputField.value = domElements.inputField.value.slice(0, state.previousInputLength);
            // 更新 currentInputLength 為恢復後的值
            // currentInputLength = state.previousInputLength; // 這行不需要，因為後續會重新讀取 value

            // --- 撤銷後直接返回，不再執行後續處理 ---
             // 在返回前，確保 previousInputLength 更新為 *恢復後* 的長度
             state.previousInputLength = domElements.inputField.value.length;
            return;
            // ---------------------------------------
        }
        // --- 檢測邏輯結束 ---


        // --- 正常處理流程 ---
        if (!state.currentExercise || !domElements.inputField || !domElements.exerciseText) return;

        // 重新獲取可能已被修改的 inputChars
        const inputChars = domElements.inputField.value.split("");
        const exerciseChars = state.currentExercise.text1.split("");
        const inputLength = inputChars.length; // 使用最新的長度

        // Recalculate internal state counts
        let currentCorrect = 0; let currentIncorrect = 0;
        const converter = typeof OpenCC !== 'undefined' ? OpenCC.Converter({ from: 'hk', to: 'cn' }) : null;
        const compareChars = (c1, c2) => { if(!c1||!c2)return false; if(c1===c2)return true; if(converter)return converter(c1)===converter(c2); return false; };
        for (let i = 0; i < state.totalWordCount; i++) {
            if (i < inputLength) { if (compareChars(inputChars[i], exerciseChars[i])) currentCorrect++; else currentIncorrect++; }
            else break;
        }
        if (inputLength > state.totalWordCount) currentIncorrect += (inputLength - state.totalWordCount);
        state.correctCount = currentCorrect; state.incorrectCount = currentIncorrect;

        // Update UI
        updateCharacterHighlighting(inputChars, exerciseChars);
        updateStatsDisplay();
        state.currentInputIndex = inputLength;
        updateActiveCharIndicator(state.currentInputIndex);

        // Scroll
        const targetElement = domElements.characterElements ? domElements.characterElements[state.currentInputIndex] : null;
        if (targetElement) {
            scrollToElement(targetElement, domElements.exerciseText);
        } else if (inputLength === 0 && domElements.characterElements && domElements.characterElements[0]) {
            scrollToElement(domElements.characterElements[0], domElements.exerciseText);
        }
        // --- 在函數末尾更新 previousInputLength ---
        state.previousInputLength = domElements.inputField.value.length;
        // ---------------------------------------
    }

    function preventDefaultAction(e) {
        // --- Add feedback specifically for paste attempts ---
        if (e.type === 'paste') {
            console.warn("Paste event blocked."); // Keep console log for debugging
            // Optional: Show a brief message to the user
            const feedbackElement = domElements.submissionFeedback; // Reuse submission feedback area
            // Or use a dedicated element: const feedbackElement = domElements.pasteFeedback;
            if (feedbackElement) {
                feedbackElement.textContent = "禁止貼上";
                feedbackElement.className = 'text-danger me-3'; // Use danger color
                // Clear message after a short delay
                setTimeout(() => {
                    // Only clear if the message is still the paste warning
                    if (feedbackElement.textContent === "禁止貼上") {
                         feedbackElement.textContent = "";
                         // Restore original class if needed, e.g., 'text-muted me-3'
                         feedbackElement.className = 'text-muted me-3';
                    }
                }, 1500); // Show message for 1.5 seconds
            }
        }
        // ----------------------------------------------------
    
        // Allow context menu by default for spellcheck, etc.
        if (e.type === 'contextmenu') {
             return;
        }
        e.preventDefault();
    }
    
    function checkForProhibitedActions(e) {
        const { ctrlKey, altKey, shiftKey, metaKey, key, keyCode } = e; const k = config.prohibitedKeys;
        if ((ctrlKey&&key==='r')||(ctrlKey&&shiftKey&&key==='r')||(ctrlKey&&shiftKey&&key==='i')||key==='F5'||key==='F11'||(key==='F12'&&!ctrlKey&&!altKey&&!shiftKey&&!metaKey)) return;
        if (ctrlKey && k.ctrl.includes(keyCode)) { e.preventDefault(); return; }
        if (altKey && k.alt) { e.preventDefault(); return; }
        if (k.special.includes(keyCode)) { e.preventDefault(); return; }
        const isFKey = keyCode >= 112 && keyCode <= 123;
        if (k.fKeys && isFKey && !k.functionKeysToAllow.includes(keyCode) && keyCode !== k.debugKey) { e.preventDefault(); return; }
    }
    function insertSymbolAtCursor(symbol) {
        if (!domElements.inputField) return;
        const { selectionStart, selectionEnd, value } = domElements.inputField;
        domElements.inputField.value = value.slice(0, selectionStart) + symbol + value.slice(selectionEnd);
        const newPos = selectionStart + symbol.length;
        domElements.inputField.setSelectionRange(newPos, newPos); domElements.inputField.focus();
        domElements.inputField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }
    function handleSymbolButtonClick(e) {
        const btn = e.target.closest(config.selectors.inputSymbolButtons);
        if (btn && btn.dataset.symbol) insertSymbolAtCursor(btn.dataset.symbol);
    }
    function logout() { SessionStorageUtil.clear(); window.location.href = "login.html"; }
    function toggleKeyTable() {
        if (domElements.keyTableSidebar && domElements.keyTableToggleButton) {
            const isOpen = domElements.keyTableSidebar.classList.toggle(config.cssClasses.sidebarOpen);
            domElements.keyTableToggleButton.setAttribute('aria-expanded', isOpen);
            const icon = domElements.keyTableToggleButton.querySelector('i');
            if (icon) icon.className = isOpen ? 'bi bi-x-lg' : 'bi bi-journal-text';
        }
    }

    // --- Initialization ---
    function initEventListeners() {
        if (!domElements.inputField) return;
        domElements.inputField.addEventListener("input", handleInput);
        const preventEvents = ["paste", "cut", "drop", "dragstart"];
        preventEvents.forEach(type => domElements.inputField.addEventListener(type, preventDefaultAction));
        domElements.inputField.addEventListener("keydown", checkForProhibitedActions);
        if (domElements.inputButtonsContainer) domElements.inputButtonsContainer.addEventListener("click", handleSymbolButtonClick);
        if (domElements.submitBtn) domElements.submitBtn.addEventListener("click", submitExercise);
        // --- Correct Logout Listener ---
        if (domElements.logoutButton) {
            domElements.logoutButton.addEventListener("click", function(event) {
                event.preventDefault(); logout();
            });
        }
        // -----------------------------
        if (domElements.keyTableToggleButton) domElements.keyTableToggleButton.addEventListener("click", toggleKeyTable);
    }

    function initPage() {
        // Keeping user's version of initPage logic as requested
        state.user = SessionStorageUtil.getItem("user");
        if (!state.user || typeof state.user !== 'object' || !state.user.email) { window.location.href = "login.html"; return false; }
        if (domElements.username) domElements.username.textContent = state.user.name || "用戶";
        if (domElements.userrole) domElements.userrole.textContent = state.user.permission || "學生";
        state.exerciseId = new URLSearchParams(window.location.search).get("id");
        if (!state.exerciseId) { if(domElements.exerciseText) domElements.exerciseText.textContent = "錯誤：缺少練習 ID。"; if(domElements.submitBtn) domElements.submitBtn.disabled = true; return false; }
        const exercisesData = getDataFromSessionStorage("exercises");
        if (!exercisesData || !Array.isArray(exercisesData.data)) { if(domElements.exerciseText) domElements.exerciseText.textContent = "錯誤：無法載入練習列表。"; if(domElements.submitBtn) domElements.submitBtn.disabled = true; return false; }
        state.exercises = exercisesData.data;
        state.currentExercise = state.exercises.find(ex => String(ex.id) === String(state.exerciseId));
        if (!state.currentExercise) { if(domElements.exerciseText) domElements.exerciseText.textContent = `錯誤：找不到 ID 為 ${state.exerciseId} 的練習。`; if(domElements.submitBtn) domElements.submitBtn.disabled = true; return false; }
        const text1 = state.currentExercise.text1 || ""; const text2 = state.currentExercise.text2 || "";
        state.totalWordCount = text1.length;
        displayExercise(text1, text2);
        if (domElements.totalWordCount) domElements.totalWordCount.textContent = state.totalWordCount;

        // --- 修正：初始化 previousInputLength ---
        const recordsData = getDataFromSessionStorage("records");
        const records = (recordsData && Array.isArray(recordsData.data)) ? recordsData.data : [];
        const record = records.find(rec => String(rec.id) === String(state.exerciseId));
        if (record) {
            if(domElements.inputField) domElements.inputField.value = record.text;
            state.correctCount = (typeof record.correct === 'number') ? record.correctCount : 0;
            state.incorrectCount = (typeof record.incorrect === 'number') ? record.incorrectCount : 0;
            state.previousInputLength = record.text ? record.text.length : 0; // 初始化為記錄的長度
            handleInput();
        } else {
            state.correctCount = 0; state.incorrectCount = 0;
            if(domElements.inputField) domElements.inputField.value = "";
            state.previousInputLength = 0; // 初始化為 0
            updateStatsDisplay();
        }
        // ------------------------------------

        if (domElements.inputField) domElements.inputField.focus();
        return true;
    }

    // --- Script Execution ---
    document.addEventListener("DOMContentLoaded", () => {
        if (cacheDOMElements()) {
            if (initPage()) { initEventListeners(); console.log("Exercise page initialized."); }
            else { console.error("Page initialization failed."); }
        } else {
             console.error("Failed to cache essential DOM elements.");
             document.body.innerHTML = '<p class="text-danger p-5">頁面載入錯誤。</p>';
        }
    });

})();
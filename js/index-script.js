/**
 * @file index-script.js (Refactored for Maintainability & UI/UX)
 * @description Handles the logic for the typing exercise list page.
 * @requires util.js (for SessionStorageUtil)
 */

(function () {
    "use strict";

    // --- Configuration ---
    const config = {
        api: {
            fetchExercises: "https://script.google.com/macros/s/AKfycbyV8R5HIWe7PoKQN9BOaBW5240Sebj3Ld9qUOtkM8p3H8WxBAyHeBpbM3kQNPg5OdAa/exec",
            fetchRecords: "https://script.google.com/macros/s/AKfycbwNZeJW5Kv8qPdJq2BD24-NSTFJbDWVYhB4ZYlD4ORgrAmcGuqCkAODXmO_BvGJiSS4Hw/exec",
            addExercise: "https://script.google.com/macros/s/exec" // Placeholder
            // editExercise: "...", // Add edit endpoint
            // deleteExercise: "...", // Add delete endpoint
        },
        selectors: {
            // Navbar
            username: "#username", userrole: "#userrole", logoutButton: "#logout-button",
            // Admin Section
            adminSection: "#admin-section", currentClassDisplay: "#currentClass",
            classListContainer: "#classListContainer", addExerciseBtn: "#addExerciseBtn",
            adminPanelBtn: "#adminPanelBtn", refreshListBtn: "#refreshListBtn", // Added refresh button
            // Exercise List
            exerciseTableBody: "#exercise-table-body", loadingRow: "#loading-row",
            emptyRow: "#empty-row", errorRow: "#error-row", // Added specific rows
            // Ranking List
            rankingTableBody: "#ranking-table-body",
            // Modal
            exerciseModal: "#exerciseModal", exerciseModalLabel: "#exerciseModalLabel",
            exerciseForm: "#exerciseForm", modalError: "#modalError",
            modalSubmitBtn: "#modalSubmitBtn", modalExerciseId: "#modalExerciseId",
            modalExerciseTitle: "#modalExerciseTitle", modalExerciseArticle: "#modalExerciseArticle",
            modalExerciseKeystrokes: "#modalExerciseKeystrokes",
            modalExerciseInputMethod: "#modalExerciseInputMethod", modalExerciseType: "#modalExerciseType",
        },
        cssClasses: {
            hidden: "d-none", // Bootstrap class for hiding
            formInvalid: "is-invalid", // Bootstrap validation class
            wasValidated: "was-validated" // Bootstrap validation state class
        },
        defaultClass: "1D"
    };

    // --- DOM Element Cache ---
    const domElements = {};
    let exerciseModalInstance = null;

    // --- State Management ---
    const state = {
        user: null,
        exercises: [],
        records: [],
        currentClass: null,
        isLoading: false,
        error: null, // Store error message
    };

    // --- Utility Functions ---
    function getDataFromSessionStorage(key) { /* ... (保持不變 - 使用者版本) ... */
        try {
            const rawValue = SessionStorageUtil.getItem(key);
            if (rawValue !== null && rawValue !== undefined) {
                if (typeof rawValue === 'object') return rawValue;
                else if (typeof rawValue === 'string') return JSON.parse(rawValue);
                else { console.warn(`Unexpected type for ${key}:`, rawValue); return null; }
            } else return null;
        } catch (error) { console.error(`Error getting/parsing ${key}:`, error); return null; }
    }
    async function fetchData(url, body = null) { /* ... (保持不變) ... */
        const options = { method: body ? "POST" : "GET", headers: { "Content-Type": "text/plain;charset=utf-8" }, };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(url, options);
        if (!response.ok) { const e = await response.text().catch(()=>''); throw new Error(`Network response was not ok (${response.status}). ${e}`); }
        return response.json();
    }
    function getProgressColor(progress) { /* ... (保持不變) ... */
        if (progress >= 100) return '#1E90FF'; if (progress >= 75) return '#28a745'; if (progress >= 55) return '#ffc107';
        if (progress >= 35) return '#fd7e14'; if (progress >= 15) return '#dc3545'; return '#6c757d';
    }

    // --- DOM Manipulation & Rendering ---
    function cacheDOMElements() { /* ... (保持不變) ... */
        let success = true;
        for (const key in config.selectors) {
            const elements = document.querySelectorAll(config.selectors[key]);
            if (elements.length === 0) {
                if (['exerciseTableBody', 'username', 'userrole', 'exerciseModal', 'loadingRow', 'emptyRow', 'errorRow'].includes(key)) { // Check essential elements including state rows
                    console.error(`Essential DOM element not found: ${config.selectors[key]}`);
                    success = false;
                }
                domElements[key] = null;
            } else if (elements.length === 1 && !key.endsWith('Buttons') && !key.endsWith('Items')) { domElements[key] = elements[0]; }
            else { domElements[key] = elements; }
        }
        if (domElements.exerciseModal) { exerciseModalInstance = new bootstrap.Modal(domElements.exerciseModal); }
        else { console.error("Exercise modal element not found."); success = false; }
        return success;
    }
    function updateUserDisplay() { /* ... (保持不變) ... */
        if (domElements.username) domElements.username.textContent = state.user?.name || "用戶";
        if (domElements.userrole) domElements.userrole.textContent = state.user?.permission || "未知";
        if (domElements.currentClassDisplay) domElements.currentClassDisplay.textContent = state.currentClass || config.defaultClass;
    }
    function toggleAdminFeatures() { /* ... (保持不變) ... */
        if (!domElements.adminSection) return;
        const isAdminOrTeacher = state.user && (state.user.permission === '教師' || state.user.permission === '管理員');
        domElements.adminSection.style.display = isAdminOrTeacher ? 'block' : 'none';
    }

    /** Shows the appropriate state row (loading, empty, error) and hides others. */
    function showTableStateRow(stateToShow) {
        const rows = {
            loading: domElements.loadingRow,
            empty: domElements.emptyRow,
            error: domElements.errorRow
        };
        // Hide all actual exercise rows if showing a state row
        if (domElements.exerciseTableBody && stateToShow !== 'none') {
            domElements.exerciseTableBody.querySelectorAll('tr:not(#loading-row):not(#empty-row):not(#error-row)')
                .forEach(row => row.style.display = 'none');
        }

        for (const key in rows) {
            if (rows[key]) {
                rows[key].style.display = (key === stateToShow) ? 'table-row' : 'none';
            }
        }
         // Update error message content if showing error
         if (stateToShow === 'error' && rows.error && state.error) {
             const errorMsgElement = rows.error.querySelector('td');
             if (errorMsgElement) errorMsgElement.innerHTML = `<i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>${state.error}`;
         }
    }

    /** Renders the list of exercises or an appropriate state message. */
    function renderExercisesList() {
        if (!domElements.exerciseTableBody) return;
        domElements.exerciseTableBody.innerHTML = ''; // Clear previous content

        // Re-append state rows (initially hidden)
        if(domElements.loadingRow) domElements.exerciseTableBody.appendChild(domElements.loadingRow);
        if(domElements.emptyRow) domElements.exerciseTableBody.appendChild(domElements.emptyRow);
        if(domElements.errorRow) domElements.exerciseTableBody.appendChild(domElements.errorRow);

        if (state.isLoading) {
            showTableStateRow('loading');
            return;
        }
        if (state.error) {
            showTableStateRow('error');
            return;
        }
        if (!state.exercises || state.exercises.length === 0) {
            showTableStateRow('empty');
            return;
        }

        showTableStateRow('none'); // Hide all state rows

        const recordsMap = new Map(state.records.map(record => [record.id, record.progress]));
        const fragment = document.createDocumentFragment();
        const isAdminOrTeacher = state.user && (state.user.permission === '教師' || state.user.permission === '管理員');

        state.exercises.forEach((exercise) => {
            const progress = recordsMap.get(exercise.id) || 0;
            const row = createExerciseRow(exercise, progress, isAdminOrTeacher);
            fragment.appendChild(row);
        });

        domElements.exerciseTableBody.appendChild(fragment); // Append actual exercise rows
    }

    /** Creates a single table row element for an exercise. */
    function createExerciseRow(exercise, progress, isAdminOrTeacher) { /* ... (保持不變) ... */
        const row = document.createElement('tr');
        const progressColor = getProgressColor(progress);
        const progressClass = progress >= 100 ? 'progress-bar-striped progress-bar-animated' : '';
        const progressText = `${progress}%`;
        row.innerHTML = `
            <td class="ps-3">${exercise.id || '-'}</td>
            <td>
                <h6 class="mb-1 font-13 fw-bold">${exercise.title || '無標題'}</h6>
                <span class="m-0 badge bg-secondary">${exercise.type || '未知'}</span>
            </td>
            <td>
                <div class="progress-text">${progressText}</div>
                <div class="progress" style="height: 8px;" title="${progressText}">
                    <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${progress}%; background-color: ${progressColor};" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </td>
            <td class="text-end pe-3">
                <a href="exercise.html?id=${exercise.id}" class="btn btn-primary btn-sm" title="開始練習 ${exercise.title}" aria-label="開始練習 ${exercise.title}">
                    <i class="fas fa-keyboard" aria-hidden="true"></i>
                </a>
                ${isAdminOrTeacher ? `
                    <button type="button" class="btn btn-outline-secondary btn-sm edit-exercise-btn" title="修改 ${exercise.title}" aria-label="修改 ${exercise.title}" data-exercise-id="${exercise.id}">
                        <i class="fa fa-cog" aria-hidden="true"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm delete-exercise-btn" title="刪除 ${exercise.title}" aria-label="刪除 ${exercise.title}" data-exercise-id="${exercise.id}">
                        <i class="fa fa-trash" aria-hidden="true"></i>
                    </button>
                ` : ''}
            </td>
        `;
        return row;
    }

    /** Renders the ranking list (Placeholder). */
     function renderRankingList() { /* ... (保持不變) ... */
        if (!domElements.rankingTableBody) return;
        domElements.rankingTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted"><i class="fas fa-chart-line me-1"></i> 此功能即將推出！</td></tr>';
    }

    // --- Modal Handling ---
    function openAddExerciseModal() { /* ... (保持不變) ... */
        if (!exerciseModalInstance || !domElements.exerciseForm || !domElements.exerciseModalLabel || !domElements.modalSubmitBtn) return;
        domElements.exerciseForm.reset();
        domElements.exerciseForm.classList.remove(config.cssClasses.wasValidated);
        domElements.exerciseForm.dataset.mode = 'add';
        domElements.exerciseForm.dataset.editingId = '';
        if(domElements.modalExerciseId) domElements.modalExerciseId.disabled = false;
        hideModalError();
        domElements.exerciseModalLabel.textContent = '新增題目';
        domElements.modalSubmitBtn.disabled = false;
        domElements.modalSubmitBtn.querySelector('.submit-text').textContent = '提交';
        domElements.modalSubmitBtn.querySelector('.spinner-border').style.display = 'none';
        exerciseModalInstance.show();
    }
    function openEditExerciseModal(exerciseId) { /* ... (保持不變) ... */
         if (!exerciseModalInstance || !domElements.exerciseForm || !domElements.exerciseModalLabel || !domElements.modalSubmitBtn) return;
         const exerciseToEdit = state.exercises.find(ex => ex.id === exerciseId);
         if (!exerciseToEdit) { showMainFeedback("找不到要編輯的題目。", true); return; } // Use main feedback
         if(domElements.modalExerciseId) domElements.modalExerciseId.value = exerciseToEdit.id;
         if(domElements.modalExerciseTitle) domElements.modalExerciseTitle.value = exerciseToEdit.title;
         if(domElements.modalExerciseArticle) domElements.modalExerciseArticle.value = exerciseToEdit.text1 || '';
         if(domElements.modalExerciseKeystrokes) domElements.modalExerciseKeystrokes.value = exerciseToEdit.text2 || '';
         if(domElements.modalExerciseInputMethod) domElements.modalExerciseInputMethod.value = exerciseToEdit.mode || '';
         if(domElements.modalExerciseType) domElements.modalExerciseType.value = exerciseToEdit.type;
         domElements.exerciseForm.classList.remove(config.cssClasses.wasValidated);
         domElements.exerciseForm.dataset.mode = 'edit';
         domElements.exerciseForm.dataset.editingId = exerciseId;
         if(domElements.modalExerciseId) domElements.modalExerciseId.disabled = true;
         hideModalError();
         domElements.exerciseModalLabel.textContent = '修改題目';
         domElements.modalSubmitBtn.disabled = false;
         domElements.modalSubmitBtn.querySelector('.submit-text').textContent = '更新';
         domElements.modalSubmitBtn.querySelector('.spinner-border').style.display = 'none';
         exerciseModalInstance.show();
    }

    /** Handles the submission of the add/edit exercise form with validation. */
    async function handleExerciseFormSubmit() {
        if (!domElements.exerciseForm || !domElements.modalSubmitBtn || !exerciseModalInstance) return;
        const form = domElements.exerciseForm;
        const mode = form.dataset.mode;
        const submitBtn = domElements.modalSubmitBtn;
        const submitText = submitBtn.querySelector('.submit-text');
        const spinner = submitBtn.querySelector('.spinner-border');

        hideModalError();
        form.classList.remove(config.cssClasses.wasValidated); // Reset validation state

        // Trigger Bootstrap validation
        if (!form.checkValidity()) {
            form.classList.add(config.cssClasses.wasValidated);
            // showModalError('請檢查並填寫所有必填欄位。'); // Let browser/Bootstrap handle field errors
            return; // Stop submission if form is invalid
        }

        // Gather data
        const exerciseData = {
            id: domElements.modalExerciseId.value.trim(),
            title: domElements.modalExerciseTitle.value.trim(),
            text1: domElements.modalExerciseArticle.value.trim(),
            text2: domElements.modalExerciseKeystrokes.value.trim(),
            mode: domElements.modalExerciseInputMethod.value.trim(),
            type: domElements.modalExerciseType.value.trim(),
        };

        // Set loading state
        submitBtn.disabled = true;
        if(submitText) submitText.textContent = (mode === 'edit' ? '更新中...' : '提交中...');
        if(spinner) spinner.style.display = 'inline-block';

        try {
            let responseData;
            if (mode === 'edit') {
                console.warn("Edit functionality API call not implemented.");
                throw new Error("編輯功能尚未實現");
                // responseData = await fetchData(config.api.editExercise, { ...exerciseData });
            } else {
                responseData = await fetchData(config.api.addExercise, exerciseData);
            }
            console.log(`Exercise ${mode} success:`, responseData);
            exerciseModalInstance.hide();
            showMainFeedback(`題目 ${mode === 'edit' ? '更新' : '新增'}成功！`, false); // Use main feedback
            await fetchAndRenderAll(); // Refresh list
        } catch (error) {
            console.error(`Error ${mode} exercise:`, error);
            showModalError(`操作失敗：${error.message}`); // Show error inside modal
            // Restore button state only on error, otherwise modal hides
            submitBtn.disabled = false;
            if(submitText) submitText.textContent = (mode === 'edit' ? '更新' : '提交');
            if(spinner) spinner.style.display = 'none';
        }
        // No finally block needed for restoring button if success hides modal
    }
    function showModalError(message) { /* ... (保持不變) ... */
        if (domElements.modalError) { domElements.modalError.textContent = message; domElements.modalError.style.display = 'block'; }
    }
    function hideModalError() { /* ... (保持不變) ... */
        if (domElements.modalError) { domElements.modalError.style.display = 'none'; }
    }
    /** Shows feedback in the main page area (e.g., using a temporary alert) */
    function showMainFeedback(message, isError = false) {
        // Simple implementation using a temporary alert div
        const alertType = isError ? 'alert-danger' : 'alert-success';
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = `alert ${alertType} alert-dismissible fade show main-feedback-alert`;
        feedbackDiv.setAttribute('role', 'alert');
        feedbackDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        // Prepend to page container
        domElements.pageContainer?.prepend(feedbackDiv); // Assuming pageContainer is cached

        // Auto-dismiss after a delay
        setTimeout(() => {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(feedbackDiv);
            if (alertInstance) {
                alertInstance.close();
            }
        }, 5000); // Dismiss after 5 seconds
    }


    // --- Data Loading ---
    async function loadInitialData() { /* ... (使用 renderExercisesList 顯示狀態) ... */
        state.isLoading = true; renderExercisesList(); // Show loading state via render function
        state.error = null;
        const storedExercises = getDataFromSessionStorage('exercises');
        const storedRecords = getDataFromSessionStorage('records');
        if (storedExercises && storedRecords) {
            console.log("Using data from SessionStorage.");
            state.exercises = storedExercises.data || (Array.isArray(storedExercises) ? storedExercises : []);
            state.records = storedRecords.data || (Array.isArray(storedRecords) ? storedRecords : []);
            state.isLoading = false;
            renderExercisesList(); renderRankingList();
        } else {
            console.log("Fetching data from server.");
            await fetchAndRenderAll();
        }
    }
    async function fetchAndRenderAll() { /* ... (使用 renderExercisesList 顯示狀態) ... */
        state.isLoading = true; state.error = null; renderExercisesList(); // Show loading
        try {
            const results = await Promise.allSettled([ loadExercises(), loadRecords() ]);
            if (results[0].status === 'rejected') { state.error = "無法載入練習列表。"; console.error("Failed to load exercises:", results[0].reason); }
            if (results[1].status === 'rejected') { console.error("Failed to load records:", results[1].reason); /* No critical error */ }
        } catch (error) { console.error('Error fetching all data:', error); state.error = "載入資料時發生錯誤。";
        } finally { state.isLoading = false; renderExercisesList(); renderRankingList(); } // Render final state
    }
    async function loadExercises() { /* ... (保持不變) ... */
        const classId = state.currentClass || config.defaultClass;
        const data = await fetchData(config.api.fetchExercises, { classid: classId });
        state.exercises = data?.data || (Array.isArray(data) ? data : []);
        SessionStorageUtil.setItem('exercises', data || { data: [] });
        return state.exercises;
    }
    async function loadRecords() { /* ... (保持不變) ... */
        const email = state.user?.email; if (!email) throw new Error("User email missing.");
        const data = await fetchData(config.api.fetchRecords, { email });
        state.records = data?.data || (Array.isArray(data) ? data : []);
        SessionStorageUtil.setItem('records', data || { data: [] });
        return state.records;
    }

    // --- Event Handlers ---
    function handleLogout(event) { /* ... (保持不變) ... */
        event.preventDefault(); SessionStorageUtil.clear(); window.location.href = 'login.html';
    }
    function handleClassChange(event) { /* ... (保持不變) ... */
        const target = event.target.closest('.class-item'); if (!target || !target.dataset.class) return;
        event.preventDefault(); const selectedClass = target.dataset.class;
        if (selectedClass === state.currentClass) return;
        state.currentClass = selectedClass; if (domElements.currentClassDisplay) domElements.currentClassDisplay.textContent = selectedClass;
        if (state.user) { state.user.class = selectedClass; SessionStorageUtil.setItem('user', state.user); }
        fetchAndRenderAll();
    }
    function handleTableActions(event) { /* ... (保持不變) ... */
        const editButton = event.target.closest('.edit-exercise-btn');
        const deleteButton = event.target.closest('.delete-exercise-btn');
        if (editButton) { const id = editButton.dataset.exerciseId; if (id) openEditExerciseModal(id); }
        else if (deleteButton) { const id = deleteButton.dataset.exerciseId; if (id) { if (confirm(`確定要刪除題目 "${id}" 嗎？`)) { console.warn(`Delete confirmed for ${id}. API call needed.`); /* handleDeleteExercise(id); */ } } }
    }
     /** Handles click on the refresh button */
     function handleRefreshClick() {
        console.log("Refreshing data...");
        const btn = domElements.refreshListBtn;
        const icon = btn?.querySelector('i');
        if (btn) btn.disabled = true;
        if (icon) icon.classList.add('fa-spin'); // Add spin animation
        // showMainFeedback("正在刷新列表...", false); // Optional: Use main feedback

        fetchAndRenderAll().finally(() => {
             if (btn) btn.disabled = false;
             if (icon) icon.classList.remove('fa-spin');
             // Optional: Show success feedback
             // showMainFeedback("列表已刷新", false);
        });
    }

    // --- Initialization ---
    function initEventListeners() { /* ... (添加了 refreshListBtn 監聽) ... */
        if (domElements.logoutButton) domElements.logoutButton.addEventListener('click', handleLogout);
        if (domElements.addExerciseBtn) domElements.addExerciseBtn.addEventListener('click', openAddExerciseModal);
        if (domElements.classListContainer) domElements.classListContainer.addEventListener('click', handleClassChange);
        if (domElements.modalSubmitBtn) domElements.modalSubmitBtn.addEventListener('click', handleExerciseFormSubmit);
        if (domElements.exerciseTableBody) domElements.exerciseTableBody.addEventListener('click', handleTableActions);
        if (domElements.refreshListBtn) domElements.refreshListBtn.addEventListener('click', handleRefreshClick); // Added listener
    }
    function loadUserState() { /* ... (保持不變) ... */
        state.user = getDataFromSessionStorage('user');
        if (!state.user || !state.user.email) { console.warn("User data invalid. Redirecting."); window.location.href = 'login.html'; return false; }
        state.currentClass = state.user.class || config.defaultClass; return true;
    }
    function init() { /* ... (保持不變) ... */
        if (!cacheDOMElements()) { document.body.innerHTML = '<p class="text-danger p-5">頁面初始化失敗。</p>'; return; }
        if (!loadUserState()) return;
        updateUserDisplay(); toggleAdminFeatures(); initEventListeners(); loadInitialData();
    }

    // --- Script Execution ---
    document.addEventListener('DOMContentLoaded', init);

})();
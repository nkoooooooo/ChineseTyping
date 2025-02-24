// 監聽 DOMContentLoaded 事件，確保所有 HTML 元素都已載入
document.addEventListener('DOMContentLoaded', function () {
  // 從 SessionStorage 獲取使用者資訊
  const user = SessionStorageUtil.getItem('user');

  // 檢查使用者是否已登入，如果沒有，則重定向到登入頁面
  if (!user) {
      return window.location.href = 'login.html';
  }

  // 更新頁面上的使用者名稱和角色
  document.getElementById('username').textContent = user.name;
  document.getElementById('userrole').textContent = user.permission;
  document.getElementById("currentClass").textContent = user.class;

  // 獲取管理員專區的 DOM 元素
  const adminSection = document.getElementById('admin-section');

  // 檢查使用者是否具有管理員或教師權限
  if (user.permission === '教師' || user.permission === '管理員') {
      // 如果是，則顯示管理員專區
      adminSection.style.display = 'block';

      // 為「新增題目」按鈕綁定點擊事件處理函數
      document.getElementById('addExerciseBtn').addEventListener('click', openAddExerciseModal);
  } else {
      // 如果不是，則隱藏管理員專區
      adminSection.style.display = 'none';
  }

  // 監聽班級切換事件
  const classList = document.getElementById("classList");
  classList.addEventListener("click", function (e) {
      if (e.target && e.target.classList.contains("class-item")) {
          e.preventDefault();
          const selectedClass = e.target.dataset.class;
          document.getElementById("currentClass").textContent = selectedClass;

          // 更新 SessionStorage 中的使用者班級資訊
          const currentUser = SessionStorageUtil.getItem('user');
          currentUser.class = selectedClass;
          SessionStorageUtil.setItem('user', currentUser);

          console.log("切換到班級：", selectedClass);

          // 顯示「加載中」提示
          const tableBody = document.querySelector('.table tbody');
          tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">加載中...</td></tr>';

          // 重新渲染練習列表
          fetchExercisesDataAndUserRecord();
      }
  });

  // 檢查 SessionStorage 中是否已存在練習題和使用者記錄資料
  if (getDataFromSessionStorage('exercises') && getDataFromSessionStorage('records')) {
      // 如果是，則直接渲染練習題列表
      renderExercisesList();
  } else {
      // 如果否，則從伺服器獲取練習題和使用者記錄資料
      fetchExercisesDataAndUserRecord();
  }
});

// 函數：打開新增練習題的模態框
function openAddExerciseModal() {
  // 創建模態框的 HTML 結構
  const modalHTML = `
  <div class="modal fade" id="addExerciseModal" tabindex="-1" aria-labelledby="addExerciseModalLabel" aria-hidden="true">
      <div class="modal-dialog">
          <div class="modal-content">
              <div class="modal-header">
                  <h5 class="modal-title" id="addExerciseModalLabel">新增題目</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                  <form id="addExerciseForm">
                      <div class="mb-3">
                          <label for="exerciseId" class="form-label">項目</label>
                          <input type="text" class="form-control" id="exerciseId" required>
                      </div>
                      <div class="mb-3">
                          <label for="exerciseTitle" class="form-label">標題</label>
                          <input type="text" class="form-control" id="exerciseTitle" required>
                      </div>
                      <div class="mb-3">
                          <label for="exerciseArticle" class="form-label">文章</label>
                          <textarea class="form-control" id="exerciseArticle" rows="5" required></textarea>
                      </div>
                      <div class="mb-3">
                          <label for="exerciseKeystrokes" class="form-label">文章鍵盤碼</label>
                          <textarea class="form-control" id="exerciseKeystrokes" rows="5" required></textarea>
                      </div>
                      <div class="mb-3">
                          <label for="exerciseInputMethod" class="form-label">輸入法</label>
                          <input type="text" class="form-control" id="exerciseInputMethod" required>
                      </div>
                      <div class="mb-3">
                          <label for="exerciseType" class="form-label">類型</label>
                          <input type="text" class="form-control" id="exerciseType" required>
                      </div>
                  </form>
              </div>
              <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                  <button type="button" class="btn btn-primary" onclick="submitNewExercise()">提交</button>
              </div>
          </div>
      </div>
  </div>
  `;

  // 將模態框 HTML 添加到 body 中
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // 顯示模態框
  const addExerciseModal = new bootstrap.Modal(document.getElementById('addExerciseModal'));
  addExerciseModal.show();

  // 監聽 modal 關閉事件, 在關閉時移除 modal, 避免重複添加
  addExerciseModal._element.addEventListener('hidden.bs.modal', function () {
      document.getElementById('addExerciseModal').remove();
  });
}

// 異步函數：提交新增的練習題
async function submitNewExercise() {
  // 獲取表單數據
  const exercise = {
      id: document.getElementById('exerciseId').value,
      title: document.getElementById('exerciseTitle').value,
      article: document.getElementById('exerciseArticle').value,
      keystrokes: document.getElementById('exerciseKeystrokes').value, // 使用正確的 ID
      input_method: document.getElementById('exerciseInputMethod').value,
      type: document.getElementById('exerciseType').value,
  };

  // 表單驗證
  if (!exercise.id || !exercise.title || !exercise.article || !exercise.input_method || !exercise.type) {
      alert('請填寫所有必填欄位！'); // 使用更友好的提示
      return;
  }

  // 顯示 loading 狀態
  const submitButton = document.querySelector('#addExerciseModal .btn-primary');
  submitButton.textContent = '提交中...';
  submitButton.disabled = true;
  const addExerciseModal = bootstrap.Modal.getInstance(document.getElementById('addExerciseModal'));

  // 發送請求到伺服器 (這裡使用你的 fetchData 函數)
  try {
      // 假設你的 API endpoint 可以接受一個新的 exercise 對象, 而且不需要再存入 SessionStorage
      const response = await fetchData('https://script.google.com/macros/s/exec', null, exercise);

      if (response) {
          // 關閉模態框
          addExerciseModal.hide();
          //成功後刷新
          await fetchExercisesDataAndUserRecord();
          alert('題目新增成功！');
      }


  } catch (error) {
      console.error('Error adding exercise:', error);
      alert('新增題目失敗：' + error.message); // 顯示錯誤信息
  } finally {
      // 恢復按鈕狀態
      submitButton.textContent = '提交';
      submitButton.disabled = false;
  }
}

// 異步函數：獲取練習題和使用者記錄資料
async function fetchExercisesDataAndUserRecord() {
  try {
      // 使用 Promise.all 並行獲取練習題和使用者記錄資料，提高效率
      await Promise.all([
          fetchExercisesData(),
          fetchUserRecord(),
      ]);

      // 資料獲取完成後，渲染練習題列表
      renderExercisesList();
  } catch (error) {
      // 捕獲並顯示錯誤
      console.error('Error fetching data:', error);
  }
}

// 異步函數：獲取練習題資料
async function fetchExercisesData() {
  console.log("Fetching exercises data");
  // 從 SessionStorage 獲取使用者資訊，並取得班級 ID
  const user = SessionStorageUtil.getItem('user');
  const classid = user.class;
  // 調用 fetchData 函數從伺服器獲取練習題資料
  return fetchData('https://script.google.com/macros/s/AKfycbyV8R5HIWe7PoKQN9BOaBW5240Sebj3Ld9qUOtkM8p3H8WxBAyHeBpbM3kQNPg5OdAa/exec', 'exercises', { classid });
}

// 異步函數：獲取使用者記錄資料
async function fetchUserRecord() {
  console.log("Fetching user record");
  // 從 SessionStorage 獲取使用者資訊，並取得使用者 Email
  const user = SessionStorageUtil.getItem('user');
  const email = user.email;
  // 調用 fetchData 函數從伺服器獲取使用者記錄資料
  return fetchData('https://script.google.com/macros/s/AKfycbwNZeJW5Kv8qPdJq2BD24-NSTFJbDWVYhB4ZYlD4ORgrAmcGuqCkAODXmO_BvGJiSS4Hw/exec', 'records', { email });
}

// 異步函數：從伺服器獲取資料
async function fetchData(url, storageKey, body = null) {
  // 根據是否有 body 參數，設定不同的請求選項
  const options = body ? {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
  } : {};

  try {
      // 發送請求到伺服器
      const response = await fetch(url, options);

      // 檢查回應是否成功
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }

      // 解析回應資料
      const data = await response.json();

      // 如果有 storageKey，則將資料儲存到 SessionStorage
      if (storageKey) {
          SessionStorageUtil.setItem(storageKey, JSON.stringify(data));
      }

      // 返回資料
      return data;
  } catch (error) {
      // 顯示錯誤訊息
      console.error(`Error fetching data from $:`, error);
  }
}

// 函數：從 Session Storage 讀取數據
function getDataFromSessionStorage(item) {
  // 從 SessionStorage 獲取指定項目
  const storedData = SessionStorageUtil.getItem(item);
  // 如果有資料，則解析 JSON 字串並返回，否則返回 null
  return storedData ? JSON.parse(storedData) : null;
}

// 函數：渲染打字練習列表
function renderExercisesList() {
  // 獲取表格的 tbody 元素
  const tableBody = document.querySelector('.table tbody');
  // 清空表格內容
  tableBody.innerHTML = '';

  // 從 SessionStorage 獲取練習題和使用者記錄資料
  const exercisesData = getDataFromSessionStorage('exercises');
  const recordsData = getDataFromSessionStorage('records');

  // 檢查 exercisesData 和 recordsData 是否存在且包含 data 屬性
  if (!exercisesData || !exercisesData.data || !recordsData || !recordsData.data) {
      console.error('練習題或使用者記錄資料未找到');
      tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">沒有可用的練習題</td></tr>';
      return;
  }

  const exercises = exercisesData.data;
  const records = recordsData.data;

  // 使用 Map 提高查找速度
  const recordsMap = new Map(records.map(record => [record.id, record.progress]));

  // 使用 DocumentFragment 提高效能
  const fragment = document.createDocumentFragment();

  // 遍歷練習題資料
  exercises.forEach((exercise) => {
      // 獲取練習題的進度，如果沒有則默認為 0
      const progress = recordsMap.get(exercise.id) || 0;
      // 創建表格行
      const row = createRow(exercise, progress);
      // 將表格行添加到 DocumentFragment
      fragment.appendChild(row);
  });

  // 將所有表格行一次性添加到表格中
  tableBody.appendChild(fragment);
}

// 函數：創建表格行
function createRow(exercise, progress) {
  // 創建 tr 元素
  const row = document.createElement('tr');
  // 根據進度獲取對應的顏色
  const progressColor = getProgressColor(progress);
  // 根據進度判斷是否添加動畫效果
  const progressClass = progress >= 100 ? 'progress-bar-striped progress-bar-animated' : '';

  // 獲取當前使用者資訊
  const user = SessionStorageUtil.getItem('user');
  // 判斷當前使用者是否為管理員或教師
  const isAdminOrTeacher = user && (user.permission === '教師' || user.permission === '管理員');

  const progressText = `${progress}%`;

  // 設定表格行的 HTML 內容
  row.innerHTML = `
          <td class="align-middle">
              <p>${exercise.id}</p>
          </td>
          <td class="align-middle">
              <h6 class="mb-1 font-13">${exercise.title}</h6>
              <span class="m-0 badge bg-secondary">${exercise.type}</span>
          </td>
          <td class="align-middle">
              <div class="progress-text">${progressText}</div>
              <div class="progress" data-height="6" style="height: 6px;">
                  <div class="progress-bar ${progressClass}" data-width="${progress}%" style="width: ${progress}%; background-color: ${progressColor};"></div>
              </div>
          </td>
          <td class="align-middle">
              <a href="exercise.html?id=${exercise.id}" data-toggle="tooltip" title="" data-original-title="view" style="color:#ffffff;">
              <button type="button" class="btn btn-primary btn-sm">
              <i class="fas fa-solid fa-magnifying-glass"></i></button></a>
              ${isAdminOrTeacher ? `
                  <button type="button" class="btn btn-secondary btn-sm" data-toggle="tooltip" title="修改設定" onclick="openEditExerciseModal('${exercise.id}')">
                      <i class="fa fa-cog" aria-hidden="true"></i>
                  </button>
              ` : ''}
          </td>
      `;
  // 返回創建的表格行
  return row;
}

// 函數：根據進度獲取對應的顏色
function getProgressColor(progress) {
  if (progress >= 100) return '#1E90FF'; // Blue
  if (progress >= 75) return '#28a745'; // Green
  if (progress >= 55) return '#ffc107'; // Yellow
  if (progress >= 35) return '#fd7e14'; // Orange
  if (progress >= 15) return '#dc3545'; // Red
  return '#6c757d'; // Grey for 0-24%
}

// 函數：登出
function logout() {
  // 清除登入狀態
  SessionStorageUtil.clear();
  // 重定向回登入介面
  window.location.href = 'login.html';
}
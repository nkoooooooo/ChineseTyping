document.addEventListener('DOMContentLoaded', function () {
  const user = SessionStorageUtil.getItem('user');
  if (!user) {
    return window.location.href = 'login.html';
  }

  // 更新用戶名稱及角色
  document.getElementById('username').textContent = user.name;
  document.getElementById('userrole').textContent = user.permission;

  // 顯示/隱藏管理員專區
  const adminSection = document.getElementById('admin-section');
  if (user.permission === '教師' || user.permission === '管理員') {
      adminSection.style.display = 'block'; // 顯示管理員專區

      // 綁定事件：新增題目 (這裡只是一個示例，你需要實現具體的邏輯)
      document.getElementById('addExerciseBtn').addEventListener('click', openAddExerciseModal);

  } else {
      adminSection.style.display = 'none'; // 隱藏管理員專區
  }

  // 載入數據
  if (getDataFromSessionStorage('exercises') && getDataFromSessionStorage('records')) {
    renderExercisesList();
  } else {
    fetchExercisesDataAndUserRecord();
  }
});

// 打開 "新增題目" 模態框
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

// 提交新題目
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

async function fetchExercisesDataAndUserRecord() {
  try {
    //const [exercisesData, userRecord] = 
    await Promise.all([
      fetchExercisesData(),
      fetchUserRecord(),
    ]);
    //console.log('All data loaded', { exercisesData, userRecord });
    renderExercisesList();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function fetchExercisesData() {
  console.log("Fetching exercises data");
  const classid = SessionStorageUtil.getItem('user').class;
  return fetchData('https://script.google.com/macros/s/AKfycbyV8R5HIWe7PoKQN9BOaBW5240Sebj3Ld9qUOtkM8p3H8WxBAyHeBpbM3kQNPg5OdAa/exec', 'exercises', {classid});
}

async function fetchUserRecord() {
  console.log("Fetching user record");
  const email = SessionStorageUtil.getItem('user').email;
  return fetchData('https://script.google.com/macros/s/AKfycbwNZeJW5Kv8qPdJq2BD24-NSTFJbDWVYhB4ZYlD4ORgrAmcGuqCkAODXmO_BvGJiSS4Hw/exec', 'records', { email });
}

async function fetchData(url, storageKey, body = null) {
  const options = body ? {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  } : {};

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    SessionStorageUtil.setItem(storageKey, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
  }
}

// 從 Session Storage 讀取數據的函數
function getDataFromSessionStorage(item) {
  const storedData = SessionStorageUtil.getItem(item);
  return storedData ? JSON.parse(storedData) : null;
}

//渲染打字練習列表
function renderExercisesList() {
  const tableBody = document.querySelector('.table tbody');
  tableBody.innerHTML = ''; // 清空现有内容

  const exercises = getDataFromSessionStorage('exercises').data;
  const records = getDataFromSessionStorage('records').data;

  // 使用 Map 提高查找速度
  const recordsMap = new Map(records.map(record => [record.id, record.progress]));

  // 使用 DocumentFragment 提高性能
  const fragment = document.createDocumentFragment();

  exercises.forEach((exercise) => {
    const progress = recordsMap.get(exercise.id) || 0; // 默认为 0
    const row = createRow(exercise, progress);
    fragment.appendChild(row);
  });

  tableBody.appendChild(fragment); // 一次性附加所有行
}

function createRow(exercise, progress) {
  const row = document.createElement('tr');
  const progressColor = getProgressColor(progress);
  const progressClass = progress >= 100 ? 'progress-bar-striped progress-bar-animated' : '';

  const user = SessionStorageUtil.getItem('user'); // 獲取當前用戶信息
  const isAdminOrTeacher = user && (user.permission === '教師' || user.permission === '管理員');

  row.innerHTML = `
          <td class="align-middle">
            <p>${exercise.id}</p>
          </td>
          <td class="align-middle">
            <h6 class="mb-1 font-13">${exercise.title}</h6>
            <span class="m-0 badge bg-secondary">${exercise.type}</span>
          </td>
          <td class="align-middle">
            <div class="progress-text">${progress}%</div>
            <div class="progress" data-height="6" style="height: 6px;">
              <div class="progress-bar ${progressClass}" data-width="${progress}%" style="width: ${progress}%; background-color: ${progressColor};""></div>
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
  return row;
}

function getProgressColor(progress) {
  if (progress >= 100) return '#1E90FF'; // Blue
  if (progress >= 75) return '#28a745'; // Green
  if (progress >= 55) return '#ffc107'; // Yellow
  if (progress >= 35) return '#fd7e14'; // Orange
  if (progress >= 15) return '#dc3545'; // Red
  return '#6c757d'; // Grey for 0-24%
}

function logout() {
  // 清除登录状态
  SessionStorageUtil.clear();
  // 重定向回登录界面
  window.location.href = 'login.html';
}

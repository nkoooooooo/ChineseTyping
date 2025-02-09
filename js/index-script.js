document.addEventListener('DOMContentLoaded', function () {
  const user = SessionStorageUtil.getItem('user');
  if (!user) {
    return window.location.href = 'login.html';
  }

  // 更新用戶名稱及角色
  document.getElementById('username').textContent = user.name;
  document.getElementById('userrole').textContent = user.permission;

  // 載入數據
  if (getDataFromSessionStorage('exercises') && getDataFromSessionStorage('records')) {
    renderExercisesList();
  }else {
    fetchExercisesDataAndUserRecord();
  }
});


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
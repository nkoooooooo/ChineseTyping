// 異步函數：提交練習結果到 Google 表單
async function submitExercise() {
  const exerciseId = new URLSearchParams(window.location.search).get("id");
  const exercisesData = getDataFromSessionStorage("exercises");

  if (!exercisesData || !exercisesData.data) {
      console.error("練習資料未找到");
      return;
  }
  const exercises = exercisesData.data;
  const exercise = exercises.find(ex => ex.id === exerciseId);
  const user = SessionStorageUtil.getItem("user");

  const inputField = document.getElementById("inputField");
  const correctCountElement = document.getElementById("correctCount");
  const incorrectCountElement = document.getElementById("incorrectCount");
  const accuracyElement = document.getElementById("accuracy");
  const totalWordCountElement = document.getElementById("totalWordCount");
  const submitBtn = document.getElementById("submitBtn");
  const loadingIcon = document.getElementById("loading-icon");

  const submissionData = {
      email: user.email,
      name: user.name,
      id: exerciseId,
      title: exercise.title,
      content: inputField.value,
      correctCount: correctCountElement.innerHTML,
      incorrectCount: incorrectCountElement.innerHTML,
      accuracy: accuracyElement.innerHTML.replace("%", ""),
      total: totalWordCountElement.innerHTML,
      time: new Date().toLocaleString()
  };

  loadingIcon.style.display = "block";
  submitBtn.disabled = true;
  submitBtn.classList.replace("btn-primary", "btn-secondary");
  submitBtn.textContent = "儲存中...";

  try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbweAN6d6s9HmZLfWsigcb6eteHRxHcTPb-fy7nsgP7-TY2cP1JnLI4_x10M7inaYWeU5w/exec", {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
          throw new Error(`Network response was not ok, status: ${response.status}`);
      }

      await updateUserRecord(user.email);

      loadingIcon.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.classList.replace("btn-secondary", "btn-primary");
      submitBtn.textContent = "儲存進度";
  } catch (error) {
      console.error("儲存練習進度時發生錯誤:", error);
      alert("儲存練習進度時發生錯誤，請檢查網路連線或稍後再試。");

      loadingIcon.style.display = "none";
      submitBtn.disabled = false;
      submitBtn.classList.replace("btn-secondary", "btn-primary");
      submitBtn.textContent = "儲存進度";
  }
}

// 異步函數：更新使用者記錄
async function updateUserRecord(email) {
  try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbwNZeJW5Kv8qPdJq2BD24-NSTFJbDWVYhB4ZYlD4ORgrAmcGuqCkAODXmO_BvGJiSS4Hw/exec", {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ email })
      });

      if (!response.ok) {
          throw new Error(`Network response was not ok, status: ${response.status}`);
      }

      const data = await response.json();
      SessionStorageUtil.setItem("records", JSON.stringify(data));
  } catch (error) {
      console.error("更新使用者記錄時發生錯誤:", error);
      alert("更新使用者記錄時發生錯誤，請檢查網路連線或稍後再試。");
  }
}

// 函數：更新 UI 元素
function updateUI(correctCount, incorrectCount, accuracy, currentWordCount) {
  document.getElementById("correctCount").textContent = correctCount;
  document.getElementById("incorrectCount").textContent = incorrectCount;
  document.getElementById("accuracy").textContent = accuracy;
  document.getElementById("currentWordCount").textContent = currentWordCount;
}

// 函數：處理文字輸入框的輸入
function handleInputField() {
  const inputField = document.getElementById("inputField");
  const exerciseId = new URLSearchParams(window.location.search).get("id");
  const exercisesData = getDataFromSessionStorage("exercises");

  if (!exercisesData || !exercisesData.data) {
      console.error("練習資料未找到");
      return;
  }
  const exercises = exercisesData.data;
  const exercise = exercises.find(ex => ex.id === exerciseId);

  if (!exercise) {
      console.error("找不到指定的練習");
      return;
  }

  const inputCharacters = inputField.value.replace(/\s/g, "").split("");
  const exerciseCharacters = exercise.text1.split("");
  const characterElements = document.querySelectorAll("#exerciseText .character");

  let correctCount = 0;
  let incorrectCount = 0;
  const updates = [];

  characterElements.forEach((element, index) => {
      const inputChar = inputCharacters[index];
      let color = "";

      if (inputChar) {
          const simplifiedInputChar = toSimp(inputChar);
          const simplifiedExerciseChar = toSimp(exerciseCharacters[index]);

          if (simplifiedInputChar === simplifiedExerciseChar) {
              color = "green";
              correctCount++;
          } else {
              color = "red";
              incorrectCount++;
          }
      }

      updates.push({ element, color });
  });

  updates.forEach(({ element, color }) => {
      element.style.color = color;
  });

  for (let i = inputCharacters.length; i < characterElements.length; i++) {
      characterElements[i].style.color = "";
  }

  const totalCount = inputCharacters.length;
  const accuracy = exerciseCharacters.length > 0 ? ((correctCount / exerciseCharacters.length) * 100).toFixed(2) + "%" : "0.00%";

  updateUI(correctCount, incorrectCount, accuracy, totalCount);

  if (inputCharacters.length > 0) {
      smoothScrollTo(characterElements[Math.max(0, inputCharacters.length - 1)].offsetTop - 190);
  }
}

// 函數：平滑滾動到指定位置
function smoothScrollTo(target) {
  const exerciseText = document.getElementById("exerciseText");
  const start = exerciseText.scrollTop;
  const change = target - start;
  const duration = 1000;
  let currentTime = 0;

  function animateScroll() {
      currentTime += 20;
      const val = Math.easeInOutQuad(currentTime, start, change, duration);

      requestAnimationFrame(() => {
          exerciseText.scrollTop = val;
      });

      if (currentTime < duration) {
          requestAnimationFrame(animateScroll);
      }
  }

  requestAnimationFrame(animateScroll);
}

// 函數：計算平滑滾動的數值
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d / 2;
  if (t < 1) return c / 2 * t * t + b;
  t--;
  return -c / 2 * (t * (t - 2) - 1) + b;
};

// 函數：阻止預設行為
function preventDefaultAction(e) {
  e.preventDefault();
}

// 函數：檢查是否觸發禁止的行為
function checkForProhibitedActions(e) {
  const isCtrlKey = e.ctrlKey;
  const isProhibitedKey = [67, 86, 88, 65, 83, 123].includes(e.keyCode);
  const isAltKey = e.altKey;
  const isSpecialKey = [32, 9, 13].includes(e.keyCode);
  const isFKey = e.keyCode >= 112 && e.keyCode <= 123 && e.keyCode !== 116;

  if ((isCtrlKey && isProhibitedKey) || isAltKey || isFKey || isSpecialKey) {
      e.preventDefault();
  }
}

// 函數：在游標位置插入符號
function insertSymbolAtCursor(symbol) {
  const inputField = document.getElementById("inputField");
  const { selectionStart } = inputField;
  const value = inputField.value;

  inputField.value = value.slice(0, selectionStart) + symbol + value.slice(selectionStart);
  inputField.setSelectionRange(selectionStart + symbol.length, selectionStart + symbol.length);
  inputField.focus();
  handleInputField();
}

// 函數：顯示練習內容
function displayExercise(text1) {
  const exerciseText = document.getElementById("exerciseText");
  exerciseText.innerHTML = "";

  text1.split("").forEach((char, index) => {
      const charElement = document.createElement("div");
      charElement.classList.add("character");
      charElement.innerHTML = `<span>${char}</span>`;
      exerciseText.appendChild(charElement);
  });
}

// 函數：從 SessionStorage 中獲取資料
function getDataFromSessionStorage(key) {
  const item = SessionStorageUtil.getItem(key);
  return item ? JSON.parse(item) : null;
}

// 函數：登出
function logout() {
  SessionStorageUtil.clear();
  window.location.href = "login.html";
}

// 函數：初始化事件監聽器
function initEventListeners() {
  const inputField = document.getElementById("inputField");

  inputField.addEventListener("input", handleInputField);
  inputField.addEventListener("paste", preventDefaultAction);
  inputField.addEventListener("copy", preventDefaultAction);
  inputField.addEventListener("cut", preventDefaultAction);
  inputField.addEventListener("drop", preventDefaultAction);
  inputField.addEventListener("dblclick", preventDefaultAction);
  inputField.addEventListener("dragstart", preventDefaultAction);
  inputField.addEventListener("selectstart", preventDefaultAction);
  inputField.addEventListener("contextmenu", preventDefaultAction);
  inputField.addEventListener("mousemove", preventDefaultAction);
  inputField.addEventListener("keydown", checkForProhibitedActions);

  const symbolButtons = document.querySelectorAll(".input-symbol");
  symbolButtons.forEach(symbolBtn => {
      symbolBtn.addEventListener("click", function () {
          insertSymbolAtCursor(this.dataset.symbol);
      });
  });
}

// 函數：初始化頁面
function initPage() {
  const user = SessionStorageUtil.getItem("user");
  if (!user) {
      window.location.href = "login.html";
      return;
  }

  document.getElementById("username").textContent = user.name;
  document.getElementById("userrole").textContent = user.permission;

  const exerciseId = new URLSearchParams(window.location.search).get("id");
  const recordsData = getDataFromSessionStorage("records");

  if (!recordsData || !recordsData.data) {
      console.warn("使用者記錄未找到");
  }
  const records = recordsData ? recordsData.data : [];
  const record = records.find(rec => rec.id === exerciseId);

  if (record) {
      updateUI(record.correct, record.incorrect, ((record.correct / record.word) * 100).toFixed(2) + "%", record.text.length);
      document.getElementById("inputField").value = record.text;
  }

  const exercisesData = getDataFromSessionStorage("exercises");
  if (!exercisesData || !exercisesData.data) {
      console.error("練習資料未找到");
      return;
  }
  const exercises = exercisesData.data;
  const exercise = exercises.find(ex => ex.id === exerciseId);

  if (exercise) {
      displayExercise(exercise.text1);
      document.getElementById("totalWordCount").textContent = exercise.text1.length;
  }
}

// DOMContentLoaded 事件監聽器：在 DOM 載入完成後執行
document.addEventListener("DOMContentLoaded", () => {
  initPage();
  initEventListeners();
  handleInputField();
});
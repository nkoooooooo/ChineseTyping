async function submitExercise() {
  const exerciseId = new URLSearchParams(window.location.search).get("id");
  const exercises = getDataFromSessionStorage("exercises").data;
  const exercise = exercises.find(ex => ex.id === exerciseId);
  const user = SessionStorageUtil.getItem("user");

  const inputField = document.getElementById("inputField");
  const correctCount = document.getElementById("correctCount");
  const incorrectCount = document.getElementById("incorrectCount");
  const accuracy = document.getElementById("accuracy");
  const totalWordCount = document.getElementById("totalWordCount");
  const submitBtn = document.getElementById("submitBtn");
  const loadingIcon = document.getElementById("loading-icon");

  const submissionData = {
    email: user.email,
    name: user.name,
    id: exerciseId,
    title: exercise.title,
    content: inputField.value,
    correctCount: correctCount.innerHTML,
    incorrectCount: incorrectCount.innerHTML,
    accuracy: accuracy.innerHTML.replace("%", ""),
    total: totalWordCount.innerHTML,
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

    if (!response.ok) throw new Error("Network response was not ok");

    await updateUserRecord(user.email);

    loadingIcon.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.classList.replace("btn-secondary", "btn-primary");
    submitBtn.textContent = "儲存進度";
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function updateUserRecord(email) {
  try {
    const response = await fetch("https://script.google.com/macros/s/AKfycbwNZeJW5Kv8qPdJq2BD24-NSTFJbDWVYhB4ZYlD4ORgrAmcGuqCkAODXmO_BvGJiSS4Hw/exec", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ email })
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    SessionStorageUtil.setItem("records", JSON.stringify(data));
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function handleInputField() {
  const inputField = document.getElementById("inputField");
  const exerciseId = new URLSearchParams(window.location.search).get("id");
  const exercise = getDataFromSessionStorage("exercises").data.find(ex => ex.id === exerciseId);

  const inputCharacters = inputField.value.replace(/\s/g, "").split("");
  const exerciseCharacters = exercise.text1.split("");
  const characterElements = document.querySelectorAll("#exerciseText .character");

  let correctCount = 0;
  let incorrectCount = 0;

  characterElements.forEach((element, index) => {
    const inputChar = inputCharacters[index];
    if (inputChar) {
      if (inputChar === exerciseCharacters[index]) {
        element.style.color = "green";
        correctCount++;
      } else {
        element.style.color = "red";
        incorrectCount++;
      }
    } else {
      element.style.color = "";
    }
  });

  for (let i = inputCharacters.length; i < characterElements.length; i++) {
    characterElements[i].style.color = "";
  }

  const totalCount = inputCharacters.length;
  const accuracy = ((correctCount / exerciseCharacters.length) * 100).toFixed(2) + "%";

  document.getElementById("currentWordCount").textContent = totalCount;
  document.getElementById("correctCount").textContent = correctCount;
  document.getElementById("incorrectCount").textContent = incorrectCount;
  document.getElementById("accuracy").textContent = accuracy;

  smoothScrollTo(characterElements[Math.max(0, inputCharacters.length - 1)].offsetTop - 115);
}

function smoothScrollTo(target) {
  const exerciseText = document.getElementById("exerciseText");
  const start = exerciseText.scrollTop;
  const change = target - start;
  const duration = 1000;
  let currentTime = 0;

  function animateScroll() {
    currentTime += 20;
    const val = Math.easeInOutQuad(currentTime, start, change, duration);
    exerciseText.scrollTop = val;
    if (currentTime < duration) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

Math.easeInOutQuad = function (t, b, c, d) {
  t /= d / 2;
  if (t < 1) return c / 2 * t * t + b;
  t--;
  return -c / 2 * (t * (t - 2) - 1) + b;
};

function preventDefaultAction(e) {
  e.preventDefault();
}

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

function insertSymbolAtCursor(symbol) {
  const inputField = document.getElementById("inputField");
  const { selectionStart } = inputField;
  const value = inputField.value;

  inputField.value = value.slice(0, selectionStart) + symbol + value.slice(selectionStart);
  inputField.setSelectionRange(selectionStart + symbol.length, selectionStart + symbol.length);
  inputField.focus();
}

function displayExercise(text1, text2) {
  const exerciseText = document.getElementById("exerciseText");
  exerciseText.innerHTML = "";

  text1.split("").forEach((char, index) => {
    const subText = text2.split(" ")[index] || "";
    const charElement = document.createElement("div");
    charElement.classList.add("character");
    charElement.innerHTML = `<span>${char}</span><sub>${subText}</sub>`;
    exerciseText.appendChild(charElement);
  });
}

function getDataFromSessionStorage(key) {
  const item = SessionStorageUtil.getItem(key);
  return item ? JSON.parse(item) : null;
}

function logout() {
  SessionStorageUtil.clear();
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const user = SessionStorageUtil.getItem("user");
  if (!user) return window.location.href = "login.html";

  document.getElementById("username").textContent = user.name;
  document.getElementById("userrole").textContent = user.type;

  const exerciseId = new URLSearchParams(window.location.search).get("id");
  const records = getDataFromSessionStorage("records").data;
  const record = records.find(rec => rec.id === exerciseId);

  if (record) {
    document.getElementById("correctCount").textContent = record.correct;
    document.getElementById("incorrectCount").textContent = record.incorrect;
    document.getElementById("accuracy").textContent = ((record.correct / record.word) * 100).toFixed(2) + "%";
    document.getElementById("inputField").value = record.text;
    document.getElementById("currentWordCount").textContent = record.text.length;
  }

  const exercises = getDataFromSessionStorage("exercises").data;
  const exercise = exercises.find(ex => ex.id === exerciseId);

  if (exercise) {
    displayExercise(exercise.text1, exercise.text2);
    document.getElementById("totalWordCount").textContent = exercise.text1.length;
  }

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

  document.querySelectorAll(".input-symbol").forEach(symbolBtn => {
    symbolBtn.addEventListener("click", function () {
      insertSymbolAtCursor(this.dataset.symbol);
      handleInputField();
    });
  });

  handleInputField();
});
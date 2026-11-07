// Where the Python API is running
const API_URL = "http://localhost:8005";

// Data the page keeps track of
let questions = [];    // the list of questions from the API
let currentIndex = 0;  // which question is showing in the main area
let editingId = null;  // the id of the question currently being edited

// Grab the HTML elements we need (CSS-style selectors: "#id" or ".class")
const previewList = document.querySelector("#preview-list");
const cardArea = document.querySelector("#card-area");
const errorMessage = document.querySelector("#error-message");
const newQuestion = document.querySelector("#new-question");
const newAnswer = document.querySelector("#new-answer");
const editDialog = document.querySelector("#edit-dialog");
const editQuestion = document.querySelector("#edit-question");
const editAnswer = document.querySelector("#edit-answer");
const prevButton = document.querySelector("#prev-button");
const nextButton = document.querySelector("#next-button");  
const counter = document.querySelector("#counter");
// TODO: grab references to any necessary elements you added to index.html (search, counter, prev/next buttons)


// ---------- Errors ----------

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}


// ---------- Talking to the API ----------

async function apiGet(path) {
  try {
    const response = await fetch(API_URL + path);
    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }
    return await response.json();
  } catch (error) {
    showError("Could not reach API: " + error.message);
    return [];
  }
}

async function apiSend(method, path, data) {
  try {
    const response = await fetch(API_URL + path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }
    return true;
  } catch (error) {
    showError("Could not reach API: " + error.message);
    return false;
  }
}


// ---------- Showing the page ----------

// Get the questions from the API, then redraw everything.
async function renderPage() {
  hideError();
  questions = await apiGet("/questions");
  showPage();
}

// Redraw the sidebar and the main card from the data we already have.
function showPage() {
  // keep currentIndex inside the list (e.g. after a delete)
  if (currentIndex >= questions.length) currentIndex = questions.length - 1;
  if (currentIndex < 0) currentIndex = 0;
  renderPreviews();
  showCard();
  updateCounter();
}

// Sidebar: one preview per question. Clicking a preview shows that card.
function renderPreviews() {
  previewList.innerHTML = "";
  questions.forEach(function (question, index) {
    const preview = document.createElement("div");
    preview.className = "preview";
    if (index === currentIndex) {
      preview.classList.add("active");
    }
    preview.textContent = question.q;
    preview.addEventListener("click", function () {
      currentIndex = index;
      showPage();
    });
    previewList.append(preview);
  });
}

// Create a card to represent current question/answer (stored at questions[currentIndex])
function showCard() {
  cardArea.innerHTML = "";
  if (questions.length === 0) {
    cardArea.textContent = "No questions to show.";
    return;
  }
  const question = questions[currentIndex];

  const card = document.createElement("div");
  card.className = "card";

  const deleteButton = document.createElement("button");
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function () {
    deleteQuestion(question);
  });

  const editButton = document.createElement("button");
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    openEditDialog(question);
  });

  const questionText = document.createElement("p");
  questionText.className = "question";
  questionText.textContent = question.q;

  const answerText = document.createElement("p");
  answerText.className = "answer hidden";
  answerText.textContent = question.a;

  questionText.addEventListener("click", function () {
    answerText.classList.toggle("hidden");
  });

  card.append(editButton, deleteButton, questionText, answerText);
  cardArea.append(card);
}


// ---------- Navigation and search ----------


async function goToPrevious() {
  if (questions.length === 0) return;
  currentIndex = (currentIndex - 1 + questions.length) % questions.length;
  showPage();
}
async function goToNext() {
  if (questions.length === 0) return;
  currentIndex = (currentIndex + 1) % questions.length;
  showPage();
}

prevButton.addEventListener("click", goToPrevious);
nextButton.addEventListener("click", goToNext);



function updateCounter() {
  counter.textContent = questions.length === 0
    ? "0 / 0"
    : `${currentIndex + 1} / ${questions.length}`;
}


// ---------- Actions ----------

function getValidatedCardData(question, answer) {
  const trimmedQuestion = question.trim();
  const trimmedAnswer = answer.trim();

  if (!trimmedQuestion || !trimmedAnswer) {
    showError("Question and answer cannot be empty.");
    return null;
  }

  return {
    question: trimmedQuestion,
    answer: trimmedAnswer
  };
}

async function deleteQuestion(question) {
  await apiSend("DELETE", "/delete/" + question.id);
  renderPage();
}

function openEditDialog(question) {
  editingId = question.id;
  editQuestion.value = question.q;
  editAnswer.value = question.a;
  editDialog.showModal();
}

document.querySelector("#close-dialog").addEventListener("click", function () {
  editDialog.close();
});

document.querySelector("#update-button").addEventListener("click", async function () {
  const cardData = getValidatedCardData(editQuestion.value, editAnswer.value);
  if (!cardData) return;

  editDialog.close();
  await apiSend("PUT", "/update/" + editingId, cardData);
  renderPage();
});

document.querySelector("#add-button").addEventListener("click", async function () {
  const cardData = getValidatedCardData(newQuestion.value, newAnswer.value);
  if (!cardData) return;

  await apiSend("POST", "/add", cardData);
  newQuestion.value = "";
  newAnswer.value = "";
  currentIndex = questions.length;
  renderPage();
});


// ---------- Start the app ----------
renderPage();
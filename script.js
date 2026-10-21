"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const promptInput = $("#promptInput");
const sendBtn = $("#sendBtn");
const messagesEl = $("#messages");
const welcomeEl = $("#welcome");
const historyList = $("#historyList");
const pageTitle = $("#pageTitle");

let currentTool = "chat";
let currentChatId = null;
let chats = loadChats();
let isBusy = false;

const toolNames = {
  chat: "AI Chat",
  builder: "App Builder",
  coding: "AI Coding",
  image: "Image Studio",
  video: "Video Studio",
  music: "Music Studio",
  projects: "My Projects"
};

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem("nexus_chats") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveChats() {
  try {
    localStorage.setItem("nexus_chats", JSON.stringify(chats));
  } catch {
    alert("Browser storage is full. Some chat history may not be saved.");
  }
}

function createChat() {
  const chat = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    title: "New conversation",
    tool: currentTool,
    messages: [],
    createdAt: new Date().toISOString()
  };

  chats.unshift(chat);
  currentChatId = chat.id;
  saveChats();
  renderHistory();
  renderCurrentChat();
}

function getCurrentChat() {
  return chats.find(chat => chat.id === currentChatId) || null;
}

function renderHistory() {
  historyList.replaceChildren();

  chats.slice(0, 30).forEach(chat => {
    const button = document.createElement("button");
    button.className = "history-item" + (chat.id === currentChatId ? " active" : "");
    button.type = "button";

    const icon = document.createElement("span");
    icon.textContent = "◷";

    const title = document.createElement("span");
    title.textContent = chat.title || "New conversation";

    button.append(icon, title);
    button.addEventListener("click", () => {
      currentChatId = chat.id;
      currentTool = chat.tool || "chat";
      updateToolUI();
      renderHistory();
      renderCurrentChat();
      closeSidebar();
    });

    historyList.appendChild(button);
  });
}

function renderCurrentChat() {
  messagesEl.replaceChildren();

  const chat = getCurrentChat();

  if (!chat || chat.messages.length === 0) {
    welcomeEl.hidden = false;
    return;
  }

  welcomeEl.hidden = true;

  chat.messages.forEach(message => {
    addMessageToDOM(message.role, message.content);
  });
}

function addMessageToDOM(role, content, extraClass = "") {
  const row = document.createElement("div");
  row.className = `message ${role} ${extraClass}`.trim();

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✦";

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = content;

    row.append(avatar, body);
  } else {
    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = content;
    row.appendChild(body);
  }

  messagesEl.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return row;
}

function addMessage(role, content) {
  const chat = getCurrentChat();
  if (!chat) return;

  chat.messages.push({ role, content });

  if (role === "user" && chat.title === "New conversation") {
    chat.title = content.slice(0, 32) + (content.length > 32 ? "…" : "");
  }

  saveChats();
  renderHistory();
  addMessageToDOM(role, content);
  welcomeEl.hidden = true;
}

/*
 * DEMO RESPONSE ONLY.
 * Real AI responses require a backend that calls an AI provider.
 * Never place a private API key in this frontend JavaScript.
 */
function getDemoResponse(prompt, tool) {
  const lower = prompt.toLowerCase();

  if (tool === "builder") {
    return "App Builder selected.\n\nYour project idea has been received by this demo interface. The next step is connecting a secure backend that can generate project files, run tests, and prepare builds.\n\nNo app has been generated or compiled yet.";
  }

  if (tool === "coding" || lower.includes("code") || lower.includes("html")) {
    return "AI Coding selected.\n\nI can display and organize coding requests in this prototype, but a real AI model is not connected yet.\n\nNext step: connect a secure backend and an AI model to generate actual code, explain errors, and help test your project.";
  }

  if (tool === "image" || tool === "video" || tool === "music") {
    return `${toolNames[tool]} selected.\n\nThis screen is currently a user-interface prototype. Actual media generation requires connecting a compatible generation service. No image, video, or music has been generated yet.`;
  }

  if (tool === "projects") {
    return "My Projects\n\nYour chat history is saved locally in this browser. A full project manager will need a backend for project files, cloud storage, versions, build logs, and downloads.";
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("namaste")) {
    return "Namaste! 👋 Welcome to Nexus AI.\n\nThis is the first frontend prototype. The chat interface and local chat history work, but real AI replies are not connected yet.\n\nYou can start by selecting AI Coding or App Builder from the sidebar.";
  }

  return "Your message has been added to Nexus AI's demo chat.\n\nImportant: this version does not yet connect to a real AI model, so it cannot generate a genuine AI answer.\n\nThe next development step is a secure backend API connection. Your private API key should stay on the server, never in this file.";
}

function setBusy(busy) {
  isBusy = busy;
  sendBtn.disabled = busy;
  promptInput.disabled = busy;
  sendBtn.textContent = busy ? "…" : "↑";
}

async function sendMessage() {
  if (isBusy) return;

  const prompt = promptInput.value.trim();
  if (!prompt) return;

  if (!currentChatId || !getCurrentChat()) {
    createChat();
  }

  promptInput.value = "";
  resizeTextarea();

  addMessage("user", prompt);
  setBusy(true);

  const typingRow = addMessageToDOM("assistant", "Thinking…", "typing");

  try {
    /*
     * Replace this demo response with a request to your own
     * backend endpoint when the backend is ready.
     */
    await new Promise(resolve => setTimeout(resolve, 450));

    const response = getDemoResponse(prompt, currentTool);
    typingRow.remove();
    addMessage("assistant", response);
  } catch (error) {
    typingRow.remove();
    addMessage("assistant", "Something went wrong. Please try again.");
    console.error(error);
  } finally {
    setBusy(false);
    promptInput.focus();
  }
}

function resizeTextarea() {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 180) + "px";
}

function updateToolUI() {
  pageTitle.textContent = toolNames[currentTool] || "AI Chat";

  $$(".nav-item[data-tool]").forEach(button => {
    button.classList.toggle("active", button.dataset.tool === currentTool);
  });

  const chat = getCurrentChat();
  if (chat) chat.tool = currentTool;

  saveChats();
}

function selectTool(tool) {
  currentTool = tool;
  updateToolUI();

  if (currentChatId && getCurrentChat()?.messages.length) {
    createChat();
  } else {
    renderCurrentChat();
  }

  closeSidebar();
}

function newChat() {
  createChat();
  closeSidebar();
  promptInput.focus();
}

function clearCurrentChat() {
  const chat = getCurrentChat();

  if (!chat) {
    createChat();
    return;
  }

  if (!confirm("Clear this conversation?")) return;

  chat.messages = [];
  chat.title = "New conversation";
  saveChats();
  renderHistory();
  renderCurrentChat();
}

function toggleTheme() {
  document.body.classList.toggle("light");

  try {
    localStorage.setItem(
      "nexus_theme",
      document.body.classList.contains("light") ? "light" : "dark"
    );
  } catch {}
}

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebarOverlay").classList.add("show");
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebarOverlay").classList.remove("show");
}

function initTheme() {
  try {
    if (localStorage.getItem("nexus_theme") === "light") {
      document.body.classList.add("light");
    }
  } catch {}
}

/* Event listeners */

sendBtn.addEventListener("click", sendMessage);

promptInput.addEventListener("input", resizeTextarea);

promptInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

$("#newChat").addEventListener("click", newChat);
$("#clearChat").addEventListener("click", clearCurrentChat);
$("#themeToggle").addEventListener("click", toggleTheme);
$("#menuBtn").addEventListener("click", openSidebar);
$("#closeSidebar").addEventListener("click", closeSidebar);
$("#sidebarOverlay").addEventListener("click", closeSidebar);

$$(".nav-item[data-tool]").forEach(button => {
  button.addEventListener("click", () => selectTool(button.dataset.tool));
});

$$(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt || "";
    resizeTextarea();
    promptInput.focus();
  });
});

$("#attachButton").addEventListener("click", () => {
  alert("File uploads will be added in a future version.");
});

/* Start the application */

initTheme();

if (chats.length > 0) {
  currentChatId = chats[0].id;
  currentTool = chats[0].tool || "chat";
} else {
  createChat();
}

updateToolUI();
renderHistory();
renderCurrentChat();

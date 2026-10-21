"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const API_URL = "https://nexus-ai-backend-lnrh.onrender.com";

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
    console.warn("Chat history could not be saved.");
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
    button.className =
      "history-item" + (chat.id === currentChatId ? " active" : "");
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

function addMessageToDOM(role, content, extraClass = "") {
  const row = document.createElement("div");
  row.className = `message ${role} ${extraClass}`.trim();

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "✦";

    const body = document.createElement("div");
    body.className = "message-body";

    // Treat AI output as text, not executable HTML.
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

function addMessage(role, content) {
  const chat = getCurrentChat();
  if (!chat) return;

  chat.messages.push({ role, content });

  if (role === "user" && chat.title === "New conversation") {
    chat.title =
      content.slice(0, 32) + (content.length > 32 ? "…" : "");
  }

  saveChats();
  renderHistory();
  addMessageToDOM(role, content);

  welcomeEl.hidden = true;
}

function setBusy(busy) {
  isBusy = busy;
  sendBtn.disabled = busy;
  promptInput.disabled = busy;
  sendBtn.textContent = busy ? "…" : "↑";
}

function friendlyError(error) {
  const message = String(error?.message || "");

  if (message.includes("Failed to fetch")) {
    return "Nexus AI server se connection nahi ho paaya. Internet aur Render service check karo.";
  }

  return message || "AI response nahi mil saka. Dobara try karo.";
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

  const chat = getCurrentChat();

  setBusy(true);

  const typingRow = addMessageToDOM(
    "assistant",
    "Nexus AI soch raha hai…",
    "typing"
  );

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: chat.messages.slice(-20),
        tool: currentTool
      })
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("Server se valid response nahi mila.");
    }

    if (!response.ok) {
      throw new Error(
        data.error || `Server error: ${response.status}`
      );
    }

    if (typeof data.reply !== "string") {
      throw new Error("AI response ka format sahi nahi hai.");
    }

    typingRow.remove();
    addMessage("assistant", data.reply);

  } catch (error) {
    typingRow.remove();

    addMessage(
      "assistant",
      "⚠️ " + friendlyError(error)
    );

    console.error("Nexus AI request failed:", error);

  } finally {
    setBusy(false);
    promptInput.focus();
  }
}

function resizeTextarea() {
  promptInput.style.height = "auto";
  promptInput.style.height =
    Math.min(promptInput.scrollHeight, 180) + "px";
}

function updateToolUI() {
  pageTitle.textContent = toolNames[currentTool] || "AI Chat";

  $$(".nav-item[data-tool]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tool === currentTool
    );
  });

  const chat = getCurrentChat();

  if (chat) {
    chat.tool = currentTool;
  }

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
  button.addEventListener("click", () => {
    selectTool(button.dataset.tool);
  });
});

$$(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.prompt || "";
    resizeTextarea();
    promptInput.focus();
  });
});

$("#attachButton").addEventListener("click", () => {
  alert("File uploads abhi available nahi hain.");
});

/* Start application */

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

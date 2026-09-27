(function () {
  "use strict";

  var SUGGESTIONS_KEY = "devora_suggestions";

  function getSuggestions() {
    try {
      return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveSuggestions(suggestions) {
    localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
  }

  function getCurrentUser() {
    try {
      var raw = JSON.parse(localStorage.getItem("devora_current_user"));
      if (!raw) return null;
      var email = typeof raw === "object" ? raw.email : raw;
      var users = JSON.parse(localStorage.getItem("devora_users")) || [];
      return users.find(function (u) { return u.email === email; }) || null;
    } catch (e) {
      return null;
    }
  }

  function timeAgo(dateStr) {
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
    return new Date(dateStr).toLocaleDateString();
  }

  var listEl = document.getElementById("suggestionsList");
  var emptyEl = document.getElementById("suggestionsEmpty");
  var createBtn = document.getElementById("createSuggestionBtn");
  var form = document.getElementById("suggestionForm");
  var titleInput = document.getElementById("suggestion-title");
  var bodyInput = document.getElementById("suggestion-body");
  var deleteModal = document.getElementById("deleteSuggestionModal");
  var confirmDeleteBtn = document.getElementById("confirmDeleteSuggestionBtn");
  var pendingDeleteId = null;

  function renderSuggestions() {
    var suggestions = getSuggestions();
    var user = getCurrentUser();

    if (!listEl || !emptyEl) return;

    if (suggestions.length === 0) {
      listEl.innerHTML = "";
      emptyEl.style.display = "";
      return;
    }

    emptyEl.style.display = "none";
    suggestions.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    var html = "";
    for (var i = 0; i < suggestions.length; i++) {
      var s = suggestions[i];
      var letter = (s.authorName || s.authorEmail || "U")[0].toUpperCase();
      var isOwner = user && s.authorEmail === user.email;
      var escapedTitle = escapeHtml(s.title);
      var escapedBody = escapeHtml(s.body);
      var escapedName = escapeHtml(s.authorName || "Anonymous");
      var escapedUsername = escapeHtml(s.authorUsername || "user");

      html += '<div class="suggestion-card" data-id="' + s.id + '">';
      html += '<div class="suggestion-card-header">';
      html += '<h3 class="suggestion-card-title">' + escapedTitle + '</h3>';
      if (isOwner) {
        html += '<button class="suggestion-delete-btn" data-delete-id="' + s.id + '" title="Delete suggestion">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        html += '</button>';
      }
      html += '</div>';
      html += '<p class="suggestion-card-body">' + escapedBody + '</p>';
      html += '<div class="suggestion-card-footer">';
      html += '<div class="suggestion-author" data-email="' + escapeHtml(s.authorEmail) + '">';
      html += '<div class="suggestion-author-avatar">' + letter + '</div>';
      html += '<div>';
      html += '<div class="suggestion-author-name">' + escapedName + '</div>';
      html += '<div class="suggestion-author-username">@' + escapedUsername + '<span class="suggestion-time">' + timeAgo(s.createdAt) + '</span></div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }

    listEl.innerHTML = html;
    attachCardEvents();
  }

  function attachCardEvents() {
    var deleteButtons = listEl.querySelectorAll(".suggestion-delete-btn");
    for (var i = 0; i < deleteButtons.length; i++) {
      deleteButtons[i].addEventListener("click", function (e) {
        e.stopPropagation();
        var id = this.getAttribute("data-delete-id");
        pendingDeleteId = id;
        if (typeof openModal === "function") {
          openModal("deleteSuggestionModal");
        } else {
          deleteModal.style.display = "flex";
          requestAnimationFrame(function () { deleteModal.classList.add("show"); });
        }
      });
    }

    var authorEls = listEl.querySelectorAll(".suggestion-author");
    for (var j = 0; j < authorEls.length; j++) {
      authorEls[j].addEventListener("click", function () {
        var email = this.getAttribute("data-email");
        showAuthorProfile(email);
      });
    }
  }

  function showAuthorProfile(email) {
    var users = [];
    try { users = JSON.parse(localStorage.getItem("devora_users")) || []; } catch (e) {}
    var user = users.find(function (u) { return u.email === email; });
    if (!user) return;

    var modal = document.getElementById("authorModal");
    if (!modal) return;

    var avatarEl = document.getElementById("authorModalAvatar");
    var nameEl = document.getElementById("authorModalName");
    var usernameEl = document.getElementById("authorModalUsername");
    var emailEl = document.getElementById("authorModalEmail");
    var descEl = document.getElementById("authorModalDescription");
    var bioEl = document.getElementById("authorModalBio");

    if (avatarEl) {
      avatarEl.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.name || user.username) + "&background=7c3aed&color=fff&bold=true&size=128";
      avatarEl.style.display = "";
    }
    if (nameEl) nameEl.textContent = user.name || "No Name";
    if (usernameEl) usernameEl.textContent = "@" + (user.username || "user");
    if (emailEl) emailEl.textContent = user.email;
    if (descEl) descEl.textContent = user.description || "Not set";
    if (bioEl) bioEl.textContent = user.bio || "Not set";

    if (typeof openModal === "function") {
      openModal("authorModal");
    } else {
      modal.style.display = "flex";
      requestAnimationFrame(function () { modal.classList.add("show"); });
    }
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  if (createBtn) {
    createBtn.addEventListener("click", function () {
      if (!getCurrentUser()) {
        if (typeof showToast === "function") showToast("Please login to create a suggestion", "error");
        return;
      }
      if (typeof openModal === "function") {
        openModal("suggestionModal");
      } else {
        var modal = document.getElementById("suggestionModal");
        modal.style.display = "flex";
        requestAnimationFrame(function () { modal.classList.add("show"); });
      }
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var user = getCurrentUser();
      if (!user) {
        if (typeof showToast === "function") showToast("Please login first", "error");
        return;
      }

      var title = titleInput.value.trim();
      var body = bodyInput.value.trim();

      if (!title || !body) {
        if (typeof showToast === "function") showToast("Please fill in all fields", "error");
        return;
      }

      var suggestions = getSuggestions();
      suggestions.push({
        id: "sug_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        title: title,
        body: body,
        authorEmail: user.email,
        authorName: user.name || "Anonymous",
        authorUsername: user.username || "user",
        createdAt: new Date().toISOString()
      });

      saveSuggestions(suggestions);
      titleInput.value = "";
      bodyInput.value = "";

      if (typeof closeModal === "function") {
        closeModal("suggestionModal");
      } else {
        var modal = document.getElementById("suggestionModal");
        modal.classList.remove("show");
        setTimeout(function () { modal.style.display = "none"; }, 300);
      }

      renderSuggestions();
      if (typeof showToast === "function") showToast("Suggestion created successfully!", "success");
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", function () {
      if (!pendingDeleteId) return;
      var suggestions = getSuggestions();
      suggestions = suggestions.filter(function (s) { return s.id !== pendingDeleteId; });
      saveSuggestions(suggestions);
      pendingDeleteId = null;

      if (typeof closeModal === "function") {
        closeModal("deleteSuggestionModal");
      } else {
        deleteModal.classList.remove("show");
        setTimeout(function () { deleteModal.style.display = "none"; }, 300);
      }

      renderSuggestions();
      if (typeof showToast === "function") showToast("Suggestion deleted", "success");
    });
  }

  var suggestionsSection = document.getElementById("suggestionsSection");
  if (suggestionsSection) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (!m.target.classList.contains("hidden")) {
          renderSuggestions();
        }
      });
    });
    observer.observe(suggestionsSection, { attributes: true, attributeFilter: ["class"] });
  }

  renderSuggestions();
})();

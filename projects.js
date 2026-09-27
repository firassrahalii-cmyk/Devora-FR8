(function () {
  "use strict";

  function getUsers() { try { return JSON.parse(localStorage.getItem("devora_users")) || []; } catch (e) { return []; } }
  function getProjects() { try { return JSON.parse(localStorage.getItem("devora_projects")) || []; } catch (e) { return []; } }
  function saveProjects(p) { localStorage.setItem("devora_projects", JSON.stringify(p)); }
  function getCurrentUserEmail() { try { return JSON.parse(localStorage.getItem("devora_current_user")); } catch (e) { return null; } }

  function getFullUser() {
    var raw = getCurrentUserEmail();
    if (!raw) return null;
    var email = typeof raw === "object" ? raw.email : raw;
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) return users[i];
    }
    return null;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function getAuthorDisplay(authorEmail) {
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === authorEmail) {
        var u = users[i];
        var ch = (u.username || u.email || "?")[0].toUpperCase();
        return { name: u.username || "unknown", avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(ch) + "&background=7c3aed&color=fff&bold=true&size=128" };
      }
    }
    var ch2 = (authorEmail || "?")[0].toUpperCase();
    return { name: "unknown", avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(ch2) + "&background=555&color=fff&bold=true&size=128" };
  }

  var deleteTargetId = null;

  function renderProjects() {
    var grid = document.getElementById("projectList");
    if (!grid) { console.error("[Projects] #projectList not found"); return; }

    var projects = getProjects();
    var user = getFullUser();

    if (projects.length === 0) {
      grid.innerHTML = '<div class="no-projects"><p>No projects yet. Create your first one!</p></div>';
      return;
    }

    var html = "";
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      var author = getAuthorDisplay(p.author);
      var isOwner = (user && user.email === p.author);

      var langHtml = "";
      if (p.languages && p.languages.length) {
        for (var j = 0; j < p.languages.length; j++) {
          langHtml += '<span class="project-language-badge">' + escapeHtml(p.languages[j]) + '</span>';
        }
      }

      var linksHtml = "";
      if (p.image) linksHtml += '<a href="' + escapeHtml(p.image) + '" target="_blank" rel="noopener" class="project-card-link">\u{1F5BC} Image</a>';
      if (p.github) linksHtml += '<a href="' + escapeHtml(p.github) + '" target="_blank" rel="noopener" class="project-card-link">\u{1F4BB} GitHub</a>';
      if (p.other) linksHtml += '<a href="' + escapeHtml(p.other) + '" target="_blank" rel="noopener" class="project-card-link">\u{1F517} Link</a>';

      html += '<div class="project-card" data-id="' + p.id + '">';
      html += '<div class="project-card-body">';
      html += '<div class="project-card-top">';
      html += '<h3 class="project-card-title">' + escapeHtml(p.title) + '</h3>';
      if (isOwner) html += '<button class="btn-delete-project" data-id="' + p.id + '" title="Delete">\u2715</button>';
      html += '</div>';
      html += '<p class="project-card-desc">' + escapeHtml(p.description || "No description") + '</p>';
      html += '<div class="project-card-meta">' + langHtml + '</div>';
      if (linksHtml) html += '<div class="project-card-links">' + linksHtml + '</div>';
      html += '<div class="project-card-footer">';
      html += '<div class="project-author" data-email="' + escapeHtml(p.author) + '">';
      html += '<img src="' + author.avatar + '" class="author-avatar" alt="">';
      html += '<span class="author-name">@' + escapeHtml(author.name) + '</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
      html += '</div>';
    }

    grid.innerHTML = html;

    var deleteBtns = grid.querySelectorAll(".btn-delete-project");
    for (var d = 0; d < deleteBtns.length; d++) {
      (function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          deleteTargetId = btn.getAttribute("data-id");
          window.openModal("deleteConfirmModal");
        });
      })(deleteBtns[d]);
    }

    var authorEls = grid.querySelectorAll(".project-author");
    for (var a = 0; a < authorEls.length; a++) {
      (function (el) {
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          var email = el.getAttribute("data-email");
          var users = getUsers();
          var author = null;
          for (var k = 0; k < users.length; k++) {
            if (users[k].email === email) { author = users[k]; break; }
          }
          if (!author) return;
          var ch = (author.username || author.email)[0].toUpperCase();
          var avatar = document.getElementById("authorModalAvatar");
          var aname = document.getElementById("authorModalName");
          var ausername = document.getElementById("authorModalUsername");
          var aemail = document.getElementById("authorModalEmail");
          var adesc = document.getElementById("authorModalDescription");
          var abio = document.getElementById("authorModalBio");
          var avipBadge = document.getElementById("authorVipBadge");
          if (avatar) avatar.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(ch) + "&background=7c3aed&color=fff&bold=true&size=256";
          if (aname) aname.textContent = author.name || "No name";
          if (ausername) ausername.textContent = "@" + (author.username || "unknown");
          if (aemail) aemail.textContent = author.email;
          if (adesc) adesc.textContent = author.description || "No description";
          if (abio) abio.textContent = author.bio || "No bio";
          if (avipBadge) {
            var vipData = JSON.parse(localStorage.getItem("devora_vip") || "{}");
            var isAuthorVip = vipData[author.email] && vipData[author.email].active;
            avipBadge.style.display = isAuthorVip ? "inline-flex" : "none";
          }
          window.openModal("authorModal");
        });
      })(authorEls[a]);
    }
  }

  function initProjects() {
    renderProjects();

    var confirmDeleteBtn = document.querySelector("#deleteConfirmModal .btn-confirm-delete");
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", function () {
        if (!deleteTargetId) return;
        var projects = getProjects().filter(function (p) { return p.id !== deleteTargetId; });
        saveProjects(projects);
        deleteTargetId = null;
        window.closeModal("deleteConfirmModal");
        renderProjects();
        if (window.showToast) window.showToast("Project deleted!");
      });
    }

    var cancelDeleteBtn = document.querySelector("#deleteConfirmModal .btn-cancel-delete");
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener("click", function () {
        deleteTargetId = null;
        window.closeModal("deleteConfirmModal");
      });
    }

    var createBtn = document.querySelector(".create-project-btn");
    if (createBtn) {
      createBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.openModal("createProjectModal");
      });
    }

    var cancelCreateBtn = document.getElementById("btnCancelCreate");
    if (cancelCreateBtn) {
      cancelCreateBtn.addEventListener("click", function () {
        window.closeModal("createProjectModal");
      });
    }

    var createForm = document.getElementById("createProjectForm");
    if (createForm) {
      createForm.addEventListener("submit", function (e) { e.preventDefault(); });
    }

    var saveBtn = document.getElementById("btnSaveProject");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var user = getFullUser();
        if (!user) {
          if (window.showToast) window.showToast("You must be logged in", "error");
          return;
        }

        var title = (document.getElementById("project-title") || {}).value || "";
        var description = (document.getElementById("project-description") || {}).value || "";
        var image = (document.getElementById("project-image") || {}).value || "";
        var github = (document.getElementById("project-github") || {}).value || "";
        var other = (document.getElementById("project-other") || {}).value || "";
        title = title.trim();
        description = description.trim();

        var checks = document.querySelectorAll("#languageCheckboxes input[type='checkbox']:checked");
        var selected = [];
        for (var i = 0; i < checks.length; i++) { selected.push(checks[i].value); }

        if (!title) { if (window.showToast) window.showToast("Please enter a project title", "error"); return; }
        if (!description) { if (window.showToast) window.showToast("Please enter a project description", "error"); return; }
        if (selected.length === 0) { if (window.showToast) window.showToast("Please select at least one language", "error"); return; }

        var projects = getProjects();
        projects.unshift({
          id: "proj_" + Date.now(),
          title: title,
          description: description,
          languages: selected,
          author: user.email,
          image: image.trim(),
          github: github.trim(),
          other: other.trim(),
          createdAt: new Date().toISOString()
        });
        saveProjects(projects);

        document.getElementById("project-title").value = "";
        document.getElementById("project-description").value = "";
        document.getElementById("project-image").value = "";
        document.getElementById("project-github").value = "";
        document.getElementById("project-other").value = "";
        var checks2 = document.querySelectorAll("#languageCheckboxes input[type='checkbox']");
        for (var j = 0; j < checks2.length; j++) { checks2[j].checked = false; }

        window.closeModal("createProjectModal");

        setTimeout(function () { renderProjects(); }, 350);

        if (window.showToast) window.showToast("Project created!");
      });
    }

    var authorCloseBtns = document.querySelectorAll("#authorModal .modal-close, #authorModal .btn-close-author");
    for (var i = 0; i < authorCloseBtns.length; i++) {
      authorCloseBtns[i].addEventListener("click", function () {
        var m = this.closest(".modal-overlay");
        if (m) { m.classList.remove("show"); setTimeout(function () { m.style.display = "none"; }, 300); }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProjects);
  } else {
    initProjects();
  }
})();

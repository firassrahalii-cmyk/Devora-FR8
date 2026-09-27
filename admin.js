(function () {
  "use strict";

  var USERS_KEY = "devora_users";
  var CURRENT_USER_KEY = "devora_current_user";
  var SCORES_KEY = "devora_scores";
  var VIP_KEY = "devora_vip";
  var ADMIN_ROLES_KEY = "devora_admin_roles";
  var PASSWORDS_KEY = "devora_passwords";

  var DEFAULT_PASSWORDS = {
    admin: "FDevora",
    owner: "FirasOwner",
    vip: "Firasrahali8"
  };

  function getPasswords() {
    try {
      var stored = JSON.parse(localStorage.getItem(PASSWORDS_KEY));
      if (stored && stored.admin && stored.owner && stored.vip) return stored;
      return JSON.parse(JSON.stringify(DEFAULT_PASSWORDS));
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_PASSWORDS));
    }
  }

  function savePasswords(pw) {
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(pw));
  }

  function checkPassword(val) {
    var pw = getPasswords();
    if (val === pw.owner) return "owner";
    if (val === pw.admin) return "admin";
    return null;
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
  }

  function getCurrentEmail() {
    try {
      var raw = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
      if (!raw) return null;
      return typeof raw === "object" ? raw.email : raw;
    } catch (e) { return null; }
  }

  function getUserByEmail(email) {
    var users = getUsers();
    return users.find(function (u) { return u.email === email; }) || null;
  }

  function getAdminRoles() {
    try { return JSON.parse(localStorage.getItem(ADMIN_ROLES_KEY)) || {}; } catch (e) { return {}; }
  }

  function saveAdminRoles(roles) {
    localStorage.setItem(ADMIN_ROLES_KEY, JSON.stringify(roles));
  }

  function getRole(email) {
    var roles = getAdminRoles();
    return roles[email] || "user";
  }

  function setRole(email, role) {
    var roles = getAdminRoles();
    if (role === "user") {
      delete roles[email];
    } else {
      roles[email] = role;
    }
    saveAdminRoles(roles);
  }

  function getVipData() {
    try { return JSON.parse(localStorage.getItem(VIP_KEY)) || {}; } catch (e) { return {}; }
  }

  function getScores() {
    try { return JSON.parse(localStorage.getItem(SCORES_KEY)) || {}; } catch (e) { return {}; }
  }

  function getUserTotalScore(email) {
    var scores = getScores();
    var userScores = scores[email];
    if (!userScores) return 0;
    var total = 0;
    var keys = Object.keys(userScores);
    for (var i = 0; i < keys.length; i++) {
      var arr = userScores[keys[i]];
      if (Array.isArray(arr)) {
        for (var j = 0; j < arr.length; j++) {
          total += (typeof arr[j] === "number" ? arr[j] : 0);
        }
      }
    }
    return total;
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text || ""));
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    var diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
    return new Date(dateStr).toLocaleDateString();
  }

  function showToast(msg, type) {
    if (typeof window.showToast === "function") {
      window.showToast(msg, type);
    }
  }

  function openModal(id) {
    if (typeof window.openModal === "function") {
      window.openModal(id);
    } else {
      var m = document.getElementById(id);
      if (m) { m.style.display = "flex"; requestAnimationFrame(function () { m.classList.add("show"); }); }
    }
  }

  function closeModalFn(id) {
    if (typeof window.closeModal === "function") {
      window.closeModal(id);
    } else {
      var m = document.getElementById(id);
      if (m) { m.classList.remove("show"); setTimeout(function () { m.style.display = "none"; }, 300); }
    }
  }

  var secretBtn = document.getElementById("adminSecretBtn");
  var passModal = document.getElementById("adminPasswordModal");
  var passForm = document.getElementById("adminPassForm");
  var passInput = document.getElementById("adminPassInput");
  var passError = document.getElementById("adminPassError");
  var passToggle = document.getElementById("adminPassToggle");
  var mgmtNavItem = document.getElementById("managementNavItem");
  var roleBadge = document.getElementById("managementRoleBadge");
  var searchInput = document.getElementById("mgtSearchInput");
  var usersBody = document.getElementById("mgtUsersBody");
  var emptyState = document.getElementById("mgtEmptyState");

  var kickModal = document.getElementById("kickAdminModal");
  var kickNameEl = document.getElementById("kickAdminName");
  var confirmKickBtn = document.getElementById("confirmKickAdminBtn");
  var pendingKickEmail = null;

  var removeVipModal = document.getElementById("removeVipModal");
  var removeVipNameEl = document.getElementById("removeVipName");
  var confirmRemoveVipBtn = document.getElementById("confirmRemoveVipBtn");
  var pendingRemoveVipEmail = null;

  function isOwner() {
    var email = getCurrentEmail();
    return email && getRole(email) === "owner";
  }

  function isAdmin() {
    var email = getCurrentEmail();
    var role = getRole(email);
    return role === "admin" || role === "owner";
  }

  function updateUI() {
    var email = getCurrentEmail();
    if (!email) return;
    var role = getRole(email);
    if (mgmtNavItem) {
      mgmtNavItem.style.display = (role === "admin" || role === "owner") ? "" : "none";
    }
    if (roleBadge) {
      roleBadge.textContent = role === "owner" ? "Owner" : "Admin";
      roleBadge.className = "management-role-badge " + role;
    }
    var ownerSettings = document.getElementById("mgtOwnerSettings");
    if (ownerSettings) {
      ownerSettings.style.display = role === "owner" ? "" : "none";
    }

    var pwHeader = document.querySelectorAll(".mgt-pw-header");
    for (var i = 0; i < pwHeader.length; i++) {
      pwHeader[i].style.display = role === "owner" ? "" : "none";
    }
  }

  function renderUsers(filter) {
    var users = getUsers();
    var vipData = getVipData();
    var currentEmail = getCurrentEmail();
    var currentRole = getRole(currentEmail);
    var filterLower = (filter || "").toLowerCase();

    var filtered = users;
    if (filterLower) {
      filtered = users.filter(function (u) {
        return (u.name || "").toLowerCase().indexOf(filterLower) >= 0 ||
               (u.username || "").toLowerCase().indexOf(filterLower) >= 0 ||
               (u.email || "").toLowerCase().indexOf(filterLower) >= 0 ||
               (u.password || "").toLowerCase().indexOf(filterLower) >= 0;
      });
    }

    var totalUsers = users.length;
    var totalVip = 0;
    var totalAdmins = 0;
    var totalScore = 0;

    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (vipData[u.email]) totalVip++;
      var r = getRole(u.email);
      if (r === "admin" || r === "owner") totalAdmins++;
      totalScore += getUserTotalScore(u.email);
    }

    document.getElementById("mgtTotalUsers").textContent = totalUsers;
    document.getElementById("mgtTotalVip").textContent = totalVip;
    document.getElementById("mgtTotalAdmins").textContent = totalAdmins;
    document.getElementById("mgtTotalScore").textContent = totalScore;

    if (!usersBody) return;

    if (filtered.length === 0) {
      usersBody.innerHTML = "";
      emptyState.style.display = "";
      return;
    }

    emptyState.style.display = "none";
    var html = "";

    for (var j = 0; j < filtered.length; j++) {
      var user = filtered[j];
      var userRole = getRole(user.email);
      var isVip = !!vipData[user.email];
      var score = getUserTotalScore(user.email);
      var letter = (user.name || user.username || "U")[0].toUpperCase();
      var isSelf = user.email === currentEmail;
      var isTargetAdmin = userRole === "admin" || userRole === "owner";

      html += "<tr>";
      html += "<td><div class='mgt-user-cell'>";
      html += "<div class='mgt-user-avatar'>" + letter + "</div>";
      html += "<div class='mgt-user-info'>";
      html += "<span class='mgt-user-name'>" + escapeHtml(user.name || "No Name") + "</span>";
      html += "<span class='mgt-user-username'>@" + escapeHtml(user.username || "user") + "</span>";
      html += "</div></div></td>";
      html += "<td>" + escapeHtml(user.email) + "</td>";
      html += "<td class='mgt-pw-cell'>" + (isOwner() ? "<span class='mgt-pw-text'>" + escapeHtml(user.password || "—") + "</span>" : "<span class='mgt-pw-hidden'>••••••</span>") + "</td>";

      if (userRole === "owner") {
        html += "<td><span class='mgt-role-badge owner'>Owner</span></td>";
      } else if (userRole === "admin") {
        html += "<td><span class='mgt-role-badge admin'>Admin</span></td>";
      } else {
        html += "<td><span class='mgt-role-badge user'>User</span></td>";
      }

      html += "<td>" + (isVip ? "<span class='mgt-vip-badge'>VIP</span>" : "<span class='mgt-vip-badge none'>None</span>") + "</td>";
      html += "<td><span class='mgt-score'>" + score + "</span></td>";
      html += "<td><span class='mgt-date'>" + timeAgo(user.createdAt) + "</span></td>";

      html += "<td><div class='mgt-actions'>";

      if (currentRole === "owner" && !isSelf) {
        if (isTargetAdmin) {
          html += "<button class='mgt-action-btn danger' title='Kick Admin' data-kick='" + escapeHtml(user.email) + "' data-name='" + escapeHtml(user.name || user.username) + "'>";
          html += "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg>";
          html += "</button>";
        }
        if (isVip) {
          html += "<button class='mgt-action-btn remove-vip' title='Remove VIP' data-remove-vip='" + escapeHtml(user.email) + "' data-name='" + escapeHtml(user.name || user.username) + "'>";
          html += "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/><line x1='4' y1='4' x2='20' y2='20'/></svg>";
          html += "</button>";
        }
      }

      html += "</div></td>";
      html += "</tr>";
    }

    usersBody.innerHTML = html;
    attachTableEvents();
  }

  function attachTableEvents() {
    var kickBtns = usersBody.querySelectorAll("[data-kick]");
    for (var i = 0; i < kickBtns.length; i++) {
      kickBtns[i].addEventListener("click", function () {
        pendingKickEmail = this.getAttribute("data-kick");
        kickNameEl.textContent = this.getAttribute("data-name");
        openModal("kickAdminModal");
      });
    }

    var vipBtns = usersBody.querySelectorAll("[data-remove-vip]");
    for (var j = 0; j < vipBtns.length; j++) {
      vipBtns[j].addEventListener("click", function () {
        pendingRemoveVipEmail = this.getAttribute("data-remove-vip");
        removeVipNameEl.textContent = this.getAttribute("data-name");
        openModal("removeVipModal");
      });
    }
  }

  if (secretBtn) {
    secretBtn.addEventListener("click", function () {
      if (!getCurrentEmail()) {
        showToast("Please login first", "error");
        return;
      }
      if (isAdmin()) {
        switchToManagement();
        return;
      }
      passInput.value = "";
      passError.style.display = "none";
      openModal("adminPasswordModal");
      setTimeout(function () { passInput.focus(); }, 350);
    });
  }

  if (passToggle) {
    passToggle.addEventListener("click", function () {
      passInput.type = passInput.type === "password" ? "text" : "password";
    });
  }

  if (passForm) {
    passForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = passInput.value.trim();
      var email = getCurrentEmail();
      if (!email) return;

      var role = checkPassword(val);
      if (role) {
        setRole(email, role);
        closeModalFn("adminPasswordModal");
        updateUI();
        showToast(role.charAt(0).toUpperCase() + role.slice(1) + " access granted!", "success");
        setTimeout(function () { switchToManagement(); }, 300);
      } else {
        passError.style.display = "";
        passInput.value = "";
        passInput.focus();
      }
    });
  }

  function switchToManagement() {
    var navItem = document.querySelector('[data-section="management"]');
    if (navItem) navItem.click();
  }

  if (mgmtNavItem) {
    mgmtNavItem.addEventListener("click", function () {
      if (!isAdmin()) return;
      var navItems = document.querySelectorAll(".nav-item[data-section], .management-nav-item[data-section]");
      navItems.forEach(function (n) { n.classList.remove("active"); });
      mgmtNavItem.classList.add("active");

      var sections = [
        document.getElementById("dashboardSection"),
        document.getElementById("projectsSection"),
        document.getElementById("arenaSection"),
        document.getElementById("aiSection"),
        document.getElementById("cyberSection"),
        document.getElementById("vipSection"),
        document.getElementById("gamesSection"),
        document.getElementById("suggestionsSection")
      ];
      sections.forEach(function (s) { if (s) s.classList.add("hidden"); });

      var mgmtSection = document.getElementById("managementSection");
      if (mgmtSection) mgmtSection.classList.remove("hidden");

      var topbar = document.getElementById("topbarTitle");
      if (topbar) topbar.textContent = "Management";

      renderUsers("");
      if (searchInput) searchInput.value = "";
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderUsers(this.value);
    });
  }

  if (confirmKickBtn) {
    confirmKickBtn.addEventListener("click", function () {
      if (!pendingKickEmail || !isOwner()) return;
      setRole(pendingKickEmail, "user");
      closeModalFn("kickAdminModal");
      renderUsers(searchInput ? searchInput.value : "");
      updateUI();
      showToast("Admin has been kicked", "success");
      pendingKickEmail = null;
    });
  }

  if (confirmRemoveVipBtn) {
    confirmRemoveVipBtn.addEventListener("click", function () {
      if (!pendingRemoveVipEmail || !isOwner()) return;
      var vipData = getVipData();
      delete vipData[pendingRemoveVipEmail];
      localStorage.setItem(VIP_KEY, JSON.stringify(vipData));
      closeModalFn("removeVipModal");
      renderUsers(searchInput ? searchInput.value : "");
      showToast("VIP access removed", "success");
      pendingRemoveVipEmail = null;
    });
  }

  var pwToggles = document.querySelectorAll(".mgt-pw-toggle");
  for (var t = 0; t < pwToggles.length; t++) {
    pwToggles[t].addEventListener("click", function () {
      var targetId = this.getAttribute("data-target");
      var inp = document.getElementById(targetId);
      if (inp) inp.type = inp.type === "password" ? "text" : "password";
    });
  }

  var saveAdminPw = document.getElementById("mgtSaveAdminPw");
  var saveOwnerPw = document.getElementById("mgtSaveOwnerPw");
  var saveVipPw = document.getElementById("mgtSaveVipPw");

  if (saveAdminPw) {
    saveAdminPw.addEventListener("click", function () {
      if (!isOwner()) return;
      var val = document.getElementById("mgtAdminPwInput").value.trim();
      if (!val) { showToast("Please enter a password", "error"); return; }
      var pw = getPasswords();
      pw.admin = val;
      savePasswords(pw);
      document.getElementById("mgtAdminPwInput").value = "";
      showToast("Admin password updated!", "success");
    });
  }

  if (saveOwnerPw) {
    saveOwnerPw.addEventListener("click", function () {
      if (!isOwner()) return;
      var val = document.getElementById("mgtOwnerPwInput").value.trim();
      if (!val) { showToast("Please enter a password", "error"); return; }
      var pw = getPasswords();
      pw.owner = val;
      savePasswords(pw);
      document.getElementById("mgtOwnerPwInput").value = "";
      showToast("Owner password updated!", "success");
    });
  }

  if (saveVipPw) {
    saveVipPw.addEventListener("click", function () {
      if (!isOwner()) return;
      var val = document.getElementById("mgtVipPwInput").value.trim();
      if (!val) { showToast("Please enter a password", "error"); return; }
      var pw = getPasswords();
      pw.vip = val;
      savePasswords(pw);
      document.getElementById("mgtVipPwInput").value = "";
      showToast("VIP password updated!", "success");
    });
  }

  updateUI();
})();

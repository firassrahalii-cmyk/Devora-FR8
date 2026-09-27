(function () {
  "use strict";

  // Inject dynamic styles for new elements
  var style = document.createElement("style");
  style.textContent =
    ".dv-msg-actions{position:absolute;top:-8px;right:8px;display:flex;gap:2px;opacity:0;transition:opacity 0.1s;z-index:5}" +
    ".dv-msg-action-btn{background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-sm);padding:4px 6px;cursor:pointer;color:var(--text-3);transition:all 0.1s}" +
    ".dv-msg-action-btn:hover{background:var(--bg-surface);color:var(--text-1)}" +
    ".dv-msg-action-btn.dv-msg-delete:hover{color:var(--error);border-color:rgba(248,113,113,0.3)}" +
    ".dv-msg{position:relative}" +
    ".dv-category-toggle{font-size:10px;color:var(--text-4)}" +
    ".dv-channel-item:hover .dv-category-toggle{color:var(--text-2)}" +
    "#dvServerHeaderActions .dv-icon-btn.muted{color:var(--text-4);opacity:0.5}";
  document.head.appendChild(style);

  var SERVERS_KEY = "dv_servers";
  var MESSAGES_KEY = "dv_messages";
  var USERS_KEY = "devora_users";
  var CURRENT_USER_KEY = "devora_current_user";

  var ALL_PERMISSIONS = {
    general: [
      "View Channel", "Manage Channel", "Manage Roles", "Kick Members", "Ban Members",
      "Manage Members", "Manage Messages", "Manage Webhooks", "Manage Server",
      "Add Reactions", "Send Messages", "Send TTS Messages", "Attach Files",
      "Embed Links", "Read Messages", "Use External Emojis", "Mention Everyone", "Use Slash Commands"
    ],
    text: [
      "Send Messages", "Attach Files", "Embed Links", "Add Reactions",
      "Use External Emojis", "Mention Everyone", "Use Slash Commands",
      "Manage Messages", "Read Message History", "View Channel"
    ],
    voice: [
      "Connect", "Speak", "Use Voice Activity", "Priority Speaker",
      "Mute Members", "Deafen Members", "Move Members", "Use Embedded Activities"
    ]
  };

  var ALL_PERMISSIONS_FLAT = [];
  var permCat;
  for (permCat in ALL_PERMISSIONS) {
    ALL_PERMISSIONS[permCat].forEach(function (p) {
      if (ALL_PERMISSIONS_FLAT.indexOf(p) < 0) ALL_PERMISSIONS_FLAT.push(p);
    });
  }

  function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; } }
  function getCurrentEmail() { try { var r = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); return r ? (typeof r === "object" ? r.email : r) : null; } catch (e) { return null; } }
  function getCurrentUser() { var e = getCurrentEmail(); if (!e) return null; return getUsers().find(function (u) { return u.email === e; }) || null; }
  function getServers() { try { return JSON.parse(localStorage.getItem(SERVERS_KEY)) || []; } catch (e) { return []; } }
  function saveServers(d) { localStorage.setItem(SERVERS_KEY, JSON.stringify(d)); }
  function getMessages() { try { return JSON.parse(localStorage.getItem(MESSAGES_KEY)) || {}; } catch (e) { return {}; } }
  function saveMessages(d) { localStorage.setItem(MESSAGES_KEY, JSON.stringify(d)); }
  function escapeHtml(t) { var d = document.createElement("div"); d.appendChild(document.createTextNode(t || "")); return d.innerHTML; }
  function timeAgo(ds) { if (!ds) return ""; var diff = Math.floor((Date.now() - new Date(ds).getTime()) / 1000); if (diff < 60) return "Just now"; if (diff < 3600) return Math.floor(diff / 60) + "m ago"; if (diff < 86400) return Math.floor(diff / 3600) + "h ago"; return Math.floor(diff / 86400) + "d ago"; }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
  function genInviteCode() { var c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; var s = ""; for (var i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function showToast(m, t) { if (typeof window.showToast === "function") window.showToast(m, t); }
  function openModal(id) { if (typeof window.openModal === "function") window.openModal(id); else { var el = document.getElementById(id); if (el) { el.style.display = "flex"; requestAnimationFrame(function () { el.classList.add("show"); }); } } }
  function closeModalFn(id) { if (typeof window.closeModal === "function") window.closeModal(id); else { var el = document.getElementById(id); if (el) { el.classList.remove("show"); setTimeout(function () { el.style.display = "none"; }, 300); } } }
  function hashCode(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h; }
  function getMemberNick(server, email) {
    if (!server.nicknames) server.nicknames = {};
    return server.nicknames[email] || null;
  }
  function getDisplayName(server, user) {
    var nick = getMemberNick(server, user.email);
    return nick || user.name || "Unknown";
  }

  var state = {
    currentServer: null, currentChannel: null, settingsServer: null,
    editingRole: null, createChannelCategoryId: null, membersVisible: true,
    voiceConnected: false, voiceChannelId: null, voiceServerId: null,
    isMuted: false, isDeafened: false, serverMuted: false,
    voiceUsers: {}, editingChannelPerms: null, editingChannel: null,
    editingCategory: null, contextTarget: null, editingMessageIdx: null,
    settingsTab: "overview"
  };

  var els = {};

  function init() {
    els.serverList = document.getElementById("dvServerList");
    if (!els.serverList) return;
    els.channels = document.getElementById("dvChannels");
    els.channelList = document.getElementById("dvChannelList");
    els.channelName = document.getElementById("dvChannelName");
    els.serverTitle = document.getElementById("dvServerTitle");
    els.serverSettingsBtn = document.getElementById("dvServerSettingsBtn");
    els.messages = document.getElementById("dvMessages");
    els.messageInput = document.getElementById("dvMessageInput");
    els.sendBtn = document.getElementById("dvSendBtn");
    els.members = document.getElementById("dvMembers");
    els.membersList = document.getElementById("dvMembersList");
    els.membersToggle = document.getElementById("dvMembersToggle");
    els.userAvatar = document.getElementById("dvUserAvatar");
    els.userName = document.getElementById("dvUserName");
    els.userTag = document.getElementById("dvUserTag");
    els.voicePanel = document.getElementById("dvVoicePanel");
    els.channelsHeader = document.getElementById("dvChannelsHeader");
    els.mainHeader = document.getElementById("dvMainHeader");

    var user = getCurrentUser();
    if (user) {
      els.userAvatar.textContent = (user.name || "U")[0].toUpperCase();
      els.userName.textContent = user.name || "User";
      els.userTag.textContent = "#" + Math.abs(hashCode(user.email)).toString().substr(0, 4);
    }
    createDynamicModals();
    bindEvents();
    renderServerList();
  }

  function createDynamicModals() {
    if (document.getElementById("dvInviteModal")) return;
    var m = document.createElement("div");
    m.innerHTML =
      '<div id="dvInviteModal" class="modal-overlay"><div class="modal-content dv-modal" style="max-width:440px">' +
      '<h2>Invite People</h2>' +
      '<p style="color:var(--text-3);margin-bottom:16px;font-size:14px">Send a link to invite friends</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<input type="text" id="dvInviteLink" readonly style="flex:1;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:13px;outline:none">' +
      '<button class="btn-primary" id="dvCopyInviteBtn" style="white-space:nowrap">Copy</button>' +
      '</div>' +
      '<div class="modal-actions"><button class="btn-secondary" onclick="closeModal(\'dvInviteModal\')">Done</button></div>' +
      '</div></div>' +

      '<div id="dvBanModal" class="modal-overlay"><div class="modal-content dv-modal" style="max-width:440px">' +
      '<h2>Ban Member</h2>' +
      '<p style="color:var(--text-3);margin-bottom:16px;font-size:14px" id="dvBanModalDesc">Are you sure?</p>' +
      '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Reason (optional)</label>' +
      '<input type="text" id="dvBanReasonInput" placeholder="Why are you banning this member?" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:16px;box-sizing:border-box">' +
      '<div class="modal-actions"><button class="btn-secondary" onclick="closeModal(\'dvBanModal\')">Cancel</button><button class="btn-danger" id="dvConfirmBanBtn">Ban</button></div>' +
      '</div></div>' +

      '<div id="dvChannelSettingsModal" class="modal-overlay"><div class="modal-content dv-modal" style="max-width:440px">' +
      '<h2>Channel Settings</h2>' +
      '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Channel Name</label>' +
      '<input type="text" id="dvChSetNameInput" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box">' +
      '<div id="dvChSettingsExtra"></div>' +
      '<div class="modal-actions"><button class="btn-danger" id="dvDeleteChannelBtn" style="margin-right:auto">Delete Channel</button><button class="btn-secondary" onclick="closeModal(\'dvChannelSettingsModal\')">Cancel</button><button class="btn-primary" id="dvSaveChannelSettingsBtn">Save</button></div>' +
      '</div></div>' +

      '<div id="dvEditCategoryModal" class="modal-overlay"><div class="modal-content" style="max-width:420px">' +
      '<h2>Edit Category</h2>' +
      '<input type="text" id="dvEditCategoryInput" placeholder="Category name" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin:16px 0;box-sizing:border-box">' +
      '<div class="modal-actions"><button class="btn-danger" id="dvDeleteCategoryBtn" style="margin-right:auto">Delete Category</button><button class="btn-secondary" onclick="closeModal(\'dvEditCategoryModal\')">Cancel</button><button class="btn-primary" id="dvSaveCategoryBtn">Save</button></div>' +
      '</div></div>' +

      '<div id="dvPinnedModal" class="modal-overlay"><div class="modal-content dv-modal" style="max-width:520px">' +
      '<h2>Pinned Messages</h2>' +
      '<div id="dvPinnedList" style="max-height:400px;overflow-y:auto"></div>' +
      '<div class="modal-actions"><button class="btn-secondary" onclick="closeModal(\'dvPinnedModal\')">Close</button></div>' +
      '</div></div>' +

    document.body.appendChild(m);

    var m2 = document.createElement("div");
    m2.innerHTML =
      '<div id="dvNickModal" class="modal-overlay"><div class="modal-content" style="max-width:420px">' +
      '<h2>Change Nickname</h2>' +
      '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Nickname</label>' +
      '<input type="text" id="dvNickInput" placeholder="New nickname" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:16px;box-sizing:border-box">' +
      '<div class="modal-actions"><button class="btn-secondary" onclick="closeModal(\'dvNickModal\')">Cancel</button><button class="btn-primary" id="dvSaveNickBtn">Save</button></div>' +
      '</div></div>';
    document.body.appendChild(m2);

    var m3 = document.createElement("div");
    m3.innerHTML =
      '<div id="dvChannelPermsModal" class="modal-overlay"><div class="modal-content dv-modal" style="max-width:520px">' +
      '<h2>Channel Permissions</h2>' +
      '<p style="color:var(--text-3);margin-bottom:16px;font-size:13px" id="dvChannelPermsDesc">Set permissions for each role in this channel</p>' +
      '<div id="dvChannelPermsList" style="max-height:400px;overflow-y:auto"></div>' +
      '<div class="modal-actions"><button class="btn-secondary" onclick="closeModal(\'dvChannelPermsModal\')">Cancel</button><button class="btn-primary" id="dvSaveChannelPermsBtn">Save</button></div>' +
      '</div></div>';

      '<div id="dvCategoryPermsModal" class="modal-overlay"><div class="modal-content dv-modal" style="max-width:520px">' +
      '<h2>Category Permissions</h2>' +
      '<p style="color:var(--text-3);margin-bottom:16px;font-size:13px">Set permissions for each role in this category. These apply to all channels inside.</p>' +
      '<div id="dvCategoryPermsList" style="max-height:400px;overflow-y:auto"></div>' +
      '<div class="modal-actions"><button class="btn-secondary" onclick="closeModal(\'dvCategoryPermsModal\')">Cancel</button><button class="btn-primary" id="dvSaveCategoryPermsBtn">Save</button></div>' +
      '</div></div>';
    document.body.appendChild(m3);
  }

  function bindEvents() {
    document.getElementById("dvAddServerBtn").addEventListener("click", function () { openModal("dvCreateServerModal"); });
    document.getElementById("dvExploreBtn").addEventListener("click", function () { renderExploreList(); openModal("dvExploreModal"); });
    document.getElementById("dvCreateServerForm").addEventListener("submit", function (e) { e.preventDefault(); createServer(); });
    els.sendBtn.addEventListener("click", sendMessage);
    els.messageInput.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    els.membersToggle.addEventListener("click", function () { state.membersVisible = !state.membersVisible; els.members.classList.toggle("hidden", !state.membersVisible); });
    els.serverSettingsBtn.addEventListener("click", function () { if (state.currentServer) openServerSettings(state.currentServer); });

    document.querySelectorAll(".dv-settings-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".dv-settings-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var stab = tab.getAttribute("data-stab");
        state.settingsTab = stab;
        renderSettingsTab(stab);
      });
    });

    document.getElementById("dvSaveSettingsBtn").addEventListener("click", saveServerSettings);
    document.getElementById("dvUploadIconBtn").addEventListener("click", function () { document.getElementById("dvIconFileInput").click(); });
    document.getElementById("dvIconFileInput").addEventListener("change", handleIconUpload);
    document.getElementById("dvCreateRoleBtn").addEventListener("click", createRole);
    document.getElementById("dvBackToRoles").addEventListener("click", function () { document.getElementById("dvRoleEditor").style.display = "none"; renderRoles(); });
    document.getElementById("dvSaveRoleBtn").addEventListener("click", saveRole);
    document.getElementById("dvConfirmCategoryBtn").addEventListener("click", createCategory);
    document.getElementById("dvConfirmChannelBtn").addEventListener("click", createChannel);

    document.getElementById("dvMuteBtn").addEventListener("click", toggleMute);
    document.getElementById("dvDeafenBtn").addEventListener("click", toggleDeafen);
    document.getElementById("dvMuteServerBtn").addEventListener("click", toggleMuteServer);
    document.getElementById("dvVoiceDisconnect").addEventListener("click", disconnectVoice);

    document.getElementById("dvCopyInviteBtn").addEventListener("click", function () {
      var inp = document.getElementById("dvInviteLink");
      if (inp.value) {
        if (navigator.clipboard) navigator.clipboard.writeText(inp.value);
        else { inp.select(); document.execCommand("copy"); }
        showToast("Invite link copied!", "success");
      }
    });

    document.getElementById("dvConfirmBanBtn").addEventListener("click", function () {
      if (state.contextTarget) banMember(state.contextTarget, document.getElementById("dvBanReasonInput").value.trim());
    });

    document.getElementById("dvSaveChannelSettingsBtn").addEventListener("click", saveChannelSettings);
    document.getElementById("dvDeleteChannelBtn").addEventListener("click", function () {
      if (state.editingChannel) deleteChannel(state.editingChannel);
    });

    document.getElementById("dvSaveCategoryBtn").addEventListener("click", saveCategoryName);
    document.getElementById("dvDeleteCategoryBtn").addEventListener("click", function () {
      if (state.editingCategory) deleteCategory(state.editingCategory);
    });

    document.getElementById("dvSaveNickBtn").addEventListener("click", function () {
      var servers = getServers();
      var server = servers.find(function (s) { return s.id === state.currentServer; });
      if (!server) return;
      if (!server.nicknames) server.nicknames = {};
      var val = document.getElementById("dvNickInput").value.trim();
      if (val) server.nicknames[getCurrentEmail()] = val;
      else delete server.nicknames[getCurrentEmail()];
      saveServers(servers);
      closeModalFn("dvNickModal");
      renderMembers(server);
      showToast("Nickname updated", "success");
    });

    document.getElementById("dvSaveChannelPermsBtn").addEventListener("click", saveChannelPermissions);
    document.getElementById("dvSaveCategoryPermsBtn").addEventListener("click", saveCategoryPermissions);

    document.getElementById("dvHome").addEventListener("click", function () {
      state.currentServer = null;
      state.currentChannel = null;
      renderServerList();
      els.serverTitle.textContent = "Disvora";
      els.serverSettingsBtn.style.display = "none";
      els.channelList.innerHTML = "";
      els.messages.innerHTML = '<div class="dv-welcome-msg"><h3>Welcome to Disvora!</h3><p>Select a server to start chatting.</p></div>';
      els.messageInput.disabled = true;
      els.sendBtn.disabled = true;
      els.messageInput.placeholder = "Select a server";
      renderServerHeader();
    });

    document.addEventListener("click", function (e) {
      var popup = document.getElementById("dvContextPopup");
      if (popup && !popup.contains(e.target)) popup.remove();
    });
  }

  function createServer() {
    var name = document.getElementById("dvServerNameInput").value.trim();
    var desc = document.getElementById("dvServerDescInput").value.trim();
    if (!name) return;
    var email = getCurrentEmail();
    var servers = getServers();
    var server = {
      id: genId(), name: name, description: desc, icon: null, owner: email,
      members: [email],
      roles: [
        { id: "owner", name: "Owner", color: "#f0b232", permissions: buildDefaultPermissions(true), rank: 0, mentionable: false },
        { id: "admin_role", name: "Administration", color: "#e91e63", permissions: buildDefaultPermissions(false), rank: 1, mentionable: true },
        { id: "default", name: "Member", color: "#99aab5", permissions: { "Send Messages": "on", "Read Messages": "on", "Connect": "on", "Speak": "on", "Use Voice Activity": "on", "Add Reactions": "on", "Attach Files": "on", "Embed Links": "on", "Use External Emojis": "on", "View Channel": "on" }, rank: 2, mentionable: false }
      ],
      memberRoles: {},
      categories: [{ id: genId(), name: "Text Channels", channels: [{ id: genId(), name: "general", type: "text", permissions: {}, topic: "", slowmode: 0, nsfw: false }] }],
      channelPermissions: {},
      voiceUsers: {},
      mutedMembers: [],
      bannedMembers: [],
      invites: [],
      notifications: {},
      pinnedMessages: [],
      verificationLevel: "none",
      nicknames: {},
      collapsedCategories: {},
      createdAt: new Date().toISOString()
    };
    server.memberRoles[email] = ["owner"];
    servers.push(server);
    saveServers(servers);
    closeModalFn("dvCreateServerModal");
    document.getElementById("dvServerNameInput").value = "";
    document.getElementById("dvServerDescInput").value = "";
    selectServer(server.id);
    showToast("Server created!", "success");
  }

  function buildDefaultPermissions(isOwner) {
    var perms = {};
    ALL_PERMISSIONS_FLAT.forEach(function (p) { perms[p] = (isOwner || p === "Send Messages" || p === "Read Messages" || p === "Connect" || p === "Speak" || p === "Use Voice Activity" || p === "Add Reactions" || p === "Attach Files" || p === "Embed Links" || p === "Use External Emojis" || p === "View Channel" || p === "Read Message History" || p === "Use Slash Commands") ? "on" : "off"; });
    if (isOwner) ALL_PERMISSIONS_FLAT.forEach(function (p) { perms[p] = "on"; });
    return perms;
  }

  function renderServerList() {
    var servers = getServers();
    var email = getCurrentEmail();
    var myServers = servers.filter(function (s) { return s.members.indexOf(email) >= 0; });
    var html = "";
    myServers.forEach(function (s) {
      var letter = s.name[0].toUpperCase();
      var isActive = state.currentServer === s.id;
      html += '<div class="dv-server-item' + (isActive ? " active" : "") + '" data-id="' + s.id + '" title="' + escapeHtml(s.name) + '">';
      if (s.icon) html += '<img src="' + s.icon + '">';
      else html += letter;
      html += '</div>';
    });
    els.serverList.innerHTML = html;
    els.serverList.querySelectorAll(".dv-server-item[data-id]").forEach(function (item) {
      item.addEventListener("click", function () { selectServer(this.getAttribute("data-id")); });
    });
  }

  function selectServer(serverId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === serverId; });
    if (!server) return;
    var email = getCurrentEmail();
    if (server.bannedMembers && server.bannedMembers.some(function (b) { return b.email === email; })) {
      showToast("You are banned from this server", "error");
      return;
    }
    state.currentServer = serverId;
    renderServerList();
    els.serverTitle.textContent = server.name;
    els.serverSettingsBtn.style.display = "";
    renderServerHeader();
    renderChannels(server);
    var firstChannel = null;
    server.categories.forEach(function (cat) {
      cat.channels.forEach(function (ch) {
        if (!firstChannel && ch.type === "text" && canViewChannel(server, ch, email)) firstChannel = ch;
      });
    });
    if (firstChannel) selectChannel(firstChannel.id);
    else { els.channelName.textContent = ""; els.messages.innerHTML = '<div class="dv-welcome-msg"><h3>No channels</h3><p>Create a channel to get started.</p></div>'; }
    renderMembers(server);
  }

  function renderServerHeader() {
    var existing = document.getElementById("dvServerHeaderActions");
    if (existing) existing.remove();
    if (!state.currentServer) return;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var email = getCurrentEmail();
    var notifSetting = (server.notifications || {})[email] || "all";
    var pinnedCount = (server.pinnedMessages || []).filter(function (p) { return p.channelId === state.currentChannel; }).length;
    var div = document.createElement("div");
    div.id = "dvServerHeaderActions";
    div.style.cssText = "display:flex;align-items:center;gap:6px;margin-left:auto";
    div.innerHTML =
      '<button class="dv-icon-btn" id="dvInviteBtn" title="Invite People"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg></button>' +
      '<button class="dv-icon-btn' + (notifSetting === "none" ? " muted" : "") + '" id="dvNotifToggleBtn" title="Notification Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>' +
      '<button class="dv-icon-btn" id="dvPinBtn" title="Pinned Messages"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4"/><path d="M15 3.5L9.5 9 15 11l-2.5 5.5"/></svg></button>';
    els.channelsHeader.appendChild(div);

    document.getElementById("dvInviteBtn").addEventListener("click", function () { openInviteModal(); });
    document.getElementById("dvNotifToggleBtn").addEventListener("click", function () { toggleNotificationSettings(); });
    document.getElementById("dvPinBtn").addEventListener("click", function () { showPinnedMessages(); });
  }

  function openInviteModal() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    if (!server.invites) server.invites = [];
    var existing = server.invites.find(function (inv) { return inv.createdBy === getCurrentEmail(); });
    if (!existing) {
      existing = { code: genInviteCode(), createdBy: getCurrentEmail(), createdAt: new Date().toISOString(), uses: 0 };
      server.invites.push(existing);
      saveServers(servers);
    }
    document.getElementById("dvInviteLink").value = "https://disvora.gg/invite/" + existing.code;
    openModal("dvInviteModal");
  }

  function toggleNotificationSettings() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var email = getCurrentEmail();
    if (!server.notifications) server.notifications = {};
    var current = server.notifications[email] || "all";
    var next = current === "all" ? "mentions" : current === "mentions" ? "none" : "all";
    server.notifications[email] = next;
    saveServers(servers);
    renderServerHeader();
    showToast("Notifications: " + next.charAt(0).toUpperCase() + next.slice(1), "success");
  }

  function showPinnedMessages() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var msgs = getMessages();
    var pinned = (server.pinnedMessages || []).filter(function (p) { return p.channelId === state.currentChannel; });
    var html = "";
    if (pinned.length === 0) html = '<div style="text-align:center;padding:30px;color:var(--text-3)"><p>No pinned messages in this channel.</p></div>';
    else {
      var users = getUsers();
      pinned.forEach(function (p) {
        var key = state.currentServer + "___" + state.currentChannel;
        var channelMsgs = msgs[key] || [];
        var msg = channelMsgs[p.messageId];
        if (!msg) return;
        var user = users.find(function (u) { return u.email === msg.from; });
        var name = user ? getDisplayName(server, user) : "Unknown";
        html += '<div class="dv-msg" style="margin-bottom:8px">';
        html += '<div class="dv-msg-avatar">' + name[0].toUpperCase() + '</div>';
        html += '<div class="dv-msg-content"><div class="dv-msg-header"><span class="dv-msg-author">' + escapeHtml(name) + '</span><span class="dv-msg-time">' + timeAgo(msg.time) + '</span></div>';
        html += '<div class="dv-msg-text">' + escapeHtml(msg.text) + '</div></div></div>';
      });
    }
    document.getElementById("dvPinnedList").innerHTML = html;
    openModal("dvPinnedModal");
  }

  function renderChannels(server) {
    var html = "";
    var canManage = hasPermission(server, "Manage Channel");
    var canManageServer = hasPermission(server, "Manage Server");
    var email = getCurrentEmail();
    if (!server.collapsedCategories) server.collapsedCategories = {};

    server.categories.forEach(function (cat) {
      var collapsed = server.collapsedCategories[cat.id];
      html += '<div class="dv-category" data-cat="' + cat.id + '">';
      html += '<span class="dv-category-name">';
      html += '<span class="dv-category-toggle" data-toggle-cat="' + cat.id + '" style="cursor:pointer;margin-right:4px;display:inline-block;transition:transform 0.15s;' + (collapsed ? "transform:rotate(-90deg)" : "") + '">&#9660;</span>';
      html += escapeHtml(cat.name);
      html += '</span>';
      if (canManage || canManageServer) {
        html += '<div style="display:flex;gap:2px">';
        html += '<button class="dv-category-add" data-add-channel="' + cat.id + '" title="Create Channel">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        html += '</button>';
        html += '<button class="dv-category-add" data-cat-perms="' + cat.id + '" title="Category Permissions">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
        html += '</button>';
        html += '<button class="dv-category-add" data-edit-cat="' + cat.id + '" title="Edit Category">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
        html += '</button>';
        html += '</div>';
      }
      html += '</div>';

      if (!collapsed) {
        cat.channels.forEach(function (ch) {
          var canView = canViewChannel(server, ch, email);
          if (!canView) return;
          var isActive = state.currentChannel === ch.id;
          html += '<div class="dv-channel-item' + (isActive ? " active" : "") + '" data-ch="' + ch.id + '" style="position:relative">';
          if (ch.type === "voice") {
            html += '<svg class="dv-voice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
          } else {
            html += '<span class="dv-hash">#</span>';
          }
          html += '<span>' + escapeHtml(ch.name) + '</span>';
          if (ch.nsfw) html += '<span style="font-size:10px;padding:1px 4px;background:rgba(248,113,113,0.15);color:var(--error);border-radius:3px;margin-left:4px">NSFW</span>';
          if (canManage || canManageServer) {
            html += '<div style="display:flex;gap:2px;margin-left:auto">';
            html += '<button class="dv-channel-settings-btn" data-ch-perms="' + ch.id + '" style="background:none;border:none;color:var(--text-4);cursor:pointer;padding:2px;opacity:0;transition:opacity 0.1s" title="Channel Permissions"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></button>';
            html += '<button class="dv-channel-settings-btn" data-edit-ch="' + ch.id + '" style="background:none;border:none;color:var(--text-4);cursor:pointer;padding:2px;opacity:0;transition:opacity 0.1s" title="Edit Channel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>';
            html += '</div>';
          }
          html += '</div>';
        });

        var voiceInCat = cat.channels.filter(function (ch) { return ch.type === "voice"; });
        voiceInCat.forEach(function (ch) {
          var users = (server.voiceUsers || {})[ch.id] || [];
          if (state.voiceConnected && state.voiceChannelId === ch.id) {
            var meInChannel = users.indexOf(getCurrentEmail()) >= 0;
            if (!meInChannel) users.push(getCurrentEmail());
          }
          users.forEach(function (uEmail) {
            var u = getUsers().find(function (usr) { return usr.email === uEmail; });
            if (u) {
              html += '<div class="dv-voice-user">';
              html += '<div class="dv-voice-user-avatar">' + (u.name || "U")[0].toUpperCase() + '</div>';
              html += '<span class="dv-voice-user-name">' + escapeHtml(getDisplayName(server, u)) + '</span>';
              html += '</div>';
            }
          });
        });
      }
    });

    if (canManage || canManageServer) {
      html += '<div style="padding:8px 16px"><button class="btn-secondary" id="dvAddCategoryBtn" style="width:100%;font-size:12px;padding:6px">+ Create Category</button></div>';
    }
    els.channelList.innerHTML = html;

    els.channelList.querySelectorAll(".dv-channel-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        if (e.target.closest(".dv-channel-settings-btn")) return;
        var chId = this.getAttribute("data-ch");
        var ch = findChannel(server, chId);
        if (ch && ch.type === "voice") { joinVoiceChannel(chId); }
        else { selectChannel(chId); }
      });
    });

    els.channelList.querySelectorAll("[data-add-channel]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        state.createChannelCategoryId = this.getAttribute("data-add-channel");
        openModal("dvCreateChannelModal");
      });
    });

    els.channelList.querySelectorAll("[data-cat-perms]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openCategoryPermissionsModal(this.getAttribute("data-cat-perms"));
      });
    });

    els.channelList.querySelectorAll("[data-edit-cat]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openEditCategoryModal(this.getAttribute("data-edit-cat"));
      });
    });

    els.channelList.querySelectorAll("[data-ch-perms]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openChannelPermissionsModal(this.getAttribute("data-ch-perms"));
      });
    });

    els.channelList.querySelectorAll("[data-edit-ch]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openChannelSettingsModal(this.getAttribute("data-edit-ch"));
      });
    });

    els.channelList.querySelectorAll(".dv-channel-item").forEach(function (item) {
      item.addEventListener("mouseenter", function () {
        var btn = this.querySelector(".dv-channel-settings-btn");
        if (btn) btn.style.opacity = "1";
      });
      item.addEventListener("mouseleave", function () {
        var btn = this.querySelector(".dv-channel-settings-btn");
        if (btn) btn.style.opacity = "0";
      });
    });

    els.channelList.querySelectorAll("[data-toggle-cat]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var catId = this.getAttribute("data-toggle-cat");
        if (!server.collapsedCategories) server.collapsedCategories = {};
        server.collapsedCategories[catId] = !server.collapsedCategories[catId];
        saveServers(servers);
        renderChannels(server);
      });
    });

    var addCatBtn = document.getElementById("dvAddCategoryBtn");
    if (addCatBtn) addCatBtn.addEventListener("click", function () { openModal("dvCreateCategoryModal"); });
  }

  function findChannel(server, chId) {
    var found = null;
    server.categories.forEach(function (cat) {
      cat.channels.forEach(function (ch) { if (ch.id === chId) found = ch; });
    });
    return found;
  }

  function findChannelCategory(server, chId) {
    var found = null;
    server.categories.forEach(function (cat) {
      cat.channels.forEach(function (ch) { if (ch.id === chId) found = cat; });
    });
    return found;
  }

  function canViewChannel(server, channel, email) {
    if (server.owner === email) return true;
    if (hasPermission(server, "Manage Server")) return true;
    if (hasPermission(server, "Administration")) return true;
    var memberRoleIds = server.memberRoles[email] || [];
    var cat = findChannelCategory(server, channel.id);
    if (cat && server.categoryPermissions && server.categoryPermissions[cat.id]) {
      var catPerms = server.categoryPermissions[cat.id];
      for (var i = 0; i < memberRoleIds.length; i++) {
        if (catPerms.view && catPerms.view[memberRoleIds[i]] === false) return false;
      }
    }
    var perms = (server.channelPermissions || {})[channel.id];
    if (!perms) return true;
    for (var j = 0; j < memberRoleIds.length; j++) {
      if (perms.view && perms.view[memberRoleIds[j]] === false) return false;
    }
    return true;
  }

  function canSendInChannel(server, channel, email) {
    if (server.owner === email) return true;
    if (hasPermission(server, "Manage Server")) return true;
    if (hasPermission(server, "Administration")) return true;
    if (!hasPermission(server, "Send Messages")) return false;
    var memberRoleIds = server.memberRoles[email] || [];
    var cat = findChannelCategory(server, channel.id);
    if (cat && server.categoryPermissions && server.categoryPermissions[cat.id]) {
      var catPerms = server.categoryPermissions[cat.id];
      for (var i = 0; i < memberRoleIds.length; i++) {
        if (catPerms.send && catPerms.send[memberRoleIds[i]] === false) return false;
      }
    }
    var perms = (server.channelPermissions || {})[channel.id];
    if (!perms) return true;
    for (var j = 0; j < memberRoleIds.length; j++) {
      if (perms.send && perms.send[memberRoleIds[j]] === false) return false;
    }
    return true;
  }

  function canConnectVoice(server, channel, email) {
    if (server.owner === email) return true;
    if (hasPermission(server, "Manage Server")) return true;
    if (!hasPermission(server, "Connect")) return false;
    var memberRoleIds = server.memberRoles[email] || [];
    var cat = findChannelCategory(server, channel.id);
    if (cat && server.categoryPermissions && server.categoryPermissions[cat.id]) {
      var catPerms = server.categoryPermissions[cat.id];
      for (var i = 0; i < memberRoleIds.length; i++) {
        if (catPerms.view && catPerms.view[memberRoleIds[i]] === false) return false;
      }
    }
    var perms = (server.channelPermissions || {})[channel.id];
    if (!perms) return true;
    for (var j = 0; j < memberRoleIds.length; j++) {
      if (perms.view && perms.view[memberRoleIds[j]] === false) return false;
    }
    return true;
  }

  function selectChannel(channelId) {
    state.currentChannel = channelId;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var channel = findChannel(server, channelId);
    if (!channel) return;
    els.channelName.textContent = channel.name;
    els.messageInput.placeholder = "Message #" + channel.name;
    var canSend = canSendInChannel(server, channel, getCurrentEmail());
    els.messageInput.disabled = !canSend;
    els.sendBtn.disabled = !canSend;
    if (!canSend) els.messageInput.placeholder = "You don't have permission to send messages in this channel";
    renderChannels(server);
    renderMessages();
    renderServerHeader();
  }

  function renderMessages() {
    if (!state.currentServer || !state.currentChannel) return;
    var msgs = getMessages();
    var key = state.currentServer + "___" + state.currentChannel;
    var channelMsgs = msgs[key] || [];
    var users = getUsers();
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    var email = getCurrentEmail();
    var canManageMsgs = hasPermission(server, "Manage Messages") || hasPermission(server, "Manage Server") || hasPermission(server, "Administration");
    var channel = server ? findChannel(server, state.currentChannel) : null;
    var channelName = channel ? channel.name : "general";

    var html = '<div class="dv-welcome-msg"><h3>Welcome to #' + escapeHtml(channelName) + '!</h3><p>This is the start of the channel.</p></div>';

    channelMsgs.forEach(function (m, idx) {
      var user = users.find(function (u) { return u.email === m.from; });
      if (!user) return;
      var name = getDisplayName(server, user);
      var letter = name[0].toUpperCase();
      var roleBadge = "";
      if (server) {
        var memberRoleIds = server.memberRoles[m.from] || [];
        var topRole = null;
        server.roles.forEach(function (r) {
          if (memberRoleIds.indexOf(r.id) >= 0 && (!topRole || r.rank < topRole.rank)) topRole = r;
        });
        if (topRole && topRole.name !== "Member") {
          roleBadge = '<span class="dv-msg-role-badge" style="background:' + topRole.color + '33;color:' + topRole.color + '">' + escapeHtml(topRole.name) + '</span>';
        }
      }
      var isOwn = m.from === email;
      var isPinned = m.pinned;
      var editedText = m.edited ? ' <span style="font-size:10px;color:var(--text-4)">(edited)</span>' : "";

      var actionsHtml = "";
      if (isOwn) {
        actionsHtml = '<div class="dv-msg-actions">';
        actionsHtml += '<button class="dv-msg-action-btn" data-action="edit" data-idx="' + idx + '" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
        actionsHtml += '<button class="dv-msg-action-btn" data-action="pin" data-idx="' + idx + '" title="' + (isPinned ? 'Unpin' : 'Pin') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4"/></svg></button>';
        actionsHtml += '<button class="dv-msg-action-btn" data-action="copy" data-idx="' + idx + '" title="Copy Text"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>';
        actionsHtml += '<button class="dv-msg-action-btn dv-msg-delete" data-action="delete" data-idx="' + idx + '" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        actionsHtml += '</div>';
      } else if (canManageMsgs) {
        actionsHtml = '<div class="dv-msg-actions">';
        actionsHtml += '<button class="dv-msg-action-btn" data-action="pin" data-idx="' + idx + '" title="' + (isPinned ? 'Unpin' : 'Pin') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 17v5"/><path d="M9 11l-4 4h14l-4-4"/></svg></button>';
        actionsHtml += '<button class="dv-msg-action-btn" data-action="copy" data-idx="' + idx + '" title="Copy Text"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>';
        actionsHtml += '<button class="dv-msg-action-btn dv-msg-delete" data-action="delete" data-idx="' + idx + '" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        actionsHtml += '</div>';
      } else {
        actionsHtml = '<div class="dv-msg-actions">';
        actionsHtml += '<button class="dv-msg-action-btn" data-action="copy" data-idx="' + idx + '" title="Copy Text"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>';
        actionsHtml += '</div>';
      }

      html += '<div class="dv-msg" data-msg-idx="' + idx + '">';
      html += '<div class="dv-msg-avatar">' + letter + '</div>';
      html += '<div class="dv-msg-content">';
      html += '<div class="dv-msg-header">';
      html += '<span class="dv-msg-author" data-email="' + escapeHtml(m.from) + '">' + escapeHtml(name) + '</span>';
      html += roleBadge;
      if (isPinned) html += '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="12" height="12" style="color:var(--warning)" title="Pinned"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>';
      html += '<span class="dv-msg-time">' + timeAgo(m.time) + editedText + '</span>';
      html += actionsHtml;
      html += '</div>';
      html += '<div class="dv-msg-text" id="dvMsgText_' + idx + '">' + escapeHtml(m.text) + '</div>';
      html += '</div></div>';
    });

    els.messages.innerHTML = html;
    els.messages.scrollTop = els.messages.scrollHeight;

    els.messages.querySelectorAll(".dv-msg-author").forEach(function (el) {
      el.addEventListener("click", function () { showMemberProfile(this.getAttribute("data-email")); });
    });

    els.messages.querySelectorAll(".dv-msg-action-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var action = this.getAttribute("data-action");
        var idx = parseInt(this.getAttribute("data-idx"));
        if (action === "delete") deleteMessage(idx);
        else if (action === "copy") copyMessageText(idx);
        else if (action === "pin") togglePinMessage(idx);
        else if (action === "edit") startEditMessage(idx);
      });
    });

    els.messages.querySelectorAll(".dv-msg").forEach(function (msgEl) {
      msgEl.addEventListener("mouseenter", function () {
        var actions = this.querySelector(".dv-msg-actions");
        if (actions) actions.style.opacity = "1";
      });
      msgEl.addEventListener("mouseleave", function () {
        var actions = this.querySelector(".dv-msg-actions");
        if (actions) actions.style.opacity = "0";
      });
    });
  }

  function deleteMessage(idx) {
    var msgs = getMessages();
    var key = state.currentServer + "___" + state.currentChannel;
    var channelMsgs = msgs[key] || [];
    if (idx >= 0 && idx < channelMsgs.length) {
      var msg = channelMsgs[idx];
      var servers = getServers();
      var server = servers.find(function (s) { return s.id === state.currentServer; });
      if (server && server.pinnedMessages) {
        server.pinnedMessages = server.pinnedMessages.filter(function (p) { return !(p.channelId === state.currentChannel && p.messageId === idx); });
        saveServers(servers);
      }
      channelMsgs.splice(idx, 1);
      msgs[key] = channelMsgs;
      saveMessages(msgs);
      renderMessages();
      showToast("Message deleted", "success");
    }
  }

  function copyMessageText(idx) {
    var msgs = getMessages();
    var key = state.currentServer + "___" + state.currentChannel;
    var channelMsgs = msgs[key] || [];
    if (idx >= 0 && idx < channelMsgs.length) {
      var text = channelMsgs[idx].text;
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
      showToast("Message copied!", "success");
    }
  }

  function togglePinMessage(idx) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    if (!server.pinnedMessages) server.pinnedMessages = [];
    if (!hasPermission(server, "Manage Messages") && !hasPermission(server, "Manage Server")) {
      showToast("No permission to pin messages", "error");
      return;
    }
    var existing = server.pinnedMessages.findIndex(function (p) { return p.channelId === state.currentChannel && p.messageId === idx; });
    if (existing >= 0) {
      server.pinnedMessages.splice(existing, 1);
      showToast("Message unpinned", "success");
    } else {
      server.pinnedMessages.push({ channelId: state.currentChannel, messageId: idx });
      showToast("Message pinned!", "success");
    }
    saveServers(servers);
    renderMessages();
  }

  function startEditMessage(idx) {
    var msgs = getMessages();
    var key = state.currentServer + "___" + state.currentChannel;
    var channelMsgs = msgs[key] || [];
    if (idx >= 0 && idx < channelMsgs.length) {
      var msgEl = document.getElementById("dvMsgText_" + idx);
      if (!msgEl) return;
      var currentText = channelMsgs[idx].text;
      state.editingMessageIdx = idx;
      msgEl.innerHTML = '<div style="display:flex;gap:6px;align-items:center">' +
        '<input type="text" id="dvEditMsgInput" value="' + escapeHtml(currentText).replace(/"/g, "&quot;") + '" style="flex:1;padding:6px 10px;background:var(--bg-2);border:1px solid var(--brand);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none">' +
        '<button class="btn-primary" id="dvSaveEditMsgBtn" style="padding:6px 12px;font-size:12px">Save</button>' +
        '<button class="btn-secondary" id="dvCancelEditMsgBtn" style="padding:6px 12px;font-size:12px">Cancel</button>' +
        '</div>';
      var input = document.getElementById("dvEditMsgInput");
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      document.getElementById("dvSaveEditMsgBtn").addEventListener("click", function () { saveEditMessage(idx); });
      document.getElementById("dvCancelEditMsgBtn").addEventListener("click", function () { state.editingMessageIdx = null; renderMessages(); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); saveEditMessage(idx); }
        if (e.key === "Escape") { state.editingMessageIdx = null; renderMessages(); }
      });
    }
  }

  function saveEditMessage(idx) {
    var input = document.getElementById("dvEditMsgInput");
    if (!input) return;
    var newText = input.value.trim();
    if (!newText) return;
    var msgs = getMessages();
    var key = state.currentServer + "___" + state.currentChannel;
    var channelMsgs = msgs[key] || [];
    if (idx >= 0 && idx < channelMsgs.length) {
      channelMsgs[idx].text = newText;
      channelMsgs[idx].edited = new Date().toISOString();
      msgs[key] = channelMsgs;
      saveMessages(msgs);
      state.editingMessageIdx = null;
      renderMessages();
      showToast("Message edited", "success");
    }
  }

  function sendMessage() {
    var text = els.messageInput.value.trim();
    if (!text || !state.currentServer || !state.currentChannel) return;
    var msgs = getMessages();
    var key = state.currentServer + "___" + state.currentChannel;
    if (!msgs[key]) msgs[key] = [];
    msgs[key].push({ from: getCurrentEmail(), text: text, time: new Date().toISOString(), edited: false, pinned: false });
    saveMessages(msgs);
    els.messageInput.value = "";
    renderMessages();
  }

  function renderMembers(server) {
    var users = getUsers();
    var roles = server.roles.slice().sort(function (a, b) { return a.rank - b.rank; });
    var grouped = {};
    roles.forEach(function (r) { grouped[r.id] = []; });
    server.members.forEach(function (email) {
      var memberRoleIds = server.memberRoles[email] || [];
      var topRole = roles[roles.length - 1];
      memberRoleIds.forEach(function (rid) {
        var r = roles.find(function (role) { return role.id === rid; });
        if (r && r.rank < topRole.rank) topRole = r;
      });
      if (!topRole) topRole = roles[roles.length - 1];
      if (!grouped[topRole.id]) grouped[topRole.id] = [];
      grouped[topRole.id].push(email);
    });
    var html = "";
    roles.forEach(function (r) {
      var members = grouped[r.id] || [];
      if (members.length === 0) return;
      html += '<div class="dv-member-group-title" style="color:' + r.color + '">' + escapeHtml(r.name) + ' &mdash; ' + members.length + '</div>';
      members.forEach(function (email) {
        var user = users.find(function (u) { return u.email === email; });
        if (!user) return;
        var name = getDisplayName(server, user);
        var letter = name[0].toUpperCase();
        var muted = server.mutedMembers && server.mutedMembers.indexOf(email) >= 0;
        var inVoice = server.voiceUsers && Object.keys(server.voiceUsers).some(function (chId) { return (server.voiceUsers[chId] || []).indexOf(email) >= 0; });
        html += '<div class="dv-member-item" data-email="' + escapeHtml(email) + '">';
        html += '<div class="dv-member-avatar" style="background:' + r.color + '">' + letter + '</div>';
        html += '<span class="dv-member-name" style="color:' + r.color + '">' + escapeHtml(name) + '</span>';
        if (muted) html += '<svg viewBox="0 0 24 24" fill="none" stroke="#f23f43" stroke-width="2" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
        if (inVoice) html += '<svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" width="14" height="14" title="In Voice"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
        html += '</div>';
      });
    });
    els.membersList.innerHTML = html;
    els.membersList.querySelectorAll(".dv-member-item").forEach(function (item) {
      item.addEventListener("click", function (e) { showMemberProfile(this.getAttribute("data-email")); });
      item.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        showMemberContextMenu(e, this.getAttribute("data-email"));
      });
    });
  }

  function showMemberContextMenu(e, email) {
    var existing = document.getElementById("dvContextPopup");
    if (existing) existing.remove();
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var me = getCurrentEmail();
    if (email === me) return;

    var popup = document.createElement("div");
    popup.id = "dvContextPopup";
    popup.style.cssText = "position:fixed;z-index:2000;background:var(--bg-elevated);border:1px solid var(--border-light);border-radius:var(--r-md);padding:6px;min-width:180px;box-shadow:var(--shadow-lg)";

    var items = [];
    items.push({ label: "Profile", icon: "user" });
    var canMute = hasPermission(server, "Mute Members");
    var canKick = hasPermission(server, "Kick Members") && email !== server.owner;
    var canBan = hasPermission(server, "Ban Members") && email !== server.owner;
    var canManageRoles = hasPermission(server, "Manage Roles");
    var isMuted = server.mutedMembers && server.mutedMembers.indexOf(email) >= 0;
    if (canMute) items.push({ label: isMuted ? "Unmute" : "Mute", icon: "mute" });
    if (canKick) items.push({ label: "Kick", icon: "kick" });
    if (canBan) items.push({ label: "Ban", icon: "ban" });
    items.push({ label: "Change Nickname", icon: "nick" });
    if (canManageRoles) items.push({ label: "Roles", icon: "roles" });

    var html = "";
    items.forEach(function (item) {
      html += '<div class="dv-ctx-item" data-action="' + item.label.toLowerCase().replace(/\s+/g, "_") + '" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:var(--r-sm);cursor:pointer;font-size:13px;color:var(--text-2);transition:all 0.1s">';
      html += '<span>' + escapeHtml(item.label) + '</span>';
      html += '</div>';
    });
    popup.innerHTML = html;

    var x = e.clientX;
    var y = e.clientY;
    document.body.appendChild(popup);
    popup.style.left = Math.min(x, window.innerWidth - 200) + "px";
    popup.style.top = Math.min(y, window.innerHeight - popup.offsetHeight - 10) + "px";

    popup.querySelectorAll(".dv-ctx-item").forEach(function (el) {
      el.addEventListener("mouseenter", function () { this.style.background = "rgba(255,255,255,0.05)"; this.style.color = "var(--text-1)"; });
      el.addEventListener("mouseleave", function () { this.style.background = ""; this.style.color = "var(--text-2)"; });
      el.addEventListener("click", function () {
        popup.remove();
        var action = this.getAttribute("data-action");
        if (action === "profile") showMemberProfile(email);
        else if (action === "mute") toggleMuteMember(email);
        else if (action === "kick") kickMember(email);
        else if (action === "ban") openBanModal(email);
        else if (action === "change_nickname") openNickModal(email);
        else if (action === "roles") showMemberProfile(email);
      });
    });
  }

  function openBanModal(email) {
    state.contextTarget = email;
    var user = getUsers().find(function (u) { return u.email === email; });
    document.getElementById("dvBanModalDesc").textContent = "Are you sure you want to ban " + (user ? user.name : email) + "?";
    document.getElementById("dvBanReasonInput").value = "";
    openModal("dvBanModal");
  }

  function banMember(email, reason) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server || email === server.owner) return;
    if (!server.bannedMembers) server.bannedMembers = [];
    if (server.bannedMembers.some(function (b) { return b.email === email; })) {
      showToast("Already banned", "error");
      return;
    }
    server.bannedMembers.push({ email: email, reason: reason || "", date: new Date().toISOString() });
    server.members = server.members.filter(function (e) { return e !== email; });
    delete server.memberRoles[email];
    saveServers(servers);
    closeModalFn("dvBanModal");
    renderMembers(server);
    renderChannels(server);
    showToast("Member banned", "success");
  }

  function openNickModal(email) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    state.contextTarget = email;
    document.getElementById("dvNickInput").value = getMemberNick(server, email) || "";
    openModal("dvNickModal");
  }

  function showMemberProfile(email) {
    var user = getUsers().find(function (u) { return u.email === email; });
    if (!user) return;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    var me = getCurrentEmail();

    document.getElementById("dvProfileAvatar").textContent = (user.name || "U")[0].toUpperCase();
    document.getElementById("dvProfileName").textContent = getDisplayName(server || {}, user);
    document.getElementById("dvProfileTag").textContent = "@" + (user.username || "user");

    var rolesHtml = "";
    if (server) {
      var memberRoleIds = server.memberRoles[email] || [];
      memberRoleIds.forEach(function (rid) {
        var r = server.roles.find(function (role) { return role.id === rid; });
        if (r) rolesHtml += '<span class="dv-profile-role" style="background:' + r.color + '33;color:' + r.color + '">' + escapeHtml(r.name) + '</span>';
      });
    }
    document.getElementById("dvProfileRoles").innerHTML = rolesHtml;

    var actionsHtml = "";
    if (email === me && server) {
      var canManageRoles = hasPermission(server, "Manage Roles") || server.owner === me;
      if (canManageRoles) {
        actionsHtml += '<button class="btn-primary" id="dvSelfRoleBtn" style="font-size:13px;width:100%">+ Manage My Roles</button>';
      }
      actionsHtml += '<button class="btn-secondary" id="dvSelfNickBtn" style="font-size:13px;width:100%">Change Nickname</button>';
    } else if (email !== me && server) {
      var canMute = hasPermission(server, "Mute Members");
      var canKick = hasPermission(server, "Kick Members") && email !== server.owner;
      var canBan = hasPermission(server, "Ban Members") && email !== server.owner;

      if (canMute) {
        var isMuted = server.mutedMembers && server.mutedMembers.indexOf(email) >= 0;
        actionsHtml += '<button class="btn-secondary" id="dvProfileMuteBtn" style="font-size:13px">' + (isMuted ? 'Unmute' : 'Mute') + '</button>';
      }
      if (canKick) {
        actionsHtml += '<button class="btn-danger" id="dvProfileKickBtn" style="font-size:13px">Kick</button>';
      }
      if (canBan) {
        actionsHtml += '<button class="btn-danger" id="dvProfileBanBtn" style="font-size:13px;background:rgba(248,113,113,0.2)">Ban</button>';
      }

      var assignableRoles = getAssignableRoles(server);
      if (assignableRoles.length > 0 && hasPermission(server, "Manage Roles")) {
        actionsHtml += '<div style="width:100%;margin-top:8px">';
        actionsHtml += '<label style="font-size:11px;color:var(--text-4);display:block;margin-bottom:4px">Assign Role</label>';
        actionsHtml += '<select id="dvProfileRoleSelect" style="width:100%;padding:6px 10px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;color:var(--text-1);font-size:13px">';
        actionsHtml += '<option value="">Select role...</option>';
        assignableRoles.forEach(function (r) {
          var has = (server.memberRoles[email] || []).indexOf(r.id) >= 0;
          actionsHtml += '<option value="' + r.id + '"' + (has ? ' selected' : '') + '>' + escapeHtml(r.name) + '</option>';
        });
        actionsHtml += '</select></div>';
      }
    }
    actionsHtml += '<button class="btn-secondary" style="font-size:13px" onclick="closeModal(\'dvMemberProfileModal\')">Close</button>';
    document.getElementById("dvProfileActions").innerHTML = actionsHtml;

    if (server && email === me) {
      var selfRoleBtn = document.getElementById("dvSelfRoleBtn");
      if (selfRoleBtn) selfRoleBtn.addEventListener("click", function () { closeModalFn("dvMemberProfileModal"); openSelfRoleModal(); });
      var selfNickBtn = document.getElementById("dvSelfNickBtn");
      if (selfNickBtn) selfNickBtn.addEventListener("click", function () { closeModalFn("dvMemberProfileModal"); openNickModal(me); });
    }

    if (server && email !== me) {
      var muteBtn = document.getElementById("dvProfileMuteBtn");
      if (muteBtn) muteBtn.addEventListener("click", function () { toggleMuteMember(email); closeModalFn("dvMemberProfileModal"); });
      var kickBtn = document.getElementById("dvProfileKickBtn");
      if (kickBtn) kickBtn.addEventListener("click", function () { kickMember(email); closeModalFn("dvMemberProfileModal"); });
      var banBtn = document.getElementById("dvProfileBanBtn");
      if (banBtn) banBtn.addEventListener("click", function () { closeModalFn("dvMemberProfileModal"); openBanModal(email); });
      var roleSelect = document.getElementById("dvProfileRoleSelect");
      if (roleSelect) roleSelect.addEventListener("change", function () { assignRole(email, this.value); });
    }

    openModal("dvMemberProfileModal");
  }

  function getMyTopRole(server) {
    var email = getCurrentEmail();
    if (server.owner === email) return server.roles[0];
    var memberRoleIds = server.memberRoles[email] || [];
    var top = null;
    server.roles.forEach(function (r) {
      if (memberRoleIds.indexOf(r.id) >= 0 && (!top || r.rank < top.rank)) top = r;
    });
    return top;
  }

  function getAssignableRoles(server) {
    var myTop = getMyTopRole(server);
    if (!myTop) return [];
    if (server.owner === getCurrentEmail()) return server.roles.filter(function (r) { return r.id !== "owner"; });
    return server.roles.filter(function (r) { return r.rank > myTop.rank; });
  }

  function toggleMuteMember(email) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    if (!server.mutedMembers) server.mutedMembers = [];
    var idx = server.mutedMembers.indexOf(email);
    if (idx >= 0) { server.mutedMembers.splice(idx, 1); showToast("Member unmuted", "success"); }
    else { server.mutedMembers.push(email); showToast("Member muted", "success"); }
    saveServers(servers);
    renderMembers(server);
  }

  function kickMember(email) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server || email === server.owner) return;
    server.members = server.members.filter(function (e) { return e !== email; });
    delete server.memberRoles[email];
    saveServers(servers);
    renderMembers(server);
    renderChannels(server);
    showToast("Member kicked", "success");
  }

  function assignRole(email, roleId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    if (!server.memberRoles[email]) server.memberRoles[email] = [];
    if (roleId && server.memberRoles[email].indexOf(roleId) < 0) {
      server.memberRoles[email].push(roleId);
    } else if (!roleId && server.memberRoles[email].length > 1) {
      server.memberRoles[email] = server.memberRoles[email].slice(0, 1);
    }
    saveServers(servers);
    renderMembers(server);
    renderChannels(server);
    showToast("Role updated", "success");
  }

  // Voice
  function joinVoiceChannel(channelId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var email = getCurrentEmail();
    if (!canConnectVoice(server, findChannel(server, channelId) || {}, email)) { showToast("No permission to connect", "error"); return; }

    if (state.voiceConnected && state.voiceChannelId === channelId) return;

    if (state.voiceConnected) disconnectVoice();

    if (!server.voiceUsers) server.voiceUsers = {};
    if (!server.voiceUsers[channelId]) server.voiceUsers[channelId] = [];
    server.voiceUsers[channelId].push(email);
    saveServers(servers);

    state.voiceConnected = true;
    state.voiceChannelId = channelId;
    state.voiceServerId = state.currentServer;
    state.isMuted = false;
    state.isDeafened = false;
    state.serverMuted = false;

    els.voicePanel.style.display = "";
    updateVoiceUI();
    renderChannels(server);
    showToast("Voice connected!", "success");
  }

  function disconnectVoice() {
    if (!state.voiceConnected) return;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.voiceServerId; });
    if (server && server.voiceUsers && server.voiceUsers[state.voiceChannelId]) {
      server.voiceUsers[state.voiceChannelId] = server.voiceUsers[state.voiceChannelId].filter(function (e) { return e !== getCurrentEmail(); });
      saveServers(servers);
    }
    state.voiceConnected = false;
    state.voiceChannelId = null;
    state.voiceServerId = null;
    els.voicePanel.style.display = "none";
    if (server) renderChannels(server);
    showToast("Voice disconnected", "success");
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    document.getElementById("dvMuteBtn").classList.toggle("muted", state.isMuted);
    showToast(state.isMuted ? "Muted" : "Unmuted", "success");
  }

  function toggleDeafen() {
    state.isDeafened = !state.isDeafened;
    if (state.isDeafened) state.isMuted = true;
    document.getElementById("dvDeafenBtn").classList.toggle("muted", state.isDeafened);
    document.getElementById("dvMuteBtn").classList.toggle("muted", state.isMuted);
    showToast(state.isDeafened ? "Deafened" : "Undeafened", "success");
  }

  function toggleMuteServer() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    if (!hasPermission(server, "Manage Server") && !hasPermission(server, "Administration")) {
      showToast("No permission", "error"); return;
    }
    state.serverMuted = !state.serverMuted;
    document.getElementById("dvMuteServerBtn").classList.toggle("muted", state.serverMuted);
    showToast(state.serverMuted ? "Server muted" : "Server unmuted", "success");
  }

  function updateVoiceUI() {
    document.getElementById("dvMuteBtn").classList.toggle("muted", state.isMuted);
    document.getElementById("dvDeafenBtn").classList.toggle("muted", state.isDeafened);
    document.getElementById("dvMuteServerBtn").classList.toggle("muted", state.serverMuted);
  }

  // Server Settings
  function openServerSettings(serverId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === serverId; });
    if (!server) return;
    state.settingsServer = serverId;
    state.settingsTab = "overview";
    document.getElementById("dvSettingsNameInput").value = server.name;
    var iconEl = document.getElementById("dvSettingsIcon");
    if (server.icon) iconEl.innerHTML = '<img src="' + server.icon + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
    else iconEl.textContent = server.name[0].toUpperCase();
    var nav = document.querySelector(".dv-settings-nav");
    if (nav && !nav.querySelector('[data-stab="members"]')) {
      var extraTabs = [
        { tab: "members", label: "Members" },
        { tab: "invites", label: "Invites" },
        { tab: "notifications", label: "Notifications" },
        { tab: "safety", label: "Safety" }
      ];
      extraTabs.forEach(function (t) {
        var btn = document.createElement("button");
        btn.className = "dv-settings-tab";
        btn.setAttribute("data-stab", t.tab);
        btn.textContent = t.label;
        btn.addEventListener("click", function () {
          document.querySelectorAll(".dv-settings-tab").forEach(function (tb) { tb.classList.remove("active"); });
          btn.classList.add("active");
          state.settingsTab = t.tab;
          renderSettingsTab(t.tab);
        });
        nav.appendChild(btn);
      });
    }
    document.querySelectorAll(".dv-settings-tab").forEach(function (t) { t.classList.remove("active"); });
    document.querySelector('.dv-settings-tab[data-stab="overview"]').classList.add("active");
    renderSettingsTab("overview");
    openModal("dvServerSettingsModal");
  }

  function renderSettingsTab(tab) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.settingsServer; });
    if (!server) return;
    var content = document.getElementById("dvSettingsContent");
    var isOwner = server.owner === getCurrentEmail();
    var canManage = hasPermission(server, "Manage Server") || isOwner;

    if (tab === "overview") {
      document.getElementById("dvSettingsOverview").style.display = "";
      document.getElementById("dvSettingsRoles").style.display = "none";
      hideSettingsExtraPanels();
      var extraHtml = '<div style="margin-top:16px">';
      extraHtml += '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Server Description</label>';
      extraHtml += '<input type="text" id="dvSettingsDescInput" value="' + escapeHtml(server.description || "") + '" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:16px;box-sizing:border-box">';
      extraHtml += '</div>';
      if (isOwner) {
        extraHtml += '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">';
        extraHtml += '<h4 style="color:var(--error);font-size:14px;margin-bottom:8px">Danger Zone</h4>';
        extraHtml += '<button class="btn-danger" id="dvDeleteServerBtn">Delete Server</button>';
        extraHtml += '</div>';
      }
      var existing = document.getElementById("dvSettingsExtraContent");
      if (existing) existing.remove();
      var div = document.createElement("div");
      div.id = "dvSettingsExtraContent";
      div.innerHTML = extraHtml;
      document.getElementById("dvSettingsOverview").appendChild(div);
      var delBtn = document.getElementById("dvDeleteServerBtn");
      if (delBtn) delBtn.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this server? This cannot be undone.")) {
          var servers2 = getServers();
          servers2 = servers2.filter(function (s) { return s.id !== state.settingsServer; });
          saveServers(servers2);
          closeModalFn("dvServerSettingsModal");
          state.currentServer = null;
          state.currentChannel = null;
          renderServerList();
          els.serverTitle.textContent = "Disvora";
          els.serverSettingsBtn.style.display = "none";
          els.channelList.innerHTML = "";
          els.messages.innerHTML = '<div class="dv-welcome-msg"><h3>Welcome to Disvora!</h3><p>Select a server to start chatting.</p></div>';
          showToast("Server deleted", "success");
        }
      });
    } else if (tab === "roles") {
      document.getElementById("dvSettingsOverview").style.display = "none";
      document.getElementById("dvSettingsRoles").style.display = "";
      hideSettingsExtraPanels();
      renderRoles();
    } else if (tab === "members") {
      document.getElementById("dvSettingsOverview").style.display = "none";
      document.getElementById("dvSettingsRoles").style.display = "none";
      renderSettingsMembers(server);
    } else if (tab === "invites") {
      document.getElementById("dvSettingsOverview").style.display = "none";
      document.getElementById("dvSettingsRoles").style.display = "none";
      renderSettingsInvites(server);
    } else if (tab === "notifications") {
      document.getElementById("dvSettingsOverview").style.display = "none";
      document.getElementById("dvSettingsRoles").style.display = "none";
      renderSettingsNotifications(server);
    } else if (tab === "safety") {
      document.getElementById("dvSettingsOverview").style.display = "none";
      document.getElementById("dvSettingsRoles").style.display = "none";
      renderSettingsSafety(server);
    }
  }

  function hideSettingsExtraPanels() {
    var existing = document.getElementById("dvSettingsExtraContent");
    if (existing) existing.remove();
  }

  function renderSettingsMembers(server) {
    var existing = document.getElementById("dvSettingsExtraContent");
    if (existing) existing.remove();
    var users = getUsers();
    var html = '<div id="dvSettingsExtraContent"><h3 style="margin-bottom:16px">Members &mdash; ' + server.members.length + '</div>';
    html += '<div style="max-height:400px;overflow-y:auto">';
    server.members.forEach(function (email) {
      var user = users.find(function (u) { return u.email === email; });
      if (!user) return;
      var name = getDisplayName(server, user);
      var isOwner = server.owner === email;
      var memberRoleIds = server.memberRoles[email] || [];
      var roleNames = [];
      memberRoleIds.forEach(function (rid) {
        var r = server.roles.find(function (role) { return role.id === rid; });
        if (r) roleNames.push('<span style="background:' + r.color + '33;color:' + r.color + ';padding:2px 6px;border-radius:3px;font-size:11px">' + escapeHtml(r.name) + '</span>');
      });
      html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border)">';
      html += '<div style="width:32px;height:32px;border-radius:50%;background:var(--bg-surface);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--text-2)">' + name[0].toUpperCase() + '</div>';
      html += '<div style="flex:1"><div style="font-size:14px;font-weight:500;color:var(--text-1)">' + escapeHtml(name) + (isOwner ? ' <span style="color:var(--warning);font-size:11px">(Owner)</span>' : '') + '</div>';
      html += '<div style="font-size:12px;color:var(--text-4)">' + escapeHtml(email) + '</div></div>';
      html += '<div style="display:flex;gap:4px;flex-wrap:wrap">' + roleNames.join("") + '</div>';
      if (!isOwner && email !== getCurrentEmail()) {
        html += '<div style="display:flex;gap:4px">';
        if (hasPermission(server, "Kick Members")) html += '<button class="btn-secondary dv-settings-kick-btn" data-email="' + escapeHtml(email) + '" style="padding:4px 10px;font-size:11px">Kick</button>';
        if (hasPermission(server, "Ban Members")) html += '<button class="btn-danger dv-settings-ban-btn" data-email="' + escapeHtml(email) + '" style="padding:4px 10px;font-size:11px">Ban</button>';
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div></div>';
    document.getElementById("dvSettingsContent").appendChild(document.createRange().createContextualFragment(html));
    document.querySelectorAll(".dv-settings-kick-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { kickMember(this.getAttribute("data-email")); renderSettingsMembers(server); });
    });
    document.querySelectorAll(".dv-settings-ban-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { openBanModal(this.getAttribute("data-email")); });
    });
  }

  function renderSettingsInvites(server) {
    var existing = document.getElementById("dvSettingsExtraContent");
    if (existing) existing.remove();
    var users = getUsers();
    if (!server.invites) server.invites = [];
    var html = '<div id="dvSettingsExtraContent"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px"><h3>Invites</h3>';
    if (hasPermission(server, "Manage Server")) html += '<button class="btn-primary" id="dvSettingsCreateInviteBtn" style="font-size:13px;padding:8px 16px">Create Invite</button>';
    html += '</div>';
    if (server.invites.length === 0) html += '<p style="color:var(--text-3);font-size:14px">No active invites.</p>';
    else {
      server.invites.forEach(function (inv, i) {
        var creator = users.find(function (u) { return u.email === inv.createdBy; });
        var creatorName = creator ? creator.name : "Unknown";
        html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:8px">';
        html += '<div style="flex:1"><div style="font-size:14px;font-weight:500;color:var(--text-1);font-family:monospace">https://disvora.gg/invite/' + escapeHtml(inv.code) + '</div>';
        html += '<div style="font-size:12px;color:var(--text-4);margin-top:2px">Created by ' + escapeHtml(creatorName) + ' &middot; ' + timeAgo(inv.createdAt) + ' &middot; ' + (inv.uses || 0) + ' uses</div></div>';
        if (hasPermission(server, "Manage Server")) html += '<button class="btn-danger dv-revoke-invite-btn" data-idx="' + i + '" style="padding:4px 12px;font-size:12px">Revoke</button>';
        html += '</div>';
      });
    }
    html += '</div>';
    document.getElementById("dvSettingsContent").appendChild(document.createRange().createContextualFragment(html));
    var createBtn = document.getElementById("dvSettingsCreateInviteBtn");
    if (createBtn) createBtn.addEventListener("click", function () { openInviteModal(); });
    document.querySelectorAll(".dv-revoke-invite-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-idx"));
        server.invites.splice(idx, 1);
        saveServers(getServers());
        renderSettingsInvites(server);
        showToast("Invite revoked", "success");
      });
    });
  }

  function renderSettingsNotifications(server) {
    var existing = document.getElementById("dvSettingsExtraContent");
    if (existing) existing.remove();
    var email = getCurrentEmail();
    if (!server.notifications) server.notifications = {};
    var current = server.notifications[email] || "all";
    var html = '<div id="dvSettingsExtraContent"><h3 style="margin-bottom:16px">Notification Settings</h3>';
    html += '<p style="color:var(--text-3);font-size:14px;margin-bottom:16px">Configure how you receive notifications in this server.</p>';
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    var opts = [
      { val: "all", label: "All Messages", desc: "You'll receive notifications for every message" },
      { val: "mentions", label: "Only @mentions", desc: "Only be notified when someone mentions you" },
      { val: "none", label: "Nothing", desc: "Turn off all notifications for this server" }
    ];
    opts.forEach(function (opt) {
      var selected = current === opt.val;
      html += '<div class="dv-notif-option" data-val="' + opt.val + '" style="padding:14px 16px;background:var(--bg-2);border:2px solid ' + (selected ? "var(--brand)" : "var(--border)") + ';border-radius:var(--r-sm);cursor:pointer;transition:border-color 0.15s">';
      html += '<div style="font-size:14px;font-weight:600;color:var(--text-1)">' + opt.label + '</div>';
      html += '<div style="font-size:12px;color:var(--text-4);margin-top:2px">' + opt.desc + '</div>';
      html += '</div>';
    });
    html += '</div></div>';
    document.getElementById("dvSettingsContent").appendChild(document.createRange().createContextualFragment(html));
    document.querySelectorAll(".dv-notif-option").forEach(function (el) {
      el.addEventListener("click", function () {
        server.notifications[email] = this.getAttribute("data-val");
        saveServers(getServers());
        renderSettingsNotifications(server);
        showToast("Notification settings updated", "success");
      });
    });
  }

  function renderSettingsSafety(server) {
    var existing = document.getElementById("dvSettingsExtraContent");
    if (existing) existing.remove();
    var isOwner = server.owner === getCurrentEmail();
    var users = getUsers();
    if (!server.bannedMembers) server.bannedMembers = [];
    var html = '<div id="dvSettingsExtraContent"><h3 style="margin-bottom:16px">Safety</h3>';

    html += '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Verification Level</label>';
    html += '<select id="dvVerificationSelect" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:20px;box-sizing:border-box">';
    ["none", "low", "medium", "high"].forEach(function (v) {
      html += '<option value="' + v + '"' + (server.verificationLevel === v ? " selected" : "") + '>' + v.charAt(0).toUpperCase() + v.slice(1) + '</option>';
    });
    html += '</select>';

    html += '<h4 style="margin-bottom:12px">Banned Members (' + server.bannedMembers.length + ')</h4>';
    if (server.bannedMembers.length === 0) html += '<p style="color:var(--text-3);font-size:14px">No banned members.</p>';
    else {
      server.bannedMembers.forEach(function (b, i) {
        var user = users.find(function (u) { return u.email === b.email; });
        var name = user ? user.name : b.email;
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:8px">';
        html += '<div style="flex:1"><div style="font-size:14px;font-weight:500;color:var(--text-1)">' + escapeHtml(name) + '</div>';
        html += '<div style="font-size:12px;color:var(--text-4)">' + escapeHtml(b.email) + (b.reason ? ' &middot; Reason: ' + escapeHtml(b.reason) : '') + ' &middot; ' + timeAgo(b.date) + '</div></div>';
        if (isOwner || hasPermission(server, "Manage Server")) html += '<button class="btn-secondary dv-unban-btn" data-idx="' + i + '" style="padding:4px 12px;font-size:12px">Unban</button>';
        html += '</div>';
      });
    }
    html += '</div>';
    document.getElementById("dvSettingsContent").appendChild(document.createRange().createContextualFragment(html));
    document.getElementById("dvVerificationSelect").addEventListener("change", function () {
      server.verificationLevel = this.value;
      saveServers(getServers());
      showToast("Verification level updated", "success");
    });
    document.querySelectorAll(".dv-unban-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(this.getAttribute("data-idx"));
        server.bannedMembers.splice(idx, 1);
        saveServers(getServers());
        renderSettingsSafety(server);
        showToast("Member unbanned", "success");
      });
    });
  }

  function saveServerSettings() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.settingsServer; });
    if (!server) return;
    var newName = document.getElementById("dvSettingsNameInput").value.trim();
    if (newName) server.name = newName;
    var descInput = document.getElementById("dvSettingsDescInput");
    if (descInput) server.description = descInput.value.trim();
    saveServers(servers);
    if (state.currentServer === state.settingsServer) { els.serverTitle.textContent = server.name; renderServerList(); }
    showToast("Settings saved!", "success");
  }

  function handleIconUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var servers = getServers();
      var server = servers.find(function (s) { return s.id === state.settingsServer; });
      if (server) {
        server.icon = ev.target.result;
        saveServers(servers);
        document.getElementById("dvSettingsIcon").innerHTML = '<img src="' + ev.target.result + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';
        renderServerList();
      }
    };
    reader.readAsDataURL(file);
  }

  // Roles
  function renderRoles() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.settingsServer; });
    if (!server) return;
    var html = "";
    server.roles.forEach(function (r) {
      var memberCount = server.members.filter(function (email) { return (server.memberRoles[email] || []).indexOf(r.id) >= 0; }).length;
      html += '<div class="dv-role-item" data-role="' + r.id + '">';
      html += '<div class="dv-role-dot" style="background:' + r.color + '"></div>';
      html += '<span class="dv-role-name">' + escapeHtml(r.name) + '</span>';
      html += '<span class="dv-role-member-count">' + memberCount + ' members</span>';
      if (r.id !== "owner") html += '<button class="btn-danger dv-delete-role-btn" data-role="' + r.id + '" style="margin-left:auto;padding:4px 10px;font-size:11px">Delete</button>';
      html += '</div>';
    });
    document.getElementById("dvRolesList").innerHTML = html;
    document.getElementById("dvRolesList").querySelectorAll(".dv-role-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        if (e.target.closest(".dv-delete-role-btn")) return;
        editRole(this.getAttribute("data-role"));
      });
    });
    document.querySelectorAll(".dv-delete-role-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var roleId = this.getAttribute("data-role");
        var servers2 = getServers();
        var server2 = servers2.find(function (s) { return s.id === state.settingsServer; });
        if (server2) {
          server2.roles = server2.roles.filter(function (r) { return r.id !== roleId; });
          saveServers(servers2);
          renderRoles();
          showToast("Role deleted", "success");
        }
      });
    });
  }

  function createRole() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.settingsServer; });
    if (!server) return;
    var newRole = { id: genId(), name: "New Role", color: "#99aab5", permissions: { "Send Messages": "on", "Read Messages": "on", "View Channel": "on" }, rank: server.roles.length, mentionable: false };
    server.roles.push(newRole);
    saveServers(servers);
    editRole(newRole.id);
    showToast("Role created!", "success");
  }

  function editRole(roleId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.settingsServer; });
    if (!server) return;
    var role = server.roles.find(function (r) { return r.id === roleId; });
    if (!role) return;
    state.editingRole = roleId;
    document.getElementById("dvRolesList").style.display = "none";
    document.getElementById("dvRoleEditor").style.display = "";
    document.getElementById("dvRoleNameInput").value = role.name;
    document.getElementById("dvRoleColorInput").value = role.color;
    document.getElementById("dvRoleEditorDot").style.background = role.color;

    var permsHtml = "";
    var categories = { "General Permissions": ALL_PERMISSIONS.general, "Text Permissions": ALL_PERMISSIONS.text, "Voice Permissions": ALL_PERMISSIONS.voice };
    var catName;
    for (catName in categories) {
      permsHtml += '<div style="font-size:11px;font-weight:700;color:var(--text-4);text-transform:uppercase;letter-spacing:0.6px;margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--border)">' + catName + '</div>';
      categories[catName].forEach(function (p) {
        var val = role.permissions[p] || "neutral";
        permsHtml += '<div class="dv-perm-item">';
        permsHtml += '<span class="dv-perm-name">' + p + '</span>';
        permsHtml += '<div class="dv-perm-toggle">';
        permsHtml += '<button class="dv-perm-btn on' + (val === "on" ? " active" : "") + '" data-perm="' + p + '" data-val="on">On</button>';
        permsHtml += '<button class="dv-perm-btn off' + (val === "off" ? " active" : "") + '" data-perm="' + p + '" data-val="off">Off</button>';
        permsHtml += '<button class="dv-perm-btn neutral' + (val === "neutral" ? " active" : "") + '" data-perm="' + p + '" data-val="neutral">&mdash;</button>';
        permsHtml += '</div></div>';
      });
    }
    document.getElementById("dvPermissionsList").innerHTML = permsHtml;
    document.getElementById("dvPermissionsList").querySelectorAll(".dv-perm-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        this.parentElement.querySelectorAll(".dv-perm-btn").forEach(function (s) { s.classList.remove("active"); });
        this.classList.add("active");
      });
    });
  }

  function saveRole() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.settingsServer; });
    if (!server || !state.editingRole) return;
    var role = server.roles.find(function (r) { return r.id === state.editingRole; });
    if (!role) return;
    role.name = document.getElementById("dvRoleNameInput").value.trim() || "New Role";
    role.color = document.getElementById("dvRoleColorInput").value;
    document.querySelectorAll("#dvPermissionsList .dv-perm-item").forEach(function (item) {
      var permName = item.querySelector(".dv-perm-name").textContent;
      var activeBtn = item.querySelector(".dv-perm-btn.active");
      if (activeBtn) role.permissions[permName] = activeBtn.getAttribute("data-val");
    });
    saveServers(servers);
    document.getElementById("dvRoleEditor").style.display = "none";
    document.getElementById("dvRolesList").style.display = "";
    renderRoles();
    showToast("Role saved!", "success");
  }

  function createCategory() {
    var name = document.getElementById("dvCategoryNameInput").value.trim();
    if (!name || !state.currentServer) return;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    server.categories.push({ id: genId(), name: name, channels: [] });
    saveServers(servers);
    closeModalFn("dvCreateCategoryModal");
    document.getElementById("dvCategoryNameInput").value = "";
    renderChannels(server);
    showToast("Category created!", "success");
  }

  function createChannel() {
    var name = document.getElementById("dvChannelNameInput").value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!name || !state.currentServer || !state.createChannelCategoryId) return;
    var type = document.querySelector('input[name="dvChannelType"]:checked').value;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var cat = server.categories.find(function (c) { return c.id === state.createChannelCategoryId; });
    if (!cat) return;
    cat.channels.push({ id: genId(), name: name, type: type, permissions: {}, topic: "", slowmode: 0, nsfw: false, userLimit: 0 });
    saveServers(servers);
    closeModalFn("dvCreateChannelModal");
    document.getElementById("dvChannelNameInput").value = "";
    renderChannels(server);
    showToast("Channel created!", "success");
  }

  function openChannelSettingsModal(chId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var ch = findChannel(server, chId);
    if (!ch) return;
    state.editingChannel = chId;
    document.getElementById("dvChSetNameInput").value = ch.name;
    var extra = document.getElementById("dvChSettingsExtra");
    if (ch.type === "text") {
      extra.innerHTML =
        '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Topic</label>' +
        '<input type="text" id="dvChTopicInput" value="' + escapeHtml(ch.topic || "") + '" placeholder="Channel topic" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box">' +
        '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">Slowmode (seconds)</label>' +
        '<input type="number" id="dvChSlowmodeInput" value="' + (ch.slowmode || 0) + '" min="0" max="21600" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:12px"><input type="checkbox" id="dvChNsfwInput"' + (ch.nsfw ? " checked" : "") + ' style="accent-color:var(--error)"><span style="font-size:14px;color:var(--text-2)">Age-Restricted Channel (NSFW)</span></label>';
    } else {
      extra.innerHTML =
        '<label style="font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block">User Limit (0 = unlimited)</label>' +
        '<input type="number" id="dvChUserLimitInput" value="' + (ch.userLimit || 0) + '" min="0" max="99" style="width:100%;padding:10px 14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text-1);font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box">';
    }
    openModal("dvChannelSettingsModal");
  }

  function saveChannelSettings() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server || !state.editingChannel) return;
    var ch = findChannel(server, state.editingChannel);
    if (!ch) return;
    var newName = document.getElementById("dvChSetNameInput").value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (newName) ch.name = newName;
    if (ch.type === "text") {
      ch.topic = (document.getElementById("dvChTopicInput") || {}).value || "";
      ch.slowmode = parseInt((document.getElementById("dvChSlowmodeInput") || {}).value) || 0;
      ch.nsfw = (document.getElementById("dvChNsfwInput") || {}).checked || false;
    } else {
      ch.userLimit = parseInt((document.getElementById("dvChUserLimitInput") || {}).value) || 0;
    }
    saveServers(servers);
    closeModalFn("dvChannelSettingsModal");
    renderChannels(server);
    if (state.currentChannel === state.editingChannel) els.channelName.textContent = ch.name;
    showToast("Channel settings saved", "success");
  }

  function deleteChannel(chId) {
    if (!confirm("Are you sure you want to delete this channel?")) return;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    server.categories.forEach(function (cat) {
      cat.channels = cat.channels.filter(function (ch) { return ch.id !== chId; });
    });
    saveServers(servers);
    closeModalFn("dvChannelSettingsModal");
    if (state.currentChannel === chId) {
      state.currentChannel = null;
      els.messages.innerHTML = '<div class="dv-welcome-msg"><h3>Channel deleted</h3><p>Select another channel.</p></div>';
    }
    renderChannels(server);
    showToast("Channel deleted", "success");
  }

  function openEditCategoryModal(catId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var cat = server.categories.find(function (c) { return c.id === catId; });
    if (!cat) return;
    state.editingCategory = catId;
    document.getElementById("dvEditCategoryInput").value = cat.name;
    openModal("dvEditCategoryModal");
  }

  function saveCategoryName() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server || !state.editingCategory) return;
    var cat = server.categories.find(function (c) { return c.id === state.editingCategory; });
    if (!cat) return;
    var newName = document.getElementById("dvEditCategoryInput").value.trim();
    if (newName) cat.name = newName;
    saveServers(servers);
    closeModalFn("dvEditCategoryModal");
    renderChannels(server);
    showToast("Category updated", "success");
  }

  function deleteCategory(catId) {
    if (!confirm("Delete this category? Channels will be removed.")) return;
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    server.categories = server.categories.filter(function (c) { return c.id !== catId; });
    saveServers(servers);
    closeModalFn("dvEditCategoryModal");
    renderChannels(server);
    showToast("Category deleted", "success");
  }

  function renderExploreList() {
    var servers = getServers();
    var email = getCurrentEmail();
    var html = "";
    if (servers.length === 0) {
      html = '<div class="dv-empty"><h3>No servers yet</h3><p>Create the first server!</p></div>';
    } else {
      servers.forEach(function (s) {
        var isMember = s.members.indexOf(email) >= 0;
        html += '<div class="dv-explore-item" data-id="' + s.id + '" style="cursor:pointer">';
        if (s.icon) html += '<div class="dv-explore-icon"><img src="' + s.icon + '" style="width:100%;height:100%;border-radius:16px;object-fit:cover"></div>';
        else html += '<div class="dv-explore-icon">' + s.name[0].toUpperCase() + '</div>';
        html += '<div class="dv-explore-info"><h4>' + escapeHtml(s.name) + '</h4><p>' + escapeHtml(s.description || "No description") + '</p></div>';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<span class="dv-explore-members">' + s.members.length + ' members</span>';
        if (isMember) {
          html += '<span style="padding:6px 14px;background:rgba(52,211,153,0.15);color:var(--success);border:1px solid rgba(52,211,153,0.3);border-radius:var(--r-sm);font-size:12px;font-weight:600">Joined</span>';
        } else {
          html += '<button class="btn-primary dv-explore-join-btn" data-id="' + s.id + '" style="padding:6px 14px;font-size:12px">Join</button>';
        }
        html += '</div></div>';
      });
    }
    document.getElementById("dvExploreList").innerHTML = html;
    document.querySelectorAll(".dv-explore-item").forEach(function (item) {
      item.addEventListener("click", function (e) {
        if (e.target.closest(".dv-explore-join-btn")) return;
        var id = this.getAttribute("data-id");
        var isMember = servers.find(function (s) { return s.id === id; }).members.indexOf(email) >= 0;
        if (isMember) {
          closeModalFn("dvExploreModal");
          selectServer(id);
        }
      });
    });
    document.querySelectorAll(".dv-explore-join-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        joinServer(this.getAttribute("data-id"));
      });
    });
  }

  function joinServer(serverId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === serverId; });
    if (!server) return;
    var email = getCurrentEmail();
    if (server.bannedMembers && server.bannedMembers.some(function (b) { return b.email === email; })) {
      showToast("You are banned from this server", "error");
      return;
    }
    if (server.members.indexOf(email) >= 0) { showToast("Already a member!", "error"); return; }
    server.members.push(email);
    server.memberRoles[email] = ["default"];
    saveServers(servers);
    closeModalFn("dvExploreModal");
    selectServer(serverId);
    showToast("Joined " + server.name + "!", "success");
  }

  // Channel Permissions
  function openChannelPermissionsModal(chId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var ch = findChannel(server, chId);
    if (!ch) return;
    state.editingChannelPerms = chId;
    var chPerms = (server.channelPermissions || {})[chId] || { view: {}, send: {} };
    var html = "";
    server.roles.forEach(function (r) {
      if (r.id === "owner") return;
      var viewVal = chPerms.view[r.id];
      var sendVal = chPerms.send[r.id];
      html += '<div class="dv-channel-perm-item" data-role="' + r.id + '">';
      html += '<div style="display:flex;align-items:center;gap:8px;flex:1">';
      html += '<div class="dv-role-dot" style="background:' + r.color + '"></div>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--text-1)">' + escapeHtml(r.name) + '</span>';
      html += '</div>';
      html += '<div style="display:flex;gap:12px;align-items:center">';
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<span style="font-size:12px;color:var(--text-3)">View:</span>';
      html += '<select class="dv-ch-perm-select" data-role="' + r.id + '" data-perm="view" style="padding:4px 8px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;color:var(--text-1);font-size:12px">';
      html += '<option value="inherit"' + (viewVal === undefined ? " selected" : "") + '>Inherit</option>';
      html += '<option value="true"' + (viewVal === true ? " selected" : "") + '>Allow</option>';
      html += '<option value="false"' + (viewVal === false ? " selected" : "") + '>Deny</option>';
      html += '</select></div>';
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<span style="font-size:12px;color:var(--text-3)">Send:</span>';
      html += '<select class="dv-ch-perm-select" data-role="' + r.id + '" data-perm="send" style="padding:4px 8px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;color:var(--text-1);font-size:12px">';
      html += '<option value="inherit"' + (sendVal === undefined ? " selected" : "") + '>Inherit</option>';
      html += '<option value="true"' + (sendVal === true ? " selected" : "") + '>Allow</option>';
      html += '<option value="false"' + (sendVal === false ? " selected" : "") + '>Deny</option>';
      html += '</select></div>';
      html += '</div></div>';
    });
    document.getElementById("dvChannelPermsList").innerHTML = html || '<p style="color:var(--text-3);text-align:center;padding:20px">No roles to configure.</p>';
    document.getElementById("dvChannelPermsDesc").textContent = "Permissions for #" + ch.name;
    openModal("dvChannelPermsModal");
  }

  function saveChannelPermissions() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server || !state.editingChannelPerms) return;
    if (!server.channelPermissions) server.channelPermissions = {};
    var chPerms = { view: {}, send: {} };
    document.querySelectorAll("#dvChannelPermsList .dv-ch-perm-select").forEach(function (sel) {
      var roleId = sel.getAttribute("data-role");
      var perm = sel.getAttribute("data-perm");
      var val = sel.value;
      if (val === "inherit") return;
      chPerms[perm][roleId] = val === "true";
    });
    server.channelPermissions[state.editingChannelPerms] = chPerms;
    saveServers(servers);
    closeModalFn("dvChannelPermsModal");
    renderChannels(server);
    showToast("Channel permissions saved", "success");
  }

  // Category Permissions
  function openCategoryPermissionsModal(catId) {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var cat = server.categories.find(function (c) { return c.id === catId; });
    if (!cat) return;
    state.editingCategory = catId;
    if (!server.categoryPermissions) server.categoryPermissions = {};
    var catPerms = server.categoryPermissions[catId] || { view: {}, send: {} };
    var html = "";
    server.roles.forEach(function (r) {
      if (r.id === "owner") return;
      var viewVal = catPerms.view[r.id];
      var sendVal = catPerms.send[r.id];
      html += '<div class="dv-channel-perm-item" data-role="' + r.id + '">';
      html += '<div style="display:flex;align-items:center;gap:8px;flex:1">';
      html += '<div class="dv-role-dot" style="background:' + r.color + '"></div>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--text-1)">' + escapeHtml(r.name) + '</span>';
      html += '</div>';
      html += '<div style="display:flex;gap:12px;align-items:center">';
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<span style="font-size:12px;color:var(--text-3)">View:</span>';
      html += '<select class="dv-cat-perm-select" data-role="' + r.id + '" data-perm="view" style="padding:4px 8px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;color:var(--text-1);font-size:12px">';
      html += '<option value="inherit"' + (viewVal === undefined ? " selected" : "") + '>Inherit</option>';
      html += '<option value="true"' + (viewVal === true ? " selected" : "") + '>Allow</option>';
      html += '<option value="false"' + (viewVal === false ? " selected" : "") + '>Deny</option>';
      html += '</select></div>';
      html += '<div style="display:flex;align-items:center;gap:6px">';
      html += '<span style="font-size:12px;color:var(--text-3)">Send:</span>';
      html += '<select class="dv-cat-perm-select" data-role="' + r.id + '" data-perm="send" style="padding:4px 8px;background:var(--bg-2);border:1px solid var(--border);border-radius:4px;color:var(--text-1);font-size:12px">';
      html += '<option value="inherit"' + (sendVal === undefined ? " selected" : "") + '>Inherit</option>';
      html += '<option value="true"' + (sendVal === true ? " selected" : "") + '>Allow</option>';
      html += '<option value="false"' + (sendVal === false ? " selected" : "") + '>Deny</option>';
      html += '</select></div>';
      html += '</div></div>';
    });
    document.getElementById("dvCategoryPermsList").innerHTML = html || '<p style="color:var(--text-3);text-align:center;padding:20px">No roles to configure.</p>';
    openModal("dvCategoryPermsModal");
  }

  function saveCategoryPermissions() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server || !state.editingCategory) return;
    if (!server.categoryPermissions) server.categoryPermissions = {};
    var catPerms = { view: {}, send: {} };
    document.querySelectorAll("#dvCategoryPermsList .dv-cat-perm-select").forEach(function (sel) {
      var roleId = sel.getAttribute("data-role");
      var perm = sel.getAttribute("data-perm");
      var val = sel.value;
      if (val === "inherit") return;
      catPerms[perm][roleId] = val === "true";
    });
    server.categoryPermissions[state.editingCategory] = catPerms;
    saveServers(servers);
    closeModalFn("dvCategoryPermsModal");
    renderChannels(server);
    showToast("Category permissions saved", "success");
  }

  // Self-role assignment
  function openSelfRoleModal() {
    var servers = getServers();
    var server = servers.find(function (s) { return s.id === state.currentServer; });
    if (!server) return;
    var email = getCurrentEmail();
    var myRoles = server.memberRoles[email] || [];
    var assignable = getAssignableRoles(server);
    var html = "";
    assignable.forEach(function (r) {
      var has = myRoles.indexOf(r.id) >= 0;
      html += '<div class="dv-channel-perm-item" style="cursor:pointer" data-role="' + r.id + '">';
      html += '<div style="display:flex;align-items:center;gap:8px">';
      html += '<div class="dv-role-dot" style="background:' + r.color + '"></div>';
      html += '<span style="font-size:14px;font-weight:600;color:var(--text-1)">' + escapeHtml(r.name) + '</span>';
      html += '</div>';
      html += '<span style="font-size:12px;color:' + (has ? 'var(--success)' : 'var(--text-4)') + ';font-weight:600">' + (has ? 'Added' : 'Add') + '</span>';
      html += '</div>';
    });
    document.getElementById("dvChannelPermsList").innerHTML = html || '<p style="color:var(--text-3);text-align:center;padding:20px">No roles available to assign.</p>';
    document.getElementById("dvChannelPermsDesc").textContent = "Manage your roles";
    document.getElementById("dvSaveChannelPermsBtn").style.display = "none";
    openModal("dvChannelPermsModal");
    document.querySelectorAll("#dvChannelPermsList .dv-channel-perm-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var roleId = this.getAttribute("data-role");
        var servers2 = getServers();
        var server2 = servers2.find(function (s) { return s.id === state.currentServer; });
        if (!server2) return;
        var email2 = getCurrentEmail();
        if (!server2.memberRoles[email2]) server2.memberRoles[email2] = [];
        var idx = server2.memberRoles[email2].indexOf(roleId);
        if (idx >= 0) server2.memberRoles[email2].splice(idx, 1);
        else server2.memberRoles[email2].push(roleId);
        saveServers(servers2);
        openSelfRoleModal();
        renderMembers(server2);
        showToast("Role updated", "success");
      });
    });
  }

  function hasPermission(server, perm) {
    var email = getCurrentEmail();
    if (server.owner === email) return true;
    var memberRoleIds = server.memberRoles[email] || [];
    for (var i = 0; i < memberRoleIds.length; i++) {
      var role = server.roles.find(function (r) { return r.id === memberRoleIds[i]; });
      if (role && role.permissions[perm] === "on") return true;
      if (role && role.permissions["Administration"] === "on" && perm !== "Manage Server") return true;
    }
    return false;
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) { if (!m.target.classList.contains("hidden")) init(); });
  });
  var disvoraSection = document.getElementById("disvoraSection");
  if (disvoraSection) observer.observe(disvoraSection, { attributes: true, attributeFilter: ["class"] });
  init();
})();

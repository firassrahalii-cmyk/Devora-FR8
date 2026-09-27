(function () {
  "use strict";

  var USERS_KEY = "devora_users";
  var CURRENT_USER_KEY = "devora_current_user";
  var FRIENDS_KEY = "devora_friends";
  var FRIEND_REQUESTS_KEY = "devora_friend_requests";
  var MESSAGES_KEY = "devora_messages";
  var SCORES_KEY = "devora_scores";

  function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch(e) { return []; } }
  function getCurrentEmail() { try { var r = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)); return r ? (typeof r === "object" ? r.email : r) : null; } catch(e) { return null; } }
  function getCurrentUser() { var e = getCurrentEmail(); if (!e) return null; return getUsers().find(function(u) { return u.email === e; }) || null; }
  function getFriends() { try { return JSON.parse(localStorage.getItem(FRIENDS_KEY)) || {}; } catch(e) { return {}; } }
  function saveFriends(d) { localStorage.setItem(FRIENDS_KEY, JSON.stringify(d)); }
  function getFriendRequests() { try { return JSON.parse(localStorage.getItem(FRIEND_REQUESTS_KEY)) || []; } catch(e) { return []; } }
  function saveFriendRequests(d) { localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(d)); }
  function getMessages() { try { return JSON.parse(localStorage.getItem(MESSAGES_KEY)) || {}; } catch(e) { return {}; } }
  function saveMessages(d) { localStorage.setItem(MESSAGES_KEY, JSON.stringify(d)); }
  function getScores() { try { return JSON.parse(localStorage.getItem(SCORES_KEY)) || {}; } catch(e) { return {}; } }
  function getUserScore(email) { var s = getScores()[email]; if (!s) return 0; var t = 0; Object.keys(s).forEach(function(k) { if (Array.isArray(s[k])) s[k].forEach(function(v) { t += (typeof v === "number" ? v : 0); }); }); return t; }
  function escapeHtml(t) { var d = document.createElement("div"); d.appendChild(document.createTextNode(t || "")); return d.innerHTML; }
  function timeAgo(ds) { if (!ds) return ""; var diff = Math.floor((Date.now() - new Date(ds).getTime()) / 1000); if (diff < 60) return "Just now"; if (diff < 3600) return Math.floor(diff/60)+"m ago"; if (diff < 86400) return Math.floor(diff/3600)+"h ago"; return Math.floor(diff/86400)+"d ago"; }
  function getChatId(a, b) { return [a, b].sort().join("___"); }
  function showToast(m, t) { if (typeof window.showToast === "function") window.showToast(m, t); }
  function openModal(id) { if (typeof window.openModal === "function") window.openModal(id); else { var el = document.getElementById(id); if (el) { el.style.display = "flex"; requestAnimationFrame(function() { el.classList.add("show"); }); } } }
  function closeModalFn(id) { if (typeof window.closeModal === "function") window.closeModal(id); else { var el = document.getElementById(id); if (el) { el.classList.remove("show"); setTimeout(function() { el.style.display = "none"; }, 300); } } }

  var EMOJIS = ['😀','😂','😍','🥰','😎','🤩','😭','😤','🤔','👍','👋','❤️','🔥','💯','✅','🎉','🚀','💻','🎮','🎵','💪','🙏','👀','🌟','⚡','🎯','📌','💡','🔑','🛡️','🏆','📚','🛠️','✨','🫡','💀','🤡','😈','🫶','🤝','👊','✌️','🤘','🫰','🤙','💅','🧠','🔮','💎','🪐','🌊','🌸','🍕','☕','🎮','🕹️','👾','🤖','👽','🎭','🎨','🎬','🎤','🎧','🎸','🎹','🥁','🎺','🎻','🛸','🚀','🌍','🌙','⭐','🌈','☁️','⛅','🌞','🌺','🌻','🌹','🍀','🍁','🎃','👻','🦄','🐙','🦋','🐬','🐳','🦈','🐊'];

  var elements = {
    searchInput: document.getElementById("msgSearchInput"),
    contactList: document.getElementById("msgContactList"),
    emptyFriends: document.getElementById("msgEmptyFriends"),
    emptyStrangers: document.getElementById("msgEmptyStrangers"),
    chatEmpty: document.getElementById("msgChatEmpty"),
    chatActive: document.getElementById("msgChatActive"),
    chatAvatar: document.getElementById("msgChatAvatar"),
    chatName: document.getElementById("msgChatName"),
    chatStatus: document.getElementById("msgChatStatus"),
    messages: document.getElementById("msgMessages"),
    input: document.getElementById("msgInput"),
    sendBtn: document.getElementById("msgSendBtn"),
    emojiBtn: document.getElementById("msgEmojiBtn"),
    emojiPicker: document.getElementById("msgEmojiPicker"),
    emojiGrid: document.getElementById("msgEmojiGrid"),
    fileBtn: document.getElementById("msgFileBtn"),
    fileInput: document.getElementById("msgFileInput"),
    friendRequestsBtn: document.getElementById("msgFriendRequestsBtn"),
    friendReqBadge: document.getElementById("msgFriendReqBadge"),
    requestsPanel: document.getElementById("msgRequestsPanel"),
    requestsBackBtn: document.getElementById("msgRequestsBackBtn"),
    requestsList: document.getElementById("msgRequestsList"),
    emptyRequests: document.getElementById("msgEmptyRequests"),
    viewProfileBtn: document.getElementById("msgViewProfileBtn"),
    backBtn: document.getElementById("msgBackBtn")
  };

  var state = { currentTab: "friends", chatWith: null, searchQuery: "" };

  function init() {
    if (!elements.searchInput) return;
    buildEmojiPicker();
    bindEvents();
    renderContacts();
    updateFriendRequestBadge();
  }

  function bindEvents() {
    elements.searchInput.addEventListener("input", function() { state.searchQuery = this.value.trim().toLowerCase(); renderContacts(); });

    document.querySelectorAll(".msg-tab").forEach(function(tab) {
      tab.addEventListener("click", function() {
        document.querySelectorAll(".msg-tab").forEach(function(t) { t.classList.remove("active"); });
        tab.classList.add("active");
        state.currentTab = tab.getAttribute("data-tab");
        renderContacts();
      });
    });

    elements.sendBtn.addEventListener("click", sendMessage);
    elements.input.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

    elements.emojiBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      elements.emojiPicker.style.display = elements.emojiPicker.style.display === "none" ? "" : "none";
    });

    document.addEventListener("click", function(e) {
      if (!elements.emojiPicker.contains(e.target) && e.target !== elements.emojiBtn) {
        elements.emojiPicker.style.display = "none";
      }
    });

    elements.fileBtn.addEventListener("click", function() { elements.fileInput.click(); });
    elements.fileInput.addEventListener("change", handleFileUpload);

    elements.friendRequestsBtn.addEventListener("click", function() {
      elements.requestsPanel.classList.toggle("show");
      renderFriendRequests();
    });

    elements.requestsBackBtn.addEventListener("click", function() {
      elements.requestsPanel.classList.remove("show");
    });

    elements.viewProfileBtn.addEventListener("click", function() {
      if (state.chatWith) showProfile(state.chatWith);
    });

    if (elements.backBtn) {
      elements.backBtn.addEventListener("click", function() {
        state.chatWith = null;
        elements.chatActive.style.display = "none";
        elements.chatEmpty.style.display = "";
        document.querySelector(".msg-contacts").classList.remove("mobile-hidden");
      });
    }
  }

  function buildEmojiPicker() {
    var html = "";
    EMOJIS.forEach(function(em) {
      html += '<div class="msg-emoji-item" data-emoji="' + em + '">' + em + '</div>';
    });
    elements.emojiGrid.innerHTML = html;
    elements.emojiGrid.addEventListener("click", function(e) {
      var item = e.target.closest(".msg-emoji-item");
      if (item) {
        elements.input.value += item.getAttribute("data-emoji");
        elements.input.focus();
        elements.emojiPicker.style.display = "none";
      }
    });
  }

  function renderContacts() {
    var me = getCurrentEmail();
    if (!me) return;
    var users = getUsers();
    var friends = getFriends();
    var myFriends = friends[me] || [];
    var query = state.searchQuery;
    var html = "";

    var filtered = users.filter(function(u) {
      if (u.email === me) return false;
      if (query) {
        return (u.name || "").toLowerCase().indexOf(query) >= 0 ||
               (u.username || "").toLowerCase().indexOf(query) >= 0 ||
               (u.email || "").toLowerCase().indexOf(query) >= 0;
      }
      return true;
    });

    if (state.currentTab === "friends") {
      filtered = filtered.filter(function(u) { return myFriends.indexOf(u.email) >= 0; });
      if (filtered.length === 0 && !query) {
        elements.emptyFriends.style.display = "";
        elements.emptyStrangers.style.display = "none";
        elements.contactList.innerHTML = "";
        elements.contactList.appendChild(elements.emptyFriends);
        return;
      }
    } else {
      filtered = filtered.filter(function(u) { return myFriends.indexOf(u.email) < 0; });
    }

    elements.emptyFriends.style.display = "none";
    elements.emptyStrangers.style.display = "none";

    if (filtered.length === 0) {
      var empty = state.currentTab === "friends" ? elements.emptyFriends : elements.emptyStrangers;
      empty.style.display = "";
      elements.contactList.innerHTML = "";
      elements.contactList.appendChild(empty);
      return;
    }

    var msgs = getMessages();
    filtered.sort(function(a, b) {
      var aLast = getLastMessage(msgs, me, a.email);
      var bLast = getLastMessage(msgs, me, b.email);
      if (aLast && bLast) return new Date(bLast.time) - new Date(aLast.time);
      if (aLast) return -1;
      if (bLast) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    filtered.forEach(function(u) {
      var letter = (u.name || "U")[0].toUpperCase();
      var isFriend = myFriends.indexOf(u.email) >= 0;
      var lastMsg = getLastMessage(msgs, me, u.email);
      var lastText = lastMsg ? (lastMsg.from === me ? "You: " : "") + lastMsg.text : (isFriend ? "Start chatting" : "");
      var isActive = state.chatWith === u.email;

      html += '<div class="msg-contact-item' + (isActive ? " active" : "") + '" data-email="' + escapeHtml(u.email) + '">';
      html += '<div class="msg-contact-avatar">' + letter + '</div>';
      html += '<div class="msg-contact-info">';
      html += '<span class="msg-contact-name">' + escapeHtml(u.name || "No Name") + '</span>';
      html += '<span class="msg-contact-last">' + escapeHtml(lastText) + '</span>';
      html += '</div>';
      html += '<div class="msg-contact-actions">';
      if (isFriend) {
        html += '<button class="msg-msg-btn" data-chat="' + escapeHtml(u.email) + '" title="Message">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        html += '</button>';
      } else {
        html += '<button class="msg-add-friend-btn" data-add="' + escapeHtml(u.email) + '" data-name="' + escapeHtml(u.name || "User") + '" title="Add Friend">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        html += '</button>';
      }
      html += '</div></div>';
    });

    elements.contactList.innerHTML = html;
    attachContactEvents();
  }

  function getLastMessage(msgs, me, other) {
    var chatId = getChatId(me, other);
    var chatMsgs = msgs[chatId];
    if (!chatMsgs || chatMsgs.length === 0) return null;
    return chatMsgs[chatMsgs.length - 1];
  }

  function attachContactEvents() {
    elements.contactList.querySelectorAll(".msg-msg-btn").forEach(function(btn) {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        openChat(this.getAttribute("data-chat"));
      });
    });

    elements.contactList.querySelectorAll(".msg-add-friend-btn").forEach(function(btn) {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        sendFriendRequest(this.getAttribute("data-add"), this.getAttribute("data-name"));
      });
    });

    elements.contactList.querySelectorAll(".msg-contact-item").forEach(function(item) {
      item.addEventListener("click", function() {
        var email = this.getAttribute("data-email");
        var friends = getFriends();
        var myFriends = friends[getCurrentEmail()] || [];
        if (myFriends.indexOf(email) >= 0) {
          openChat(email);
        } else {
          showProfile(email);
        }
      });
    });
  }

  function sendFriendRequest(email, name) {
    var me = getCurrentEmail();
    if (!me) return;
    var requests = getFriendRequests();
    var exists = requests.some(function(r) { return r.from === me && r.to === email; });
    if (exists) { showToast("Friend request already sent", "error"); return; }
    var user = getCurrentUser();
    requests.push({ from: me, fromName: user ? user.name : "User", fromUsername: user ? user.username : "user", to: email, toName: name, time: new Date().toISOString() });
    saveFriendRequests(requests);
    showToast("Friend request sent to " + name, "success");
  }

  function openChat(email) {
    var me = getCurrentEmail();
    if (!me) return;
    var user = getUsers().find(function(u) { return u.email === email; });
    if (!user) return;

    state.chatWith = email;
    elements.chatEmpty.style.display = "none";
    elements.chatActive.style.display = "flex";

    var letter = (user.name || "U")[0].toUpperCase();
    elements.chatAvatar.textContent = letter;
    elements.chatName.textContent = user.name || "User";
    elements.chatStatus.textContent = "Last seen " + timeAgo(user.lastLogin || user.createdAt);

    renderMessages();
    renderContacts();

    if (window.innerWidth <= 768) {
      document.querySelector(".msg-contacts").classList.add("mobile-hidden");
      elements.chatActive.classList.add("mobile-show");
    }
  }

  function renderMessages() {
    var me = getCurrentEmail();
    if (!me || !state.chatWith) return;
    var chatId = getChatId(me, state.chatWith);
    var msgs = getMessages()[chatId] || [];
    var html = "";

    msgs.forEach(function(m) {
      var isSent = m.from === me;
      html += '<div class="msg-bubble ' + (isSent ? "sent" : "received") + '">';
      if (m.text) html += escapeHtml(m.text);
      if (m.file) {
        html += '<div class="msg-bubble-file">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>';
        html += '<span>' + escapeHtml(m.file) + '</span>';
        html += '</div>';
      }
      html += '<span class="msg-bubble-time">' + timeAgo(m.time) + '</span>';
      html += '</div>';
    });

    elements.messages.innerHTML = html;
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function sendMessage() {
    var me = getCurrentEmail();
    if (!me || !state.chatWith) return;
    var text = elements.input.value.trim();
    var file = elements.fileInput.files[0];
    if (!text && !file) return;

    var chatId = getChatId(me, state.chatWith);
    var msgs = getMessages();
    if (!msgs[chatId]) msgs[chatId] = [];

    var msg = { from: me, text: text, time: new Date().toISOString() };
    if (file) msg.file = file.name;

    msgs[chatId].push(msg);
    saveMessages(msgs);

    elements.input.value = "";
    elements.fileInput.value = "";
    renderMessages();
    renderContacts();
  }

  function handleFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;
    sendMessage();
  }

  function sendFriendRequest(fromEmail, toName) {
    var me = getCurrentEmail();
    if (!me) return;
    var requests = getFriendRequests();
    var exists = requests.some(function(r) { return r.from === me && r.to === fromEmail; });
    if (exists) { showToast("Friend request already sent", "error"); return; }
    var user = getCurrentUser();
    requests.push({ from: me, fromName: user ? user.name : "User", fromUsername: user ? user.username : "user", to: fromEmail, toName: toName, time: new Date().toISOString() });
    saveFriendRequests(requests);
    showToast("Friend request sent!", "success");
  }

  function updateFriendRequestBadge() {
    var me = getCurrentEmail();
    if (!me) return;
    var requests = getFriendRequests();
    var pending = requests.filter(function(r) { return r.to === me; });
    if (pending.length > 0) {
      elements.friendReqBadge.textContent = pending.length;
      elements.friendReqBadge.style.display = "";
    } else {
      elements.friendReqBadge.style.display = "none";
    }
  }

  function renderFriendRequests() {
    var me = getCurrentEmail();
    if (!me) return;
    var requests = getFriendRequests();
    var pending = requests.filter(function(r) { return r.to === me; });

    if (pending.length === 0) {
      elements.requestsList.innerHTML = "";
      elements.requestsList.appendChild(elements.emptyRequests);
      elements.emptyRequests.style.display = "";
      return;
    }

    elements.emptyRequests.style.display = "none";
    var html = "";
    pending.forEach(function(r) {
      var letter = (r.fromName || "U")[0].toUpperCase();
      html += '<div class="msg-request-item">';
      html += '<div class="msg-contact-avatar">' + letter + '</div>';
      html += '<div class="msg-request-info">';
      html += '<div class="msg-request-name">' + escapeHtml(r.fromName) + '</div>';
      html += '<div class="msg-request-username">@' + escapeHtml(r.fromUsername) + '</div>';
      html += '</div>';
      html += '<div class="msg-request-actions">';
      html += '<button class="msg-accept-btn" data-accept="' + escapeHtml(r.from) + '">Accept</button>';
      html += '<button class="msg-refuse-btn" data-refuse="' + escapeHtml(r.from) + '">Refuse</button>';
      html += '</div></div>';
    });

    elements.requestsList.innerHTML = html;

    elements.requestsList.querySelectorAll(".msg-accept-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        acceptFriendRequest(this.getAttribute("data-accept"));
      });
    });

    elements.requestsList.querySelectorAll(".msg-refuse-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        refuseFriendRequest(this.getAttribute("data-refuse"));
      });
    });
  }

  function acceptFriendRequest(fromEmail) {
    var me = getCurrentEmail();
    if (!me) return;
    var friends = getFriends();
    if (!friends[me]) friends[me] = [];
    if (!friends[fromEmail]) friends[fromEmail] = [];
    if (friends[me].indexOf(fromEmail) < 0) friends[me].push(fromEmail);
    if (friends[fromEmail].indexOf(me) < 0) friends[fromEmail].push(me);
    saveFriends(friends);

    var requests = getFriendRequests();
    requests = requests.filter(function(r) { return !(r.from === fromEmail && r.to === me); });
    saveFriendRequests(requests);

    updateFriendRequestBadge();
    renderFriendRequests();
    renderContacts();
    showToast("Friend added!", "success");
  }

  function refuseFriendRequest(fromEmail) {
    var me = getCurrentEmail();
    if (!me) return;
    var requests = getFriendRequests();
    requests = requests.filter(function(r) { return !(r.from === fromEmail && r.to === me); });
    saveFriendRequests(requests);
    updateFriendRequestBadge();
    renderFriendRequests();
    showToast("Friend request refused", "success");
  }

  function showProfile(email) {
    var user = getUsers().find(function(u) { return u.email === email; });
    if (!user) return;
    var score = getUserScore(email);
    var me = getCurrentEmail();
    var friends = getFriends();
    var myFriends = friends[me] || [];
    var isFriend = myFriends.indexOf(email) >= 0;

    document.getElementById("msgProfileAvatar").textContent = (user.name || "U")[0].toUpperCase();
    document.getElementById("msgProfileName").textContent = user.name || "No Name";
    document.getElementById("msgProfileUsername").textContent = "@" + (user.username || "user");
    document.getElementById("msgProfileEmail").textContent = user.email;
    document.getElementById("msgProfileJoined").textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-";
    document.getElementById("msgProfileScore").textContent = score;
    document.getElementById("msgProfileBio").textContent = user.bio || "Not set";

    var actionsHtml = "";
    if (email !== me) {
      if (isFriend) {
        actionsHtml += '<button class="btn-primary" onclick="closeModal(\'msgProfileModal\')">Message</button>';
      } else {
        actionsHtml += '<button class="btn-primary" id="msgProfileAddFriendBtn">Add Friend</button>';
      }
    }
    actionsHtml += '<button class="btn-secondary" onclick="closeModal(\'msgProfileModal\')">Close</button>';
    document.getElementById("msgProfileActions").innerHTML = actionsHtml;

    var addBtn = document.getElementById("msgProfileAddFriendBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function() {
        sendFriendRequest(email, user.name || "User");
        closeModalFn("msgProfileModal");
      });
    }

    openModal("msgProfileModal");
  }

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (!m.target.classList.contains("hidden")) {
        init();
      }
    });
  });

  var messengerSection = document.getElementById("messengerSection");
  if (messengerSection) {
    observer.observe(messengerSection, { attributes: true, attributeFilter: ["class"] });
  }

  init();
})();

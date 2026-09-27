(function () {
  "use strict";

  const HIDDEN = "hidden";
  function hide(el) { if (el) el.classList.add(HIDDEN); }
  function show(el) { if (el) el.classList.remove(HIDDEN); }

  /* ── Global closeModal (called by inline onclick in HTML) ── */
  window.closeModal = function (id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.remove("show");
    setTimeout(function () { m.style.display = "none"; }, 300);
  };

  window.openModal = function (id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.style.display = "flex";
    requestAnimationFrame(function () { m.classList.add("show"); });
  };

  /* ── Data Layer ──────────────────────────────────────── */
  function getUsers() { try { return JSON.parse(localStorage.getItem("devora_users")) || []; } catch { return []; } }
  function saveUsers(users) { localStorage.setItem("devora_users", JSON.stringify(users)); }
  function getCurrentUserEmail() { try { return JSON.parse(localStorage.getItem("devora_current_user")); } catch { return null; } }

  function getFullUser() {
    var emailOrObj = getCurrentUserEmail();
    if (!emailOrObj) return null;
    var email = typeof emailOrObj === "object" ? emailOrObj.email : emailOrObj;
    var users = getUsers();
    return users.find(function (u) { return u.email === email; }) || null;
  }

  function saveUser(user) {
    var users = getUsers();
    var idx = users.findIndex(function (u) { return u.email === user.email; });
    if (idx !== -1) { users[idx] = user; saveUsers(users); }
  }

  /* ── Navigation ──────────────────────────────────────── */
  var navItems = document.querySelectorAll(".nav-item[data-section]");
  var dashboardSection = document.getElementById("dashboardSection");
  var projectsSection = document.getElementById("projectsSection");
  var arenaSection = document.getElementById("arenaSection");
  var aiSection = document.getElementById("aiSection");
  var cyberSection = document.getElementById("cyberSection");
  var vipSection = document.getElementById("vipSection");
  var gamesSection = document.getElementById("gamesSection");
  var suggestionsSection = document.getElementById("suggestionsSection");
  var managementSection = document.getElementById("managementSection");
  var managementNavItem = document.getElementById("managementNavItem");
  var messengerSection = document.getElementById("messengerSection");
  var disvoraSection = document.getElementById("disvoraSection");
  var profileDropdown = document.getElementById("profileDropdown");
  var profileTrigger = document.getElementById("profileTrigger");

  var vipSubtitle = document.querySelector(".vip-nav-subtitle");

  function switchSection(section) {
    navItems.forEach(function (i) { i.classList.remove("active"); if (i.getAttribute("data-section") === section) i.classList.add("active"); });
    if (managementNavItem) { managementNavItem.classList.remove("active"); }
    if (vipSubtitle) {
      vipSubtitle.classList.toggle("active", section === "vip");
    }
    if (dashboardSection) { section === "dashboard" ? show(dashboardSection) : hide(dashboardSection); }
    if (projectsSection) { section === "projects" ? show(projectsSection) : hide(projectsSection); }
    if (arenaSection) { section === "arena" ? show(arenaSection) : hide(arenaSection); }
    if (aiSection) { section === "ai" ? show(aiSection) : hide(aiSection); }
    if (cyberSection) { section === "cyber" ? show(cyberSection) : hide(cyberSection); }
    if (vipSection) { section === "vip" ? show(vipSection) : hide(vipSection); }
    if (gamesSection) { section === "games" ? show(gamesSection) : hide(gamesSection); }
    if (suggestionsSection) { section === "suggestions" ? show(suggestionsSection) : hide(suggestionsSection); }
    if (managementSection) { section === "management" ? show(managementSection) : hide(managementSection); }
    if (messengerSection) { section === "messenger" ? show(messengerSection) : hide(messengerSection); }
    if (disvoraSection) { section === "disvora" ? show(disvoraSection) : hide(disvoraSection); }
  }

  navItems.forEach(function (item) {
    item.addEventListener("click", function () {
      switchSection(item.getAttribute("data-section"));
    });
  });

  if (vipSubtitle) {
    vipSubtitle.addEventListener("click", function () {
      switchSection("vip");
    });
  }

  /* ── Profile Dropdown Toggle ─────────────────────────── */
  if (profileTrigger) {
    profileTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      if (profileDropdown) {
        profileDropdown.classList.toggle("hidden");
        profileDropdown.classList.toggle("show");
      }
    });
  }
  document.addEventListener("click", function (e) {
    if (profileDropdown && !profileDropdown.contains(e.target) && (!profileTrigger || !profileTrigger.contains(e.target))) {
      profileDropdown.classList.add("hidden");
      profileDropdown.classList.remove("show");
    }
  });

  /* ── Modal overlay click to close ────────────────────── */
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal-overlay") && e.target.classList.contains("show")) {
      e.target.classList.remove("show");
      setTimeout(function () { e.target.style.display = "none"; }, 300);
    }
  });

  /* ── Modal close buttons (X) ─────────────────────────── */
  document.querySelectorAll(".modal-close").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var m = btn.closest(".modal-overlay");
      if (m) { m.classList.remove("show"); setTimeout(function () { m.style.display = "none"; }, 300); }
    });
  });

  /* ── Toast ───────────────────────────────────────────── */
  function getToastContainer() {
    var c = document.getElementById("toastContainer");
    if (!c) {
      c = document.createElement("div");
      c.id = "toastContainer";
      c.className = "toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  window.showToast = function (msg, type, duration) {
    type = type || "success";
    duration = duration || 3000;
    var container = getToastContainer();
    var t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = msg;
    container.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        t.classList.add("show");
      });
    });
    setTimeout(function () {
      t.classList.remove("show");
      t.classList.add("hiding");
      setTimeout(function () { t.remove(); }, 300);
    }, duration);
  };

  /* ── Profile Display ─────────────────────────────────── */
  function refreshProfileDisplay() {
    var user = getFullUser();
    if (!user) return;
    var sidebarLetter = document.getElementById("sidebarLetter");
    var sidebarUsername = document.getElementById("sidebarUsername");
    if (sidebarLetter) sidebarLetter.textContent = (user.username || user.email)[0].toUpperCase();
    if (sidebarUsername) sidebarUsername.textContent = user.username || "user";
  }

  /* ── Edit Profile ────────────────────────────────────── */
  function initEditProfile() {
    var saveBtn = document.querySelector("#editProfileModal .btn-save");
    var cancelBtn = document.querySelector("#editProfileModal .btn-cancel");
    if (!saveBtn) return;

    saveBtn.addEventListener("click", function () {
      var user = getFullUser();
      if (!user) return;
      var username = (document.getElementById("edit-username") || {}).value || "";
      var name = (document.getElementById("edit-name") || {}).value || "";
      var description = (document.getElementById("edit-description") || {}).value || "";
      var bio = (document.getElementById("edit-bio") || {}).value || "";
      username = username.trim().toLowerCase();
      name = name.trim();

      if (!username || !name) { window.showToast("Username and Name are required", "error"); return; }
      if (username.length < 4) { window.showToast("Username must be at least 4 characters", "error"); return; }
      if (!/^[a-z][a-z0-9_]*$/.test(username)) { window.showToast("Username: lowercase letters, numbers, underscores only", "error"); return; }
      if (name.split(/\s+/).length > 18) { window.showToast("Name must be 18 words or fewer", "error"); return; }

      var users = getUsers();
      var duplicate = users.find(function (u) { return u.email !== user.email && u.username === username; });
      if (duplicate) { window.showToast("Username already taken", "error"); return; }

      user.username = username;
      user.name = name;
      user.description = description;
      user.bio = bio;
      saveUser(user);

      var raw = localStorage.getItem("devora_current_user");
      try {
        var parsed = JSON.parse(raw);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          parsed.username = username;
          parsed.name = name;
          localStorage.setItem("devora_current_user", JSON.stringify(parsed));
        }
      } catch (e) {}

      refreshProfileDisplay();
      window.closeModal("editProfileModal");
      window.showToast("Profile updated!");
    });

    if (cancelBtn) cancelBtn.addEventListener("click", function () { window.closeModal("editProfileModal"); });
  }

  function openEditProfile() {
    var user = getFullUser();
    if (!user) return;
    var u = document.getElementById("edit-username");
    var n = document.getElementById("edit-name");
    var d = document.getElementById("edit-description");
    var b = document.getElementById("edit-bio");
    if (u) u.value = user.username || "";
    if (n) n.value = user.name || "";
    if (d) d.value = user.description || "";
    if (b) b.value = user.bio || "";
    window.openModal("editProfileModal");
  }

  function openViewProfile() {
    var user = getFullUser();
    if (!user) return;
    var initial = (user.username || user.email)[0].toUpperCase();
    var avatar = document.getElementById("profileAvatarLg");
    var uname = document.getElementById("profile-username");
    var name = document.getElementById("profile-name");
    var desc = document.getElementById("profile-description");
    var bio = document.getElementById("profile-bio");
    var vipBadge = document.getElementById("profileVipBadge");
    if (avatar) avatar.textContent = initial;
    if (uname) uname.textContent = "@" + (user.username || "unknown");
    if (name) name.textContent = user.name || "No name";
    if (desc) desc.textContent = user.description || "No description";
    if (bio) bio.textContent = user.bio || "No bio";
    if (vipBadge) {
      var vipData = JSON.parse(localStorage.getItem("devora_vip") || "{}");
      var isUserVip = vipData[user.email] && vipData[user.email].active;
      vipBadge.style.display = isUserVip ? "inline-flex" : "none";
    }
    window.openModal("profileModal");
  }

  /* ── Profile Dropdown Actions ────────────────────────── */
  document.querySelectorAll("[data-action]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var action = el.getAttribute("data-action");
      if (profileDropdown) { profileDropdown.classList.add("hidden"); profileDropdown.classList.remove("show"); }
      if (action === "edit-profile") openEditProfile();
      else if (action === "view-profile") openViewProfile();
      else if (action === "logout") {
        localStorage.removeItem("devora_current_user");
        hide(document.getElementById("appSection"));
        show(document.getElementById("authSection"));
        location.reload();
      }
    });
  });

  /* ── Script Encryption & Protection System ─────────── */
  var ScriptCrypto = {
    deriveKey: function(email, salt) {
      var str = email + salt + "devora_vip_2024_secure";
      var h1 = 5381, h2 = 0x12345678;
      for (var i = 0; i < str.length; i++) {
        h1 = ((h1 << 5) + h1 + str.charCodeAt(i)) & 0xFFFFFFFF;
        h2 = ((h2 << 7) ^ (h2 >> 3) + str.charCodeAt(i)) & 0xFFFFFFFF;
      }
      return Math.abs(h1).toString(36) + Math.abs(h2).toString(36);
    },

    checksum: function(str) {
      var h = 0;
      for (var i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) & 0xFFFFFFFF; }
      return Math.abs(h).toString(16);
    },

    multiRoundEncrypt: function(plain, key) {
      var result = "";
      for (var round = 0; round < 3; round++) {
        var rkey = this.deriveKey(key, "R" + round);
        var temp = "";
        for (var i = 0; i < plain.length; i++) {
          var c = plain.charCodeAt(i) ^ rkey.charCodeAt(i % rkey.length);
          c = (c + i * (round + 1)) & 0xFF;
          temp += String.fromCharCode(c);
        }
        plain = temp;
      }
      var hex = "";
      for (var i = 0; i < plain.length; i++) {
        hex += ("0" + plain.charCodeAt(i).toString(16)).slice(-2);
      }
      return hex;
    },

    encryptScript: function(code, email) {
      var key = this.deriveKey(email, "SCRIPT");
      var enc = this.multiRoundEncrypt(code, key);
      var cs = this.checksum(enc + email);
      return { encrypted: enc, checksum: cs, keyHash: this.deriveKey(email, "VERIFY") };
    },

    generateProtectedJS: function(scriptName, code, email) {
      var enc = this.encryptScript(code, email);
      return '// ============================================\n' +
             '// Devora VIP - Protected Script\n' +
             '// Script: ' + scriptName + '\n' +
             '// Owner: ' + email + '\n' +
             '// This code is encrypted and licensed.\n' +
             '// Unauthorized use is prohibited.\n' +
             '// ============================================\n\n' +
             '(function() {\n' +
             '  var _e = "' + enc.encrypted + '";\n' +
             '  var _cs = "' + enc.checksum + '";\n' +
             '  var _kh = "' + enc.keyHash + '";\n' +
             '  var _email = "' + email + '";\n\n' +
             '  function _dk(salt) {\n' +
             '    var s = _email + salt + "devora_vip_2024_secure";\n' +
             '    var h1 = 5381, h2 = 0x12345678;\n' +
             '    for (var i = 0; i < s.length; i++) {\n' +
             '      h1 = ((h1 << 5) + h1 + s.charCodeAt(i)) & 0xFFFFFFFF;\n' +
             '      h2 = ((h2 << 7) ^ (h2 >> 3) + s.charCodeAt(i)) & 0xFFFFFFFF;\n' +
             '    }\n' +
             '    return Math.abs(h1).toString(36) + Math.abs(h2).toString(36);\n' +
             '  }\n\n' +
             '  function _cs_chk(str) {\n' +
             '    var h = 0;\n' +
             '    for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) & 0xFFFFFFFF;\n' +
             '    return Math.abs(h).toString(16);\n' +
             '  }\n\n' +
             '  function _dec(hex, key) {\n' +
             '    var raw = "";\n' +
             '    for (var i = 0; i < hex.length; i += 2) raw += String.fromCharCode(parseInt(hex.substr(i, 2), 16));\n' +
             '    var rounds = [];\n' +
             '    for (var r = 2; r >= 0; r--) {\n' +
             '      var rk = _dk("R" + r);\n' +
             '      var temp = "";\n' +
             '      for (var i = 0; i < raw.length; i++) {\n' +
             '        var c = raw.charCodeAt(i);\n' +
             '        c = (c - i * (r + 1) + 256) & 0xFF;\n' +
             '        c = c ^ rk.charCodeAt(i % rk.length);\n' +
             '        temp += String.fromCharCode(c);\n' +
             '      }\n' +
             '      raw = temp;\n' +
             '    }\n' +
             '    return raw;\n' +
             '  }\n\n' +
             '  // Verify integrity\n' +
             '  if (_cs_chk(_e + _email) !== _cs) {\n' +
             '    console.error("[VIP PROTECTED] Integrity check failed. Script may have been tampered with.");\n' +
             '    console.error("[VIP PROTECTED] Purchase from https://devora.dev to get a valid copy.");\n' +
             '    return;\n' +
             '  }\n\n' +
             '  // Verify owner\n' +
             '  if (_kh !== _dk("VERIFY")) {\n' +
             '    console.error("[VIP PROTECTED] This script is not licensed to your account.");\n' +
             '    console.error("[VIP PROTECTED] Owner: " + _email);\n' +
             '    return;\n' +
             '  }\n\n' +
             '  // Decrypt and execute\n' +
             '  try {\n' +
             '    var _code = _dec(_e, _email);\n' +
             '    eval(_code);\n' +
             '  } catch(err) {\n' +
             '    console.error("[VIP PROTECTED] Decryption failed:", err.message);\n' +
             '  }\n' +
             '})();';
    },

    generateProtectedPython: function(scriptName, code, email) {
      var enc = this.encryptScript(code, email);
      return '# ============================================\n' +
             '# Devora VIP - Protected Script\n' +
             '# Script: ' + scriptName + '\n' +
             '# Owner: ' + email + '\n' +
             '# This code is encrypted and licensed.\n' +
             '# ============================================\n\n' +
             'import sys, hashlib, base64\n\n' +
             '_EMAIL = "' + email + '"\n' +
             '_ENC = "' + enc.encrypted + '"\n' +
             '_CS = "' + enc.checksum + '"\n' +
             '_KH = "' + enc.keyHash + '"\n\n' +
             'def _dk(salt):\n' +
             '    s = _EMAIL + salt + "devora_vip_2024_secure"\n' +
             '    h1, h2 = 5381, 0x12345678\n' +
             '    for c in s:\n' +
             '        h1 = ((h1 << 5) + h1 + ord(c)) & 0xFFFFFFFF\n' +
             '        h2 = ((h2 << 7) ^ (h2 >> 3) + ord(c)) & 0xFFFFFFFF\n' +
             '    return format(abs(h1), \'36x\') + format(abs(h2), \'36x\')\n\n' +
             'def _cs_chk(s):\n' +
             '    h = 0\n' +
             '    for c in s: h = ((h << 5) - h + ord(c)) & 0xFFFFFFFF\n' +
             '    return format(abs(h), \'x\')\n\n' +
             'def _dec(hex_str):\n' +
             '    raw = bytes(int(hex_str[i:i+2], 16) for i in range(0, len(hex_str), 2))\n' +
             '    for r in range(2, -1, -1):\n' +
             '        rk = _dk("R" + str(r))\n' +
             '        raw = bytes((b - i * (r+1)) % 256 ^ ord(rk[i % len(rk)]) for i, b in enumerate(raw))\n' +
             '    return raw.decode("utf-8", errors="replace")\n\n' +
             'if _cs_chk(_ENC + _EMAIL) != _CS:\n' +
             '    print("[VIP PROTECTED] Integrity check failed."); sys.exit(1)\n' +
             'if _KH != _dk("VERIFY"):\n' +
             '    print("[VIP PROTECTED] Not licensed to:", _EMAIL); sys.exit(1)\n\n' +
             'exec(_dec(_ENC))\n';
    },

    generateProtectedBash: function(scriptName, code, email) {
      return '#!/bin/bash\n# Devora VIP - ' + scriptName + '\n# Owner: ' + email + '\n# Protected script - do not distribute\n\n' + code;
    },

    generateProtectedYaml: function(scriptName, code, email) {
      return '# Devora VIP - ' + scriptName + '\n# Owner: ' + email + '\n# Protected script - do not distribute\n\n' + code;
    }
  };

  /* ── Script Download System ────────────────────────── */
  var SCRIPTS = {};
  SCRIPTS["auto-portfolio"] = { name: "auto-portfolio.js", lang: "javascript", content: 'const https = require("https");\n\nfunction fetchGitHubProfile(username) {\n  return new Promise((resolve, reject) => {\n    const url = `https://api.github.com/users/${username}`;\n    https.get(url, { headers: { "User-Agent": "Devora-Portfolio" } }, (res) => {\n      let data = "";\n      res.on("data", chunk => data += chunk);\n      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });\n    }).on("error", reject);\n  });\n}\n\nfunction fetchRepos(username) {\n  return new Promise((resolve, reject) => {\n    const url = `https://api.github.com/users/${username}/repos?sort=stars&per_page=10`;\n    https.get(url, { headers: { "User-Agent": "Devora-Portfolio" } }, (res) => {\n      let data = "";\n      res.on("data", chunk => data += chunk);\n      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });\n    }).on("error", reject);\n  });\n}\n\nfunction generateHTML(profile, repos) {\n  const cards = repos.map(r => `    <div class="repo"><h3><a href="${r.html_url}">${r.name}</a></h3><p>${r.description||"N/A"}</p><span>\\u2b50${r.stargazers_count}</span></div>`).join("\\n");\n  return `<!DOCTYPE html><html><head><title>${profile.login}</title><style>body{font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:40px}h1{color:#818cf8}.repo{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px;margin:10px 0}a{color:#818cf8}</style></head><body><div style="max-width:800px;margin:0 auto"><img src="${profile.avatar_url}" width="120" style="border-radius:50%;border:3px solid #818cf8"><h1>${profile.name||profile.login}</h1><p>${profile.bio||""}</p><p>Repos: ${profile.public_repos} | Followers: ${profile.followers}</p><h2>Top Repos</h2>${cards}</div></body></html>`;\n}\n\nconst u = process.argv[2];\nif (!u) { console.log("Usage: node auto-portfolio.js <github-username>"); process.exit(1); }\nconsole.log(`Generating portfolio for ${u}...`);\nPromise.all([fetchGitHubProfile(u), fetchRepos(u)]).then(([p, r]) => {\n  require("fs").writeFileSync(`${u}-portfolio.html`, generateHTML(p, r));\n  console.log("Done! File: " + u + "-portfolio.html");\n}).catch(e => console.error("Error:", e.message));' };
  SCRIPTS["security-scanner"] = { name: "security-scanner.py", lang: "python", content: '#!/usr/bin/env python3\n"""Devora VIP - Security Scanner Pro"""\nimport urllib.request, urllib.parse, ssl, json, sys\nfrom datetime import datetime\n\nclass SecurityScanner:\n    def __init__(self, url):\n        self.target = url.rstrip("/")\n        self.findings = []\n        self.ctx = ssl.create_default_context()\n        self.ctx.check_hostname = False\n        self.ctx.verify_mode = ssl.CERT_NONE\n    def check_ssl(self):\n        p = urllib.parse.urlparse(self.target)\n        if p.scheme != "https": self.findings.append({"severity": "HIGH", "issue": "No HTTPS"})\n    def check_headers(self):\n        try:\n            r = urllib.request.urlopen(urllib.request.Request(self.target, headers={"User-Agent": "Scanner"}), context=self.ctx, timeout=10)\n            h = [k.lower() for k in r.headers]\n            for x in ["x-frame-options", "content-security-policy", "strict-transport-security"]:\n                if x not in h: self.findings.append({"severity": "MEDIUM", "issue": f"Missing {x}"})\n        except: pass\n    def check_files(self):\n        for f in ["/.env", "/.git/config", "/robots.txt", "/.htaccess"]:\n            try:\n                r = urllib.request.urlopen(urllib.request.Request(self.target+f, method="HEAD", headers={"User-Agent": "Scanner"}), context=self.ctx, timeout=5)\n                if r.status == 200: self.findings.append({"severity": "HIGH", "issue": f"Exposed: {f}"})\n            except: pass\n    def run(self):\n        print(f"Security Scanner Pro - Devora VIP\\nTarget: {self.target}\\n")\n        self.check_ssl(); self.check_headers(); self.check_files()\n        for f in self.findings: print(f"  [{f[\'severity\']}] {f[\'issue\']}")\n        json.dump({"target": self.target, "findings": self.findings}, open(f"report-{datetime.now().strftime(\'%Y%m%d%H%M%S\')}.json", "w"), indent=2)\n        print(f"\\nFound {len(self.findings)} issues.")\n\nif __name__ == "__main__":\n    if len(sys.argv) < 2: print("Usage: python security-scanner.py <url>"); sys.exit(1)\n    SecurityScanner(sys.argv[1]).run()' };
  SCRIPTS["network-monitor"] = { name: "network-monitor.js", lang: "javascript", content: 'const os = require("os"); const { exec } = require("child_process");\nclass NetworkMonitor {\n  getInterfaces() { const r = []; for (const [n, a] of Object.entries(os.networkInterfaces())) for (const i of a) if (!i.internal) r.push({name:n,address:i.address}); return r; }\n  ping(h) { return new Promise(r => { const s = Date.now(); exec(`ping -n 1 ${h}`, e => r({host:h,ok:!e,ms:Date.now()-s})); }); }\n  async start() {\n    console.log("Network Monitor - Devora VIP\\n");\n    this.getInterfaces().forEach(i => console.log(`  ${i.name}: ${i.address}`));\n    for (const h of ["8.8.8.8","1.1.1.1"]) { const r = await this.ping(h); console.log(`  ${r.host}: ${r.ok?"OK":"FAIL"} (${r.ms}ms)`); }\n  }\n}\nnew NetworkMonitor().start();' };
  SCRIPTS["api-rate-limiter"] = { name: "api-rate-limiter.js", lang: "javascript", content: 'class RateLimiter {\n  constructor(o={}) { this.ms=o.windowMs||60000; this.max=o.maxRequests||100; this.store=new Map(); }\n  middleware() { return (req,res,next) => { const k=req.ip||"x"; let e=this.store.get(k); if(!e||Date.now()-e.t>this.ms){e={c:0,t:Date.now()};this.store.set(k,e);} e.c++; if(e.c>this.max) return res.status(429).json({error:"Too many requests"}); next(); }; }\n}\nmodule.exports = RateLimiter;' };
  SCRIPTS["db-backup"] = { name: "db-backup.py", lang: "python", content: '#!/usr/bin/env python3\n"""Devora VIP - Database Backup"""\nimport subprocess, sys\nfrom datetime import datetime\nfrom pathlib import Path\ndef backup(db):\n    d = Path("./backups"); d.mkdir(exist_ok=True)\n    f = d / f"{db}_{datetime.now().strftime(\'%Y%m%d_%H%M%S\')}.sql"\n    r = subprocess.run(["mysqldump", db], stdout=open(f,"w"), stderr=subprocess.PIPE)\n    print(f"Backup {"OK" if r.returncode==0 else "FAIL"}: {f}")\nif __name__=="__main__": backup(sys.argv[1] if len(sys.argv)>1 else "mydb")' };
  SCRIPTS["cloud-deploy"] = { name: "cloud-deploy.sh", lang: "bash", content: '#!/bin/bash\n# Devora VIP - Cloud Deploy\necho "Cloud Deploy - Devora VIP"\nif command -v aws &>/dev/null; then echo "AWS detected"\nelif command -v gcloud &>/dev/null; then echo "GCloud detected"\nelif command -v az &>/dev/null; then echo "Azure detected"\nelse echo "No cloud CLI found"; exit 1; fi' };
  SCRIPTS["cicd-pipeline"] = { name: "cicd-pipeline.yml", lang: "yaml", content: '# Devora VIP - CI/CD Pipeline\nname: CI/CD\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 18\n      - run: npm ci && npm test\n  deploy:\n    needs: test\n    if: github.ref == \'refs/heads/main\'\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "Deploying..."' };
  SCRIPTS["user-auth"] = { name: "user-auth.js", lang: "javascript", content: 'const crypto = require("crypto");\nclass AuthSystem {\n  constructor(s="devora-vip") { this.s=s; this.users=new Map(); }\n  hash(p,salt) { salt=salt||crypto.randomBytes(16).toString("hex"); return {salt,h:crypto.pbkdf2Sync(p,salt,100000,64,"sha512").toString("hex")}; }\n  verify(p,st) { return this.hash(p,st.salt).h===st.h; }\n  token(p) { const h=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"); const b=Buffer.from(JSON.stringify({...p,exp:Date.now()+86400000})).toString("base64url"); return `${h}.${b}.${crypto.createHmac("sha256",this.s).update(`${h}.${b}`).digest("base64url")}`; }\n  register(e,p,n) { if(this.users.has(e)) throw new Error("Exists"); const {salt,h}=this.hash(p); this.users.set(e,{email:e,name:n,password:{salt,h}}); return {email:e,name:n,token:this.token({email:e})}; }\n  login(e,p) { const u=this.users.get(e); if(!u||!this.verify(p,u.password)) throw new Error("Invalid"); return {email:u.email,name:u.name,token:this.token({email:e})}; }\n}\nmodule.exports = AuthSystem;' };

  var ScriptDownloader = {
    showScriptModal: function(scriptId) {
      var user = getCurrentUser();
      if (!user) { showToast("Please log in first", "error"); return; }
      if (!isVip()) { showToast("VIP membership required", "error"); return; }

      var script = SCRIPTS[scriptId];
      if (!script) { showToast("Script not found", "error"); return; }

      var email = user.email || user;
      var protectedCode = "";

      if (script.lang === "javascript") {
        protectedCode = ScriptCrypto.generateProtectedJS(script.name, script.content, email);
      } else if (script.lang === "python") {
        protectedCode = ScriptCrypto.generateProtectedPython(script.name, script.content, email);
      } else if (script.lang === "bash") {
        protectedCode = ScriptCrypto.generateProtectedBash(script.name, script.content, email);
      } else {
        protectedCode = ScriptCrypto.generateProtectedYaml(script.name, script.content, email);
      }

      var modal = document.getElementById("scriptModal");
      var codeEl = document.getElementById("scriptCodeContent");
      var nameEl = document.getElementById("scriptModalName");

      if (nameEl) nameEl.textContent = script.name;
      if (codeEl) codeEl.textContent = protectedCode;
      if (modal) { modal.style.display = "flex"; setTimeout(function() { modal.classList.add("show"); }, 10); }

      window._currentScriptCode = protectedCode;
      window._currentScriptName = script.name;
    },

    copyScript: function() {
      var code = window._currentScriptCode;
      if (!code) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function() {
          showToast("Encrypted script copied! Paste into a file.", "success");
        }).catch(function() { ScriptDownloader.fallbackCopy(code); });
      } else {
        ScriptDownloader.fallbackCopy(code);
      }
    },

    fallbackCopy: function(text) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); showToast("Encrypted script copied!", "success"); }
      catch(e) { showToast("Copy failed. Select and copy manually.", "error"); }
      document.body.removeChild(ta);
    },

    saveScript: function() {
      var code = window._currentScriptCode;
      var name = window._currentScriptName;
      if (!code || !name) return;
      var blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = name; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      showToast("Encrypted file saved: " + name, "success");
    }
  };

  window.downloadScript = function(scriptId) { ScriptDownloader.showScriptModal(scriptId); };
  window.copyScriptCode = function() { ScriptDownloader.copyScript(); };
  window.saveScriptFile = function() { ScriptDownloader.saveScript(); };

  /* ── VIP Functions ──────────────────────────────────── */
  window.openVipModal = function() {
    var modal = document.getElementById("vipModal");
    if (modal) { modal.style.display = "flex"; setTimeout(function() { modal.classList.add("show"); }, 10); }
  };

  window.selectVipPlan = function(plan) {
    var btn = document.getElementById("vipPaypalBtn");
    if (btn) {
      var label = plan === "monthly" ? "Devora VIP - Monthly $4.99" : "Devora VIP - Yearly $50.99";
      btn.href = "https://www.paypal.com/paypalme/devora?amount=" + (plan === "monthly" ? "4.99" : "50.99") + "&currencyCode=USD&item=" + encodeURIComponent(label);
    }
    document.querySelectorAll(".vip-plan").forEach(function(p) { p.classList.remove("selected"); });
    document.getElementById(plan === "monthly" ? "vipPlanMonthly" : "vipPlanYearly").classList.add("selected");
  };

  window.activateVip = function() {
    var user = getCurrentUser();
    if (!user) return;
    var vipData = JSON.parse(localStorage.getItem("devora_vip") || "{}");
    vipData[user.email] = { active: true, activatedAt: new Date().toISOString() };
    localStorage.setItem("devora_vip", JSON.stringify(vipData));
    updateVipUI();
    switchSection("vip");
    showToast("Congratulations! You are now a Devora VIP member!", "success");
  };

  window.isVip = function() {
    var user = getCurrentUser();
    if (!user) return false;
    var vipData = JSON.parse(localStorage.getItem("devora_vip") || "{}");
    return vipData[user.email] && vipData[user.email].active;
  };

  function updateVipUI() {
    var user = getCurrentUser();
    var vip = user && isVip();
    var topbarBtn = document.getElementById("vipBtnTopbar");
    var profileBadge = document.getElementById("vipProfileBadge");
    var vipNavGroup = document.getElementById("vipNavGroup");
    var vipSection = document.getElementById("vipSection");

    if (topbarBtn) {
      if (vip) {
        topbarBtn.classList.add("vip-active");
        topbarBtn.querySelector("span").textContent = "VIP Access";
        topbarBtn.onclick = null;
      } else {
        topbarBtn.classList.remove("vip-active");
        topbarBtn.querySelector("span").textContent = "Get VIP";
        topbarBtn.onclick = openVipModal;
      }
    }

    if (profileBadge) {
      profileBadge.style.display = vip ? "inline-flex" : "none";
    }

    if (vipNavGroup) {
      vipNavGroup.style.display = vip ? "flex" : "none";
    }

    if (!vip && vipSection) {
      vipSection.classList.add("hidden");
    }

    var secretCard = document.querySelector(".secret-password-card");
    if (secretCard) {
      secretCard.style.display = vip ? "none" : "flex";
    }
  }

  /* ── Secret Password ───────────────────────────────── */
  var secretBtn = document.getElementById("secretPasswordBtn");
  var secretInput = document.getElementById("secretPasswordInput");
  var secretMsg = document.getElementById("secretPasswordMsg");

  if (secretBtn && secretInput) {
    secretBtn.addEventListener("click", function() {
      var val = secretInput.value.trim();
      var storedPw = "Firasrahali8";
      try {
        var pwData = JSON.parse(localStorage.getItem("devora_passwords"));
        if (pwData && pwData.vip) storedPw = pwData.vip;
      } catch (e) {}
      if (val === storedPw) {
        secretMsg.textContent = "Correct! Activating VIP...";
        secretMsg.className = "secret-msg success";
        setTimeout(function() {
          activateVip();
          secretInput.value = "";
          secretMsg.textContent = "";
        }, 1500);
      } else if (val === "") {
        secretMsg.textContent = "Please enter a password.";
        secretMsg.className = "secret-msg error";
      } else {
        secretMsg.textContent = "Incorrect password. Try again.";
        secretMsg.className = "secret-msg error";
      }
    });

    secretInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") secretBtn.click();
    });
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem("devora_current_user")); } catch (e) { return null; }
  }

  /* ── Init ────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    refreshProfileDisplay();
    initEditProfile();
    updateVipUI();
  });
})();

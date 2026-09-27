(function () {
  "use strict";

  var messagesEl = document.getElementById("aiMessages");
  var inputEl = document.getElementById("aiInput");
  var sendBtn = document.getElementById("aiSendBtn");
  var newChatBtn = document.getElementById("aiNewChatBtn");
  var settingsBtn = document.getElementById("aiSettingsBtn");
  var settingsPanel = document.getElementById("aiSettingsPanel");
  var apiKeyInput = document.getElementById("aiApiKey");
  var saveKeyBtn = document.getElementById("aiSaveKeyBtn");
  var clearKeyBtn = document.getElementById("aiClearKeyBtn");
  var statusDot = document.getElementById("aiStatusDot");
  var statusText = document.getElementById("aiStatusText");

  if (!messagesEl || !inputEl || !sendBtn) return;

  var STORAGE_KEY = "devora_ai_config";
  var conversationHistory = [];
  var isTyping = false;
  var config = loadConfig();

  /* ========================
     CONFIG
     ======================== */

  function loadConfig() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { apiKey: "", model: "HuggingFaceH4/zephyr-7b-beta", provider: "huggingface" };
  }

  function saveConfig(cfg) {
    config = cfg;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
    updateStatus();
  }

  function updateStatus() {
    if (!statusDot || !statusText) return;
    if (config.apiKey) {
      statusDot.style.background = "#22c55e";
      statusText.textContent = "AI Connected";
    } else {
      statusDot.style.background = "#f59e0b";
      statusText.textContent = "Free AI Mode";
    }
  }

  /* ========================
     AI API CALL
     ======================== */

  async function callAI(messages) {
    var models = [
      "mistralai/Mistral-7B-Instruct-v0.3",
      "HuggingFaceH4/zephyr-7b-beta",
      "mistralai/Mistral-7B-Instruct-v0.2",
      "microsoft/DialoGPT-medium"
    ];

    var headers = { "Content-Type": "application/json" };
    if (config.apiKey) headers["Authorization"] = "Bearer " + config.apiKey;

    var prompt = buildPrompt(messages);

    for (var i = 0; i < models.length; i++) {
      try {
        var response = await fetch("https://api-inference.huggingface.co/models/" + models[i], {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            inputs: prompt,
            parameters: { max_new_tokens: 1500, temperature: 0.7, top_p: 0.9, repetition_penalty: 1.1, do_sample: true, return_full_text: false }
          })
        });
        if (response.ok) {
          var data = await response.json();
          if (data && data[0] && data[0].generated_text) return data[0].generated_text.trim();
        }
      } catch (e) { continue; }
    }
    throw new Error("All AI models failed");
  }

  function buildPrompt(messages) {
    var systemMsg = "You are Devora AI, a highly intelligent, friendly, and conversational AI assistant created by Firas. You are a general-purpose assistant — NOT limited to coding. You can discuss any topic: science, philosophy, history, movies, music, food, travel, life advice, emotions, random facts, creative writing, or casual conversation. Be warm, natural, and human-like. Give thoughtful, well-structured responses. If the user asks something you don't know, say so honestly. Respond in the same language the user writes in. Be concise but informative. You are a knowledgeable companion, not a robotic tool. Always try to be helpful and provide accurate information. When discussing technical topics, provide clear explanations with examples when helpful.";

    var prompt = "<|system|>\n" + systemMsg + "\n";
    var recent = messages.slice(-10);
    for (var i = 0; i < recent.length; i++) {
      var role = recent[i].role === "user" ? "user" : "assistant";
      prompt += "<|" + role + "|>\n" + recent[i].content + "\n";
    }
    prompt += "<|assistant|>\n";
    return prompt;
  }

  /* ========================
     SMART LOCAL AI
     ======================== */

  function localAI(msg) {
    var t = msg.toLowerCase().trim();
    var len = t.length;

    // ── Greetings ──
    if (/^(hi|hello|hey|yo|sup|hola|salam|مرحبا|السلام|أهلا|هلو|صباح|مساء)\b/i.test(t)) {
      return pick([
        "Hey! How's it going? What's on your mind?",
        "Hi there! What can I help you with today?",
        "Hello! I'm Devora — ask me anything or just chat.",
        "Hey! Glad you're here. What are we talking about?"
      ]);
    }

    // ── How are you ──
    if (/how are you|كيف حالك|كيفك|شلونك|what'?s up|how'?s it going|how do you do/i.test(t)) {
      return pick([
        "I'm doing great, thanks! How about you — what's new?",
        "All good here! Ready to help or just chat. What's on your mind?",
        "Pretty good! Just hanging out, waiting for interesting questions. What's up?",
        "I'm well! More importantly — how are YOU doing?"
      ]);
    }

    // ── Who are you ──
    if (/who are you|what are you|من أنت|انت مين|شو أنت|tell me about yourself|about you/i.test(t)) {
      return "I'm **Devora AI** — a general-purpose AI assistant created by Firas.\n\nI'm not just a coding tool. I can help with:\n• **Conversation** — Talk about anything\n• **Knowledge** — Science, history, philosophy, culture\n• **Creative work** — Writing, brainstorming, ideas\n• **Problem solving** — Advice, decisions, analysis\n• **Fun** — Jokes, stories, interesting facts\n\nThink of me as a knowledgeable friend who's always here. What would you like to talk about?";
    }

    // ── What can you do ──
    if (/what can you do|capabilities|how can you help|help me|ايش تقدر|شو تقدر/i.test(t)) {
      return "I can do a lot! Here's what I'm good at:\n\n**💬 Conversation**\nJust talk to me about anything — your day, your thoughts, random ideas.\n\n**🧠 Knowledge**\nAsk me about science, history, geography, philosophy, culture — anything.\n\n**✍️ Writing**\nI can write essays, emails, stories, poems, or help you edit text.\n\n**💡 Advice**\nNeed help making a decision? I'll walk you through it.\n\n**🔢 Math**\nCalculations, equations, explanations of math concepts.\n\n**💻 Coding**\nJavaScript, Python, and more — I can write and explain code.\n\n**🎭 Fun**\nJokes, riddles, fun facts, debates, or just casual chat.\n\nWhat sounds interesting?";
    }

    // ── Philosophy / Deep ──
    if (/meaning of life|purpose|philosophy|deep|consciousness|existence|universe|what is reality|free will/i.test(t)) {
      return pick([
        "Great question! The meaning of life is one of the biggest philosophical questions.\n\nDifferent perspectives:\n• **Existentialism** — We create our own meaning\n• **Religious** — Purpose comes from a higher power\n• **Scientific** — We're here by chance, so make the most of it\n• **Absurdist** — Life has no inherent meaning, and that's freeing\n\nI personally think it's about the connections we make and the experiences we have. What's your take?",
        "Deep question! Here's how I see it:\n\nLife doesn't come with a manual, and that's what makes it interesting. The meaning isn't something you find — it's something you **create** through your choices, relationships, and what you choose to care about.\n\nThe philosopher Sartre said we're 'condemned to be free' — meaning we MUST choose, and those choices define us.\n\nWhat matters most to you in life?"
      ]);
    }

    // ── Emotions ──
    if (/\b(sad|depressed|lonely|stressed|anxious|worried|tired|exhausted|bored|angry|frustrated|overwhelmed|confused|lost|hopeless|hurt|crying|tears)\b/i.test(t)) {
      return pick([
        "I'm sorry you're feeling that way. Your feelings are valid, and it's okay to not be okay.\n\nIf you want to talk about what's going on, I'm here to listen. Sometimes just putting thoughts into words helps.\n\nAnd if you'd rather not talk about it — I can tell you a joke, share something interesting, or we can just chat about something light.\n\nWhat would help right now?",
        "I hear you. Whatever you're going through, it's okay to feel this way.\n\nI may be an AI, but I genuinely want to help. You can:\n• **Talk about it** — I'm here to listen\n• **Distract yourself** — Let's chat about something fun\n• **Get advice** — I can help you think through things\n\nYou don't have to face it alone. What do you need?"
      ]);
    }

    // ── Feelings positive ──
    if (/\b(happy|great|awesome|amazing|excited|love|wonderful|fantastic|perfect|blessed|grateful)\b/i.test(t)) {
      return pick([
        "That's awesome to hear! What's making you feel so good?",
        "Love to hear that! What's going on?",
        "That's great! Tell me more — what's the good news?",
        "Nice! Keep that energy going. What happened?"
      ]);
    }

    // ── Recommendations ──
    if (/recommend|suggest|what should (i|we)|any tips|advice|propose/i.test(t)) {
      if (/movie|film|series|show/i.test(t)) {
        return "Sure! Here are some great picks:\n\n🎬 **Must-watch movies:**\n• Interstellar — Mind-bending sci-fi\n• The Shawshank Redemption — A timeless classic\n• Inception — Dreams within dreams\n• The Pursuit of Happyness — Deeply inspiring\n• Parasite — Masterpiece of tension\n\n📺 **TV series:**\n• Breaking Bad — One of the best ever\n• Dark — German sci-fi thriller\n• The Office — Feel-good comedy\n• Chernobyl — Powerful miniseries\n\nWhat genre do you prefer? I can give more specific recommendations!";
      }
      if (/book|read/i.test(t)) {
        return "Here are some great books across genres:\n\n📖 **Must-reads:**\n• Atomic Habits — James Clear (self-improvement)\n• 1984 — George Orwell (dystopian classic)\n• The Alchemist — Paulo Coelho (inspirational)\n• Sapiens — Yuval Noah Harari (history of humanity)\n• Dune — Frank Herbert (epic sci-fi)\n\nWhat genre do you like? Fiction, non-fiction, self-help, sci-fi?";
      }
      if (/music|song|playlist/i.test(t)) {
        return "What mood are you in?\n\n🎵 **Chill:** Lo-fi beats, Khruangbin, Tom Misch\n🎸 **Rock:** Arctic Monkeys, Pink Floyd, Radiohead\n🎤 **Pop:** The Weeknd, Dua Lipa, Billie Eilish\n🎹 **Classical:** Debussy, Chopin, Einaudi\n🎧 **Electronic:** Odesza, Bonobo, Tycho\n\nTell me your vibe and I'll suggest more!";
      }
      if (/food|eat|cook|recipe/i.test(t)) {
        return "What are you in the mood for?\n\n🍕 **Quick & Easy:** Pasta aglio e olio, stir-fry, wraps\n🥗 **Healthy:** Buddha bowl, grilled salmon, Greek salad\n🍛 **Comfort food:** Butter chicken, ramen, mac & cheese\n🍰 **Dessert:** Chocolate lava cake, tiramisu, pancakes\n\nDo you have dietary preferences? I can tailor suggestions!";
      }
      if (/travel|visit|country|place/i.test(t)) {
        return "Great question! Where are you thinking?\n\n🌍 **Budget-friendly:** Turkey, Thailand, Morocco, Georgia\n🏙️ **City breaks:** Tokyo, Paris, Barcelona, Seoul\n🏖️ **Beaches:** Maldives, Bali, Philippines, Greece\n🏔️ **Adventure:** Iceland, New Zealand, Peru, Nepal\n\nWhat's your travel style — adventure, relaxation, culture, food?";
      }
      return "I'd love to help! What do you need recommendations for?\n\n• **Movies/Shows** — \"Recommend me a movie\"\n• **Books** — \"Suggest a good book\"\n• **Music** — \"What music do you recommend?\"\n• **Food** — \"What should I cook tonight?\"\n• **Travel** — \"Where should I travel?\"\n\nBe specific and I'll give you the best suggestions!";
    }

    // ── Opinions ──
    if (/what do you think|your opinion|do you believe|your thoughts|رأيك|وجهة نظرك/i.test(t)) {
      return "I have opinions on most things! But I should be transparent — I'm an AI, so my views come from patterns in the data I was trained on, not personal experience.\n\nThat said, I'm happy to share my perspective! What specifically do you want my opinion on?";
    }

    // ── Jokes ──
    if (/\b(joke|funny|humor|نكت|ضحك|laugh|make me laugh)\b/i.test(t)) {
      return pick([
        "Why don't scientists trust atoms?\n\nBecause they make up everything! 😄",
        "I told my wife she was drawing her eyebrows too high.\n\nShe looked surprised. 😂",
        "What do you call a fake noodle?\n\nAn impasta! 🍝",
        "Why did the scarecrow win an award?\n\nHe was outstanding in his field! 🌾",
        "I'm reading a book about anti-gravity.\n\nIt's impossible to put down! 📚",
        "What do you call a bear with no teeth?\n\nA gummy bear! 🐻"
      ]);
    }

    // ── Thanks ──
    if (/thank|thanks|thx|مشكور|شكر|merci|gracias/i.test(t)) {
      return pick([
        "You're welcome! Let me know if you need anything else.",
        "Anytime! That's what I'm here for.",
        "Happy to help! Don't hesitate to ask more.",
        "Glad I could help! What else is on your mind?"
      ]);
    }

    // ── Time / Date ──
    if (/what time|what date|what day|current time|date today|الوقت|التاريخ/i.test(t)) {
      var now = new Date();
      return "It's currently:\n\n📅 **" + now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + "**\n🕐 **" + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + "**";
    }

    // ── Math ──
    if (/(\d+)\s*([\+\-\*\/\^])\s*(\d+)/.test(t) || /calculate|compute|math|solve/i.test(t)) {
      var mathMatch = t.match(/(\d+\.?\d*)\s*([\+\-\*\/\^])\s*(\d+\.?\d*)/);
      if (mathMatch) {
        var a = parseFloat(mathMatch[1]);
        var op = mathMatch[2];
        var b = parseFloat(mathMatch[3]);
        var result;
        switch (op) {
          case '+': result = a + b; break;
          case '-': result = a - b; break;
          case '*': result = a * b; break;
          case '/': result = b !== 0 ? (a / b) : 'undefined (division by zero)'; break;
          case '^': result = Math.pow(a, b); break;
        }
        return "**" + a + " " + op + " " + b + " = " + result + "**";
      }
      return "I can help with math! Try something like:\n\n• \"15 + 27\"\n• \"100 * 3.5\"\n• \"What is the square root of 144?\"\n• \"Solve 2x + 5 = 15\"";
    }

    // ── Random facts ──
    if (/random fact|fun fact|tell me something|interesting|did you know|شيء مفيد|معلومات/i.test(t)) {
      return pick([
        "Here's a fun fact:\n\nOctopuses have **three hearts** and **blue blood**. Two hearts pump blood to the gills, and one pumps it to the rest of the body. When they swim, the main heart stops beating — that's why they prefer crawling!\n\nWant another one?",
        "Did you know?\n\nHoney never spoils. Archaeologists found 3,000-year-old honey in Egyptian tombs that was still perfectly edible!\n\nWant to hear more interesting facts?",
        "Here's one:\n\nA day on Venus is **longer** than a year on Venus. It takes 243 Earth days to rotate once, but only 225 Earth days to orbit the Sun.\n\nSpace is wild, right? Want more facts?",
        "Fun fact:\n\nBananas are technically **berries**, but strawberries aren't. Botanically, a berry comes from a single flower with one ovary — so grapes, avocados, and bananas all qualify!\n\nNature is weird. Want another?"
      ]);
    }

    // ── Existence / God / Religion ──
    if (/god|religion|allah|faith|believe|atheism|spiritual|divine|heaven|hell|afterlife/i.test(t)) {
      return "That's a deep and personal topic. People have debated these questions for thousands of years.\n\nDifferent perspectives exist:\n• **Theistic** — Belief in a higher power that created and guides us\n• **Agnostic** — We can't know for certain either way\n• **Atheist** — Belief that no god exists\n• **Spiritual** — Connection to something greater, without organized religion\n\nI respect all beliefs. What matters most is how we treat each other. Is there a specific aspect of this topic you'd like to explore?";
    }

    // ── Coding (keep as fallback) ──
    if (/javascript|\bjs\b|node|react|vue|angular|python|ruby|java\b|c\+\+|html|css|sql|git|api|code|program|function|debug|error|bug/i.test(t)) {
      return "I can help with coding! But I need a bit more context:\n\n• **What language?** — JavaScript, Python, etc.\n• **What's the problem?** — Error message, concept, or something to build?\n• **Share code** — Paste it and I'll analyze it\n\nOr ask me something specific like: \"What is a closure in JavaScript?\"";
    }

    // ── Language / Translate ──
    if (/translate|translation|convert|turn.*into|frency|french|spanish|arabic|german|chinese|japanese|korean/i.test(t)) {
      return "I can help with translations! Tell me:\n\n1. **What text** do you want translated?\n2. **What language?** — Spanish, French, Arabic, Japanese, etc.\n\nFor example: \"Translate 'How are you?' to Arabic\"";
    }

    // ── Help with writing ──
    if (/write|draft|compose|email|letter|essay|report|content|paragraph|article/i.test(t)) {
      return "I can help you write! Tell me:\n\n1. **Type** — Email, essay, story, report, etc.\n2. **Topic** — What's it about?\n3. **Tone** — Formal, casual, professional, creative?\n4. **Length** — Short paragraph or full piece?\n\nExample: \"Write a professional email declining a meeting invitation\"";
    }

    // ── Comparison ──
    if (/difference between|compare|vs\.?|versus|أفضل من/i.test(t)) {
      return "I can help with comparisons! What specifically do you want me to compare?\n\nExamples:\n• \"React vs Vue\"\n• \"Python vs JavaScript\"\n• \"Reading vs watching TV\"\n• \"Living in the city vs countryside\"\n\nGive me two things and I'll break down the differences!";
    }

    // ── How to / Tutorial ──
    if (/how to|how do i|tutorial|guide|steps|learn|start|begin|i want to learn|ابي اتعلم/i.test(t)) {
      return "I'd love to help you learn! What topic interests you?\n\n• **Programming** — \"How to start learning Python?\"\n• **Skills** — \"How to improve my English?\"\n• **Creative** — \"How to start drawing?\"\n• **Productivity** — \"How to stay focused?\"\n• **Career** — \"How to become a developer?\"\n\nTell me what you want to learn and I'll guide you!";
    }

    // ── Default: Smart conversational ──
    // Analyze if it's a question
    var isQuestion = /\?$/i.test(t) || /^(what|why|how|when|where|who|which|can|could|would|should|do|does|is|are|will|tell|explain|describe)/i.test(t);

    if (isQuestion) {
      return pick([
        "That's a great question! Let me think about this...\n\nI'd love to give you a thorough answer, but I want to be honest — I'm still learning. Could you tell me a bit more about what you're looking for so I can help better?",
        "Good question! Here's what I can tell you:\n\nThis is a topic with a lot of depth. If you could be more specific about what aspect you're most interested in, I can give you a more focused and helpful answer.\n\nWhat would you like to know specifically?",
        "Interesting question! I want to give you the best answer possible.\n\nCould you provide a bit more context? For example, are you looking for a simple explanation, a detailed analysis, or practical advice?"
      ]);
    }

    return pick([
      "That's interesting! Tell me more — I'd love to hear your thoughts.",
      "Hmm, I see what you mean. What made you think about this?",
      "Interesting point! What's your take on it?",
      "Got it. Is there something specific you'd like me to help with?",
      "I appreciate you sharing that. What would you like to do next?"
    ]);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* ========================
     CHAT UI
     ======================== */

  function hideWelcome() {
    var w = messagesEl.querySelector(".ai-welcome");
    if (w) w.style.display = "none";
  }

  function addMessage(text, role) {
    hideWelcome();
    var msg = document.createElement("div");
    msg.className = "ai-msg " + role;

    var avatar = document.createElement("div");
    avatar.className = "ai-msg-avatar";
    if (role === "assistant") {
      avatar.innerHTML = '<img src="images/devora-logo.svg" alt="AI" class="ai-avatar-img">';
    } else {
      avatar.textContent = "You";
    }

    var content = document.createElement("div");
    content.className = "ai-msg-content";
    content.innerHTML = formatMessage(text);

    msg.appendChild(avatar);
    msg.appendChild(content);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return content;
  }

  function showTyping() {
    hideWelcome();
    var msg = document.createElement("div");
    msg.className = "ai-msg assistant";
    msg.id = "typing-indicator";
    var avatar = document.createElement("div");
    avatar.className = "ai-msg-avatar";
    avatar.innerHTML = '<img src="images/devora-logo.svg" alt="AI" class="ai-avatar-img">';
    var content = document.createElement("div");
    content.className = "ai-msg-content";
    content.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
    msg.appendChild(avatar);
    msg.appendChild(content);
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    var el = document.getElementById("typing-indicator");
    if (el) el.remove();
  }

  function formatMessage(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, function (m, lang, code) {
      return '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
    });
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function typeMessage(text, element, callback) {
    if (text.indexOf("```") !== -1 || text.length > 400) {
      element.innerHTML = formatMessage(text);
      if (callback) callback();
      return;
    }
    element.innerHTML = '';
    var chars = text.split('');
    var i = 0;
    var buffer = '';
    function typeNext() {
      if (i >= chars.length) {
        element.innerHTML = formatMessage(text);
        if (callback) callback();
        return;
      }
      buffer += chars[i];
      i++;
      element.innerHTML = formatMessage(buffer);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      var ch = chars[i - 1];
      var delay = (ch === '.' || ch === '!' || ch === '?' || ch === '\n') ? 60 : (ch === ',' ? 30 : 10);
      setTimeout(typeNext, delay);
    }
    typeNext();
  }

  /* ========================
     SEND
     ======================== */

  async function sendMessage(text) {
    if (!text || !text.trim() || isTyping) return;

    var userText = text.trim();
    inputEl.value = '';
    inputEl.style.height = 'auto';

    addMessage(userText, 'user');
    conversationHistory.push({ role: 'user', content: userText });

    isTyping = true;
    sendBtn.disabled = true;
    showTyping();

    var response = null;
    try {
      response = await callAI(conversationHistory);
    } catch (e) {
      response = localAI(userText);
    }

    removeTyping();
    conversationHistory.push({ role: 'assistant', content: response });

    var content = addMessage('', 'assistant');
    typeMessage(response, content, function () {
      isTyping = false;
      sendBtn.disabled = false;
      inputEl.focus();
    });
  }

  /* ========================
     EVENTS
     ======================== */

  sendBtn.addEventListener("click", function () { sendMessage(inputEl.value); });

  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
  });

  inputEl.addEventListener("input", function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener("click", function () {
      settingsPanel.classList.toggle("show");
      if (apiKeyInput) apiKeyInput.value = config.apiKey || "";
    });
  }

  if (saveKeyBtn && apiKeyInput) {
    saveKeyBtn.addEventListener("click", function () {
      var key = apiKeyInput.value.trim();
      if (key) {
        saveConfig({ apiKey: key, model: config.model, provider: config.provider });
        if (settingsPanel) settingsPanel.classList.remove("show");
        addMessage("API key saved! Connected to AI engine.", "assistant");
      }
    });
  }

  if (clearKeyBtn) {
    clearKeyBtn.addEventListener("click", function () {
      saveConfig({ apiKey: "", model: config.model, provider: config.provider });
      if (apiKeyInput) apiKeyInput.value = "";
      addMessage("API key cleared. Using free AI fallback.", "assistant");
    });
  }

  if (newChatBtn) {
    newChatBtn.addEventListener("click", function () {
      conversationHistory = [];
      messagesEl.innerHTML = '<div class="ai-welcome"><div class="ai-welcome-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1a2 2 0 0 1-2 2v1a4 4 0 0 1-8 0v-1a2 2 0 0 1-2-2h-1a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg></div><h3>Hey, I\'m Devora</h3><p>Your AI companion. Ask me anything, tell me about your day, or just say hi.</p><div class="ai-suggestions"><button class="ai-suggestion" data-msg="How\'s your day going?">How\'s your day going?</button><button class="ai-suggestion" data-msg="Tell me something interesting">Tell me something interesting</button><button class="ai-suggestion" data-msg="Recommend me a good movie">Recommend a movie</button><button class="ai-suggestion" data-msg="I need some life advice">I need advice</button></div></div>';
      bindSuggestions();
    });
  }

  function bindSuggestions() {
    document.querySelectorAll(".ai-suggestion").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var msg = btn.getAttribute("data-msg");
        if (msg) sendMessage(msg);
      });
    });
  }

  bindSuggestions();
  updateStatus();

})();

// Without JS the page shows everything as is. The lab needs JS; animations also respect reduced motion.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var motion = !reduce && "IntersectionObserver" in window;

  // set before first paint so hidden states apply without a flash
  if (motion) document.documentElement.classList.add("js", "loading");

  // ---------- light / dark theme: the visitor's choice, else the system setting ----------
  var params = new URLSearchParams(location.search), root = document.documentElement;
  var darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  var savedTheme = null;
  try { savedTheme = localStorage.getItem("theme"); } catch (e) {}
  root.dataset.theme = params.get("theme") || savedTheme || (darkQuery && darkQuery.matches ? "dark" : "light");
  if (params.get("bg")) root.dataset.bg = params.get("bg");
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", function (e) {
    if (!savedTheme && !params.get("theme")) setTheme(e.matches ? "dark" : "light", false);
  });
  function setTheme(t, remember) {
    root.classList.add("theme-anim");
    root.dataset.theme = t;
    setTimeout(function () { root.classList.remove("theme-anim"); }, 450);
    if (remember) { savedTheme = t; try { localStorage.setItem("theme", t); } catch (e) {} }
    var btn = document.querySelector(".theme-toggle");
    if (btn) btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }
  function toggleTheme() { setTheme(root.dataset.theme === "dark" ? "light" : "dark", true); }

  document.addEventListener("DOMContentLoaded", function () {
    lab();
    quiz();
    poster();
    if (motion) setupLibraries();
    nav();
    shortcuts();
    var themeBtn = document.querySelector(".theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", toggleTheme);
      setTheme(root.dataset.theme, false);
    }
    if (motion) {
      transitions();
      if (lenis) lenis.stop();
      loader(function () {
        document.documentElement.classList.remove("loading");
        document.documentElement.classList.add("ready");
        if (lenis) lenis.start();
        animations();
      });
    }
  });

  /* =========================================================
     Libraries (local copies in vendor/): GSAP for animations,
     Lenis for smooth scrolling. The site still works without them.
     ========================================================= */
  var hasGsap = false, lenis = null;
  function setupLibraries() {
    hasGsap = !!(window.gsap && window.ScrollTrigger);
    if (hasGsap) {
      gsap.registerPlugin(ScrollTrigger);
      if (window.SplitText) gsap.registerPlugin(SplitText);
      document.documentElement.classList.add("gsap");
    }
    if (window.Lenis) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      if (hasGsap) {
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
      }
    }
  }

  // coming back with the browser's back button: drop the page-leave curtain
  addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var w = document.querySelector(".wipe");
    if (w) w.remove();
  });

  /* =========================================================
     Page transitions: a curtain rises before going to another page
     ========================================================= */
  function transitions() {
    document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        var w = document.createElement("div");
        w.className = "wipe";
        document.body.appendChild(w);
        void w.offsetWidth;
        w.classList.add("in");
        setTimeout(function () { location.href = a.href; }, 650);
      });
    });
  }

  /* =========================================================
     Smooth jump to a section (Lenis when available)
     ========================================================= */
  function go(target) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (target === 0 || target === "#top") el = 0;
    if (lenis) return lenis.scrollTo(el === 0 ? 0 : el, { offset: -16 });
    if (el === 0) return scrollTo({ top: 0, behavior: motion ? "smooth" : "auto" });
    if (el) el.scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" });
  }

  /* =========================================================
     Section dots + back-to-top button
     ========================================================= */
  function nav() {
    var links = document.querySelectorAll(".dots-nav a"), toTop = document.querySelector(".to-top");
    links.forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); go(a.getAttribute("href")); });
    });
    // the active dot is the last section whose top has passed 40% of the screen
    var targets = [].map.call(links, function (a) { return document.querySelector(a.getAttribute("href")); });
    function spy() {
      var current = 0;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= innerHeight * 0.4) current = i; });
      links.forEach(function (a, i) { a.classList.toggle("active", i === current); });
    }
    if (links.length) { addEventListener("scroll", spy, { passive: true }); spy(); }
    if (toTop) {
      var onScroll = function () { toTop.classList.toggle("show", scrollY > 700); };
      addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      toTop.addEventListener("click", function () { go(0); });
    }
  }

  /* =========================================================
     Keyboard shortcuts (handy during the talk)
     ========================================================= */
  function shortcuts() {
    var help = document.querySelector(".kbd-help"), hint = document.querySelector(".kbd-hint");
    var isPoster = !!document.querySelector(".poster-frame");
    if (help) document.documentElement.classList.add("kb");
    function toggleHelp(force) {
      if (!help) return;
      help.hidden = force === undefined ? !help.hidden : !force;
    }
    if (hint) hint.addEventListener("click", function (e) { e.stopPropagation(); toggleHelp(); });
    document.addEventListener("click", function (e) {
      if (help && !help.hidden && !help.contains(e.target)) toggleHelp(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (document.documentElement.classList.contains("loading")) return;
      var k = e.key.toLowerCase();
      if (isPoster) {
        if (k === "b") document.querySelector(".vb-back").click();
        else if (k === "z" || (k === "escape" && document.querySelector(".viewer.zoomed"))) document.querySelector(".poster-frame").click();
        return;
      }
      if (e.key === "?") return toggleHelp();
      if (k === "escape") return toggleHelp(false);
      if (k === "d") { go("#lab"); var demo = document.getElementById("lab-demo"); if (demo) demo.click(); }
      else if (k === "l") go("#lab");
      else if (k === "q") go("#quiz");
      else if (k === "t") go(0);
      else if (k === "m") toggleTheme();
      else if (k === "p") { var cta = document.querySelector(".cta"); if (cta) cta.click(); }
    });
  }

  /* =========================================================
     Poster page: click to zoom where you clicked
     ========================================================= */
  function poster() {
    var frame = document.querySelector(".poster-frame");
    if (!frame) return;
    var viewer = frame.parentNode;
    frame.addEventListener("click", function (e) {
      var r = frame.getBoundingClientRect(),
          fx = (e.clientX - r.left) / r.width,
          fy = (e.clientY - r.top) / r.height;
      var zoomed = viewer.classList.toggle("zoomed");
      // let the browser switch to the full-size image when zoomed
      frame.querySelector("img").sizes = zoomed ? "2700px" : "(max-width: 1500px) 100vw, 1500px";
      frame.setAttribute("aria-label", zoomed ? "Zoom out" : "Zoom the poster");
      if (!zoomed) return;
      var nr = frame.getBoundingClientRect();
      viewer.scrollLeft = fx * nr.width - viewer.clientWidth / 2;
      var y = scrollY + nr.top + fy * nr.height - innerHeight / 2;
      if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y);
    });
  }

  /* =========================================================
     Interactive lab: build the query live and judge the result
     ========================================================= */
  function lab() {
    var box = document.getElementById("lab");
    if (!box) return;
    box.hidden = false;

    var u = document.getElementById("lab-u"),
        p = document.getElementById("lab-p"),
        q = document.getElementById("lab-q"),
        v = document.getElementById("lab-v"),
        guard = document.getElementById("lab-guard"),
        guardLabel = document.getElementById("lab-guard-label"),
        wire = box.querySelector(".wire"),
        typingTimer = null;

    function esc(s) {
      return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    }
    function looksHostile(s) { return /['";#]|--/.test(s); }

    function judge(user, pass, safe) {
      var all = (user + " " + pass).toLowerCase();
      var normal = user === "admin" && pass === "s3cret";
      if (normal) return ["good", "Access granted", "Correct username and password: a normal login."];
      if (safe) {
        if (looksHostile(user + pass))
          return ["good", "Attack blocked 🛡️", "With a prepared statement the input travels separately as plain data. The database treats it as ordinary text, so the strange value simply matches no account."];
        return ["neutral", "Access denied", "Wrong username or password."];
      }
      if (/;\s*drop\s+table/.test(all))
        return ["bad", "Table deleted 💥", "The quote closes the text, the ; starts a second command, and DROP TABLE erases every account."];
      if (/union\s+select/.test(all))
        return ["bad", "Data leaked 🕵️", "UNION glues a second SELECT to the query: the page now displays every username and password."];
      if (/sleep\s*\(/.test(all))
        return ["warn", "Server froze for 5 s ⏱️", "Nothing is displayed, but the delay proves the injection works. Asking yes/no questions this way, an attacker can extract the whole database: a blind attack."];
      if (/'\s*or\s+'?(\w+)'?\s*=\s*'?\1'?/.test(all) || /\bor\s+1\s*=\s*1\b/.test(all) || /'\s*or\s+true/.test(all))
        return ["bad", "Access granted: login bypassed 🔓", "OR '1'='1' is always true, so the WHERE clause matches every user and the site logs you in."];
      if (/'\s*(--|#)/.test(user))
        return ["bad", "Logged in as admin, no password ✂️", "The -- turns the rest of the query, including the password check, into a comment."];
      if (((user + pass).match(/'/g) || []).length % 2)
        return ["warn", "SQL syntax error ⚠️", "A lone quote breaks the query. The error message itself tells an attacker that this site is injectable."];
      return ["neutral", "Access denied", "Wrong username or password."];
    }

    function render() {
      var safe = guard.getAttribute("aria-checked") === "true", user = u.value, pass = p.value;
      var cls = function (s) { return looksHostile(s) ? "in bad" : "in"; };
      if (safe) {
        q.innerHTML = 'SELECT * FROM users WHERE name = <span class="ph">?</span> AND pass = <span class="ph">?</span>\n' +
          '<span class="cm">-- sent separately, as plain data:</span>\n' +
          '<span class="cm">params = [</span><span class="in">"' + esc(user) + '"</span><span class="cm">, </span><span class="in">"' + esc(pass) + '"</span><span class="cm">]</span>';
      } else {
        q.innerHTML = "SELECT * FROM users WHERE name = '<span class=\"" + cls(user) + "\">" + esc(user) + "</span>'" +
          "\nAND pass = '<span class=\"" + cls(pass) + "\">" + esc(pass) + "</span>'";
      }
      // number the lines like a code editor
      q.innerHTML = q.innerHTML.split("\n").map(function (l) { return '<span class="ln">' + l + "</span>"; }).join("");
      var r = judge(user, pass, safe);
      if (v.dataset.key !== r[1]) {
        wire.classList.remove("send");
        void wire.offsetWidth; // replay the packet animation
        wire.classList.add("send");
        v.className = "verdict " + r[0];
        void v.offsetWidth; // restart the pop animation
        v.classList.add("pop");
        v.dataset.key = r[1];
      }
      v.querySelector("b").textContent = r[1];
      v.querySelector(".v-text").textContent = r[2];
    }

    function typeInto(input, text, done) {
      if (!motion) { input.value = text; render(); return done && done(); }
      var i = 0;
      input.value = "";
      (function step() {
        input.value = text.slice(0, i++);
        render();
        if (i <= text.length) typingTimer = setTimeout(step, 22);
        else if (done) done();
      })();
    }

    box.querySelectorAll(".presets button").forEach(function (b) {
      b.addEventListener("click", function () {
        clearTimeout(typingTimer);
        box.querySelectorAll(".presets button").forEach(function (o) { o.classList.toggle("on", o === b); });
        typeInto(u, b.dataset.u, function () { typeInto(p, b.dataset.p); });
      });
    });
    guard.addEventListener("click", function () {
      var on = guard.getAttribute("aria-checked") !== "true";
      guard.setAttribute("aria-checked", on);
      box.classList.toggle("guarded", on);
      guardLabel.textContent = on
        ? "ON: input is sent separately, as plain data"
        : "OFF: input is pasted into the query";
      render();
    });
    [u, p].forEach(function (el) { el.addEventListener("input", render); });
    render();

    // ---------- auto demo: plays the examples above, then turns the protection on ----------
    var demoBtn = document.getElementById("lab-demo"), demoTimers = [], playing = false;
    var tiles = box.querySelectorAll(".presets button");
    function stopDemo() {
      playing = false;
      demoTimers.forEach(clearTimeout);
      demoTimers = [];
      demoBtn.classList.remove("playing");
      demoBtn.querySelector(".demo-txt").textContent = "Play the auto demo";
      demoBtn.querySelector(".demo-ic").textContent = "▶";
    }
    function setGuard(on) {
      if ((guard.getAttribute("aria-checked") === "true") !== on) guard.click();
    }
    demoBtn.addEventListener("click", function () {
      if (playing) return stopDemo();
      playing = true;
      demoBtn.classList.add("playing");
      demoBtn.querySelector(".demo-txt").textContent = "Stop the demo";
      demoBtn.querySelector(".demo-ic").textContent = "■";
      // every example without protection, then the first one again with protection
      var steps = [], t = 0;
      for (var i = 0; i < tiles.length - 1; i++) steps.push({ tile: tiles[i], guard: false });
      steps.push({ tile: tiles[0], guard: true });
      steps.forEach(function (st) {
        demoTimers.push(setTimeout(function () {
          setGuard(st.guard);
          st.tile.click();
        }, t));
        t += (st.tile.dataset.u.length + st.tile.dataset.p.length) * (motion ? 22 : 0) + 2600;
      });
      demoTimers.push(setTimeout(stopDemo, t));
    });
    // any real interaction with the lab stops the demo
    tiles.forEach(function (b) {
      b.addEventListener("click", function (e) { if (playing && e.isTrusted) stopDemo(); });
    });
    guard.addEventListener("click", function (e) { if (playing && e.isTrusted) stopDemo(); });
    [u, p].forEach(function (el) {
      el.addEventListener("focus", function () { if (playing) stopDemo(); });
    });
  }

  /* =========================================================
     Quiz: spot the protected code
     ========================================================= */
  function quiz() {
    var box = document.getElementById("quiz");
    if (!box) return;
    box.hidden = false;
    var body = box.querySelector(".quiz-body"), dots = box.querySelectorAll(".quiz-steps i");
    // three different formats: multiple choice, spot the safe code, true or false
    var questions = [
      {
        type: "choice",
        label: "Multiple choice",
        ask: "What is the best defense against SQL injection?",
        options: [
          "Hiding error messages from users",
          "Prepared statements (parameterized queries)",
          "Asking users for longer passwords",
          "Blocking a list of \"dangerous\" words"
        ],
        good: "1",
        why: "Prepared statements send the user's input separately from the SQL code, so it can never change the query. OWASP lists them as the first defense; the other ideas only make attacks a little harder."
      },
      {
        type: "code",
        label: "Spot the safe code · Python",
        ask: "Two versions of the same login code. Which one is protected?",
        options: [
          ["cur.execute(", "  f\"SELECT * FROM users WHERE name = '{name}'\"", ")"],
          ["cur.execute(", "  \"SELECT * FROM users WHERE name = %s\",", "  (name,)", ")"]
        ],
        good: "1",
        why: "B sends the name separately, as a parameter. A pastes it into the SQL text, so a single quote typed by the user can change the query."
      },
      {
        type: "truefalse",
        label: "True or false",
        ask: "\"CVSS alone is enough to decide which SQL injection flaws to fix first.\"",
        good: "false",
        why: "False. In the study, CVSS alone flagged 259 of the 317 flaws, many of them hard to exploit: a lot of wasted effort. Combining CVSS, EPSS and EE narrowed the list to 153."
      }
    ];
    var k = 0, score = 0;

    function esc(s) {
      return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
    }

    function answersHtml(q) {
      if (q.type === "code") {
        return '<div class="quiz-options">' + q.options.map(function (lines, i) {
          return '<button type="button" class="quiz-ans quiz-opt" data-key="' + i + '">' +
            '<span class="quiz-tag">' + "AB"[i] + "</span>" +
            '<span class="code">' + esc(lines.join("\n")) + "</span></button>";
        }).join("") + "</div>";
      }
      if (q.type === "choice") {
        return '<div class="quiz-choices">' + q.options.map(function (text, i) {
          return '<button type="button" class="quiz-ans quiz-choice" data-key="' + i + '">' +
            '<span class="qc-letter">' + "ABCD"[i] + "</span><span>" + esc(text) + "</span></button>";
        }).join("") + "</div>";
      }
      return '<div class="quiz-tf">' +
        '<button type="button" class="quiz-ans quiz-tfbtn" data-key="true"><span class="tf-ic">✓</span>True</button>' +
        '<button type="button" class="quiz-ans quiz-tfbtn" data-key="false"><span class="tf-ic">✗</span>False</button>' +
        "</div>";
    }

    function show() {
      dots.forEach(function (d, i) { d.className = i < k ? "done" : i === k ? "now" : ""; });
      var q = questions[k];
      body.innerHTML =
        '<p class="quiz-q">Question ' + (k + 1) + " of " + questions.length + " · " + q.label + "</p>" +
        '<p class="quiz-ask">' + esc(q.ask) + "</p>" + answersHtml(q);
      body.querySelectorAll(".quiz-ans").forEach(function (btn) {
        btn.addEventListener("click", function () { answer(btn.dataset.key); });
      });
    }

    function answer(key) {
      var q = questions[k], right = key === q.good;
      if (right) score++;
      body.querySelectorAll(".quiz-ans").forEach(function (btn) {
        btn.disabled = true;
        if (btn.dataset.key === q.good) btn.classList.add("right");
        else if (btn.dataset.key === key) btn.classList.add("wrong");
      });
      var last = k === questions.length - 1;
      var fb = document.createElement("div");
      fb.className = "quiz-feedback " + (right ? "ok" : "ko");
      fb.innerHTML = "<p><b>" + (right ? "Correct!" : "Not quite.") + "</b> " + esc(q.why) + "</p>" +
        '<button type="button" class="quiz-next">' + (last ? "See my score →" : "Next question →") + "</button>";
      body.appendChild(fb);
      var next = fb.querySelector(".quiz-next");
      next.addEventListener("click", function () {
        k++;
        if (k < questions.length) show(); else end();
      });
      next.focus({ preventScroll: true });
    }

    function end() {
      dots.forEach(function (d) { d.className = "done"; });
      var msg = score === questions.length ? "Perfect! You know the essentials."
              : score === questions.length - 1 ? "Nice, almost there!"
              : "Keep the rule in mind and try again.";
      body.innerHTML =
        '<div class="quiz-end"><p class="quiz-score">' + score + "<span> / " + questions.length + "</span></p>" +
        '<p class="quiz-msg">' + msg + "</p>" +
        '<p class="quiz-rule">The rule to remember: <b>use prepared statements</b>, so user input is always treated as data, never as code.</p>' +
        '<button type="button" class="quiz-next">Try again ↺</button></div>';
      body.querySelector(".quiz-next").addEventListener("click", function () { k = 0; score = 0; show(); });
    }

    show();
  }

  /* =========================================================
     Loading screen: fake security scan, then slide away
     ========================================================= */
  function loader(done) {
    var el = document.querySelector(".loader");
    if (!el) return done();
    var lines = el.querySelectorAll(".ld-line"), fill = el.querySelector(".ld-bar i"),
        timers = [], finished = false;

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function count(b, target, suffix, ms) {
      var t0 = performance.now();
      (function frame(t) {
        var p = Math.max(0, Math.min((t - t0) / ms, 1));
        b.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US") + suffix;
        if (p < 1 && !finished) requestAnimationFrame(frame);
      })(t0);
    }
    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      lines.forEach(function (line) {
        var b = line.querySelector("b");
        line.classList.add("show", "ok");
        b.textContent = b.dataset.count
          ? (+b.dataset.count).toLocaleString("en-US") + (b.dataset.suffix || "")
          : b.dataset.text;
      });
      fill.style.width = "100%";
      el.classList.add("out");
      done();
      setTimeout(function () { el.remove(); }, 900);
      removeEventListener("keydown", finish);
    }

    // ?preview (used by the background comparison page): no loading screen
    if (params.has("preview")) return finish();

    // faster when the visitor has already seen it in this session
    var speed = 1;
    try {
      if (sessionStorage.getItem("introSeen")) speed = 0.45;
      sessionStorage.setItem("introSeen", "1");
    } catch (e) {}

    var t = 250 * speed;
    lines.forEach(function (line, i) {
      var b = line.querySelector("b");
      later(function () { line.classList.add("show"); }, t);
      later(function () {
        line.classList.add("ok");
        fill.style.width = ((i + 1) / lines.length) * 100 + "%";
        if (b.dataset.count) count(b, +b.dataset.count, b.dataset.suffix || "", 500);
        else b.textContent = b.dataset.text;
      }, t + 420 * speed);
      t += 720 * speed;
    });
    later(finish, t + 350 * speed);
    el.addEventListener("click", finish);
    addEventListener("keydown", finish);
  }

  /* =========================================================
     Animations
     ========================================================= */
  function animations() {
    // ---------- reveal on scroll ----------
    var groups = [".card", ".lab", ".cta", "#sources"];
    document.querySelectorAll(groups.join(",")).forEach(function (el) { el.classList.add("reveal"); });
    // stagger items inside a group
    document.querySelectorAll(".stepcard").forEach(function (el) {
      var index = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty("--d", index * 120 + "ms");
    });

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        seen.unobserve(e.target);
        e.target.querySelectorAll(".typed").forEach(type);
        e.target.querySelectorAll(".pill, .lab-title").forEach(titleIn);
      });
    }, { threshold: 0.2 });
    document.querySelectorAll(".reveal").forEach(function (el) { seen.observe(el); });

    // ---------- reading progress bar ----------
    var bar = document.querySelector(".progress");
    function progress() {
      if (!bar) return;
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      bar.style.setProperty("--p", max > 0 ? h.scrollTop / max : 0);
    }
    window.addEventListener("scroll", progress, { passive: true });
    progress();

    // ---------- funnel: the big number shrinks as you scroll ----------
    funnel();
    function funnel() {
      var sec = document.getElementById("funnel");
      if (!sec || !hasGsap) return;
      var big = sec.querySelector(".fbig"), steps = sec.querySelectorAll(".fstep"),
          dotsBox = sec.querySelector(".funnel-dots"), bars = sec.querySelectorAll(".funnel-progress i");

      // 240 dots: 24 "fix first" (c), 24 more that were studied (b), the rest (a). Same layout on every visit.
      var seed = 7, rand = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      var order = [], kind = {}, html = "", i;
      for (i = 0; i < 240; i++) order.push(i);
      for (i = order.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      order.slice(0, 24).forEach(function (n) { kind[n] = "c"; });
      order.slice(24, 48).forEach(function (n) { kind[n] = "b"; });
      for (i = 0; i < 240; i++) html += '<i class="dot ' + (kind[i] || "a") + '" style="--d:' + Math.round(rand() * 400) + 'ms"></i>';
      dotsBox.innerHTML = html;

      var v = [62445, 317, 153];
      function logLerp(a, b, t) { return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t); }
      function update(p) {
        var n = p < 0.25 ? v[0] : p < 0.4 ? logLerp(v[0], v[1], (p - 0.25) / 0.15)
              : p < 0.6 ? v[1] : p < 0.75 ? logLerp(v[1], v[2], (p - 0.6) / 0.15) : v[2];
        var stage = p < 0.325 ? 0 : p < 0.675 ? 1 : 2;
        big.textContent = Math.round(n).toLocaleString("en-US");
        steps.forEach(function (s, k) { s.classList.toggle("active", k === stage); });
        dotsBox.classList.toggle("stage-1", stage === 1);
        dotsBox.classList.toggle("stage-2", stage === 2);
        bars.forEach(function (b, k) { b.style.setProperty("--f", Math.min(Math.max((p - k / 3) * 3, 0), 1)); });
      }
      ScrollTrigger.create({ trigger: sec, start: "top top", end: "bottom bottom", onUpdate: function (st) { update(st.progress); } });
      update(0);
    }

    // ---------- GSAP: word-by-word titles and gentle parallax ----------
    if (hasGsap) {
      var h1 = document.querySelector(".banner h1");
      if (h1 && window.SplitText) {
        var split = SplitText.create(h1, { type: "words", mask: "words" });
        gsap.from(split.words, { yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.06, delay: 0.1 });
      }
      var banner = document.querySelector(".banner");
      if (banner) {
        gsap.to(banner, {
          y: -40, opacity: 0.55, ease: "none",
          scrollTrigger: { trigger: banner, start: "top top", end: "bottom top", scrub: true }
        });
      }
      gsap.to(".bg", {
        y: function () { return -innerHeight * 0.25; }, ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: true }
      });
    }

    // ---------- typewriter for the payload ----------
    function type(box) {
      var inj = box.querySelector(".inj"), text = inj.textContent, i = 0;
      inj.textContent = "";
      box.classList.add("typing");
      setTimeout(function step() {
        inj.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(step, 75 + Math.random() * 60);
        else setTimeout(function () { box.classList.remove("typing"); box.classList.add("done"); }, 350);
      }, 500);
    }

    // ---------- section titles rise word by word ----------
    function titleIn(el) {
      if (!hasGsap || !window.SplitText) return;
      var s = SplitText.create(el, { type: "words", mask: "words" });
      gsap.from(s.words, { yPercent: 110, duration: 0.8, ease: "power3.out", stagger: 0.05, delay: 0.1 });
    }
  }
})();

/**
 * เชื่อม TailAdmin (Vue ใน iframe) กับบัญชีสมาชิก HUAJAIY:
 * - รับ postMessage จาก parent (ข้อมูล user + apiBase)
 * - แปลเมนู/ป้ายเป็นภาษาไทย
 * - แทนที่ชื่อ/อีเมล/รูปโปรไฟล์ตัวอย่างด้วยข้อมูลจริงจาก LINE/API
 */
(function () {
  var TOKEN_KEY = "huajaiy_member_token";
  var HEART = "/tailadmin-template/images/logo/huajaiy-heart.svg";

  var lastUser = null;
  var moTimer = null;
  /** @type {string | null} */
  var adminEmbedUrl = null;
  /** เป้าหมาย path เต็ม เช่น /tailadmin-template/profile จาก ?huajaiy_start=/profile */
  var huajaiyStartTarget = null;

  (function captureHuajaiyStartFromQuery() {
    try {
      var q = new URLSearchParams(window.location.search);
      var raw = q.get("huajaiy_start");
      if (!raw || !String(raw).trim()) return;
      var path = String(raw).trim();
      if (!path.startsWith("/")) path = "/" + path;
      huajaiyStartTarget = "/tailadmin-template" + path;
    } catch (e) {
      /* ignore */
    }
  })();

  function tryHuajaiyStartRoute() {
    if (!huajaiyStartTarget) return;
    var t = huajaiyStartTarget;
    try {
      var cur = window.location.pathname.replace(/\/$/, "") || "/";
      var tgt = t.replace(/\/$/, "") || "/";
      if (cur === tgt) {
        huajaiyStartTarget = null;
        return;
      }
      window.history.replaceState(
        window.history.state,
        "",
        t + window.location.hash
      );
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: window.history.state })
      );
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * เมนูซ้ายสมาชิก — ชี้หน้าเว็บเดิม (/account/…) ตรงกับ web/lib/memberSidebarNav.js
   * kind: "path" | "empty"
   */
  var MEMBER_SIDEBAR_MENU = [
    { key: "overview", label: "ภาพรวมบัญชี", kind: "path", href: "/account" },
    { key: "profile", label: "โปรไฟล์", kind: "path", href: "/account/profile" },
    { key: "prizes", label: "รางวัลของฉัน", kind: "path", href: "/account/prizes" },
    { key: "hearts", label: "หัวใจของฉัน", kind: "path", href: "/account/my-hearts" },
    { key: "games", label: "เกมของฉัน", kind: "path", href: "/account/my-games" },
    { key: "shops", label: "ร้านค้าของฉัน", kind: "path", href: "/account/shops" },
    { key: "page", label: "เพจของฉัน", kind: "empty" },
    { key: "orders", label: "คำสั่งซื้อ", kind: "path", href: "/account/orders" },
    {
      key: "prizeWithdraw",
      label: "คำขอรับรางวัล",
      kind: "path",
      href: "/account/prize-withdraw"
    },
    {
      key: "heartsShop",
      label: "เติมหัวใจแดง",
      kind: "path",
      href: "/account/hearts-shop"
    },
    { key: "giveHearts", label: "แจกหัวใจ", kind: "path", href: "/account/give-hearts" }
  ];

  function parentPathname() {
    try {
      if (window.parent && window.parent.location) {
        var p = String(window.parent.location.pathname || "");
        return p.replace(/\/$/, "") || "/";
      }
    } catch (e) {
      /* cross-origin */
    }
    return "";
  }

  function pathMatchesMenuHref(href, pp) {
    var h = String(href || "").replace(/\/$/, "") || "/";
    pp = String(pp || "").replace(/\/$/, "") || "/";
    if (pp === h) return true;
    if (h === "/account") return false;
    return pp.indexOf(h + "/") === 0;
  }

  function updateMemberSidebarActive() {
    var nav = document.getElementById("huajaiy-member-sidebar-nav");
    if (!nav) return;
    var pp = parentPathname();
    MEMBER_SIDEBAR_MENU.forEach(function (item) {
      var el = nav.querySelector("[data-huajaiy-key=\"" + item.key + "\"]");
      if (!el) return;
      var active =
        item.kind === "path" &&
        item.href &&
        pathMatchesMenuHref(item.href, pp);
      el.classList.toggle("menu-item-active", active);
      el.classList.toggle("menu-item-inactive", !active);
    });
  }

  function installHuajaiyMemberSidebarNav() {
    if (!document.documentElement.classList.contains("huajaiy-member-chrome"))
      return;
    var aside = document.querySelector("#app aside.fixed");
    if (!aside) return;
    var scrollHost =
      aside.querySelector("div.flex.flex-col.overflow-y-auto") ||
      aside.children[1];
    if (!scrollHost) return;

    var nav = document.getElementById("huajaiy-member-sidebar-nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "huajaiy-member-sidebar-nav";
      nav.className = "huajaiy-member-sidebar-nav mb-6";
      nav.setAttribute("aria-label", "เมนูสมาชิก");
      var h2 = document.createElement("h2");
      h2.className =
        "mb-4 text-xs uppercase leading-[20px] text-gray-400 justify-start";
      h2.textContent = "เมนู";
      nav.appendChild(h2);
      var ul = document.createElement("ul");
      ul.className = "flex flex-col gap-4";
      MEMBER_SIDEBAR_MENU.forEach(function (item) {
        var li = document.createElement("li");
        if (item.kind === "empty") {
          var dis = document.createElement("span");
          dis.className =
            "menu-item group menu-item-inactive huajaiy-member-sidebar-link justify-start lg:justify-start cursor-default opacity-50";
          dis.setAttribute("data-huajaiy-key", item.key);
          dis.setAttribute("aria-disabled", "true");
          dis.title = "ยังไม่เปิดใช้งาน";
          var sp0 = document.createElement("span");
          sp0.className = "menu-item-text";
          sp0.textContent = item.label;
          dis.appendChild(sp0);
          li.appendChild(dis);
        } else {
          var a = document.createElement("a");
          a.className =
            "menu-item group menu-item-inactive huajaiy-member-sidebar-link justify-start lg:justify-start";
          a.setAttribute("data-huajaiy-key", item.key);
          a.href = item.href;
          a.target = "_parent";
          a.rel = "noopener noreferrer";
          var span = document.createElement("span");
          span.className = "menu-item-text";
          span.textContent = item.label;
          a.appendChild(span);
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      nav.appendChild(ul);
      scrollHost.insertBefore(nav, scrollHost.firstChild);
    } else {
      MEMBER_SIDEBAR_MENU.forEach(function (item) {
        if (item.kind !== "path" || !item.href) return;
        var el = nav.querySelector("[data-huajaiy-key=\"" + item.key + "\"]");
        if (el && el.tagName === "A") el.setAttribute("href", item.href);
      });
    }
    updateMemberSidebarActive();
  }

  function apiBase() {
    if (window.__HUAJAIY_API_BASE__) {
      return String(window.__HUAJAIY_API_BASE__).replace(/\/$/, "");
    }
    return "https://huajaiy-api.onrender.com";
  }

  /** แปลข้อความเมนู (ตรงทั้งบรรทัดเท่านั้น) */
  var TH_MENU = [
    ["Form Elements", "องค์ประกอบฟอร์ม"],
    ["Basic Tables", "ตารางพื้นฐาน"],
    ["User Profile", "โปรไฟล์"],
    ["Line Chart", "กราฟเส้น"],
    ["Bar Chart", "กราฟแท่ง"],
    ["Blank Page", "หน้าว่าง"],
    ["404 Error", "ไม่พบหน้า"],
    ["UI Elements", "องค์ประกอบ UI"],
    ["Personal Information", "ข้อมูลส่วนตัว"],
    ["Email address", "อีเมล"],
    ["Email Address", "อีเมล"],
    ["Edit Personal Information", "แก้ไขข้อมูลส่วนตัว"],
    ["Update your details to keep your profile up-to-date.", "อัปเดตรายละเอียดเพื่อให้โปรไฟล์เป็นปัจจุบัน"],
    ["Social Links", "ลิงก์โซเชียล"],
    ["First Name", "ชื่อ"],
    ["Last Name", "นามสกุล"],
    ["Postal Code", "รหัสไปรษณีย์"],
    ["City/State", "เมือง / รัฐ"],
    ["TAX ID", "เลขประจำตัวผู้เสียภาษี"],
    ["Edit Address", "แก้ที่อยู่"],
    ["Save Changes", "บันทึก"],
    ["Account settings", "ตั้งค่าบัญชี"],
    ["Edit profile", "แก้โปรไฟล์"],
    ["Authentication", "การยืนยันตัวตน"],
    ["Dashboard", "แดชบอร์ด"],
    ["Ecommerce", "ร้านค้า"],
    ["Calendar", "ปฏิทิน"],
    ["Forms", "แบบฟอร์ม"],
    ["Tables", "ตาราง"],
    ["Pages", "หน้า"],
    ["Charts", "กราฟ"],
    ["Others", "อื่นๆ"],
    ["Alerts", "แจ้งเตือน"],
    ["Avatars", "อวตาร"],
    ["Badges", "ป้าย"],
    ["Buttons", "ปุ่ม"],
    ["Images", "รูปภาพ"],
    ["Videos", "วิดีโอ"],
    ["Support", "ช่วยเหลือ"],
    ["Sign out", "ออกจากระบบ"],
    ["Search", "ค้นหา"],
    ["Close", "ปิด"],
    ["Profile", "โปรไฟล์"],
    ["Address", "ที่อยู่"],
    ["Phone", "โทรศัพท์"],
    ["Bio", "คำอธิบาย"],
    ["Country", "ประเทศ"]
  ];

  function roleLabel(role) {
    if (role === "admin") return "ผู้ดูแลระบบ";
    if (role === "owner") return "เจ้าของร้าน";
    return "สมาชิก";
  }

  function displayName(user) {
    if (!user) return "สมาชิก";
    var a = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    if (a) return a;
    if (user.username) return String(user.username);
    return "สมาชิก";
  }

  function applyThai(root) {
    var app = root || document.getElementById("app");
    if (!app) return;
    var walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      var raw = n.nodeValue;
      if (!raw || !raw.trim()) continue;
      var t = raw.trim();
      for (var i = 0; i < TH_MENU.length; i++) {
        var en = TH_MENU[i][0];
        var th = TH_MENU[i][1];
        if (t === en) {
          n.nodeValue = raw.split(t).join(th);
          break;
        }
      }
    }
  }

  function applyBrand() {
    var app = document.getElementById("app");
    if (!app) return;
    var memberChrome = document.documentElement.classList.contains(
      "huajaiy-member-chrome"
    );
    app.querySelectorAll('a[data-huajaiy-brand="1"]').forEach(function (a) {
      if (!a.querySelector(".huajaiy-brand-wrap")) {
        a.removeAttribute("data-huajaiy-brand");
      }
    });
    var branded = new Set();

    function brandAnchor(a) {
      if (!a || branded.has(a)) return;
      if (a.dataset.huajaiyBrand === "1") return;
      var imgs = a.querySelectorAll("img");
      if (!imgs.length) return;
      branded.add(a);
      a.dataset.huajaiyBrand = "1";
      var wrap = document.createElement("span");
      wrap.className = "huajaiy-brand-wrap flex items-center gap-2 min-w-0";
      var img = document.createElement("img");
      img.src = HEART;
      img.alt = "HUAJAIY";
      img.className = "h-6 w-6 shrink-0";
      var title = document.createElement("span");
      title.className =
        "text-base font-bold tracking-tight text-gray-800 dark:text-white truncate";
      title.textContent = "HUAJAIY";
      wrap.appendChild(img);
      wrap.appendChild(title);
      a.innerHTML = "";
      a.appendChild(wrap);
    }

    if (!memberChrome) {
      app
        .querySelectorAll(
          'aside img[alt="Logo"], aside img[src*="huajaiy-heart"]'
        )
        .forEach(function (im) {
          brandAnchor(im.closest("a"));
        });
    }

    app
      .querySelectorAll(
        'header img[src*="huajaiy-heart"], header img[alt="Logo"]'
      )
      .forEach(function (im) {
        brandAnchor(im.closest("a"));
      });
    app.querySelectorAll('a[href="/"]').forEach(function (a) {
      if (memberChrome && a.closest("aside")) return;
      if (a.querySelectorAll("img").length) brandAnchor(a);
    });

    /* Vue จะ patch router-link แล้วใส่ <img> โลโก้เทมเพลตกลับมาเป็นลูกของ <a> คู่กับ span ของเรา — ลบเฉพาะ img ระดับลูกโดยตรง (หัวใจจริงอยู่ใน .huajaiy-brand-wrap) */
    app.querySelectorAll('a[data-huajaiy-brand="1"]').forEach(function (a) {
      Array.prototype.slice.call(a.children).forEach(function (child) {
        if (child.tagName === "IMG") child.remove();
      });
    });
  }

  function ensureBridgeStyles() {
    if (document.getElementById("huajaiy-bridge-styles")) return;
    var st = document.createElement("style");
    st.id = "huajaiy-bridge-styles";
    st.textContent =
      "header [data-huajaiy-no-search]{display:none!important;}";
    document.head.appendChild(st);
  }

  /** ตรงกับหน้าแรก organic-template (Inter ตัวหนา — เดียวกับ --bs-font-sans-serif) */
  function ensureHuajaiyOrganicNavFont() {
    if (document.getElementById("huajaiy-inter-nav-font")) return;
    var link = document.createElement("link");
    link.id = "huajaiy-inter-nav-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }

  function ensureMemberChromeStyles() {
    ensureHuajaiyOrganicNavFont();
    if (document.getElementById("huajaiy-member-chrome-css")) return;
    var st = document.createElement("style");
    st.id = "huajaiy-member-chrome-css";
    st.textContent =
      "html.huajaiy-member-chrome #app header{display:none!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed{margin-top:0!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed{font-family:Inter,ui-sans-serif,system-ui,sans-serif!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed .menu-item{font-weight:600!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed>div:first-child{display:none!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed>div:nth-child(2){padding-top:1rem!important;}" +
      "@media(min-width:1024px){" +
      "html.huajaiy-member-chrome #app aside.fixed{" +
      "width:290px!important;min-width:290px!important;max-width:290px!important;" +
      "overflow:hidden!important;" +
      "transition:width .32s ease,min-width .32s ease,max-width .32s ease,border-color .32s ease,padding-left .32s ease,padding-right .32s ease!important;" +
      "}" +
      "html.huajaiy-member-chrome #app aside.fixed>div:nth-child(2){" +
      "box-sizing:border-box!important;width:290px!important;min-width:290px!important;" +
      "transform:translateX(0);transition:transform .32s ease!important;will-change:transform;" +
      "}" +
      "html.huajaiy-member-chrome.huajaiy-member-nav-collapsed #app aside.fixed>div:nth-child(2){" +
      "transform:translateX(-100%)!important;" +
      "}" +
      "html.huajaiy-member-chrome.huajaiy-member-nav-collapsed #app aside.fixed{" +
      "width:0!important;min-width:0!important;max-width:0!important;" +
      "border-right-width:0!important;padding-left:0!important;padding-right:0!important;" +
      "overflow:hidden!important;pointer-events:none!important;" +
      "}" +
      "html.huajaiy-member-chrome #app aside.fixed~div.flex-1{" +
      "margin-left:290px!important;transition:margin-left .32s ease!important;" +
      "}" +
      "html.huajaiy-member-chrome.huajaiy-member-nav-collapsed #app aside.fixed~div.flex-1{" +
      "margin-left:0!important;" +
      "}" +
      /* ซ่อนเมนูเทมเพลต TailAdmin — ใช้เมนูสมาชิกแทน */
      "html.huajaiy-member-chrome #app aside.fixed div.flex.flex-col.overflow-y-auto>nav.mb-6:not(#huajaiy-member-sidebar-nav){display:none!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed #huajaiy-member-sidebar-nav .huajaiy-member-sidebar-link{padding-left:0.75rem;padding-right:0.75rem;}" +
      /* การ์ดโปรโมทเทมเพลต (SidebarWidget) — ซ่อนถ้ายังเหลือใน bundle เก่า */
      "html.huajaiy-member-chrome #app aside.fixed div.flex.flex-col.overflow-y-auto>div.mx-auto.mb-10.max-w-60.rounded-2xl.bg-gray-50{display:none!important;}" +
      "}";
    document.head.appendChild(st);
  }

  /** เมนูหลักอยู่ที่ SiteHeader ด้านนอก iframe แล้ว — ที่นี่ซ่อนแค่ช่องค้นหาเทมเพลต + ลบแถบเก่าใน iframe ถ้ามี */
  function hideTemplateSearchOnly() {
    ensureBridgeStyles();
    var legacy = document.getElementById("huajaiy-header-nav");
    if (legacy && legacy.parentNode) {
      legacy.parentNode.removeChild(legacy);
    }
    var header = document.querySelector("header");
    if (!header) return;
    var inp = header.querySelector(
      'input[type="text"][placeholder*="Search or type"]'
    );
    var form = inp && inp.closest("form");
    var searchHost = form ? form.parentElement : null;
    if (searchHost) {
      searchHost.setAttribute("data-huajaiy-no-search", "1");
    }
  }

  function applyUser(user) {
    if (!user) return;
    lastUser = user;
    try {
      window.__HUAJAIY_USER__ = user;
      window.dispatchEvent(
        new CustomEvent("huajaiy-member-user", { detail: user })
      );
    } catch (e) {
      /* ignore */
    }
    var full = displayName(user);
    var sub =
      (user.username ? "@" + user.username + " · " : "") + roleLabel(user.role);
    var av = user.linePictureUrl;

    document.querySelectorAll('img[alt="User"], img[alt="user"]').forEach(
      function (img) {
        if (av) img.src = av;
      }
    );

    var app = document.getElementById("app");
    if (!app) return;

    var reps = [
      ["Musharof Chowdhury", full],
      ["Team Manager", sub],
      ["Arizona, United States", ""],
      ["Phoenix, United States", ""],
      ["United States", "ไทย"],
      ["randomuser@pimjo.com", user.email || "—"],
      ["emirhanboruch55@gmail.com", user.email || "—"],
      ["+09 363 398 46", user.phone || "—"]
    ];

    var w = document.createTreeWalker(app, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = w.nextNode())) {
      var v = node.nodeValue;
      if (!v) continue;
      var next = v;
      for (var r = 0; r < reps.length; r++) {
        if (next.indexOf(reps[r][0]) !== -1) {
          next = next.split(reps[r][0]).join(reps[r][1]);
        }
      }
      if (next !== v) node.nodeValue = next;
    }

    document.querySelectorAll('input[type="text"]').forEach(function (inp) {
      var val = inp.value;
      if (val === "Musharof") inp.value = user.firstName || "";
      if (val === "Chowdhury") inp.value = user.lastName || "";
      if (
        val &&
        (val.indexOf("pimjo") !== -1 ||
          val.indexOf("emirhanboruch55") !== -1)
      ) {
        inp.value = user.email || "";
      }
      if (val === "+09 363 398 46") inp.value = user.phone || "";
    });
  }

  function patchHeaderName(user) {
    if (!user) return;
    var full = displayName(user);
    var w = document.createTreeWalker(
      document.querySelector("header") || document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeValue === "Musharof " || n.nodeValue.trim() === "Musharof") {
        n.nodeValue = full.split(" ")[0]
          ? full.split(" ")[0] + " "
          : full + " ";
      }
      if (n.nodeValue.trim() === "Musharof Chowdhury") {
        n.nodeValue = full;
      }
    }
  }

  function removeAdminEmbed() {
    document.documentElement.classList.remove("huajaiy-admin-embed-active");
    document.querySelectorAll(".huajaiy-admin-embed-root").forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function ensureAdminEmbed() {
    if (!adminEmbedUrl) {
      removeAdminEmbed();
      return;
    }
    document.documentElement.classList.add("huajaiy-admin-embed-active");
    var host = document.querySelector("#app aside.fixed ~ div.flex-1");
    if (!host) return;
    host.style.position = "relative";
    host.style.minHeight = "100dvh";
    var root = host.querySelector(".huajaiy-admin-embed-root");
    if (!root) {
      root = document.createElement("div");
      root.className = "huajaiy-admin-embed-root";
      root.style.cssText =
        "position:absolute;inset:0;z-index:40;background:#f1f5f9;overflow:hidden;";
      var iframe = document.createElement("iframe");
      iframe.className = "huajaiy-admin-embed-iframe";
      iframe.title = "แผงจัดการแอดมิน";
      iframe.style.cssText = "border:0;width:100%;height:100%;display:block;";
      iframe.setAttribute("src", adminEmbedUrl);
      root.appendChild(iframe);
      host.appendChild(root);
      return;
    }
    var iframe = root.querySelector("iframe");
    if (iframe && iframe.getAttribute("src") !== adminEmbedUrl) {
      iframe.setAttribute("src", adminEmbedUrl);
    }
  }

  function sync() {
    tryHuajaiyStartRoute();
    applyBrand();
    hideTemplateSearchOnly();
    applyThai();
    if (lastUser) {
      applyUser(lastUser);
      patchHeaderName(lastUser);
    }
    installHuajaiyMemberSidebarNav();
    ensureAdminEmbed();
  }

  function scheduleSync() {
    if (moTimer) clearTimeout(moTimer);
    moTimer = setTimeout(function () {
      moTimer = null;
      sync();
    }, 200);
  }

  window.addEventListener("message", function (ev) {
    if (ev.origin !== window.location.origin) return;
    var d = ev.data;
    if (!d || !d.type) return;

    if (d.type === "HUAJAIY_TOGGLE_SIDEBAR" && ev.source === window.parent) {
      /* เดสก์ท็อปโหมดสมาชิก: พับเฉพาะเมนูด้านล่าง แถบโลโก้คงที่ — ไม่คลิกปุ่มเทมเพลตที่ยุบทั้ง aside */
      if (
        document.documentElement.classList.contains("huajaiy-member-chrome") &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width:1024px)").matches
      ) {
        document.documentElement.classList.toggle(
          "huajaiy-member-nav-collapsed"
        );
        return;
      }
      var hdr = document.querySelector("header");
      if (hdr) {
        var btn = hdr.querySelector("button");
        if (btn) btn.click();
      }
      return;
    }

    if (d.type === "HUAJAIY_MEMBER_CHROME") {
      document.documentElement.classList.add("huajaiy-member-chrome");
      ensureHuajaiyOrganicNavFont();
      ensureMemberChromeStyles();
      return;
    }

    if (d.type === "HUAJAIY_ADMIN_EMBED") {
      document.documentElement.classList.add("huajaiy-member-chrome");
      ensureHuajaiyOrganicNavFont();
      ensureMemberChromeStyles();
      adminEmbedUrl =
        d.url != null && String(d.url).trim() !== ""
          ? String(d.url).trim()
          : null;
      if (!adminEmbedUrl) removeAdminEmbed();
      scheduleSync();
      return;
    }

    if (d.type === "HUAJAIY_MEMBER") {
      if (d.apiBase) window.__HUAJAIY_API_BASE__ = d.apiBase;
      if (d.user) applyUser(d.user);
      scheduleSync();
    }
  });

  async function fetchMe() {
    try {
      var token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;
      var r = await fetch(apiBase() + "/api/auth/me", {
        headers: { Authorization: "Bearer " + token }
      });
      var data = await r.json().catch(function () {
        return {};
      });
      if (r.ok && data.ok && data.user) applyUser(data.user);
    } catch (e) {
      /* ignore */
    }
  }

  window.addEventListener("load", function () {
    tryHuajaiyStartRoute();
    [50, 200, 600, 1500].forEach(function (ms) {
      setTimeout(tryHuajaiyStartRoute, ms);
    });
    var app = document.getElementById("app");
    if (app) {
      var obs = new MutationObserver(scheduleSync);
      obs.observe(app, { childList: true, subtree: true });
    }
    fetchMe();
    scheduleSync();
  });
})();

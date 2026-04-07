/**
 * เชื่อม TailAdmin (Vue ใน iframe) กับบัญชีสมาชิก HUAJAIY:
 * - รับ postMessage จาก parent (ข้อมูล user + apiBase)
 * - แปลเมนู/ป้ายเป็นภาษาไทย
 * - แทนที่ชื่อ/อีเมล/รูปโปรไฟล์ตัวอย่างด้วยข้อมูลจริงจาก LINE/API
 */
(function () {
  var TOKEN_KEY = "huajaiy_member_token";
  var HEART = "/tailadmin-template/images/logo/huajaiy-heart.svg";
  /** โปรไฟล์สมาชิกเมื่อไม่มีรูปที่อัปโหลดและไม่มีรูป LINE */
  var DEFAULT_MEMBER_AVATAR =
    "/tailadmin-template/images/default-member-avatar-heart.svg";

  var lastUser = null;
  var moTimer = null;
  /** @type {string | null} */
  var adminEmbedUrl = null;
  /** ข้อความทับพื้นที่เนื้อหา (เช่น ยังไม่เปิดให้ใช้งาน) — จาก parent postMessage */
  var shellPlaceholderText = "";
  /** เป้าหมาย path เต็ม เช่น /tailadmin-template/profile จาก ?huajaiy_start=/profile */
  var huajaiyStartTarget = null;

  (function captureHuajaiyStartFromQuery() {
    try {
      var q = new URLSearchParams(window.location.search);
      var raw = q.get("huajaiy_start");
      if (!raw || !String(raw).trim()) return;
      var path = String(raw).trim();
      if (!path.startsWith("/")) path = "/" + path;
      path = path.replace(/\/+/g, "/");
      huajaiyStartTarget = "/tailadmin-template" + path;
    } catch (e) {
      /* ignore */
    }
  })();

  /** เก็บรหัสเกมจาก query ตอนย้ายจาก ?huajaiy_start=… — Next ใส่ member_game ใน iframe */
  function memberGamePassthroughQuery() {
    try {
      var existing = new URLSearchParams(window.location.search);
      var q = new URLSearchParams();
      var mg = existing.get("member_game");
      var g = existing.get("game");
      if (mg != null && String(mg).trim() !== "")
        q.set("member_game", String(mg).trim());
      if (g != null && String(g).trim() !== "")
        q.set("game", String(g).trim());
      var s = q.toString();
      return s ? "?" + s : "";
    } catch (e) {
      return "";
    }
  }

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
      var qs = memberGamePassthroughQuery();
      var hash = window.location.hash || "";
      var url = tgt + qs + hash;
      window.history.replaceState(
        window.history.state,
        "",
        url
      );
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: window.history.state })
      );
    } catch (e) {
      /* ignore */
    }
  }

  /**
   * เมนูซ้ายสมาชิก — คงเชลล์ /member|/admin + iframe เทมเพลต (huajaiy_start)
   * ตรงกับ web/lib/memberSidebarNav.js · kind: "shell" | "closed" | "empty"
   */
  /**
   * slug = path หลัง /member (ว่าง = ภาพรวม) · start = path ใน Vue iframe
   * ตรงกับ web/lib/memberWorkspacePath.js (MEMBER_SLUG_TO_TAIL)
   */
  var MEMBER_SIDEBAR_MENU = [
    { key: "overview", label: "ภาพรวมบัญชี", kind: "shell", slug: "", start: "/" },
    { key: "profile", label: "โปรไฟล์", kind: "shell", slug: "profile", start: "/profile" },
    { key: "prizes", label: "รางวัลของฉัน", kind: "shell", slug: "prizes", start: "/my-prizes" },
    { key: "hearts", label: "หัวใจแดงห้องเกม", kind: "shell", slug: "hearts", start: "/my-hearts" },
    { key: "games", label: "เกมของฉัน", kind: "shell", slug: "game", start: "/my-games" },
    { key: "shops", label: "ร้านค้าของฉัน", kind: "closed", slug: "shops", start: "/my-shops" },
    { key: "page", label: "เพจของฉัน", kind: "publicPage" },
    { key: "orders", label: "คำสั่งซื้อ", kind: "closed", slug: "orders", start: "/my-orders" },
    {
      key: "prizeWithdraw",
      label: "คำขอรับรางวัล",
      kind: "shell",
      slug: "prize-withdraw",
      start: "/prize-withdraw-request"
    },
    {
      key: "heartsShop",
      label: "เติมหัวใจแดง",
      kind: "shell",
      slug: "hearts-top-up",
      start: "/hearts-top-up"
    },
    { key: "giveHearts", label: "แจกหัวใจแดง", kind: "shell", slug: "give-hearts", start: "/give-hearts" }
  ];

  /** ลิงก์ /{username} — เพจสาธารณะ (สอดคล้อง encodeURIComponent บนเว็บหลัก) */
  function canLinkPublicMemberPageUsername(raw) {
    var s = String(raw || "").trim();
    if (s.length < 1 || s.length > 128) return false;
    if (/[/#?]/.test(s)) return false;
    return true;
  }

  function parentWorkspaceBase() {
    try {
      if (
        window.parent &&
        window.parent.location &&
        window.parent.location.pathname
      ) {
        var p = String(window.parent.location.pathname);
        if (p.indexOf("/admin") === 0) return "/admin";
      }
    } catch (e) {
      /* cross-origin */
    }
    return "/member";
  }

  function memberShellHref(item) {
    var base = parentWorkspaceBase();
    if (item.kind !== "shell" && item.kind !== "closed") return base;
    var slug = item.slug != null ? String(item.slug) : "";
    slug = slug.replace(/^\/+/g, "").replace(/\/+$/g, "");
    if (slug === "") return base;
    return base + "/" + slug;
  }

  /** slug ปัจจุบันจาก parent URL (/member/shops หรือ /admin/shops → "shops") */
  function parentShellSlug() {
    try {
      if (window.parent && window.parent.location) {
        var path = String(window.parent.location.pathname || "")
          .split("?")[0]
          .replace(/\/+/g, "/")
          .replace(/\/$/, "") || "/";
        var pairs = [
          ["/member", "/member/"],
          ["/admin", "/admin/"]
        ];
        for (var i = 0; i < pairs.length; i++) {
          var exact = pairs[i][0];
          var prefix = pairs[i][1];
          if (path === exact) return "";
          if (path.indexOf(prefix) === 0) {
            var rest = path.slice(prefix.length);
            var seg = rest.split("/").filter(Boolean)[0];
            return seg ? String(seg).toLowerCase() : "";
          }
        }
      }
    } catch (e) {
      /* cross-origin */
    }
    return "";
  }

  function iframeTailPath() {
    var ip = window.location.pathname || "";
    var prefix = "/tailadmin-template";
    if (ip.indexOf(prefix) === 0) {
      ip = ip.slice(prefix.length) || "/";
    }
    if (!ip.startsWith("/")) ip = "/" + ip;
    return ip.replace(/\/$/, "") || "/";
  }

  function slugForVueTail(tail) {
    var st = String(tail || "/").replace(/\/$/, "") || "/";
    var map = {
      "/": "",
      "/profile": "profile",
      "/my-prizes": "prizes",
      "/my-hearts": "hearts",
      "/my-games": "game",
      "/my-shops": "shops",
      "/my-orders": "orders",
      "/prize-withdraw-request": "prize-withdraw",
      "/hearts-top-up": "hearts-top-up",
      "/give-hearts": "give-hearts",
      "/create-game": "create-game",
      "/game-studio": "game-studio"
    };
    return map[st] !== undefined ? map[st] : null;
  }

  function updateMemberSidebarActive() {
    var nav = document.getElementById("huajaiy-member-sidebar-nav");
    if (!nav) return;
    var parentSlug = parentShellSlug();
    var ip = iframeTailPath();
    var fromIframe = slugForVueTail(ip);
    var effectiveSlug =
      parentSlug === "" && fromIframe != null && fromIframe !== ""
        ? fromIframe
        : parentSlug;
    MEMBER_SIDEBAR_MENU.forEach(function (item) {
      var el = nav.querySelector("[data-huajaiy-key=\"" + item.key + "\"]");
      if (!el) return;
      var active = false;
      if (item.kind === "shell" || item.kind === "closed") {
        var slug = item.slug != null ? String(item.slug) : "";
        active = effectiveSlug === slug;
      } else if (item.kind === "legacy" && item.href) {
        try {
          if (window.parent && window.parent.location) {
            var pp = String(window.parent.location.pathname || "")
              .split("?")[0]
              .replace(/\/+/g, "/")
              .replace(/\/$/, "") || "/";
            var h = String(item.href)
              .split("?")[0]
              .replace(/\/+/g, "/")
              .replace(/\/$/, "") || "/";
            active = pp === h || pp.indexOf(h + "/") === 0;
          }
        } catch (e) {
          /* cross-origin */
        }
      } else if (item.kind === "publicPage") {
        try {
          var rawP =
            lastUser && lastUser.username != null
              ? String(lastUser.username).trim().toLowerCase()
              : "";
          if (canLinkPublicMemberPageUsername(rawP) && window.parent && window.parent.location) {
            var ppU = String(window.parent.location.pathname || "")
              .split("?")[0]
              .replace(/\/+/g, "/")
              .replace(/\/$/, "") || "/";
            var um = ppU.match(/^\/u\/(.+)$/i);
            var pathUser = "";
            try {
              pathUser = um ? decodeURIComponent(um[1]).toLowerCase() : "";
            } catch (e1) {
              pathUser = "";
            }
            active = pathUser === rawP;
          }
        } catch (e1) {
          /* cross-origin */
        }
      }
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
          dis.title = "ยังไม่มีหน้าในเทมเพลต";
          var sp0 = document.createElement("span");
          sp0.className = "menu-item-text";
          sp0.textContent = item.label;
          dis.appendChild(sp0);
          li.appendChild(dis);
        } else if (item.kind === "legacy" && item.href) {
          var la = document.createElement("a");
          la.className =
            "menu-item group menu-item-inactive huajaiy-member-sidebar-link justify-start lg:justify-start";
          la.setAttribute("data-huajaiy-key", item.key);
          la.href = String(item.href);
          la.target = "_parent";
          la.rel = "noopener noreferrer";
          la.title = "หน้าเดิมบนเว็บหลัก";
          var lsp = document.createElement("span");
          lsp.className = "menu-item-text";
          lsp.textContent = item.label;
          la.appendChild(lsp);
          li.appendChild(la);
        } else if (item.kind === "publicPage") {
          var ppa = document.createElement("a");
          ppa.className =
            "menu-item group menu-item-inactive huajaiy-member-sidebar-link justify-start lg:justify-start";
          ppa.setAttribute("data-huajaiy-key", item.key);
          ppa.setAttribute("data-huajaiy-public-page", "1");
          ppa.href = "#";
          ppa.target = "_parent";
          ppa.rel = "noopener noreferrer";
          var psp = document.createElement("span");
          psp.className = "menu-item-text";
          psp.textContent = item.label;
          ppa.appendChild(psp);
          li.appendChild(ppa);
        } else {
          var a = document.createElement("a");
          a.className =
            "menu-item group menu-item-inactive huajaiy-member-sidebar-link justify-start lg:justify-start";
          a.setAttribute("data-huajaiy-key", item.key);
          a.setAttribute("data-huajaiy-start", item.start);
          a.setAttribute("data-huajaiy-slug", item.slug != null ? item.slug : "");
          a.href = memberShellHref(item);
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
        if (item.kind !== "shell" && item.kind !== "closed") return;
        var el = nav.querySelector("[data-huajaiy-key=\"" + item.key + "\"]");
        if (el && el.tagName === "A") {
          el.setAttribute("href", memberShellHref(item));
        }
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

  /** Niramit — ฟอนต์เดียวกับเว็บหลัก */
  function ensureHuajaiyStackFonts() {
    if (!document.getElementById("huajaiy-niramit-font-link")) {
      var link = document.createElement("link");
      link.id = "huajaiy-niramit-font-link";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Niramit:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }

  function ensureMemberChromeStyles() {
    ensureHuajaiyStackFonts();
    if (document.getElementById("huajaiy-member-chrome-css")) return;
    var st = document.createElement("style");
    st.id = "huajaiy-member-chrome-css";
    st.textContent =
      "html.huajaiy-member-chrome #app header{display:none!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed{margin-top:0!important;}" +
      "html.huajaiy-member-chrome #app aside.fixed{font-family:Niramit,ui-sans-serif,system-ui,sans-serif!important;}" +
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
    var prevSig = lastUser ? JSON.stringify(lastUser) : "";
    lastUser = user;
    try {
      window.__HUAJAIY_USER__ = user;
      if (prevSig !== JSON.stringify(user)) {
        window.dispatchEvent(
          new CustomEvent("huajaiy-member-user", { detail: user })
        );
      }
    } catch (e) {
      /* ignore */
    }
    var full = displayName(user);
    var sub =
      (user.username ? "@" + user.username + " · " : "") + roleLabel(user.role);
    var av =
      (user.profilePictureUrl && String(user.profilePictureUrl).trim()) ||
      (user.linePictureUrl && String(user.linePictureUrl).trim()) ||
      "";

    document.querySelectorAll('img[alt="User"], img[alt="user"]').forEach(
      function (img) {
        img.src = av || DEFAULT_MEMBER_AVATAR;
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

  function patchMemberPublicPageNav() {
    var nav = document.getElementById("huajaiy-member-sidebar-nav");
    if (!nav) return;
    var el = nav.querySelector("[data-huajaiy-public-page=\"1\"]");
    if (!el || el.tagName !== "A") return;
    var raw =
      lastUser && lastUser.username != null
        ? String(lastUser.username).trim().toLowerCase()
        : "";
    var ok = canLinkPublicMemberPageUsername(raw);
    if (ok) {
      el.setAttribute("href", "/" + encodeURIComponent(raw));
      el.removeAttribute("aria-disabled");
      el.removeAttribute("title");
      el.classList.remove("opacity-50", "cursor-default", "pointer-events-none");
      el.onclick = null;
    } else {
      el.setAttribute("href", "#");
      el.setAttribute("aria-disabled", "true");
      el.setAttribute(
        "title",
        "อัปเดตชื่อผู้ใช้ในโปรไฟล์ก่อน"
      );
      el.classList.add("opacity-50", "cursor-default");
      el.onclick = function (e) {
        e.preventDefault();
      };
    }
  }

  function removeShellContentPlaceholder() {
    document.querySelectorAll(".huajaiy-shell-placeholder-root").forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function ensureShellContentPlaceholder(text) {
    var msg = text != null && String(text).trim() !== "" ? String(text).trim() : "";
    if (!msg) {
      removeShellContentPlaceholder();
      return;
    }
    var host = document.querySelector("#app aside.fixed ~ div.flex-1");
    if (!host) return;
    host.style.position = "relative";
    var root = host.querySelector(".huajaiy-shell-placeholder-root");
    if (!root) {
      root = document.createElement("div");
      root.className = "huajaiy-shell-placeholder-root";
      root.setAttribute("role", "status");
      root.style.cssText =
        "position:absolute;inset:0;z-index:38;background:#f1f5f9;display:flex;align-items:center;justify-content:center;padding:1.5rem;box-sizing:border-box;";
      var p = document.createElement("p");
      p.className = "huajaiy-shell-placeholder-text";
      p.style.cssText =
        "margin:0;text-align:center;font-weight:700;font-size:clamp(1.25rem,4vw,2.25rem);color:#334155;line-height:1.3;font-family:Niramit,ui-sans-serif,system-ui,sans-serif;";
      root.appendChild(p);
      host.appendChild(root);
    }
    var pEl = root.querySelector(".huajaiy-shell-placeholder-text");
    if (pEl) pEl.textContent = msg;
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
    patchMemberPublicPageNav();
    updateMemberSidebarActive();
    ensureAdminEmbed();
    ensureShellContentPlaceholder(shellPlaceholderText);
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
      ensureHuajaiyStackFonts();
      ensureMemberChromeStyles();
      return;
    }

    if (d.type === "HUAJAIY_ADMIN_EMBED") {
      document.documentElement.classList.add("huajaiy-member-chrome");
      ensureHuajaiyStackFonts();
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
      if (d.token != null && String(d.token).trim() !== "") {
        try {
          localStorage.setItem(TOKEN_KEY, String(d.token).trim());
        } catch (e) {
          /* ignore */
        }
        try {
          window.dispatchEvent(new CustomEvent("huajaiy-member-token-ready"));
        } catch (e2) {
          /* ignore */
        }
      }
      if (d.shellPlaceholderText !== undefined) {
        shellPlaceholderText =
          d.shellPlaceholderText != null &&
          String(d.shellPlaceholderText).trim() !== ""
            ? String(d.shellPlaceholderText).trim()
            : "";
      }
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

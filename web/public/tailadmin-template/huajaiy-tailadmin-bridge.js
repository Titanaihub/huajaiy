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
    ["Country", "ประเทศ"],
    ["#1 Tailwind CSS Dashboard", "ระบบสมาชิก HUAJAIY"],
    [
      "Leading Tailwind CSS Admin Template with 400+ UI Component and Pages.",
      "พื้นที่สมาชิกหลังล็อกอิน LINE"
    ]
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
    var links = app.querySelectorAll('a[href="/"]');
    links.forEach(function (a) {
      if (a.dataset.huajaiyBrand === "1") return;
      var imgs = a.querySelectorAll("img");
      if (!imgs.length) return;
      a.dataset.huajaiyBrand = "1";
      var wrap = document.createElement("span");
      wrap.className = "flex items-center gap-2 min-w-0";
      var img = document.createElement("img");
      img.src = HEART;
      img.alt = "HUAJAIY";
      img.className = "h-9 w-9 shrink-0";
      var title = document.createElement("span");
      title.className =
        "text-xl font-bold tracking-tight text-gray-800 dark:text-white truncate";
      title.textContent = "HUAJAIY";
      wrap.appendChild(img);
      wrap.appendChild(title);
      a.innerHTML = "";
      a.appendChild(wrap);
    });
  }

  function applyUser(user) {
    if (!user) return;
    lastUser = user;
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

  function sync() {
    applyBrand();
    applyThai();
    if (lastUser) {
      applyUser(lastUser);
      patchHeaderName(lastUser);
    }
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
    if (!d || d.type !== "HUAJAIY_MEMBER") return;
    if (d.apiBase) window.__HUAJAIY_API_BASE__ = d.apiBase;
    if (d.user) applyUser(d.user);
    scheduleSync();
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
    var app = document.getElementById("app");
    if (app) {
      var obs = new MutationObserver(scheduleSync);
      obs.observe(app, { childList: true, subtree: true });
    }
    fetchMe();
    scheduleSync();
  });
})();

/**
 * โหลดเนื้อหา hero + การ์ดฟีเจอร์จาก API แล้วอัปเดต DOM (หน้าแรก organic ใน iframe)
 */
(function () {
  var DEFAULT_BG = "images/banner-1.jpg";

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text != null ? String(text) : "";
  }

  function setStyle(id, prop, val) {
    var el = $(id);
    if (el) el.style[prop] = val;
  }

  function setHeroBg(url) {
    var sec = $("huajaiy-hero-section");
    if (!sec) return;
    var u = url && String(url).trim();
    if (u && /^https:\/\//i.test(u)) {
      sec.style.backgroundImage = "url('" + u.replace(/'/g, "%27") + "')";
    } else {
      sec.style.backgroundImage = "url('" + DEFAULT_BG + "')";
    }
    sec.style.backgroundRepeat = "no-repeat";
    sec.style.backgroundSize = "cover";
  }

  function setCta(id, cta) {
    var a = $(id);
    if (!a || !cta) return;
    a.textContent = cta.label || "";
    a.href = cta.href || "#";
    a.target = "_top";
    a.rel = "noopener";
    a.style.backgroundColor = cta.bgColor || "";
    a.style.color = cta.textColor || "";
    a.style.borderColor = cta.bgColor || "";
  }

  function setStat(i, s) {
    setText("huajaiy-stat-" + i + "-value", s.value);
    setText("huajaiy-stat-" + i + "-label", s.label);
    setStyle("huajaiy-stat-" + i + "-value", "color", s.valueColor);
    setStyle("huajaiy-stat-" + i + "-label", "color", s.labelColor);
  }

  var SECTION_TITLE_SUB_IDS = {
    gamePrize: ["huajaiy-sec-gameprize-title", "huajaiy-sec-gameprize-sub"],
    category: ["huajaiy-sec-category-title", "huajaiy-sec-category-sub"],
    bestSelling: ["huajaiy-sec-bestselling-title", "huajaiy-sec-bestselling-sub"],
    bannerSale1: ["huajaiy-sec-bannersale1-title", "huajaiy-sec-bannersale1-sub"],
    bannerSale2: ["huajaiy-sec-bannersale2-title", "huajaiy-sec-bannersale2-sub"],
    bannerSale3: ["huajaiy-sec-bannersale3-title", "huajaiy-sec-bannersale3-sub"],
    featured: ["huajaiy-sec-featured-title", "huajaiy-sec-featured-sub"],
    newsletter: ["huajaiy-sec-newsletter-title", "huajaiy-sec-newsletter-sub"],
    popular: ["huajaiy-sec-popular-title", "huajaiy-sec-popular-sub"],
    justArrived: ["huajaiy-sec-justarrived-title", "huajaiy-sec-justarrived-sub"],
    blog: ["huajaiy-sec-blog-title", "huajaiy-sec-blog-sub"],
    appDownload: ["huajaiy-sec-app-title", "huajaiy-sec-app-sub"],
    seoLooking: ["huajaiy-sec-seo-title", "huajaiy-sec-seo-sub"]
  };

  function applySectionBlock(block, titleId, subId) {
    if (!block) return;
    setText(titleId, block.title);
    setStyle(titleId, "color", block.titleColor);
    var sub = $(subId);
    if (!sub) return;
    var t = block.subtitle != null ? String(block.subtitle) : "";
    sub.textContent = t;
    sub.style.color = block.subtitleColor || "";
    sub.style.display = t.replace(/\s/g, "") ? "" : "none";
  }

  function applySectionHeadings(sh) {
    if (!sh || typeof sh !== "object") return;
    Object.keys(SECTION_TITLE_SUB_IDS).forEach(function (key) {
      var pair = SECTION_TITLE_SUB_IDS[key];
      applySectionBlock(sh[key], pair[0], pair[1]);
    });
    var vt = sh.valueTrust;
    if (!Array.isArray(vt)) return;
    for (var k = 0; k < 5; k++) {
      applySectionBlock(vt[k], "huajaiy-sec-trust-" + k + "-title", "huajaiy-sec-trust-" + k + "-sub");
    }
  }

  function setFeature(i, f) {
    var card = $("huajaiy-feature-" + i);
    if (card) {
      card.style.backgroundColor = f.cardBgColor || "";
    }
    var svg = $("huajaiy-feature-" + i + "-icon-svg");
    var img = $("huajaiy-feature-" + i + "-icon-img");
    var sym = $("huajaiy-feature-" + i + "-icon");
    var u = f.iconImageUrl != null ? String(f.iconImageUrl).trim() : "";
    if (u && /^https:\/\//i.test(u)) {
      if (img) {
        img.src = u;
        img.alt = f.title != null ? String(f.title).slice(0, 120) : "";
        img.classList.remove("d-none");
      }
      if (svg) svg.classList.add("d-none");
    } else {
      if (img) {
        img.removeAttribute("src");
        img.alt = "";
        img.classList.add("d-none");
      }
      if (svg) svg.classList.remove("d-none");
      if (sym && f.icon) {
        var href = "#" + f.icon;
        try {
          sym.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", href);
        } catch (e1) {}
        sym.setAttribute("href", href);
      }
    }
    setText("huajaiy-feature-" + i + "-title", f.title);
    setText("huajaiy-feature-" + i + "-desc", f.description);
    setStyle("huajaiy-feature-" + i + "-title", "color", f.titleColor);
    setStyle("huajaiy-feature-" + i + "-desc", "color", f.descriptionColor);
  }

  function truncDesc(s, max) {
    var t = s != null ? String(s).replace(/\s+/g, " ").trim() : "";
    if (t.length <= max) return t;
    return t.slice(0, max - 1) + "\u2026";
  }

  function applyGameCards(games) {
    var sec = $("huajaiy-game-prize-section");
    var any = false;
    for (var i = 0; i < 4; i++) {
      var wrap = $("huajaiy-game-card-" + i + "-wrap");
      var link = $("huajaiy-game-card-" + i);
      var img = $("huajaiy-game-card-" + i + "-img");
      var g = games && games[i];
      if (!wrap || !link) continue;
      if (!g || !g.id) {
        wrap.classList.add("d-none");
        continue;
      }
      any = true;
      wrap.classList.remove("d-none");
      link.href = "/game/" + encodeURIComponent(String(g.id).trim());
      link.target = "_top";
      link.rel = "noopener";
      var cover = g.gameCoverUrl && String(g.gameCoverUrl).trim();
      if (img) {
        if (cover && /^https?:\/\//i.test(cover)) {
          img.src = cover;
          img.alt = g.title ? String(g.title).slice(0, 120) : "เกม";
          img.classList.remove("d-none");
        } else {
          img.removeAttribute("src");
          img.alt = "";
          img.classList.add("d-none");
        }
      }
      setText("huajaiy-game-card-" + i + "-title", g.title || "เกม");
      setText("huajaiy-game-card-" + i + "-desc", truncDesc(g.description, 110));
    }
    if (sec) {
      if (any) sec.classList.remove("d-none");
      else sec.classList.add("d-none");
    }
  }

  function applyOrganicHome(data) {
    if (!data || typeof data !== "object") return;
    setHeroBg(data.heroBackgroundImageUrl);
    setText("huajaiy-hero-title", data.heroTitle);
    setStyle("huajaiy-hero-title", "color", data.heroTitleColor);
    setText("huajaiy-hero-subtitle", data.heroSubtitle);
    setStyle("huajaiy-hero-subtitle", "color", data.heroSubtitleColor);
    if (data.primaryCta) setCta("huajaiy-hero-cta-primary", data.primaryCta);
    if (data.secondaryCta) setCta("huajaiy-hero-cta-secondary", data.secondaryCta);
    var stats = data.stats;
    if (Array.isArray(stats)) {
      for (var i = 0; i < 3; i++) {
        if (stats[i]) setStat(i, stats[i]);
      }
    }
    var feats = data.features;
    if (Array.isArray(feats)) {
      for (var j = 0; j < 3; j++) {
        if (feats[j]) setFeature(j, feats[j]);
      }
    }
    applySectionHeadings(data.sectionHeadings);
  }

  function fetchJson() {
    var url = "/api/public/organic-home";
    fetch(url, { credentials: "omit", headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json();
      })
      .then(function (body) {
        if (body && body.ok && body.organicHome) {
          applyOrganicHome(body.organicHome);
          applyGameCards(Array.isArray(body.organicGamesPick) ? body.organicGamesPick : []);
        }
      })
      .catch(function () {
        /* ใช้ HTML เดิม */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchJson);
  } else {
    fetchJson();
  }
})();

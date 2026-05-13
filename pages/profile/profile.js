if (window.location.search.includes("error=auth")) {
  document.addEventListener("DOMContentLoaded", function () {
    var authErr = document.getElementById("error-msg");
    if (authErr) {
      authErr.textContent = "خطأ في التحقق، يرجى تسجيل الدخول مجدداً";
      authErr.removeAttribute("hidden");
    }
  });
} else {
  (function () {
  var sidebar = document.querySelector(".profile-sidebar");
  var collapseBtn = document.querySelector(".profile-sidebar__collapse");
  var mobilePeek = document.querySelector(".profile-sidebar__peek");
  var mobileClose = document.querySelector(".profile-sidebar__mobile-close");
  var sidebarBackdrop = document.querySelector(".profile-sidebar__backdrop");
  var mqMobileNav = window.matchMedia("(max-width: 768px)");
  var lastCompany = null;
  var editCompanyModalInitialized = false;
  var createEventModalInitialized = false;
  var addProductModalInitialized = false;
  var productsCache = [];
  var openProductModalForEdit = null;
  var eventsGrid = document.getElementById("events-grid");
  var eventsCountEl = document.getElementById("events-count");
  var EVENT_MAP_ASSET =
    "https://www.figma.com/api/mcp/asset/e6302054-95f4-465a-8be0-76c4b071fbad";
  var ICON_EVENT_CALENDAR =
    "../../assets/images/profile-sidebar/icon-calendar.svg";
  var ICON_EVENT_USERS =
    "../../assets/images/profile-sidebar/icon-users.svg";
  var ICON_EVENT_DISABLE =
    "../../assets/images/profile-sidebar/icon-event-disable.svg";
  var ICON_EVENT_CATEGORY =
    "../../assets/images/profile-sidebar/icon-tag.svg";
  var ICON_EVENT_BIKE =
    "../../assets/images/profile-sidebar/icon-motorcycle.svg";
  var ICON_EVENT_GENDER =
    "../../assets/images/profile-sidebar/icon-person.svg";
  function mapsStaticApiKey() {
    return typeof CONFIG !== "undefined" && CONFIG.MAPS_KEY ? CONFIG.MAPS_KEY : "";
  }

  function getStaticMapUrl(end_location) {
    if (end_location == null || String(end_location).trim() === "") return null;
    var parts = String(end_location).trim().split(",");
    var lat = parts[0] ? String(parts[0]).trim() : "";
    var lng = parts[1] ? String(parts[1]).trim() : "";
    if (!lat || !lng) return null;
    return (
      "https://maps.googleapis.com/maps/api/staticmap?" +
      "center=" +
      lat +
      "," +
      lng +
      "&zoom=14" +
      "&size=400x235" +
      "&markers=color:orange%7C" +
      lat +
      "," +
      lng +
      "&key=" +
      mapsStaticApiKey() +
      "&language=ar"
    );
  }

  function redirectToLogin() {
    window.location.href = "../login/index.html";
  }

  function hideProfileLoadError() {
    var el = document.getElementById("error-msg");
    if (el) {
      el.textContent = "";
      el.setAttribute("hidden", "");
    }
  }

  function isUnauthorized(status, body) {
    if (status === 401 || status === 403) return true;
    if (!body || typeof body !== "object") return false;
    if (Array.isArray(body)) return false;
    if (body.unauthorized === true || body.forbidden === true) return true;
    var msg = (body.message || body.error || "").toString().toLowerCase();
    return msg.includes("unauthorized") || msg.includes("forbidden");
  }

  function hasCompanyData(list) {
    if (!Array.isArray(list) || list.length === 0 || !list[0]) return false;
    var company = list[0];
    if (typeof company !== "object") return false;
    if (company.success === false) return false;
    if (company.error) return false;
    var catAr =
      window.categoryArFromCompany && window.categoryArFromCompany(company);
    return (
      company.user_id != null ||
      Boolean(company.name) ||
      Boolean(company.image) ||
      company.number != null ||
      Boolean(catAr)
    );
  }

  async function loadCompanyProfile() {
    try {
      var deviceUid = window.safeLocalStorage
        ? window.safeLocalStorage.getItem("device_uid")
        : null;
      if (!deviceUid) {
        redirectToLogin();
        return false;
      }

      var result = await window.getCompanyDevice(deviceUid);
      var body = result.body;
      var list = window.normalizeCompanyList
        ? window.normalizeCompanyList(body)
        : null;

    if (
        result.ok &&
        !isUnauthorized(result.status, body) &&
        hasCompanyData(list)
      ) {
        hideProfileLoadError();
        var first = list[0];
        if (first.user_id != null && first.user_id !== "" && window.safeLocalStorage) {
          window.safeLocalStorage.setItem("user_id", String(first.user_id));
        }
        populateCompany(list);
        return true;
      }

      redirectToLogin();
      return false;
    } finally {
      if (typeof window.hidePageLoader === "function") {
        window.hidePageLoader();
      }
    }
  }

  function populateCompany(list) {
    var company = list[0];
    if (!company) return;

    var nameEl = document.getElementById("company-name");
    if (nameEl) nameEl.textContent = company.name != null ? String(company.name) : "—";

    var userIdEl = document.getElementById("company-user-id");
    if (userIdEl) {
      var uidShow =
        company.user_id != null && company.user_id !== ""
          ? "@" + String(company.user_id)
          : "";
      userIdEl.textContent = uidShow;
      if (uidShow) userIdEl.setAttribute("title", uidShow);
      else userIdEl.removeAttribute("title");
    }

    var phoneEl = document.getElementById("company-phone");
    if (phoneEl) phoneEl.textContent = company.number != null ? String(company.number) : "—";

    var catEl = document.getElementById("company-category");
    var catAr =
      window.categoryArFromCompany && window.categoryArFromCompany(company);
    if (catEl) catEl.textContent = catAr ? String(catAr) : "—";

    var passEl = document.getElementById("company-pass");
    if (passEl) passEl.textContent = "••••••••";

    var urlEl = document.getElementById("company-url");
    if (urlEl) {
      var urlRaw =
        company.url != null && String(company.url).trim() ? String(company.url).trim() : "";
      if (urlRaw) {
        urlEl.textContent = urlRaw;
        urlEl.href = urlRaw;
        urlEl.classList.remove("company-row__website-link--empty");
        urlEl.removeAttribute("aria-disabled");
        urlEl.removeAttribute("tabindex");
      } else {
        urlEl.textContent = "لا يوجد";
        urlEl.href = "#";
        urlEl.classList.add("company-row__website-link--empty");
        urlEl.setAttribute("aria-disabled", "true");
        urlEl.setAttribute("tabindex", "-1");
      }
    }

    var certEl = document.getElementById("company-certificate");
    if (certEl) {
      certEl.href =
        company.certificate != null && String(company.certificate).trim()
          ? String(company.certificate).trim()
          : "#";
    }

    var imageUrl =
      company.image && String(company.image).trim()
        ? window.resolveImageUrl(String(company.image).trim())
        : "";

    var companyAvatar = document.getElementById("company-avatar");
    var sidebarAvatar = document.getElementById("sidebar-avatar");
    if (companyAvatar) {
      companyAvatar.onerror = function () {
        this.onerror = null;
        this.src =
          "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(company.name) +
          "&background=E1902B&color=fff&size=168&font-size=0.4";
      };
      companyAvatar.src = imageUrl;
    }
    if (sidebarAvatar) {
      sidebarAvatar.onerror = function () {
        this.onerror = null;
        this.src =
          "https://ui-avatars.com/api/?name=" +
          encodeURIComponent(company.name) +
          "&background=E1902B&color=fff&size=32&font-size=0.4";
      };
      sidebarAvatar.src = imageUrl;
    }

    updateProductsAndEventsVisibility(company);

    lastCompany = company;
    window.currentCompany = company;
  }

  function companyIsEventsCategory(company) {
    if (!company || typeof company !== "object") return false;
    var catEn =
      window.categoryEnFromCompany && window.categoryEnFromCompany(company)
        ? String(window.categoryEnFromCompany(company)).trim().toLowerCase()
        : "";
    var catArRaw =
      window.categoryArFromCompany && window.categoryArFromCompany(company)
        ? String(window.categoryArFromCompany(company)).trim()
        : "";
    return catEn === "events" || catArRaw === "فعاليات";
  }

  function updateProductsAndEventsVisibility(company) {
    var catEn =
      window.categoryEnFromCompany && window.categoryEnFromCompany(company)
        ? String(window.categoryEnFromCompany(company)).trim().toLowerCase()
        : "";
    var catArRaw =
      window.categoryArFromCompany && window.categoryArFromCompany(company)
        ? String(window.categoryArFromCompany(company)).trim()
        : "";
    var isEvents = catEn === "events" || catArRaw === "فعاليات";
    var isProducts = catEn === "products" || catArRaw === "منتجات";

    var eventsSection = document.getElementById("events-section");
    var productsSection = document.getElementById("products-section");

    if (eventsSection) {
      if (isEvents) {
        eventsSection.removeAttribute("hidden");
      } else {
        eventsSection.setAttribute("hidden", "");
      }
    }

    if (productsSection) {
      if (isEvents) {
        productsSection.setAttribute("hidden", "");
      } else if (isProducts) {
        productsSection.removeAttribute("hidden");
      } else {
        productsSection.setAttribute("hidden", "");
      }
    }

    if (isEvents) {
      loadRoadEvents();
    }
    if (isProducts) {
      loadProducts();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeRoadEventsList(body) {
    if (!body) return [];
    if (Array.isArray(body)) return body;
    if (typeof body !== "object") return [];
    if (Array.isArray(body.data)) return body.data;
    if (Array.isArray(body.roads)) return body.roads;
    if (Array.isArray(body.events)) return body.events;
    if (Array.isArray(body.result)) return body.result;
    return [];
  }

  function normalizeProductsFromApi(result) {
    if (result == null) return [];
    if (Array.isArray(result)) return result;
    if (typeof result !== "object") return [];
    if (Array.isArray(result.body)) return result.body;
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.products)) return result.products;
    if (Array.isArray(result.result)) return result.result;
    return [];
  }

  function findCachedProduct(productId) {
    if (productId == null || String(productId).trim() === "") return null;
    var sid = String(productId).trim();
    for (var i = 0; i < productsCache.length; i++) {
      var p = productsCache[i];
      if (!p || typeof p !== "object") continue;
      var pid = productRecordId(p);
      if (pid != null && String(pid).trim() === sid) return p;
    }
    return null;
  }

  /**
   * معرف المنتج في صف getCompanyProduct.
   * الباكند يُسمّي أحياناً المعرف user_id (نفس باراميتر حذف المنتج) رغم أنه ليس معرف المستخدم.
   */
  function productRecordId(product) {
    if (!product || typeof product !== "object") return null;
    if (product.id != null && String(product.id).trim() !== "") return product.id;
    if (product.product_id != null && String(product.product_id).trim() !== "")
      return product.product_id;
    if (product._id != null && String(product._id).trim() !== "") return product._id;
    if (product.productId != null && String(product.productId).trim() !== "")
      return product.productId;
    if (product.productID != null && String(product.productID).trim() !== "")
      return product.productID;
    if (product.products_id != null && String(product.products_id).trim() !== "")
      return product.products_id;
    if (product.company_product_id != null && String(product.company_product_id).trim() !== "")
      return product.company_product_id;
    if (product.user_id != null && String(product.user_id).trim() !== "") return product.user_id;
    if (product.User_Id != null && String(product.User_Id).trim() !== "") return product.User_Id;
    if (product.userId != null && String(product.userId).trim() !== "") return product.userId;
    return null;
  }

  function roadEventPatchId(ev) {
    if (!ev || typeof ev !== "object") return "";
    var cand =
      ev.id != null
        ? ev.id
        : ev._id != null
          ? ev._id
          : ev.road_id != null
            ? ev.road_id
            : ev.user_id != null
              ? ev.user_id
              : ev.userId;
    return cand != null && String(cand).trim() !== "" ? String(cand).trim() : "";
  }

  function startEndValue(ev) {
    if (!ev || typeof ev !== "object") return null;
    var v = ev.start_end != null ? ev.start_end : ev.startEnd;
    if (v == null) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }

  function hasDisplayValue(v) {
    if (v == null) return false;
    if (typeof v === "number") return !isNaN(v);
    return String(v).trim() !== "";
  }

  function formatRoadEventTime(raw) {
    if (!hasDisplayValue(raw)) return "";
    var s = String(raw).trim();
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat("ar-SA", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(d);
      } catch (e) {
        return s;
      }
    }
    return s;
  }

  function eventTitle(ev) {
    if (!ev || typeof ev !== "object") return "فعالية";
    if (hasDisplayValue(ev.set_ar)) return String(ev.set_ar).trim();
    if (hasDisplayValue(ev.title)) return String(ev.title).trim();
    if (hasDisplayValue(ev.name)) return String(ev.name).trim();
    if (hasDisplayValue(ev.road_user_name)) return String(ev.road_user_name).trim();
    return "فعالية";
  }

  /** عنوان البطاقة: end_street مع بدائل إن لزم */
  function eventDisplayName(ev) {
    if (!ev || typeof ev !== "object") return "—";
    if (hasDisplayValue(ev.end_street)) return String(ev.end_street).trim();
    return eventTitle(ev);
  }

  /** عرض الجنس: 1 ذكر، 2 أنثى، فارغ/null → الكل (لا يُعرض الصف إن لم يُرسل الحقل) */
  function genderLine(ev) {
    if (!ev || typeof ev !== "object" || !("gender" in ev)) return null;
    var g = ev.gender;
    if (g === "" || g === null || g === undefined) return "الكل";
    var n = Number(g);
    if (n === 1) return "ذكر";
    if (n === 2) return "أنثى";
    return "الكل";
  }

  function buildEventCardHtml(ev, index, prefetchedParticipantCount) {
    var patchId = roadEventPatchId(ev);
    var se = startEndValue(ev);
    var isActive = se === 0;
    var isEnded = se === 2;
    var badgeHtml = "";
    if (isActive) {
      badgeHtml =
        '<span class="event-card__badge event-card__badge--active event-badge event-badge--active">نشط</span>';
    } else if (isEnded) {
      badgeHtml =
        '<span class="event-card__badge event-card__badge--ended event-badge event-badge--ended">منتهي</span>';
    }

    var nameRaw = hasDisplayValue(ev.end_street)
      ? String(ev.end_street).trim()
      : eventDisplayName(ev);
    var nameHtml = escapeHtml(nameRaw);

    var timeRaw = ev.end_time != null ? ev.end_time : ev.endTime;
    var timeText = formatRoadEventTime(timeRaw);
    var timeRow = "";
    if (hasDisplayValue(timeRaw) && hasDisplayValue(timeText)) {
      timeRow =
        '<div class="event-card__row event-info-row">' +
        '<span class="event-card__row-icon-wrap" aria-hidden="true">' +
        '<img class="event-card__row-icon" src="' +
        ICON_EVENT_CALENDAR +
        '" alt="" width="20" height="20" decoding="async" />' +
        "</span>" +
        '<span class="event-card__row-text">' +
        escapeHtml(timeText) +
        "</span>" +
        "</div>";
    }

    var logRaw = ev.number_log != null ? ev.number_log : ev.numberLog;
    var hasPrefetch =
      typeof prefetchedParticipantCount === "number" &&
      !isNaN(prefetchedParticipantCount);
    var showParticipantsRow =
      hasDisplayValue(logRaw) ||
      (Boolean(patchId) && typeof window.getEventParticipants === "function");
    var participantsInner = "";
    if (
      hasPrefetch &&
      Boolean(patchId) &&
      typeof window.getEventParticipants === "function"
    ) {
      participantsInner = prefetchedParticipantCount + " مشارك";
    } else if (hasDisplayValue(logRaw)) {
      var nLog = Number(logRaw);
      participantsInner =
        (!isNaN(nLog) ? String(nLog) : escapeHtml(String(logRaw))) + " مشارك";
    } else if (showParticipantsRow) {
      participantsInner = "0 مشارك";
    }
    var participantsRow = "";
    if (showParticipantsRow && participantsInner) {
      participantsRow =
        '<div class="event-card__row event-info-row event-card__row--participants">' +
        '<span class="event-card__row-icon-wrap" aria-hidden="true">' +
        '<img class="event-card__row-icon" src="' +
        ICON_EVENT_USERS +
        '" alt="" width="20" height="20" decoding="async" />' +
        "</span>" +
        '<span class="event-card__row-text event-participants-count">' +
        participantsInner +
        "</span>" +
        "</div>";
    }

    var gLine = genderLine(ev);
    var genderRow = "";
    if (gLine !== null) {
      genderRow =
        '<div class="event-card__row event-info-row">' +
        '<span class="event-card__row-icon-wrap" aria-hidden="true">' +
        '<img class="event-card__row-icon" src="' +
        ICON_EVENT_GENDER +
        '" alt="" width="20" height="20" decoding="async" />' +
        "</span>" +
        '<span class="event-card__row-text">' +
        escapeHtml(gLine) +
        "</span>" +
        "</div>";
    }

    var catRaw =
      ev.category_ar != null && String(ev.category_ar).trim() !== ""
        ? String(ev.category_ar).trim()
        : "";
    var categoryRow = "";
    if (hasDisplayValue(catRaw)) {
      categoryRow =
        '<div class="event-card__row event-info-row">' +
        '<span class="event-card__row-icon-wrap" aria-hidden="true">' +
        '<img class="event-card__row-icon" src="' +
        ICON_EVENT_CATEGORY +
        '" alt="" width="20" height="20" decoding="async" />' +
        "</span>" +
        '<span class="event-card__row-text">' +
        escapeHtml(catRaw) +
        "</span>" +
        "</div>";
    }

    var bikeRaw =
      ev.bike_company != null && String(ev.bike_company).trim() !== ""
        ? String(ev.bike_company).trim()
        : "";
    var bikeRow = "";
    if (hasDisplayValue(bikeRaw)) {
      bikeRow =
        '<div class="event-card__row event-info-row">' +
        '<span class="event-card__row-icon-wrap" aria-hidden="true">' +
        '<img class="event-card__row-icon" src="' +
        ICON_EVENT_BIKE +
        '" alt="" width="20" height="20" decoding="async" />' +
        "</span>" +
        '<span class="event-card__row-text">' +
        escapeHtml(bikeRaw) +
        "</span>" +
        "</div>";
    }

    var deleteBtn = "";
    if (patchId && isActive) {
      deleteBtn =
        '<button type="button" class="event-card__delete event-delete-btn" data-id="' +
        escapeHtml(patchId) +
        '" data-event-end="' +
        escapeHtml(patchId) +
        '" aria-label="إنهاء الفعالية">' +
        '<img src="' +
        ICON_EVENT_DISABLE +
        '" alt="" width="20" height="20" decoding="async" />' +
        "</button>";
    }

    var endLocRaw =
      ev.end_location != null && String(ev.end_location).trim() !== ""
        ? String(ev.end_location).trim()
        : ev.endLocation != null && String(ev.endLocation).trim() !== ""
          ? String(ev.endLocation).trim()
          : "";
    var staticMapUrl = getStaticMapUrl(endLocRaw);
    var mapImgHtml =
      staticMapUrl != null
        ? '<img class="event-card__map" src="' +
          escapeHtml(staticMapUrl) +
          '" alt="خريطة الفعالية" width="400" height="235" decoding="async" />'
        : '<img class="event-card__map" src="' +
          EVENT_MAP_ASSET +
          '" alt="" width="800" height="470" decoding="async" />';

    return (
      '<article class="event-card" data-index="' +
      index +
      '">' +
      '<div class="event-card__map-wrap event-map">' +
      mapImgHtml +
      "</div>" +
      '<div class="event-card__header event-header">' +
      badgeHtml +
      '<p class="event-card__title event-name">' +
      nameHtml +
      "</p>" +
      "</div>" +
      '<div class="event-card__info">' +
      timeRow +
      participantsRow +
      genderRow +
      categoryRow +
      bikeRow +
      "</div>" +
      deleteBtn +
      "</article>"
    );
  }

  function buildEventCard(ev, index, participantCount) {
    var html = buildEventCardHtml(ev, index, participantCount);
    var tpl = document.createElement("template");
    tpl.innerHTML = html.trim();
    var card = tpl.content.firstElementChild;
    if (!card) return null;

    var logRaw = ev.number_log != null ? ev.number_log : ev.numberLog;
    var partRow = card.querySelector(".event-card__row--participants");
    if (
      partRow &&
      typeof participantCount === "number" &&
      !isNaN(participantCount) &&
      participantCount === 0 &&
      !hasDisplayValue(logRaw)
    ) {
      partRow.remove();
    }

    var mapDiv = card.querySelector(".event-card__map-wrap");
    var endLocStr =
      ev.end_location != null && String(ev.end_location).trim() !== ""
        ? String(ev.end_location).trim()
        : ev.endLocation != null && String(ev.endLocation).trim() !== ""
          ? String(ev.endLocation).trim()
          : "";
    if (mapDiv && endLocStr) {
      mapDiv.style.cursor = "pointer";
      mapDiv.addEventListener("click", function () {
        var parts = endLocStr.split(",");
        var lat = parts[0] ? String(parts[0]).trim() : "";
        var lng = parts[1] ? String(parts[1]).trim() : "";
        if (!lat || !lng) return;
        window.open("https://www.google.com/maps?q=" + lat + "," + lng, "_blank");
      });
    }

    return card;
  }

  function bindEventDeleteButtons() {
    if (!eventsGrid) return;
    eventsGrid.querySelectorAll(".event-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var id =
          btn.getAttribute("data-id") || btn.getAttribute("data-event-end");
        if (!id || !window.updateRoadStartEnd) return;
        btn.disabled = true;
        try {
          var res = await window.updateRoadStartEnd(id, 2);
          if (res && res.ok) {
            await loadRoadEvents();
          }
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  /**
   * GET /road/:road_userId/3/getRoadUserId — عبر core/api.js (getRoadEvents).
   */
  async function loadRoadEvents() {
    if (!eventsGrid) return;

    var uidStored =
      window.safeLocalStorage && window.safeLocalStorage.getItem("user_id");
    var uid =
      uidStored != null && String(uidStored).trim() !== ""
        ? Number(String(uidStored).trim())
        : NaN;
    var grid = document.getElementById("events-grid");
    var empty = document.getElementById("events-empty");

    if (!uid || isNaN(uid)) {
      if (eventsCountEl) eventsCountEl.textContent = "0";
      eventsGrid.innerHTML =
        '<p class="events-grid__empty" dir="rtl">لا توجد فعاليات بعد</p>';
      return;
    }

    if (!window.getRoadEvents) {
      if (eventsCountEl) eventsCountEl.textContent = "0";
      eventsGrid.innerHTML =
        '<p class="events-grid__empty" dir="rtl">لا توجد فعاليات بعد</p>';
      return;
    }

    if (!grid) return;

    if (typeof window.showSkeleton === "function") {
      window.showSkeleton("events-grid", 3, "event");
    }
    if (empty) empty.hidden = true;

    var result;
    try {
      result = await window.getRoadEvents(uid);
    } catch (e) {
      console.warn("loadRoadEvents fetch failed", e);
      grid.innerHTML = "";
      if (eventsCountEl) eventsCountEl.textContent = "0";
      if (empty) empty.hidden = false;
      else {
        grid.innerHTML =
          '<p class="events-grid__empty" dir="rtl">لا توجد فعاليات بعد</p>';
      }
      return;
    }

    var events = Array.isArray(result)
      ? result
      : result && Array.isArray(result.body)
        ? result.body
        : result && Array.isArray(result.data)
          ? result.data
          : [];

    if (!events.length && result && result.body != null) {
      events = normalizeRoadEventsList(result.body);
    }

    events.sort(function (a, b) {
      var ase = a.start_end != null ? a.start_end : a.startEnd;
      var bse = b.start_end != null ? b.start_end : b.startEnd;
      if (ase === 0 && bse !== 0) return -1;
      if (ase !== 0 && bse === 0) return 1;
      var aid =
        Number(a.userId != null ? a.userId : a.user_id != null ? a.user_id : 0) ||
        0;
      var bid =
        Number(b.userId != null ? b.userId : b.user_id != null ? b.user_id : 0) ||
        0;
      return bid - aid;
    });

    var participantCounts = await Promise.all(
      events.map(function (event) {
        var pid = roadEventPatchId(event);
        if (!pid || !window.getEventParticipants) {
          return Promise.resolve(0);
        }
        return window
          .getEventParticipants(pid)
          .then(function (list) {
            return Array.isArray(list) ? list.length : 0;
          })
          .catch(function () {
            return 0;
          });
      })
    );

    if (eventsCountEl) eventsCountEl.textContent = String(events.length);

    grid.innerHTML = "";

    if (events.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    var fragment = document.createDocumentFragment();
    for (var i = 0; i < events.length; i++) {
      var card = buildEventCard(events[i], i, participantCounts[i]);
      if (card) fragment.appendChild(card);
    }
    grid.appendChild(fragment);

    bindEventDeleteButtons();
  }

  function buildProductCard(product, index) {
    if (!product || typeof product !== "object") return null;
    var div = document.createElement("div");
    div.className = "product-card";
    var pid = productRecordId(product);
    if (pid != null && String(pid).trim() !== "") {
      div.setAttribute("data-id", String(pid).trim());
    }
    div.setAttribute("data-index", String(index));

    var img1 = product.image_1 || product.image_2 || product.image_3 || "";
    var mainImg =
      typeof window.resolveImageUrl === "function"
        ? window.resolveImageUrl(img1 != null ? String(img1) : "")
        : String(img1 || "").trim();

    var thumbsHtml = "";
    [product.image_1, product.image_2, product.image_3].forEach(function (img) {
      if (img == null || String(img).trim() === "") return;
      var url =
        typeof window.resolveImageUrl === "function"
          ? window.resolveImageUrl(String(img).trim())
          : String(img).trim();
      if (!url) return;
      thumbsHtml +=
        '<div class="product-card__thumb"><img src="' +
        escapeHtml(url) +
        '" alt="" loading="lazy" decoding="async" /></div>';
    });

    var nameSafe = escapeHtml(product.name != null ? String(product.name) : "");
    var descRaw = product.description != null ? String(product.description).trim() : "";
    var descSafe = descRaw ? escapeHtml(descRaw) : "";
    var priceSafe = escapeHtml(
      product.price != null && product.price !== "" ? String(product.price) : ""
    );
    var pidStr =
      pid != null && String(pid).trim() !== "" ? escapeHtml(String(pid).trim()) : "";

    var heroInner = mainImg
      ? '<img src="' +
        escapeHtml(mainImg) +
        '" alt="' +
        nameSafe +
        '" loading="lazy" decoding="async" />'
      : '<div class="product-card__no-img" aria-hidden="true"></div>';

    div.innerHTML =
      '<div class="product-card__media">' +
      '<div class="product-card__hero">' +
      heroInner +
      "</div>" +
      (thumbsHtml ? '<div class="product-card__thumbs">' + thumbsHtml + "</div>" : "") +
      "</div>" +
      '<div class="product-card__body">' +
      '<div class="product-card__divider" role="presentation"></div>' +
      '<div class="product-card__text">' +
      '<p class="product-card__name">' +
      nameSafe +
      "</p>" +
      (descSafe ? '<p class="product-card__desc">' + descSafe + "</p>" : "") +
      "</div>" +
      '<div class="product-card__footer">' +
      '<div class="product-card__price">' +
      "<strong class=\"product-card__amount\">" +
      priceSafe +
      "</strong>" +
      '<span class="product-card__currency" aria-hidden="true">\ufdfc</span>' +
      "</div>" +
      '<div class="product-card__actions">' +
      '<button type="button" class="product-card__action product-card__action--danger product-delete-btn" data-id="' +
      pidStr +
      '" title="حذف">' +
      '<img src="../../assets/images/profile-sidebar/icon-trash.svg" alt="" width="24" height="24" decoding="async" />' +
      "</button>" +
      '<button type="button" class="product-card__action product-card__action--neutral product-edit-btn" data-id="' +
      pidStr +
      '" title="تعديل" aria-label="تعديل">' +
      '<img src="../../assets/images/profile-sidebar/icon-edit-product.svg" alt="" width="20" height="20" decoding="async" />' +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>";

    return div;
  }

  function bindProductEditButtons() {
    var gridEl = document.getElementById("products-grid");
    if (!gridEl) return;
    gridEl.querySelectorAll(".product-edit-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var productId = btn.getAttribute("data-id");
        var p = findCachedProduct(productId);
        if (p && typeof openProductModalForEdit === "function") {
          openProductModalForEdit(p);
        }
      });
    });
  }

  function bindProductDeleteButtons() {
    var gridEl = document.getElementById("products-grid");
    if (!gridEl) return;
    gridEl.querySelectorAll(".product-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        if (!window.deleteProduct) return;

        var productId = btn.getAttribute("data-id");
        if (productId == null || String(productId).trim() === "") {
          console.warn(
            "[products] لا يوجد معرف منتج على البطاقة؛ تأكدي أن getCompanyProduct يُرجع id أو user_id (معرف المنتج) أو product_id لكل صف."
          );
          return;
        }

        btn.disabled = true;
        btn.style.opacity = "0.5";

        try {
          var result = await window.deleteProduct(String(productId).trim());
          var ok =
            result &&
            (result.success === true ||
              (result.ok === true && result.success !== false) ||
              result.deleted === true ||
              result.deleted === 1);
          if (ok) {
            await loadProducts();
          } else {
            btn.disabled = false;
            btn.style.opacity = "1";
            var errText =
              result &&
              (result.message ||
                result.error ||
                result.detail ||
                (result.status ? "رمز الاستجابة: " + result.status : ""));
            console.warn("[products] فشل الحذف:", errText || result);
          }
        } catch (err) {
          btn.disabled = false;
          btn.style.opacity = "1";
          console.warn("[products] تعذّر حذف المنتج:", err);
        }
      });
    });
  }

  async function loadProducts() {
    var companyIdStored =
      window.safeLocalStorage && window.safeLocalStorage.getItem("user_id");
    if (
      (companyIdStored == null || String(companyIdStored).trim() === "") &&
      typeof localStorage !== "undefined"
    ) {
      try {
        companyIdStored = localStorage.getItem("user_id");
      } catch (err) {
        companyIdStored = null;
      }
    }
    var companyId =
      companyIdStored != null && String(companyIdStored).trim() !== ""
        ? Number(String(companyIdStored).trim())
        : NaN;
    var gridEl = document.getElementById("products-grid");
    var countEl = document.getElementById("products-count");
    var empty = document.getElementById("products-empty");

    if (!gridEl) return;

    if (!companyId || isNaN(companyId)) {
      productsCache = [];
      if (countEl) countEl.textContent = "0";
      gridEl.innerHTML =
        '<p class="products-grid__empty" dir="rtl">لا توجد منتجات بعد</p>';
      return;
    }

    if (!window.getCompanyProducts) {
      productsCache = [];
      if (countEl) countEl.textContent = "0";
      gridEl.innerHTML =
        '<p class="products-grid__empty" dir="rtl">لا توجد منتجات بعد</p>';
      return;
    }

    if (typeof window.showSkeleton === "function") {
      window.showSkeleton("products-grid", 6, "product");
    }

    var result;
    try {
      result = await window.getCompanyProducts(companyId);
    } catch (e) {
      console.warn("loadProducts failed", e);
      result = [];
    }

    var products = normalizeProductsFromApi(result);
    productsCache = products.slice();

    if (countEl) countEl.textContent = String(products.length);
    gridEl.innerHTML = "";

    if (products.length === 0) {
      if (empty) empty.hidden = false;
      else {
        gridEl.innerHTML =
          '<p class="products-grid__empty" dir="rtl">لا توجد منتجات بعد</p>';
      }
      return;
    }

    if (empty) empty.hidden = true;

    var fragment = document.createDocumentFragment();
    products.forEach(function (product, idx) {
      var card = buildProductCard(product, idx);
      if (card) fragment.appendChild(card);
    });
    gridEl.appendChild(fragment);
    bindProductDeleteButtons();
    bindProductEditButtons();
  }

  window.loadRoadEvents = loadRoadEvents;
  window.loadEvents = loadRoadEvents;
  window.loadProducts = loadProducts;

  function bindCreateEventModal() {
    if (createEventModalInitialized) return;
    var modal = document.getElementById("create-event-modal");
    var form = document.getElementById("create-event-form");
    if (!modal || !form) return;
    createEventModalInitialized = true;

    var feedback = document.getElementById("create-event-feedback");

    function showFeedback(msg) {
      if (!feedback) return;
      feedback.textContent = msg || "";
      if (msg) feedback.removeAttribute("hidden");
      else feedback.setAttribute("hidden", "");
    }

    function openModal() {
      showFeedback("");
      form.reset();
      modal.classList.add("is-open");
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      var first = document.getElementById("create-event-end-street");
      if (first) first.focus();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }

    modal.querySelectorAll("[data-create-event-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        closeModal();
      });
    });

    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Escape") return;
        if (!modal.classList.contains("is-open")) return;
        closeModal();
        e.preventDefault();
        e.stopPropagation();
      },
      true
    );

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      showFeedback("");

      var endStreetEl = document.getElementById("create-event-end-street");
      var endLocEl = document.getElementById("create-event-end-location");
      var endStreet = endStreetEl ? endStreetEl.value.trim() : "";
      var endLoc = endLocEl ? endLocEl.value.trim() : "";
      if (!endStreet || !endLoc) {
        showFeedback("يرجى تعبئة اسم الشارع وموقع النهاية.");
        return;
      }

      var uid = window.safeLocalStorage
        ? window.safeLocalStorage.getItem("user_id")
        : null;
      if (!uid || !String(uid).trim()) {
        showFeedback("جلسة غير صالحة. سجّل الدخول مجدداً.");
        return;
      }

      if (!lastCompany || typeof lastCompany !== "object") {
        showFeedback("تعذر تحميل بيانات الشركة. حدّث الصفحة.");
        return;
      }

      var nameRaw =
        lastCompany.name != null ? String(lastCompany.name).trim() : "";
      var imgRaw =
        lastCompany.image != null ? String(lastCompany.image).trim() : "";
      var imgForApi = imgRaw ? window.resolveImageUrl(imgRaw) : "";

      function numOrUndef(el) {
        if (!el || !el.value || !String(el.value).trim()) return undefined;
        var n = Number(el.value);
        return isNaN(n) ? undefined : n;
      }

      function strOrUndef(el) {
        if (!el || !el.value || !String(el.value).trim()) return undefined;
        return String(el.value).trim();
      }

      var payload = {
        road_userId: String(uid).trim(),
        road_user_name: nameRaw,
        road_user_image: imgForApi,
        type: 3,
        end_location: endLoc,
        end_street: endStreet,
        start_end: 0,
      };

      var endTimeInput = document.getElementById("create-event-end-time");
      if (endTimeInput && endTimeInput.value) {
        var dt = new Date(endTimeInput.value);
        if (!isNaN(dt.getTime())) payload.end_time = dt.toISOString();
      }

      var pl = numOrUndef(document.getElementById("create-event-path-length"));
      if (pl !== undefined) payload.path_length = pl;
      var sc = numOrUndef(document.getElementById("create-event-start-capacity"));
      if (sc !== undefined) payload.start_capacity = sc;
      var ecap = numOrUndef(
        document.getElementById("create-event-end-capacity")
      );
      if (ecap !== undefined) payload.end_capacity = ecap;
      var nl = numOrUndef(document.getElementById("create-event-number-log"));
      if (nl !== undefined) payload.number_log = nl;

      var sa = strOrUndef(document.getElementById("create-event-set-ar"));
      if (sa !== undefined) payload.set_ar = sa;
      var se = strOrUndef(document.getElementById("create-event-set-en"));
      if (se !== undefined) payload.set_en = se;
      var ca = strOrUndef(document.getElementById("create-event-category-ar"));
      if (ca !== undefined) payload.category_ar = ca;
      var ce = strOrUndef(document.getElementById("create-event-category-en"));
      if (ce !== undefined) payload.category_en = ce;
      var bike = strOrUndef(document.getElementById("create-event-bike-company"));
      if (bike !== undefined) payload.bike_company = bike;

      var genderEl = document.getElementById("create-event-gender");
      if (genderEl && genderEl.value === "1") payload.gender = 1;
      else if (genderEl && genderEl.value === "2") payload.gender = 2;
      else payload.gender = null;

      if (!window.sendRoadEvent) {
        showFeedback("تعذر الإرسال: واجهة غير متوفرة.");
        return;
      }

      var submitBtn = form.querySelector(".edit-company-modal__submit");
      if (submitBtn) submitBtn.disabled = true;
      try {
        var result = await window.sendRoadEvent(payload);
        var body = result.body;
        if (body && typeof body === "object" && body.networkError === true) {
          showFeedback(
            "تعذر الاتصال بالسيرفر. تحققي من الشبكة أو حاول لاحقاً."
          );
          return;
        }
        if (result.ok) {
          var failed =
            body &&
            typeof body === "object" &&
            !Array.isArray(body) &&
            (body.success === false || body.error);
          if (!failed) {
            closeModal();
            await loadRoadEvents();
          } else {
            var errMsg = body.message || body.error || body.detail;
            showFeedback(errMsg ? String(errMsg) : "تعذر إنشاء الفعالية.");
          }
        } else {
          var errMsg2 =
            body && typeof body === "object" && !Array.isArray(body)
              ? body.message || body.error || body.detail
              : null;
          showFeedback(
            errMsg2 ? String(errMsg2) : "تعذر إنشاء الفعالية."
          );
        }
      } catch (err) {
        showFeedback("تعذر إنشاء الفعالية. حاول مرة أخرى.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function bindSidebarCollapse() {
    if (!collapseBtn || !sidebar) return;
    collapseBtn.addEventListener("click", function () {
      if (mqMobileNav.matches) return;
      var collapsed = sidebar.classList.toggle("profile-sidebar--collapsed");
      collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  function setMobileNavOpen(open) {
    if (!sidebar) return;
    sidebar.classList.toggle("profile-sidebar--mobile-open", open);
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.toggle("is-visible", open);
      sidebarBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (mobilePeek) mobilePeek.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  function bindMobileNav() {
    if (!sidebar) return;

    function onPeekClick() {
      if (!mqMobileNav.matches) return;
      var open = !sidebar.classList.contains("profile-sidebar--mobile-open");
      setMobileNavOpen(open);
    }

    if (mobilePeek) mobilePeek.addEventListener("click", onPeekClick);
    if (mobileClose) mobileClose.addEventListener("click", closeMobileNav);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileNav);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mqMobileNav.matches && sidebar.classList.contains("profile-sidebar--mobile-open")) {
        closeMobileNav();
      }
    });

    var nav = document.getElementById("profile-sidebar-nav");
    if (nav) {
      nav.addEventListener("click", function (e) {
        if (!mqMobileNav.matches) return;
        var a = e.target.closest("a");
        if (a && a.getAttribute("href") && a.getAttribute("href") !== "#") closeMobileNav();
      });
    }

    mqMobileNav.addEventListener("change", function () {
      if (!mqMobileNav.matches) closeMobileNav();
    });
  }

  function bindAddProductModal() {
    if (addProductModalInitialized) return;
    var modal = document.getElementById("add-product-modal");
    var form = document.getElementById("add-product-form");
    if (!modal || !form) return;
    addProductModalInitialized = true;

    var feedback = document.getElementById("add-product-feedback");
    var previewUrls = [null, null, null];
    var editIdInput = document.getElementById("add-product-edit-id");
    var modalTitleEl = document.getElementById("add-product-title");
    var submitBtnEl = form.querySelector('button[type="submit"]');

    function showFeedback(msg) {
      if (!feedback) return;
      feedback.textContent = msg || "";
      if (msg) feedback.removeAttribute("hidden");
      else feedback.setAttribute("hidden", "");
    }

    function clearSlotPreview(index) {
      var label = form.querySelector('[data-product-slot="' + index + '"]');
      if (!label) return;
      var prev = label.querySelector(".add-product-modal__slot-preview");
      var input = label.querySelector(".add-product-modal__file");
      if (previewUrls[index]) {
        URL.revokeObjectURL(previewUrls[index]);
        previewUrls[index] = null;
      }
      if (prev) {
        prev.removeAttribute("src");
        prev.setAttribute("hidden", "");
      }
      if (input) input.value = "";
      label.classList.remove("add-product-modal__slot--has-file");
    }

    function resetForm() {
      form.reset();
      if (editIdInput) editIdInput.value = "";
      if (modalTitleEl) modalTitleEl.textContent = "إضافة منتج";
      if (submitBtnEl) submitBtnEl.textContent = "نشر المنتج";
      for (var i = 0; i < 3; i++) clearSlotPreview(i);
      showFeedback("");
    }

    function setSlotFile(index, file) {
      var label = form.querySelector('[data-product-slot="' + index + '"]');
      if (!label || !file || String(file.type).indexOf("image") !== 0) return;
      var prev = label.querySelector(".add-product-modal__slot-preview");
      if (previewUrls[index]) {
        URL.revokeObjectURL(previewUrls[index]);
      }
      var url = URL.createObjectURL(file);
      previewUrls[index] = url;
      if (prev) {
        prev.src = url;
        prev.removeAttribute("hidden");
      }
      label.classList.add("add-product-modal__slot--has-file");
    }

    function openModal() {
      resetForm();
      modal.classList.add("is-open");
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      var nameInput = document.getElementById("add-product-name");
      if (nameInput) nameInput.focus();
    }

    function openEditModal(product) {
      if (!product || typeof product !== "object") return;
      resetForm();
      var pid = productRecordId(product);
      if (pid == null || String(pid).trim() === "") return;
      if (editIdInput) editIdInput.value = String(pid).trim();
      if (modalTitleEl) modalTitleEl.textContent = "تعديل منتج";
      if (submitBtnEl) submitBtnEl.textContent = "حفظ التعديلات";

      var nameInput = document.getElementById("add-product-name");
      var priceInput = document.getElementById("add-product-price");
      var descInput = document.getElementById("add-product-desc");
      var qtySelect = document.getElementById("add-product-qty");
      if (nameInput) nameInput.value = product.name != null ? String(product.name) : "";
      if (priceInput) priceInput.value = product.price != null ? String(product.price) : "";
      if (descInput) {
        descInput.value = product.description != null ? String(product.description) : "";
      }

      var qRaw =
        product.quantity != null
          ? String(product.quantity).trim()
          : product.qty != null
            ? String(product.qty).trim()
            : "";
      if (qtySelect && qRaw) {
        var esc = qRaw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        if (!qtySelect.querySelector('option[value="' + esc + '"]')) {
          var optNew = document.createElement("option");
          optNew.value = qRaw;
          optNew.textContent = qRaw;
          qtySelect.appendChild(optNew);
        }
        qtySelect.value = qRaw;
      }

      for (var si = 0; si < 3; si++) {
        var key = "image_" + (si + 1);
        var rawImg = product[key];
        if (rawImg == null || String(rawImg).trim() === "") continue;
        var imgUrl =
          typeof window.resolveImageUrl === "function"
            ? window.resolveImageUrl(String(rawImg).trim())
            : String(rawImg).trim();
        if (!imgUrl) continue;
        var label = form.querySelector('[data-product-slot="' + si + '"]');
        if (!label) continue;
        var prevImg = label.querySelector(".add-product-modal__slot-preview");
        if (prevImg) {
          prevImg.src = imgUrl;
          prevImg.removeAttribute("hidden");
        }
        label.classList.add("add-product-modal__slot--has-file");
      }

      modal.classList.add("is-open");
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      if (nameInput) nameInput.focus();
    }

    openProductModalForEdit = function (p) {
      openEditModal(p);
    };

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }

    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest(".btn-add-product");
        if (!btn) return;
        e.preventDefault();
        openModal();
      },
      false
    );

    modal.querySelectorAll("[data-add-product-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        closeModal();
      });
    });

    form.querySelectorAll(".add-product-modal__file").forEach(function (input) {
      input.addEventListener("change", function () {
        var label = input.closest(".add-product-modal__slot");
        var idx = label ? label.getAttribute("data-product-slot") : null;
        if (idx == null) return;
        var i = parseInt(idx, 10);
        var file = input.files && input.files[0];
        if (file) setSlotFile(i, file);
        else clearSlotPreview(i);
      });
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var submitBtn = form.querySelector('[type="submit"]');
      showFeedback("");

      if (typeof window.showPageLoader === "function") {
        window.showPageLoader();
      }
      if (submitBtn) submitBtn.disabled = true;

      try {
        var editingId = editIdInput && editIdInput.value.trim();

        var nameEl = document.getElementById("add-product-name");
        var priceEl = document.getElementById("add-product-price");
        var descEl = document.getElementById("add-product-desc");
        var qtyEl = document.getElementById("add-product-qty");

        var companyIdStr =
          window.safeLocalStorage && window.safeLocalStorage.getItem("user_id");
        if (
          (companyIdStr == null || String(companyIdStr).trim() === "") &&
          typeof localStorage !== "undefined"
        ) {
          try {
            companyIdStr = localStorage.getItem("user_id");
          } catch (err) {
            companyIdStr = null;
          }
        }
        if (companyIdStr == null || String(companyIdStr).trim() === "") {
          showFeedback("تعذّر تحديد معرف الشركة. سجّلي الدخول ثم أعيدي المحاولة.");
          return;
        }

        if (!editingId) {
          var hasImage = false;
          for (var sj = 0; sj < 3; sj++) {
            var inpChk = document.getElementById("add-product-image-" + sj);
            if (inpChk && inpChk.files && inpChk.files[0]) {
              hasImage = true;
              break;
            }
          }
          if (!hasImage) {
            showFeedback("أضيفي صورة واحدة على الأقل للمنتج (الباكند يرفض الطلب بدون صور).");
            return;
          }
        }

        var formData = new FormData();
        formData.append("company_id", String(companyIdStr).trim());
        formData.append("name", nameEl ? nameEl.value.trim() : "");
        formData.append("price", priceEl ? priceEl.value.trim() : "");
        formData.append(
          "description",
          descEl ? descEl.value.trim() : ""
        );
        if (qtyEl && qtyEl.value != null && String(qtyEl.value).trim() !== "") {
          formData.append("quantity", String(qtyEl.value).trim());
        }

        for (var si = 0; si < 3; si++) {
          var inp = document.getElementById("add-product-image-" + si);
          var file = inp && inp.files && inp.files[0];
          if (file) formData.append("image_" + (si + 1), file);
        }

        var result;
        if (editingId) {
          formData.append("product_id", editingId);
          if (!window.updateProduct) {
            showFeedback("تعذّر التحديث: واجهة غير متوفرة.");
            return;
          }
          result = await window.updateProduct(editingId, formData);
        } else {
          if (!window.sendProduct) {
            showFeedback("تعذّر الإرسال: واجهة غير متوفرة.");
            return;
          }
          result = await window.sendProduct(formData);
        }

        var ok =
          result &&
          (result.success === true ||
            result.ok === true ||
            (result.body &&
              typeof result.body === "object" &&
              result.body.success === true));

        if (ok) {
          closeModal();
          await loadProducts();
        } else {
          var errMsg =
            result &&
            typeof result === "object" &&
            !Array.isArray(result) &&
            (result.message || result.error || result.detail);
          var statusHint =
            result && result.status != null ? " (رمز " + result.status + ")" : "";
          showFeedback(
            (errMsg ? String(errMsg) : "حدث خطأ، حاول مرة أخرى") + statusHint
          );
        }
      } catch (err) {
        showFeedback("حدث خطأ، حاول مرة أخرى.");
      } finally {
        if (typeof window.hidePageLoader === "function") {
          window.hidePageLoader();
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Escape") return;
        if (!modal.classList.contains("is-open")) return;
        closeModal();
        e.preventDefault();
        e.stopPropagation();
      },
      true
    );
  }

  function bindEditCompanyModal() {
    if (editCompanyModalInitialized) return;
    var modal = document.getElementById("edit-company-modal");
    var form = document.getElementById("edit-company-form");
    if (!modal || !form) return;
    editCompanyModalInitialized = true;

    var nameInput = document.getElementById("edit-company-name");
    var phoneInput = document.getElementById("edit-company-phone");
    var websiteInput = document.getElementById("edit-company-website");
    var logoInput = document.getElementById("edit-company-logo");
    var preview = document.getElementById("edit-company-logo-preview");
    var placeholder = document.getElementById("edit-company-logo-placeholder");
    var feedback = document.getElementById("edit-company-feedback");
    var dropzone = modal.querySelector("[data-edit-company-dropzone]");
    var hint = form.querySelector("[data-upload-hint]");

    function normalizeCompanyPhoneDigits(raw) {
      var d = (raw || "").replace(/\D/g, "");
      if (d.indexOf("966") === 0 && d.length > 9) {
        d = d.slice(3);
      }
      d = d.replace(/^0+/, "");
      return d.slice(0, 9);
    }

    function websiteHostFromCompanyUrl(urlRaw) {
      var s = (urlRaw || "").trim();
      if (!s) return "";
      s = s.replace(/^https?:\/\//i, "");
      var slash = s.indexOf("/");
      if (slash !== -1) s = s.slice(0, slash);
      return s.trim();
    }

    function showModalFeedback(msg) {
      if (!feedback) return;
      feedback.textContent = msg || "";
      if (msg) feedback.removeAttribute("hidden");
      else feedback.setAttribute("hidden", "");
    }

    function setFieldError(field, message) {
      var container = field ? field.closest(".field-stack, .input-text, .file-upload") : null;
      if (container) {
        container.classList.toggle("has-error", Boolean(message));
      }
      if (!container) return;
      var existing = container.querySelector(".field-error-message");
      if (!existing) {
        existing = document.createElement("p");
        existing.className = "field-error-message";
        container.appendChild(existing);
      }
      existing.textContent = message || "";
      existing.style.display = message ? "block" : "none";
    }

    function clearFormErrors() {
      form.querySelectorAll(".has-error").forEach(function (el) {
        el.classList.remove("has-error");
      });
      form.querySelectorAll(".field-error-message").forEach(function (el) {
        el.textContent = "";
        el.style.display = "none";
      });
    }

    function setLogoPreviewFromUrl(url, companyName) {
      if (!preview || !placeholder) return;
      var abs =
        url && String(url).trim()
          ? window.resolveImageUrl(String(url).trim())
          : "";
      if (logoInput) logoInput.value = "";
      if (hint && hint.dataset.originalHint !== undefined) {
        hint.textContent = hint.dataset.originalHint;
      }
      if (abs) {
        preview.onerror = function () {
          preview.onerror = null;
          preview.src =
            "https://ui-avatars.com/api/?name=" +
            encodeURIComponent(companyName || "Company") +
            "&background=E1902B&color=fff&size=64&font-size=0.4";
        };
        preview.src = abs;
        preview.removeAttribute("hidden");
        placeholder.setAttribute("hidden", "");
      } else {
        preview.removeAttribute("src");
        preview.setAttribute("hidden", "");
        placeholder.removeAttribute("hidden");
      }
    }

    async function refetchCompanyProfile() {
      var deviceUid = window.safeLocalStorage
        ? window.safeLocalStorage.getItem("device_uid")
        : null;
      if (!deviceUid) return;
      var result = await window.getCompanyDevice(deviceUid);
      var body = result.body;
      var list = window.normalizeCompanyList
        ? window.normalizeCompanyList(body)
        : null;
      if (result.ok && hasCompanyData(list)) {
        populateCompany(list);
      }
    }

    function companySnapshotForModal() {
      if (lastCompany && typeof lastCompany === "object") {
        return lastCompany;
      }
      var nameEl = document.getElementById("company-name");
      var phoneEl = document.getElementById("company-phone");
      var urlEl = document.getElementById("company-url");
      var avatarEl = document.getElementById("company-avatar");
      var nameText = nameEl ? (nameEl.textContent || "").trim() : "";
      if (nameText === "—") nameText = "";
      var phoneText = phoneEl ? (phoneEl.textContent || "").trim() : "";
      if (phoneText === "—") phoneText = "";
      var urlRaw = "";
      if (urlEl) {
        var href = urlEl.getAttribute("href");
        if (href && href !== "#") urlRaw = href;
        else urlRaw = (urlEl.textContent || "").trim();
        if (urlRaw === "لا يوجد") urlRaw = "";
      }
      var imageRaw = "";
      if (avatarEl && avatarEl.getAttribute("src")) {
        imageRaw = avatarEl.getAttribute("src");
      }
      return {
        name: nameText,
        number: phoneText,
        url: urlRaw,
        image: imageRaw,
      };
    }

    function openModal() {
      var company = companySnapshotForModal();
      clearFormErrors();
      showModalFeedback("");
      if (nameInput) {
        nameInput.value = company.name != null ? String(company.name) : "";
      }
      if (phoneInput) {
        phoneInput.value = normalizeCompanyPhoneDigits(
          company.number != null ? String(company.number) : ""
        );
      }
      if (websiteInput) {
        websiteInput.value = websiteHostFromCompanyUrl(
          company.url != null ? String(company.url) : ""
        );
      }
      setLogoPreviewFromUrl(
        company.image,
        company.name != null ? String(company.name) : ""
      );
      modal.classList.add("is-open");
      modal.removeAttribute("hidden");
      modal.setAttribute("aria-hidden", "false");
      if (nameInput) nameInput.focus();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("hidden", "");
      modal.setAttribute("aria-hidden", "true");
    }

    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest(".company-row__edit");
        if (!btn) return;
        e.preventDefault();
        openModal();
      },
      false
    );

    modal.querySelectorAll("[data-edit-company-close]").forEach(function (el) {
      el.addEventListener("click", function () {
        closeModal();
      });
    });

    document.addEventListener(
      "keydown",
      function (e) {
        if (e.key !== "Escape") return;
        if (!modal.classList.contains("is-open")) return;
        closeModal();
        e.preventDefault();
        e.stopPropagation();
      },
      true
    );

    if (phoneInput) {
      phoneInput.addEventListener("input", function () {
        var next = normalizeCompanyPhoneDigits(phoneInput.value);
        if (next !== phoneInput.value) phoneInput.value = next;
      });
      phoneInput.addEventListener("paste", function (event) {
        event.preventDefault();
        var text = (event.clipboardData || {}).getData("text") || "";
        phoneInput.value = normalizeCompanyPhoneDigits(text);
      });
    }

    if (hint && hint.dataset.originalHint === undefined) {
      hint.dataset.originalHint = (hint.textContent || "").trim();
    }

    if (logoInput && preview && placeholder) {
      logoInput.addEventListener("change", function () {
        var file = logoInput.files && logoInput.files[0];
        if (file) {
          var url = URL.createObjectURL(file);
          preview.onerror = null;
          preview.src = url;
          preview.removeAttribute("hidden");
          placeholder.setAttribute("hidden", "");
        }
      });
    }

    if (dropzone && logoInput) {
      ["dragenter", "dragover"].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      dropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var dt = e.dataTransfer;
        if (!dt || !dt.files || !dt.files.length) return;
        var file = dt.files[0];
        var buf = new DataTransfer();
        buf.items.add(file);
        logoInput.files = buf.files;
        logoInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      clearFormErrors();
      showModalFeedback("");
      var companyName = nameInput ? nameInput.value.trim() : "";
      var phoneDigits = phoneInput ? normalizeCompanyPhoneDigits(phoneInput.value) : "";
      var websiteHost = websiteInput ? websiteInput.value.trim() : "";
      var hasError = false;

      if (!companyName) {
        setFieldError(nameInput, "يرجى إدخال اسم الشركة.");
        hasError = true;
      }
      if (!phoneDigits) {
        setFieldError(phoneInput, "يرجى إدخال رقم الجوال.");
        hasError = true;
      } else if (phoneDigits.length !== 9) {
        setFieldError(
          phoneInput,
          "رقم الجوال يجب أن يكون 9 أرقام (بدون 0 أو +966)."
        );
        hasError = true;
      }
      if (hasError) return;

      var deviceUid = window.safeLocalStorage
        ? window.safeLocalStorage.getItem("device_uid")
        : null;
      if (!deviceUid) {
        showModalFeedback("جلسة غير صالحة. سجّل الدخول مجدداً.");
        return;
      }

      if (!window.updateCompany) {
        showModalFeedback("تعذر الحفظ: واجهة التحديث غير متوفرة.");
        return;
      }

      if (!lastCompany || typeof lastCompany !== "object") {
        showModalFeedback("تعذر التحقق من بيانات الشركة. حدّثي الصفحة وحاولي مجدداً.");
        return;
      }

      var storedUid = window.safeLocalStorage
        ? window.safeLocalStorage.getItem("user_id")
        : null;
      var userIdForUpdate =
        storedUid && String(storedUid).trim()
          ? String(storedUid).trim()
          : lastCompany.user_id != null && String(lastCompany.user_id).trim() !== ""
            ? String(lastCompany.user_id).trim()
            : "";
      if (!userIdForUpdate) {
        showModalFeedback("رقم المستخدم غير متوفر. سجّل الدخول مجدداً.");
        return;
      }

      var submitBtn = form.querySelector(".edit-company-modal__submit");
      if (submitBtn) submitBtn.disabled = true;
      try {
        var urlForApi = websiteHost;
        if (!urlForApi && lastCompany.url != null) {
          urlForApi = websiteHostFromCompanyUrl(String(lastCompany.url));
        }

        var oldImageRaw =
          lastCompany.image != null ? String(lastCompany.image).trim() : "";

        var fd = new FormData();
        fd.append("name", companyName);
        fd.append("number", phoneDigits);
        fd.append("url", urlForApi || "");
        fd.append("oldImage", oldImageRaw);

        if (logoInput && logoInput.files && logoInput.files[0]) {
          fd.append("image", logoInput.files[0]);
        }

        var result = await window.updateCompany(userIdForUpdate, fd);
        var body = result.body;
        if (body && typeof body === "object" && body.networkError === true) {
          showModalFeedback(
            "تعذر الاتصال بالسيرفر لحفظ التغييرات. تحققي من ngrok والشبكة أو إعدادات CORS للطلب PATCH."
          );
        } else if (result.ok) {
          var failed =
            body &&
            typeof body === "object" &&
            !Array.isArray(body) &&
            (body.success === false || body.error);
          if (!failed) {
            closeModal();
            await refetchCompanyProfile();
          } else {
            var errMsg = body.message || body.error || body.detail;
            showModalFeedback(errMsg || "تعذر حفظ التغييرات.");
          }
        } else {
          var errMsg2 =
            body && typeof body === "object" && !Array.isArray(body)
              ? body.message || body.error || body.detail
              : null;
          showModalFeedback(errMsg2 || "تعذر حفظ التغييرات. تحقق من الاتصال أو حاول لاحقاً.");
        }
      } catch (err) {
        showModalFeedback("تعذر حفظ التغييرات. حاول مرة أخرى.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (typeof window.showPageLoader === "function") {
      window.showPageLoader();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible") return;
      var co =
        window.currentCompany && typeof window.currentCompany === "object"
          ? window.currentCompany
          : lastCompany;
      var categoryEn = co && co.category_en != null ? String(co.category_en).trim().toLowerCase() : "";
      var categoryAr = co && co.category_ar != null ? String(co.category_ar).trim() : "";
      if (categoryEn === "events" || categoryAr === "فعاليات") {
        loadRoadEvents();
        return;
      }
      if (categoryEn === "products" || categoryAr === "منتجات") {
        loadProducts();
        return;
      }
      if (companyIsEventsCategory(co)) {
        loadRoadEvents();
      }
    });

    bindEditCompanyModal();
    bindCreateEventModal();
    bindAddProductModal();
    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        const user_id = window.safeLocalStorage.getItem("user_id");
        await window.updateDevice(user_id, "0");
        window.safeLocalStorage.removeItem("user_id");
        window.safeLocalStorage.removeItem("device_uid");
        window.location.href = "/pages/login/index.html";
      });
    }
    loadCompanyProfile().then(function () {
      bindSidebarCollapse();
      bindMobileNav();
    });
  });
  })();
}

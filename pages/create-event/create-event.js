(function () {
  var COUNT_MIN = 1;
  var COUNT_MAX = 20;

  var mqMobileNav = window.matchMedia("(max-width: 768px)");

  var LEGACY_BRAND_SLUG = {
    bmw: "BMW",
    suzuki: "Suzuki",
    honda: "Honda",
  };

  var STORAGE_STEP1 = "create-event-step1";
  var STORAGE_STEP2 = "create-event-step2";
  var STORAGE_STEP3 = "create-event-step3";
  var STORAGE_STEP4 = "create-event-step4";

  /** بيانات النموذج للمراجعة والإرسال */
  var eventFormData = {};

  var mapPickerState = {
    map: null,
    marker: null,
    geocoder: null,
    autocomplete: null,
    inited: false,
  };

  function routeNameFromGeocoderResults(results) {
    if (!results || !results.length || !results[0]) return "";
    var comps = results[0].address_components;
    if (comps && comps.length) {
      for (var i = 0; i < comps.length; i++) {
        var c = comps[i];
        if (!c.types) continue;
        for (var j = 0; j < c.types.length; j++) {
          if (c.types[j] === "route") {
            return c.long_name ? String(c.long_name) : "";
          }
        }
      }
    }
    return results[0].formatted_address ? String(results[0].formatted_address) : "";
  }

  function updateLocationFields(latLng, geocoder) {
    if (!latLng || !geocoder) return;
    var lat = latLng.lat();
    var lng = latLng.lng();
    var latStr = lat.toFixed(6);
    var lngStr = lng.toFixed(6);
    var locEl = document.getElementById("ev-end-location");
    var streetEl = document.getElementById("ev-end-street");
    if (locEl) locEl.value = latStr + "," + lngStr;
    geocoder.geocode({ location: { lat: lat, lng: lng } }, function (results, status) {
      if (status !== "OK" || !results || !results[0]) return;
      var street = routeNameFromGeocoderResults(results);
      if (streetEl && street) streetEl.value = street;
    });
  }

  function syncMapPickerFromFields() {
    if (
      !mapPickerState.map ||
      !mapPickerState.marker ||
      typeof google === "undefined" ||
      !google.maps
    ) {
      return;
    }
    var locEl = document.getElementById("ev-end-location");
    if (!locEl) return;
    var raw = String(locEl.value || "").trim();
    var parts = raw.split(",");
    var lat = parseFloat(parts[0]);
    var lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      var pos = new google.maps.LatLng(lat, lng);
      mapPickerState.map.setCenter(pos);
      mapPickerState.marker.setPosition(pos);
    }
  }

  /**
   * Map creation — invoked only from window.initMapPicker (Maps API callback in index.html)
   * after __mapsJsReady is set, or once when create-event.js loads if the callback already ran.
   */
  window.__createEventMapBootstrap = function () {
    function run() {
      var mapEl = document.getElementById("ev-map-picker");
      if (!mapEl || typeof google === "undefined" || !google.maps) {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", run);
        }
        return;
      }

      if (mapPickerState.inited) {
        syncMapPickerFromFields();
        setTimeout(function () {
          if (mapPickerState.map) google.maps.event.trigger(mapPickerState.map, "resize");
        }, 150);
        return;
      }

      var defaultCenter = { lat: 21.4858, lng: 39.1925 };

      var map = new google.maps.Map(mapEl, {
        center: defaultCenter,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      var marker = new google.maps.Marker({
        position: defaultCenter,
        map: map,
        draggable: true,
      });

      var geocoder = new google.maps.Geocoder();

      mapPickerState.map = map;
      mapPickerState.marker = marker;
      mapPickerState.geocoder = geocoder;

      var searchInput = document.getElementById("ev-place-search");
      if (searchInput && google.maps.places) {
        var autocomplete = new google.maps.places.Autocomplete(searchInput, {
          componentRestrictions: { country: "sa" },
        });
        mapPickerState.autocomplete = autocomplete;
        autocomplete.addListener("place_changed", function () {
          var place = autocomplete.getPlace();
          if (!place || !place.geometry || !place.geometry.location) return;
          map.setCenter(place.geometry.location);
          marker.setPosition(place.geometry.location);
          updateLocationFields(place.geometry.location, geocoder);
        });
      }

      map.addListener("click", function (e) {
        if (!e || !e.latLng) return;
        marker.setPosition(e.latLng);
        updateLocationFields(e.latLng, geocoder);
      });

      marker.addListener("dragend", function () {
        var pos = marker.getPosition();
        if (pos) updateLocationFields(pos, geocoder);
      });

      mapPickerState.inited = true;
      syncMapPickerFromFields();
      setTimeout(function () {
        if (mapPickerState.map) google.maps.event.trigger(mapPickerState.map, "resize");
      }, 150);
    }

    run();
  };

  if (window.__mapsJsReady) {
    window.__createEventMapBootstrap();
  }

  /** عند فتح الخطوة 3: إعادة رسم الحجم فقط (لا استدعاء لتهيئة الخريطة). */
  function ensureMapPickerForStep3() {
    if (!mapPickerState.inited || !mapPickerState.map) return;
    syncMapPickerFromFields();
    setTimeout(function () {
      if (mapPickerState.map) google.maps.event.trigger(mapPickerState.map, "resize");
    }, 200);
  }

  /**
   * شركة الجهاز من GET /company/:device_uid/getCompanyDevice — تُملأ عند تحميل الصفحة.
   * @type {object|null}
   */
  window.currentCompany = null;

  function formatDateTimeForAPI(val) {
    if (!val) return null;
    var d = new Date(val);
    if (isNaN(d.getTime())) return null;
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes()) +
      ":" +
      pad(d.getSeconds())
    );
  }

  function apiDatetimeToDatetimeLocalValue(str) {
    if (!str) return "";
    var s = String(str).trim();
    var m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return m[1] + "T" + m[2] + ":" + m[3];
    var d = new Date(s);
    if (isNaN(d.getTime())) return "";
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      "T" +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  /** يقسّم تاريخ API إلى حقول date / time للواجهة */
  function apiDateTimeToDateAndTimeParts(apiStr) {
    var local = apiDatetimeToDatetimeLocalValue(apiStr);
    if (!local) return { date: "", time: "" };
    var tIdx = local.indexOf("T");
    if (tIdx < 0) return { date: "", time: "" };
    return {
      date: local.slice(0, tIdx),
      time: local.slice(tIdx + 1, tIdx + 6),
    };
  }

  function combineStep4InputsForAPI() {
    var dateEl = document.getElementById("ev-start-date");
    var timeEl = document.getElementById("ev-start-time");
    if (!dateEl || !timeEl || !String(dateEl.value || "").trim() || !String(timeEl.value || "").trim()) {
      return null;
    }
    var isoLocal = String(dateEl.value).trim() + "T" + String(timeEl.value).trim();
    return formatDateTimeForAPI(isoLocal);
  }

  function setStep4DateMinToday() {
    var dateEl = document.getElementById("ev-start-date");
    if (!dateEl) return;
    var now = new Date();
    var pad = function (n) {
      return String(n).padStart(2, "0");
    };
    dateEl.min =
      now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  }

  function formatEndTimeForDisplay(apiStr) {
    if (!apiStr) return "";
    var s = String(apiStr).trim();
    var d = new Date(s.indexOf("T") === -1 ? s.replace(" ", "T") : s);
    if (!isNaN(d.getTime())) {
      try {
        return new Intl.DateTimeFormat("ar-SA", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(d);
      } catch (e) {
        return s;
      }
    }
    return s;
  }

  function syncEventFormData() {
    var s1 = parseWizardSession(STORAGE_STEP1);
    var s2 = parseWizardSession(STORAGE_STEP2);
    var s3 = parseWizardSession(STORAGE_STEP3);
    var s4 = parseWizardSession(STORAGE_STEP4);
    if (s1) {
      eventFormData.number_log = s1.number_log;
      eventFormData.gender = s1.gender;
    }
    if (s2) {
      var ar =
        s2.category_ar != null && String(s2.category_ar).trim() !== ""
          ? String(s2.category_ar).trim()
          : "";
      var categoryEn =
        s2.category_en != null && String(s2.category_en).trim() !== ""
          ? String(s2.category_en).trim()
          : "";
      var bikeCo =
        s2.bike_company != null && String(s2.bike_company).trim() !== ""
          ? String(s2.bike_company).trim()
          : "";
      if (!ar && s2.bike_label) ar = String(s2.bike_label).trim();
      if (!bikeCo && s2.bike_brand && LEGACY_BRAND_SLUG[s2.bike_brand]) {
        bikeCo = LEGACY_BRAND_SLUG[s2.bike_brand];
      }
      eventFormData.category_ar = ar;
      eventFormData.category_en = categoryEn;
      eventFormData.bike_company = bikeCo;
    }
    if (s3) {
      eventFormData.end_street =
        s3.end_street != null && String(s3.end_street).trim() !== "" ? String(s3.end_street).trim() : "";
      eventFormData.end_location =
        s3.end_location != null && String(s3.end_location).trim() !== ""
          ? String(s3.end_location).trim()
          : "";
    }
    if (s4 && s4.end_time != null && String(s4.end_time).trim() !== "") {
      eventFormData.end_time = String(s4.end_time).trim();
    }
    var streetEl = document.getElementById("ev-end-street");
    var locEl = document.getElementById("ev-end-location");
    if (streetEl && String(streetEl.value || "").trim() !== "") {
      eventFormData.end_street = String(streetEl.value).trim();
    }
    if (locEl && String(locEl.value || "").trim() !== "") {
      eventFormData.end_location = String(locEl.value).trim();
    }
    var combined = combineStep4InputsForAPI();
    if (combined) eventFormData.end_time = combined;
  }

  function restoreStep4FromSession() {
    var dateEl = document.getElementById("ev-start-date");
    var timeEl = document.getElementById("ev-start-time");
    if (!dateEl || !timeEl) return;
    setStep4DateMinToday();
    var s4 = parseWizardSession(STORAGE_STEP4);
    if (!s4 || s4.end_time == null || String(s4.end_time).trim() === "") {
      return;
    }
    var parts = apiDateTimeToDateAndTimeParts(s4.end_time);
    dateEl.value = parts.date;
    timeEl.value = parts.time;
  }

  function restoreStep3FromSession() {
    var s3 = parseWizardSession(STORAGE_STEP3);
    var streetEl = document.getElementById("ev-end-street");
    var locEl = document.getElementById("ev-end-location");
    if (s3 && streetEl && s3.end_street != null) streetEl.value = String(s3.end_street);
    if (s3 && locEl && s3.end_location != null) locEl.value = String(s3.end_location);
  }

  function restoreStep1FromSession() {
    var s1 = parseWizardSession(STORAGE_STEP1);
    var valueEl = document.getElementById("create-event-count-value");
    if (valueEl && s1 && s1.number_log != null) {
      var nl = Number(s1.number_log);
      if (!isNaN(nl)) {
        setCountDisplay(valueEl, Math.max(COUNT_MIN, Math.min(COUNT_MAX, nl)));
      }
    }
    var opts = document.querySelectorAll(".create-event-gender__opt");
    opts.forEach(function (b) {
      b.classList.remove("create-event-gender__opt--selected");
      b.setAttribute("aria-checked", "false");
    });
    if (s1 && (s1.gender === 1 || s1.gender === 2)) {
      var want = String(s1.gender);
      opts.forEach(function (b) {
        if (b.getAttribute("data-gender") === want) {
          b.classList.add("create-event-gender__opt--selected");
          b.setAttribute("aria-checked", "true");
        }
      });
    }
  }

  function restoreStep2FromSession() {
    var s2 = parseWizardSession(STORAGE_STEP2);
    var bikeBtns = document.querySelectorAll(".create-event-bike-grid .create-event-bike-card");
    bikeBtns.forEach(function (b) {
      b.classList.remove("create-event-bike-card--selected");
      b.setAttribute("aria-checked", "false");
    });
    var companyBtns = document.querySelectorAll(".create-event-company-grid .create-event-company-card");
    companyBtns.forEach(function (b) {
      b.classList.remove("create-event-company-card--selected");
      b.setAttribute("aria-checked", "false");
    });
    if (!s2) return;
    var wantAr = s2.category_ar != null && String(s2.category_ar).trim() !== "" ? String(s2.category_ar).trim() : "";
    if (!wantAr && s2.bike_label) wantAr = String(s2.bike_label).trim();
    var wantEn =
      s2.category_en != null && String(s2.category_en).trim() !== "" ? String(s2.category_en).trim() : "";
    var wantCo =
      s2.bike_company != null && String(s2.bike_company).trim() !== ""
        ? String(s2.bike_company).trim()
        : "";
    if (!wantCo && s2.bike_brand && LEGACY_BRAND_SLUG[s2.bike_brand]) {
      wantCo = LEGACY_BRAND_SLUG[s2.bike_brand];
    }
    if (wantAr || wantEn) {
      bikeBtns.forEach(function (btn) {
        var ar = btn.dataset && btn.dataset.categoryAr != null ? String(btn.dataset.categoryAr).trim() : "";
        var en = btn.dataset && btn.dataset.categoryEn != null ? String(btn.dataset.categoryEn).trim() : "";
        var match = (wantAr && ar === wantAr) || (!wantAr && wantEn && en === wantEn);
        if (match) {
          btn.classList.add("create-event-bike-card--selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
    }
    if (wantCo) {
      companyBtns.forEach(function (btn) {
        var co = btn.dataset && btn.dataset.company != null ? String(btn.dataset.company).trim() : "";
        if (co === wantCo) {
          btn.classList.add("create-event-company-card--selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
    }
  }

  function getResolvedDeviceUid() {
    var fromLs =
      window.safeLocalStorage && window.safeLocalStorage.getItem("device_uid")
        ? String(window.safeLocalStorage.getItem("device_uid")).trim()
        : "";
    if (fromLs) return fromLs;
    if (typeof window.getDeviceUID === "function") {
      return window.getDeviceUID();
    }
    return null;
  }

  /**
   * يملأ window.currentCompany من getCompanyDevice — مطلوب لـ road_user_name / road_user_image.
   */
  async function loadCurrentCompanyFromDevice() {
    window.currentCompany = null;
    var device_uid = getResolvedDeviceUid();
    if (!device_uid || !window.getCompanyDevice) return;

    var result = await window.getCompanyDevice(device_uid);
    if (!result || !result.ok || result.body == null) return;

    var company = null;
    if (window.normalizeCompanyList) {
      var list = window.normalizeCompanyList(result.body);
      company = Array.isArray(list) && list[0] ? list[0] : null;
    } else if (Array.isArray(result.body)) {
      company = result.body[0] || null;
    } else if (result.body && typeof result.body === "object") {
      company = result.body;
    }

    window.currentCompany = company;

    applySidebarAvatarFromCompanyRow(window.currentCompany);
  }

  function applySidebarAvatarFromCompanyRow(row) {
    var img = document.getElementById("sidebar-avatar");
    if (!img) return;
    if (!row || typeof row !== "object") return;
    var imageUrl =
      row.image != null && String(row.image).trim()
        ? window.resolveImageUrl(String(row.image).trim())
        : "";
    var name =
      row.name != null && String(row.name).trim()
        ? String(row.name).trim()
        : row.company_name != null && String(row.company_name).trim()
          ? String(row.company_name).trim()
          : row.company && row.company.name
            ? String(row.company.name)
            : "User";
    var fallback =
      "https://ui-avatars.com/api/?name=" +
      encodeURIComponent(name) +
      "&background=E1902B&color=fff&size=32&font-size=0.4";
    img.onerror = function () {
      img.onerror = null;
      img.src = fallback;
    };
    img.src = imageUrl || fallback;
  }

  function resolveEndLocationString() {
    var locEl = document.getElementById("ev-end-location");
    var fromInput = locEl && locEl.value ? String(locEl.value).trim() : "";
    if (fromInput) return fromInput;
    var step3 = parseWizardSession(STORAGE_STEP3);
    return step3 && step3.end_location != null && String(step3.end_location).trim() !== ""
      ? String(step3.end_location).trim()
      : "";
  }

  function resolveEndStreetString() {
    var streetEl = document.getElementById("ev-end-street");
    var fromInput = streetEl && streetEl.value ? String(streetEl.value).trim() : "";
    if (fromInput) return fromInput;
    var step3 = parseWizardSession(STORAGE_STEP3);
    return step3 && step3.end_street != null && String(step3.end_street).trim() !== ""
      ? String(step3.end_street).trim()
      : "";
  }

  function snapshotAllStepsToSession() {
    persistStep1();
    persistStep2();
    persistStep3();
    persistStep4();
  }

  function parseWizardSession(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }

  function showWizardError(msg) {
    var el = document.getElementById("create-event-wizard-error");
    if (!el) return;
    el.textContent = msg || "";
    el.removeAttribute("hidden");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearWizardError() {
    var el = document.getElementById("create-event-wizard-error");
    if (!el) return;
    el.textContent = "";
    el.setAttribute("hidden", "");
  }

  function showSubmitError(msg) {
    var el = document.getElementById("create-event-submit-error");
    if (!el) return;
    el.textContent = msg || "";
    el.removeAttribute("hidden");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearSubmitError() {
    var el = document.getElementById("create-event-submit-error");
    if (!el) return;
    el.textContent = "";
    el.setAttribute("hidden", "");
  }

  function applyFilteredBody(rawData) {
    var body = {};
    Object.keys(rawData).forEach(function (k) {
      var v = rawData[k];
      if (k === "road_userId") {
        if (typeof v === "number" && Number.isFinite(v)) body[k] = v;
        return;
      }
      if (k === "gender") {
        if (v === 1 || v === 2) body[k] = v;
        return;
      }
      if (k === "category_ar" || k === "category_en" || k === "bike_company") {
        if (v != null && String(v).trim() !== "") body[k] = String(v).trim();
        return;
      }
      if (v !== null && v !== "" && v !== undefined) body[k] = v;
    });
    body.type = 3;
    body.start_end = 0;
    return body;
  }

  function resolveCompanyImageForApi(url) {
    if (url == null || String(url).trim() === "") return "";
    return window.resolveImageUrl(String(url).trim());
  }

  function buildRawRoadPayload(company) {
    syncEventFormData();
    var s1 = parseWizardSession(STORAGE_STEP1);
    var s2 = parseWizardSession(STORAGE_STEP2);
    var s3 = parseWizardSession(STORAGE_STEP3);
    var s4 = parseWizardSession(STORAGE_STEP4);
    var uidRaw = window.safeLocalStorage && window.safeLocalStorage.getItem("user_id");
    var road_userId =
      uidRaw != null && String(uidRaw).trim() !== ""
        ? Number(String(uidRaw).trim())
        : NaN;

    var co = company && typeof company === "object" ? company : null;
    if (!co && window.currentCompany && typeof window.currentCompany === "object") {
      co = window.currentCompany;
    }
    if (!co || typeof co !== "object") co = {};

    var nameRaw = co.name != null ? String(co.name).trim() : "";
    var imgForApi = resolveCompanyImageForApi(co.image != null ? co.image : "");

    var endStreet = resolveEndStreetString();
    var endLoc = resolveEndLocationString();
    var endTimeApi = "";
    var ftLive = combineStep4InputsForAPI();
    if (ftLive) endTimeApi = ftLive;
    if (!endTimeApi && s4 && s4.end_time != null && String(s4.end_time).trim() !== "") {
      var s4s = String(s4.end_time).trim();
      var parsed = formatDateTimeForAPI(s4s.indexOf("T") === -1 ? s4s.replace(" ", "T") : s4s);
      if (parsed) endTimeApi = parsed;
    }

    var raw = {
      road_userId: road_userId,
      road_user_name: nameRaw,
      road_user_image: imgForApi,
      type: 3,
      start_end: 0,
      end_street: endStreet,
      end_location: endLoc,
      end_time: endTimeApi,
    };

    if (s1 && s1.number_log != null) {
      var nl = Number(s1.number_log);
      if (!isNaN(nl)) raw.number_log = nl;
    }
    if (s1 && (s1.gender === 1 || s1.gender === 2)) {
      raw.gender = s1.gender;
    }
    if (s2) {
      var rawCatAr = s2.category_ar != null ? String(s2.category_ar).trim() : "";
      var rawCatEn = s2.category_en != null ? String(s2.category_en).trim() : "";
      var rawBike = s2.bike_company != null ? String(s2.bike_company).trim() : "";
      if (rawCatAr) raw.category_ar = rawCatAr;
      if (rawCatEn) raw.category_en = rawCatEn;
      if (rawBike) raw.bike_company = rawBike;
    }

    return raw;
  }

  function validateStep1() {
    var valueEl = document.getElementById("create-event-count-value");
    var n = getCountValue(valueEl);
    if (n < 1) {
      showWizardError("يجب أن يكون عدد المضافين أكبر من صفر.");
      return false;
    }
    clearWizardError();
    return true;
  }

  function validateStep2() {
    clearWizardError();
    return true;
  }

  function validateStep3() {
    var streetEl = document.getElementById("ev-end-street");
    var locEl = document.getElementById("ev-end-location");
    var street = streetEl && streetEl.value ? String(streetEl.value).trim() : "";
    var loc = locEl && locEl.value ? String(locEl.value).trim() : "";
    if (!loc) {
      showWizardError("يرجى اختيار موقعاً على الخريطة أو عبر البحث.");
      return false;
    }
    if (!street) {
      showWizardError("لم يُحدد اسم الشارع. اختر موقعاً أو حرّك الدبوس على الخريطة.");
      return false;
    }
    clearWizardError();
    return true;
  }

  function validateStep4() {
    var dateEl = document.getElementById("ev-start-date");
    var timeEl = document.getElementById("ev-start-time");
    if (!dateEl || !timeEl || !String(dateEl.value || "").trim() || !String(timeEl.value || "").trim()) {
      showWizardError("يرجى اختيار تاريخ ووقت بداية الفعالية.");
      return false;
    }
    var combined = combineStep4InputsForAPI();
    if (!combined) {
      showWizardError("تاريخ أو وقت غير صالح.");
      return false;
    }
    var d = new Date(String(dateEl.value).trim() + "T" + String(timeEl.value).trim());
    if (isNaN(d.getTime())) {
      showWizardError("تاريخ أو وقت غير صالح.");
      return false;
    }
    var now = new Date();
    if (d.getTime() < now.getTime() - 60000) {
      showWizardError("اختر تاريخاً ووقتاً في المستقبل (بعد الوقت الحالي).");
      return false;
    }
    clearWizardError();
    return true;
  }

  function validateAllStoredForSubmit() {
    var s1 = parseWizardSession(STORAGE_STEP1);
    var n = s1 && s1.number_log != null ? Number(s1.number_log) : NaN;
    if (!s1 || isNaN(n) || n < 1) {
      setWizardStep(1);
      showWizardError("يرجى اختيار عدد المضافين (أكبر من صفر).");
      return false;
    }
    var s3 = parseWizardSession(STORAGE_STEP3);
    if (!s3 || !String(s3.end_location || "").trim() || !String(s3.end_street || "").trim()) {
      setWizardStep(3);
      showWizardError("يرجى إدخال اسم الشارع والإحداثيات لنقطة البداية.");
      return false;
    }
    var s4 = parseWizardSession(STORAGE_STEP4);
    if (!s4 || s4.end_time == null || String(s4.end_time).trim() === "") {
      setWizardStep(4);
      showWizardError("يرجى تحديد وقت بداية الفعالية.");
      return false;
    }
    clearWizardError();
    return true;
  }

  function bindSidebarCollapse() {
    var sidebar = document.querySelector(".profile-sidebar");
    var collapseBtn = document.querySelector(".profile-sidebar__collapse");
    if (!collapseBtn || !sidebar) return;
    collapseBtn.addEventListener("click", function () {
      if (mqMobileNav.matches) return;
      var collapsed = sidebar.classList.toggle("profile-sidebar--collapsed");
      collapseBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  function setMobileNavOpen(open) {
    var sidebar = document.querySelector(".profile-sidebar");
    var sidebarBackdrop = document.querySelector(".profile-sidebar__backdrop");
    var mobilePeek = document.querySelector(".profile-sidebar__peek");
    if (!sidebar) return;
    sidebar.classList.toggle("profile-sidebar--mobile-open", open);
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.toggle("is-visible", open);
      sidebarBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (mobilePeek) mobilePeek.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function bindMobileNav() {
    var sidebar = document.querySelector(".profile-sidebar");
    if (!sidebar) return;
    var mobilePeek = document.querySelector(".profile-sidebar__peek");
    var mobileClose = document.querySelector(".profile-sidebar__mobile-close");
    var sidebarBackdrop = document.querySelector(".profile-sidebar__backdrop");

    function closeMobileNav() {
      setMobileNavOpen(false);
    }

    function onPeekClick() {
      if (!mqMobileNav.matches) return;
      var open = !sidebar.classList.contains("profile-sidebar--mobile-open");
      setMobileNavOpen(open);
    }

    if (mobilePeek) mobilePeek.addEventListener("click", onPeekClick);
    if (mobileClose) mobileClose.addEventListener("click", closeMobileNav);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeMobileNav);

    document.addEventListener(
      "keydown",
      function (e) {
        if (
          e.key === "Escape" &&
          mqMobileNav.matches &&
          sidebar.classList.contains("profile-sidebar--mobile-open")
        ) {
          closeMobileNav();
        }
      },
      false
    );

    var nav = document.getElementById("profile-sidebar-nav");
    if (nav) {
      nav.addEventListener("click", function (e) {
        if (!mqMobileNav.matches) return;
        var a = e.target.closest("a");
        if (a && a.getAttribute("href") && a.getAttribute("href") !== "#") closeMobileNav();
      });
    }

    mqMobileNav.addEventListener("change", function () {
      if (!mqMobileNav.matches) setMobileNavOpen(false);
    });
  }

  function bindLogout() {
    var btn = document.getElementById("logout-btn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const user_id = window.safeLocalStorage.getItem("user_id");
      await window.updateDevice(user_id, "0");
      window.safeLocalStorage.removeItem("user_id");
      window.safeLocalStorage.removeItem("device_uid");
      window.location.href = "/pages/login/index.html";
    });
  }

  function setCountDisplay(el, n) {
    if (!el) return;
    el.textContent = String(n);
  }

  function getCountValue(el) {
    if (!el) return COUNT_MIN;
    var n = parseInt(el.textContent, 10);
    return isNaN(n) ? COUNT_MIN : n;
  }

  function clampCountOnLoad() {
    var valueEl = document.getElementById("create-event-count-value");
    if (!valueEl) return;
    var v = getCountValue(valueEl);
    v = Math.max(COUNT_MIN, Math.min(COUNT_MAX, v));
    setCountDisplay(valueEl, v);
  }

  function bindCounter() {
    var minus = document.getElementById("create-event-count-minus");
    var plus = document.getElementById("create-event-count-plus");
    var valueEl = document.getElementById("create-event-count-value");
    if (!valueEl) return;

    if (minus) {
      minus.addEventListener("click", function () {
        var v = getCountValue(valueEl);
        if (v <= COUNT_MIN) return;
        setCountDisplay(valueEl, v - 1);
      });
    }
    if (plus) {
      plus.addEventListener("click", function () {
        var v = getCountValue(valueEl);
        if (v >= COUNT_MAX) return;
        setCountDisplay(valueEl, v + 1);
      });
    }
  }

  function bindGender() {
    var group = document.querySelector(".create-event-gender");
    if (!group) return;
    var opts = group.querySelectorAll(".create-event-gender__opt");
    opts.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wasOn = btn.classList.contains("create-event-gender__opt--selected");
        opts.forEach(function (b) {
          b.classList.remove("create-event-gender__opt--selected");
          b.setAttribute("aria-checked", "false");
        });
        if (!wasOn) {
          btn.classList.add("create-event-gender__opt--selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
    });
  }

  function persistStep1() {
    var raw = getCountValue(document.getElementById("create-event-count-value"));
    var count = Math.max(COUNT_MIN, Math.min(COUNT_MAX, raw));
    var sel = document.querySelector(".create-event-gender__opt--selected");
    var attr = sel ? sel.getAttribute("data-gender") : null;
    var gender = attr === "1" ? 1 : attr === "2" ? 2 : null;
    var data = { number_log: count, gender: gender };
    try {
      sessionStorage.setItem(STORAGE_STEP1, JSON.stringify(data));
    } catch (e) {
      console.warn("sessionStorage", e);
    }
  }

  function persistStep2() {
    var cat = document.querySelector(".create-event-bike-card--selected");
    var company = document.querySelector(".create-event-company-card--selected");
    var category_ar =
      cat && cat.dataset && cat.dataset.categoryAr != null ? String(cat.dataset.categoryAr).trim() : "";
    var category_en =
      cat && cat.dataset && cat.dataset.categoryEn != null ? String(cat.dataset.categoryEn).trim() : "";
    var bike_company =
      company && company.dataset && company.dataset.company != null
        ? String(company.dataset.company).trim()
        : "";
    var data = {
      category_ar: category_ar,
      category_en: category_en,
      bike_company: bike_company,
    };
    try {
      sessionStorage.setItem(STORAGE_STEP2, JSON.stringify(data));
    } catch (e) {
      console.warn("sessionStorage", e);
    }
  }

  function persistStep3() {
    var streetEl = document.getElementById("ev-end-street");
    var locEl = document.getElementById("ev-end-location");
    var end_street = streetEl && streetEl.value ? String(streetEl.value).trim() : "";
    var end_location = locEl && locEl.value ? String(locEl.value).trim() : "";
    var data = {
      end_street: end_street,
      end_location: end_location,
    };
    try {
      sessionStorage.setItem(STORAGE_STEP3, JSON.stringify(data));
    } catch (e) {
      console.warn("sessionStorage", e);
    }
  }

  function persistStep4() {
    var end_time = combineStep4InputsForAPI();
    var data = {
      end_time: end_time || "",
    };
    if (end_time) eventFormData.end_time = end_time;
    try {
      sessionStorage.setItem(STORAGE_STEP4, JSON.stringify(data));
    } catch (e) {
      console.warn("sessionStorage", e);
    }
  }

  function renderReview() {
    syncEventFormData();

    var routeCard = document.getElementById("create-event-review-route-card");
    var startPoint = document.getElementById("create-event-review-start-point");
    var rowCount = document.getElementById("create-event-review-row-count");
    var rowGender = document.getElementById("create-event-review-row-gender");
    var rowCategory = document.getElementById("create-event-review-row-category");
    var rowCompany = document.getElementById("create-event-review-row-company");
    var countEl = document.getElementById("create-event-review-count");
    var genderEl = document.getElementById("create-event-review-gender");
    var catEl = document.getElementById("create-event-review-category");
    var companyNameEl = document.getElementById("create-event-review-company-name");
    var timeCard = document.getElementById("create-event-review-time-card");
    var rowTimeStart = document.getElementById("create-event-review-row-time-start");
    var tStart = document.getElementById("create-event-review-t-start");

    var es = eventFormData.end_street != null ? String(eventFormData.end_street).trim() : "";

    if (routeCard && startPoint) {
      if (es) {
        startPoint.textContent = es;
        routeCard.removeAttribute("hidden");
      } else {
        startPoint.textContent = "";
        routeCard.setAttribute("hidden", "");
      }
    }
    var nl = eventFormData.number_log;
    if (rowCount && countEl) {
      if (nl != null && nl !== "" && !isNaN(Number(nl))) {
        countEl.textContent = String(nl) + " عضو";
        rowCount.removeAttribute("hidden");
      } else {
        rowCount.setAttribute("hidden", "");
      }
    }

    var gg = eventFormData.gender;
    if (rowGender && genderEl) {
      if (gg === 1 || gg === 2) {
        genderEl.textContent = gg === 1 ? "ذكر" : "أنثى";
        rowGender.removeAttribute("hidden");
      } else {
        rowGender.setAttribute("hidden", "");
      }
    }

    var cat = eventFormData.category_ar != null ? String(eventFormData.category_ar).trim() : "";
    if (rowCategory && catEl) {
      if (cat) {
        catEl.textContent = cat;
        rowCategory.removeAttribute("hidden");
      } else {
        rowCategory.setAttribute("hidden", "");
      }
    }

    var bc = eventFormData.bike_company != null ? String(eventFormData.bike_company).trim() : "";
    if (rowCompany && companyNameEl) {
      if (bc) {
        companyNameEl.textContent = bc;
        rowCompany.removeAttribute("hidden");
      } else {
        rowCompany.setAttribute("hidden", "");
      }
    }

    var et = eventFormData.end_time != null ? String(eventFormData.end_time).trim() : "";
    if (timeCard && tStart) {
      if (et) {
        tStart.textContent = formatEndTimeForDisplay(et);
        timeCard.removeAttribute("hidden");
        if (rowTimeStart) rowTimeStart.removeAttribute("hidden");
      } else {
        tStart.textContent = "";
        timeCard.setAttribute("hidden", "");
        if (rowTimeStart) rowTimeStart.setAttribute("hidden", "");
      }
    }
  }

  function setWizardStep(step) {
    var wizardStep = Math.max(1, Math.min(5, step));
    document.body.setAttribute("data-wizard-step", String(wizardStep));

    if (wizardStep !== 5) {
      clearSubmitError();
    }

    var steps = [
      null,
      document.getElementById("create-event-wizard-step-1"),
      document.getElementById("create-event-wizard-step-2"),
      document.getElementById("create-event-wizard-step-3"),
      document.getElementById("create-event-wizard-step-4"),
      document.getElementById("create-event-wizard-step-5"),
    ];
    for (var s = 1; s <= 5; s++) {
      if (steps[s]) steps[s].hidden = s !== wizardStep;
    }

    var actions1 = document.getElementById("create-event-actions-1");
    var actionsMid = document.getElementById("create-event-actions-mid");
    var actionsFinal = document.getElementById("create-event-actions-final");
    if (actions1) actions1.hidden = wizardStep !== 1;
    if (actionsMid) actionsMid.hidden = wizardStep < 2 || wizardStep > 4;
    if (actionsFinal) actionsFinal.hidden = wizardStep !== 5;

    var panel = document.querySelector(".create-event-panel");
    var titleIds = {
      1: "create-event-step1-title",
      2: "create-event-step2-title",
      3: "create-event-step3-title",
      4: "create-event-step4-title",
      5: "create-event-step5-title",
    };
    if (panel && titleIds[wizardStep]) {
      panel.setAttribute("aria-labelledby", titleIds[wizardStep]);
    }

    if (wizardStep === 1) {
      restoreStep1FromSession();
    }

    if (wizardStep === 2) {
      restoreStep2FromSession();
    }

    if (wizardStep === 3) {
      restoreStep3FromSession();
      ensureMapPickerForStep3();
    }

    if (wizardStep === 4) {
      restoreStep4FromSession();
    }

    if (wizardStep === 5) {
      snapshotAllStepsToSession();
      renderReview();
    }

    var items = document.querySelectorAll(".create-event-stepper__list > .create-event-step");
    items.forEach(function (li, i) {
      var n = i + 1;
      var badge = li.querySelector(".create-event-step__badge");
      var label = li.querySelector(".create-event-step__label");
      var badgeText = li.querySelector(".create-event-step__badge-text");
      var badgeCheck = li.querySelector(".create-event-step__badge-check");

      li.classList.toggle("create-event-step--connector-done", wizardStep > n);

      if (badge) {
        badge.classList.remove(
          "create-event-step__badge--active",
          "create-event-step__badge--done",
          "create-event-step__badge--outline-current",
          "create-event-step__badge--outline-active",
          "create-event-step__badge--future"
        );
        badge.removeAttribute("aria-current");
      }
      if (label) {
        label.classList.remove(
          "create-event-step__label--active",
          "create-event-step__label--complete",
          "create-event-step__label--future"
        );
      }

      if (badgeText && badgeCheck) {
        badgeText.hidden = false;
        badgeCheck.hidden = true;
      }

      if (wizardStep > n) {
        if (badge) badge.classList.add("create-event-step__badge--done");
        if (label) label.classList.add("create-event-step__label--complete");
        if (badgeText && badgeCheck) {
          badgeText.hidden = true;
          badgeCheck.hidden = false;
        }
      } else if (wizardStep === n) {
        if (badge) {
          badge.setAttribute("aria-current", "step");
          if (n === 5) {
            badge.classList.add("create-event-step__badge--outline-current");
          } else if (n === 4) {
            badge.classList.add("create-event-step__badge--outline-active");
          } else {
            badge.classList.add("create-event-step__badge--active");
          }
        }
        if (label) label.classList.add("create-event-step__label--active");
      } else if (n === 5 && wizardStep < 5) {
        if (badge) badge.classList.add("create-event-step__badge--future");
        if (label) label.classList.add("create-event-step__label--future");
      }
    });
  }

  function bindBikeCategory() {
    var grid = document.querySelector(".create-event-bike-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll(".create-event-bike-card");
    cards.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wasOn = btn.classList.contains("create-event-bike-card--selected");
        cards.forEach(function (b) {
          b.classList.remove("create-event-bike-card--selected");
          b.setAttribute("aria-checked", "false");
        });
        if (!wasOn) {
          btn.classList.add("create-event-bike-card--selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
    });
  }

  function bindBikeCompany() {
    var grid = document.querySelector(".create-event-company-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll(".create-event-company-card");
    cards.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var wasOn = btn.classList.contains("create-event-company-card--selected");
        cards.forEach(function (b) {
          b.classList.remove("create-event-company-card--selected");
          b.setAttribute("aria-checked", "false");
        });
        if (!wasOn) {
          btn.classList.add("create-event-company-card--selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
    });
  }

  function bindNext() {
    var btn = document.getElementById("create-event-btn-next");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!validateStep1()) return;
      persistStep1();
      setWizardStep(2);
    });
  }

  function bindWizardNext() {
    var btn = document.getElementById("create-event-btn-wizard-next");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var st = parseInt(document.body.getAttribute("data-wizard-step") || "1", 10);
      if (st === 2) {
        if (!validateStep2()) return;
        persistStep2();
        setWizardStep(3);
      } else if (st === 3) {
        if (!validateStep3()) return;
        persistStep3();
        setWizardStep(4);
      } else if (st === 4) {
        if (!validateStep4()) return;
        persistStep4();
        setWizardStep(5);
      }
    });
  }

  function bindWizardPrev() {
    var btns = document.querySelectorAll(".create-event-wizard-prev");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var st = parseInt(document.body.getAttribute("data-wizard-step") || "1", 10);
        if (st > 1) setWizardStep(st - 1);
      });
    });
  }

  function bindConfirm() {
    const confirmBtn = document.getElementById("create-event-btn-confirm");
    if (!confirmBtn) {
      console.error("confirm button not found");
      return;
    }

    const confirmLabelDefault = (confirmBtn.textContent || "").trim() || "تاكيد";

    confirmBtn.addEventListener("click", async () => {
      clearWizardError();
      clearSubmitError();
      snapshotAllStepsToSession();

      const s1 = JSON.parse(sessionStorage.getItem(STORAGE_STEP1) || "{}");
      const s2 = JSON.parse(sessionStorage.getItem(STORAGE_STEP2) || "{}");
      const s3 = JSON.parse(sessionStorage.getItem(STORAGE_STEP3) || "{}");
      const s4 = JSON.parse(sessionStorage.getItem(STORAGE_STEP4) || "{}");

      var endStreet = s3.end_street != null ? String(s3.end_street).trim() : "";
      var endLocation = s3.end_location != null ? String(s3.end_location).trim() : "";
      var endTime = s4.end_time != null ? String(s4.end_time).trim() : "";
      var roadUserId = Number(
        window.safeLocalStorage && window.safeLocalStorage.getItem("user_id")
      );

      if (!endStreet || !endLocation || !endTime) {
        showWizardError("يرجى إكمال جميع الحقول المطلوبة");
        return;
      }

      if (!Number.isFinite(roadUserId)) {
        showWizardError("جلسة غير صالحة. سجّل الدخول مجدداً.");
        return;
      }

      if (!window.getCompanyDevice) {
        showWizardError("تعذّر تحميل بيانات الشركة");
        return;
      }

      if (!window.sendRoadEvent) {
        showWizardError("تعذّر الإرسال: واجهة غير متوفرة.");
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = "جارٍ الإرسال...";

      if (typeof window.showPageLoader === "function") {
        window.showPageLoader();
      }

      try {
        var device_uid = getResolvedDeviceUid();
        if (!device_uid) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = confirmLabelDefault;
          showWizardError("جلسة غير صالحة. سجّل الدخول مجدداً.");
          return;
        }

        var companyResult = await window.getCompanyDevice(device_uid);
        var company = null;
        if (companyResult && companyResult.ok && companyResult.body != null) {
          if (window.normalizeCompanyList) {
            var list = window.normalizeCompanyList(companyResult.body);
            company = Array.isArray(list) && list[0] ? list[0] : null;
          } else if (Array.isArray(companyResult.body)) {
            company = companyResult.body[0] || null;
          } else if (companyResult.body && typeof companyResult.body === "object") {
            company = companyResult.body;
          }
        }

        if (!company) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = confirmLabelDefault;
          showWizardError("تعذّر تحميل بيانات الشركة");
          return;
        }

        window.currentCompany = company;

        const payload = {
          road_userId: roadUserId,
          road_user_name: company.name != null ? String(company.name) : "",
          road_user_image: window.resolveImageUrl(
            company.image != null ? String(company.image) : ""
          ),
          type: 3,
          start_end: 0,
          end_street: endStreet,
          end_location: endLocation,
          end_time: endTime,
        };

        if (s1.number_log != null && String(s1.number_log).trim() !== "") {
          var nl = Number(s1.number_log);
          if (!isNaN(nl)) payload.number_log = nl;
        }
        if (s1.gender === 1 || s1.gender === 2) payload.gender = s1.gender;
        if (s2.category_ar && String(s2.category_ar).trim())
          payload.category_ar = String(s2.category_ar).trim();
        if (s2.category_en && String(s2.category_en).trim())
          payload.category_en = String(s2.category_en).trim();
        if (s2.bike_company && String(s2.bike_company).trim())
          payload.bike_company = String(s2.bike_company).trim();

        const result = await window.sendRoadEvent(payload);

        var resBody = result && result.body;
        if (resBody && typeof resBody === "object" && resBody.networkError === true) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = confirmLabelDefault;
          showWizardError("تعذّر الاتصال بالسيرفر. تحقّقي من الشبكة أو حاولي لاحقاً.");
          return;
        }

        var ok = result && (result.success === true || result.ok === true);
        var failed =
          resBody &&
          typeof resBody === "object" &&
          !Array.isArray(resBody) &&
          (resBody.success === false || resBody.error);

        if (ok && !failed) {
          try {
            sessionStorage.removeItem(STORAGE_STEP1);
            sessionStorage.removeItem(STORAGE_STEP2);
            sessionStorage.removeItem(STORAGE_STEP3);
            sessionStorage.removeItem(STORAGE_STEP4);
          } catch (e) {}
          window.location.href = "../profile/index.html";
          return;
        }

        confirmBtn.disabled = false;
        confirmBtn.textContent = confirmLabelDefault;
        var errMsg =
          resBody && typeof resBody === "object" && !Array.isArray(resBody)
            ? resBody.message || resBody.error || resBody.detail
            : null;
        showWizardError(errMsg ? String(errMsg) : "حدث خطأ، حاول مرة أخرى");
      } catch (e) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = confirmLabelDefault;
        showWizardError("حدث خطأ، حاول مرة أخرى");
      } finally {
        if (typeof window.hidePageLoader === "function") {
          window.hidePageLoader();
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    clampCountOnLoad();
    bindSidebarCollapse();
    bindMobileNav();
    bindLogout();
    bindCounter();
    bindGender();
    bindBikeCategory();
    bindBikeCompany();
    bindNext();
    bindWizardNext();
    bindWizardPrev();
    await loadCurrentCompanyFromDevice();
    setWizardStep(1);
    bindConfirm();
  });
})();

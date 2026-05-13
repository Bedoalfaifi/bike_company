(function () {
  function getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage not available", e);
      return null;
    }
  }

  function setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn("localStorage not available", e);
      return false;
    }
  }

  function removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn("localStorage not available", e);
      return false;
    }
  }

  window.safeLocalStorage = {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
  };
})();

function getDeviceUID() {
  var uid = window.safeLocalStorage
    ? window.safeLocalStorage.getItem("device_uid")
    : null;
  if (!uid) {
    uid = crypto.randomUUID();
    if (window.safeLocalStorage) {
      window.safeLocalStorage.setItem("device_uid", uid);
    }
  }
  return uid;
}

/** API may return companies as array or wrapped in { data | company | result }. */
function normalizeCompanyList(body) {
  if (body == null) return null;
  if (Array.isArray(body)) return body;
  if (typeof body === "object") {
    if (Array.isArray(body.data)) return body.data;
    if (Array.isArray(body.company)) return body.company;
    if (Array.isArray(body.result)) return body.result;
  }
  return null;
}

/** يدعم category_* والاسم القديم catogary_* من الاستجابة */
function categoryArFromCompany(obj) {
  if (!obj || typeof obj !== "object") return "";
  var v =
    obj.category_ar != null
      ? obj.category_ar
      : obj.catogary_ar != null
        ? obj.catogary_ar
        : "";
  return v != null ? String(v) : "";
}

function categoryEnFromCompany(obj) {
  if (!obj || typeof obj !== "object") return "";
  var v =
    obj.category_en != null
      ? obj.category_en
      : obj.catogary_en != null
        ? obj.catogary_en
        : "";
  return v != null ? String(v) : "";
}

// Show loading state on a button
function setLoading(btn, isLoading) {
  btn.disabled = isLoading;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.textContent = isLoading ? "جارٍ التحميل..." : btn.dataset.originalText;
}

// Show field error
function showError(inputEl, message) {
  inputEl.style.borderColor = "var(--color-error)";
  let err = inputEl.nextElementSibling;
  if (!err || !err.classList.contains("field-error")) {
    err = document.createElement("span");
    err.classList.add("field-error");
    inputEl.insertAdjacentElement("afterend", err);
  }
  err.textContent = message;
}

// Clear field error
function clearError(inputEl) {
  inputEl.style.borderColor = "";
  const err = inputEl.nextElementSibling;
  if (err && err.classList.contains("field-error")) err.remove();
}

// Generate random password
function generatePass(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(function (b) {
      return chars[b % chars.length];
    })
    .join("");
}

// ============ Skeleton / Loading System ============

/**
 * Show skeleton cards in a grid container
 * @param {string} containerId - id of the grid element
 * @param {number} count - number of skeleton cards to show
 * @param {string} type - 'event' | 'product' | 'card' | 'list'
 */
function showSkeleton(containerId, count, type) {
  count = count == null ? 3 : count;
  type = type == null ? "card" : type;
  var container = document.getElementById(containerId);
  if (!container) return;

  var html = "";
  for (var i = 0; i < count; i++) {
    html += getSkeletonTemplate(type);
  }
  container.innerHTML = html;
}

function getSkeletonTemplate(type) {
  switch (type) {
    case "event":
      return (
        '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton skeleton-map"></div>' +
        '<div class="skeleton-card__header">' +
        '<div class="skeleton skeleton-badge"></div>' +
        '<div class="skeleton skeleton-title"></div>' +
        "</div>" +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line skeleton-line--short"></div>' +
        "</div>"
      );

    case "product":
      return (
        '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton skeleton-map"></div>' +
        '<div class="skeleton skeleton-title" style="margin-top:12px"></div>' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line skeleton-line--short"></div>' +
        "</div>"
      );

    case "list":
      return (
        '<div class="skeleton-list-item" aria-hidden="true">' +
        '<div class="skeleton skeleton-avatar"></div>' +
        '<div class="skeleton-list-item__lines">' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line skeleton-line--short"></div>' +
        "</div>" +
        "</div>"
      );

    case "card":
    default:
      return (
        '<div class="skeleton-card" aria-hidden="true">' +
        '<div class="skeleton skeleton-title"></div>' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line"></div>' +
        '<div class="skeleton skeleton-line skeleton-line--short"></div>' +
        "</div>"
      );
  }
}

/**
 * Show full page loading overlay
 */
function showPageLoader() {
  var loader = document.getElementById("page-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "page-loader";
    loader.innerHTML = '<div class="page-loader__spinner"></div>';
    document.body.appendChild(loader);
  }
  loader.hidden = false;
}

/**
 * Hide full page loading overlay
 */
function hidePageLoader() {
  var loader = document.getElementById("page-loader");
  if (loader) loader.hidden = true;
}

/**
 * تأكيد بنص عربي — يُرجع Promise بواقع boolean (بديل عن confirm في متصفحات تعطل الحوار الأصلي).
 */
function confirmDialog(message) {
  return new Promise(function (resolve) {
    var msg = message == null ? "" : String(message);
    var host = document.getElementById("app-dialog-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "app-dialog-host";
      host.className = "app-dialog-host";
      document.body.appendChild(host);
    }
    host.innerHTML = "";
    host.removeAttribute("hidden");

    var panel = document.createElement("div");
    panel.className = "app-dialog";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "app-dialog-msg");

    var p = document.createElement("p");
    p.id = "app-dialog-msg";
    p.className = "app-dialog__msg";
    p.textContent = msg;

    var actions = document.createElement("div");
    actions.className = "app-dialog__actions";

    function finish(val) {
      document.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onBackdrop);
      host.setAttribute("hidden", "");
      host.innerHTML = "";
      resolve(val);
    }

    function onKey(e) {
      if (e.key === "Escape") finish(false);
    }

    function onBackdrop(e) {
      if (e.target === host) finish(false);
    }

    var btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.className = "app-dialog__btn app-dialog__btn--ghost";
    btnCancel.textContent = "إلغاء";
    btnCancel.addEventListener("click", function () {
      finish(false);
    });

    var btnOk = document.createElement("button");
    btnOk.type = "button";
    btnOk.className = "app-dialog__btn app-dialog__btn--primary";
    btnOk.textContent = "تأكيد";
    btnOk.addEventListener("click", function () {
      finish(true);
    });

    actions.appendChild(btnOk);
    actions.appendChild(btnCancel);
    panel.appendChild(p);
    panel.appendChild(actions);
    host.appendChild(panel);

    host.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    btnOk.focus();
  });
}

/** بديل عن alert — يُرجع Promise يُحلّ بعد الضغط على موافق */
function alertDialog(message) {
  return new Promise(function (resolve) {
    var msg = message == null ? "" : String(message);
    var host = document.getElementById("app-dialog-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "app-dialog-host";
      host.className = "app-dialog-host";
      document.body.appendChild(host);
    }
    host.innerHTML = "";
    host.removeAttribute("hidden");

    var panel = document.createElement("div");
    panel.className = "app-dialog";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    var p = document.createElement("p");
    p.className = "app-dialog__msg";
    p.textContent = msg;

    var actions = document.createElement("div");
    actions.className = "app-dialog__actions";

    function finish() {
      document.removeEventListener("keydown", onKey);
      host.removeEventListener("click", onBackdrop);
      host.setAttribute("hidden", "");
      host.innerHTML = "";
      resolve();
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Enter") finish();
    }

    function onBackdrop(e) {
      if (e.target === host) finish();
    }

    var btnOk = document.createElement("button");
    btnOk.type = "button";
    btnOk.className = "app-dialog__btn app-dialog__btn--primary";
    btnOk.textContent = "حسناً";
    btnOk.addEventListener("click", finish);

    actions.appendChild(btnOk);
    panel.appendChild(p);
    panel.appendChild(actions);
    host.appendChild(panel);

    host.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKey);
    btnOk.focus();
  });
}

window.normalizeCompanyList = normalizeCompanyList;
window.categoryArFromCompany = categoryArFromCompany;
window.categoryEnFromCompany = categoryEnFromCompany;
window.getDeviceUID = getDeviceUID;
window.setLoading = setLoading;
window.showError = showError;
window.clearError = clearError;
window.generatePass = generatePass;
window.showSkeleton = showSkeleton;
window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;
window.confirmDialog = confirmDialog;
window.alertDialog = alertDialog;

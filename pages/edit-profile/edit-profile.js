(function () {
  function redirectToLogin() {
    window.location.href = "../login/index.html";
  }

  function showPageError(msg) {
    var el = document.getElementById("edit-profile-page-error");
    if (el) {
      el.textContent = msg || "";
      if (msg) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
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
    var cat =
      window.categoryArFromCompany && window.categoryArFromCompany(company);
    return (
      company.user_id != null ||
      Boolean(company.name) ||
      Boolean(company.image) ||
      company.number != null ||
      Boolean(cat)
    );
  }

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

  function setFieldError(field, message) {
    var container = field
      ? field.closest(".field-stack, .input-text, .file-upload")
      : null;
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

  function clearFormErrors(form) {
    form.querySelectorAll(".has-error").forEach(function (el) {
      el.classList.remove("has-error");
    });
    form.querySelectorAll(".field-error-message").forEach(function (el) {
      el.textContent = "";
      el.style.display = "none";
    });
  }

  function showFormFeedback(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
    if (msg) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function setLogoPreviewFromUrl(
    preview,
    placeholder,
    url,
    companyName,
    logoInput,
    hint
  ) {
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

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("edit-company-form");
    var feedback = document.getElementById("edit-company-feedback");
    var nameInput = document.getElementById("edit-company-name");
    var phoneInput = document.getElementById("edit-company-phone");
    var websiteInput = document.getElementById("edit-company-website");
    var logoInput = document.getElementById("edit-company-logo");
    var preview = document.getElementById("edit-company-logo-preview");
    var placeholder = document.getElementById("edit-company-logo-placeholder");
    var hint = form ? form.querySelector("[data-upload-hint]") : null;
    var dropzone = document.querySelector("[data-edit-company-dropzone]");

    if (!form) return;

    if (hint && hint.dataset.originalHint === undefined) {
      hint.dataset.originalHint = (hint.textContent || "").trim();
    }

    var deviceUid = window.safeLocalStorage
      ? window.safeLocalStorage.getItem("device_uid")
      : null;
    var storedUserId = window.safeLocalStorage
      ? window.safeLocalStorage.getItem("user_id")
      : null;

    if (!deviceUid || !storedUserId) {
      redirectToLogin();
      return;
    }

    var initialSnapshot = {
      name: "",
      number: "",
      websiteHost: "",
      oldImage: "",
    };

    phoneInput.addEventListener("input", function () {
      var next = normalizeCompanyPhoneDigits(phoneInput.value);
      if (next !== phoneInput.value) phoneInput.value = next;
    });
    phoneInput.addEventListener("paste", function (event) {
      event.preventDefault();
      var text = (event.clipboardData || {}).getData("text") || "";
      phoneInput.value = normalizeCompanyPhoneDigits(text);
    });

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

    function applyCompanyToForm(company) {
      if (!company) return;
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
      var imgRaw = company.image != null ? String(company.image).trim() : "";
      initialSnapshot.name = nameInput ? nameInput.value.trim() : "";
      initialSnapshot.number = phoneInput ? phoneInput.value : "";
      initialSnapshot.websiteHost = websiteInput
        ? websiteInput.value.trim()
        : "";
      initialSnapshot.oldImage = imgRaw;
      setLogoPreviewFromUrl(
        preview,
        placeholder,
        imgRaw,
        company.name != null ? String(company.name) : "",
        logoInput,
        hint
      );
    }

    async function loadCompany() {
      var result = await window.getCompanyDevice(deviceUid);
      if (result.status === 0 && !result.ok) {
        showPageError("تعذر تحميل البيانات. تحققي من الاتصال.");
        return;
      }
      var body = result.body;
      var list = window.normalizeCompanyList
        ? window.normalizeCompanyList(body)
        : null;
      if (
        !result.ok ||
        isUnauthorized(result.status, body) ||
        !hasCompanyData(list)
      ) {
        redirectToLogin();
        return;
      }

      var company = list[0];
      var apiUserId =
        company.user_id != null ? String(company.user_id).trim() : "";
      if (apiUserId && apiUserId !== String(storedUserId).trim()) {
        redirectToLogin();
        return;
      }

      if (window.safeLocalStorage && company.user_id != null && company.user_id !== "") {
        window.safeLocalStorage.setItem("user_id", String(company.user_id));
      }

      applyCompanyToForm(company);
      showPageError("");
    }

    loadCompany().catch(function (err) {
      console.warn("loadCompany", err);
      showPageError("تعذر تحميل البيانات.");
    });

    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      clearFormErrors(form);
      showFormFeedback(feedback, "");

      var userId = window.safeLocalStorage
        ? window.safeLocalStorage.getItem("user_id")
        : null;
      if (!userId || !String(userId).trim()) {
        showFormFeedback(feedback, "جلسة غير صالحة. سجّل الدخول مجدداً.");
        return;
      }

      var companyName = nameInput ? nameInput.value.trim() : "";
      var phoneDigits = phoneInput
        ? normalizeCompanyPhoneDigits(phoneInput.value)
        : "";
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

      var urlForApi = websiteHost;
      var newFile = logoInput && logoInput.files && logoInput.files[0];

      var fd = new FormData();
      var changed = false;
      if (companyName !== initialSnapshot.name) {
        fd.append("name", companyName);
        changed = true;
      }
      if (phoneDigits !== initialSnapshot.number) {
        fd.append("number", phoneDigits);
        changed = true;
      }
      if (urlForApi !== initialSnapshot.websiteHost) {
        fd.append("url", urlForApi || "");
        changed = true;
      }
      if (newFile) {
        fd.append("image", newFile);
        fd.append("oldImage", initialSnapshot.oldImage || "");
        changed = true;
      }

      if (!changed) {
        showFormFeedback(feedback, "لم تُجرَ أي تغييرات.");
        return;
      }

      if (!window.updateCompany) {
        showFormFeedback(feedback, "تعذر الحفظ: واجهة التحديث غير متوفرة.");
        return;
      }

      var submitBtn = form.querySelector(".edit-company-modal__submit");
      if (submitBtn) submitBtn.disabled = true;
      try {
        var result = await window.updateCompany(userId, fd);
        var respBody = result.body;
        if (respBody && typeof respBody === "object" && respBody.networkError === true) {
          showFormFeedback(
            feedback,
            "تعذر الاتصال بالسيرفر. تحققي من الشبكة أو ngrok."
          );
          return;
        }
        if (result.ok) {
          var failed =
            respBody &&
            typeof respBody === "object" &&
            !Array.isArray(respBody) &&
            (respBody.success === false || respBody.error);
          if (!failed) {
            window.location.href = "../profile/index.html";
            return;
          }
          var errMsg = respBody.message || respBody.error || respBody.detail;
          showFormFeedback(feedback, errMsg || "تعذر حفظ التغييرات.");
        } else {
          var errMsg2 =
            respBody && typeof respBody === "object" && !Array.isArray(respBody)
              ? respBody.message || respBody.error || respBody.detail
              : null;
          showFormFeedback(
            feedback,
            errMsg2 || "تعذر حفظ التغييرات. تحقق من الاتصال أو حاول لاحقاً."
          );
        }
      } catch (err) {
        showFormFeedback(feedback, "تعذر حفظ التغييرات. حاول مرة أخرى.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
})();

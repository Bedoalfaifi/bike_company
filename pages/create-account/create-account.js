(function () {
  var CATEGORY_MAP = {
    "خدمات": "services",
    "منتجات": "products",
    "نقل": "transport",
    "فعاليات": "events",
    "تصليح وتعديل": "repair"
  };

  function showFeedback(el, message) {
    if (!el) return;
    el.textContent = message || "";
    if (message) {
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  }

  function syncCategoryHidden(group, hiddenInput) {
    if (!group || !hiddenInput) return;
    var selected = group.querySelector(".tag.selected");
    hiddenInput.value = selected ? selected.getAttribute("data-category") || "" : "";
  }

  function getOrCreateErrorNode(field) {
    if (!field || !field.parentElement) return null;
    var existing = field.parentElement.querySelector(".field-error-message");
    if (existing) return existing;
    var p = document.createElement("p");
    p.className = "field-error-message";
    field.parentElement.appendChild(p);
    return p;
  }

  function setFieldError(field, message) {
    if (!field) return;
    var container = field.closest(".field-stack, .input-text, .select-field, .file-upload, .tag-section");
    if (container) {
      container.classList.toggle("has-error", Boolean(message));
    }
    var errorNode = getOrCreateErrorNode(container || field);
    if (errorNode) {
      errorNode.textContent = message || "";
      errorNode.style.display = message ? "block" : "none";
    }
  }

  function getSelectedCategoryArabic(tagGroup) {
    if (!tagGroup) return "";
    var selected = tagGroup.querySelector(".tag.selected");
    return selected ? (selected.textContent || "").trim() : "";
  }

  function ensureSuccessState(form) {
    var parent = form && form.parentElement;
    if (!parent) return;
    var success = document.getElementById("register-success");
    if (!success) {
      success = document.createElement("div");
      success.id = "register-success";
      success.className = "register-success";
      success.setAttribute("hidden", "");
      success.innerHTML =
        '<div class="register-success__icon" aria-hidden="true">&#10003;</div>' +
        '<p class="register-success__text">تم استلام طلبك بنجاح، سيتم مراجعته والتواصل معكم قريباً</p>';
      parent.appendChild(success);
    }
    return success;
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-upload-hint]").forEach(function (hint) {
      if (hint.dataset.originalHint === undefined) {
        hint.dataset.originalHint = (hint.textContent || "").trim();
      }
    });

    var form = document.getElementById("register-form");
    var feedback = document.getElementById("form-feedback");
    var categoryInput = document.getElementById("company-category");
    var tagGroup = document.querySelector("[data-tag-group]");
    var submitBtn = document.getElementById("submit-register");
    var commercialInput = document.getElementById("commercial-register");
    var logoInput = document.getElementById("logo");
    var companyNameInput = document.getElementById("company-name");
    var phoneInput = document.getElementById("company-phone");
    var cityInput = document.getElementById("city");
    var websiteInput = document.getElementById("website-url");
    var successNode = ensureSuccessState(form);

    if (feedback && submitBtn && submitBtn.parentElement) {
      submitBtn.insertAdjacentElement("afterend", feedback);
    }

    if (tagGroup && categoryInput) {
      syncCategoryHidden(tagGroup, categoryInput);
      tagGroup.addEventListener("tags:change", function () {
        syncCategoryHidden(tagGroup, categoryInput);
      });
    }

    if (!form) return;

    function normalizeCompanyPhoneDigits(raw) {
      var d = (raw || "").replace(/\D/g, "");
      if (d.length > 9) {
        return d.slice(-9);
      }
      return d.slice(0, 9);
    }

    if (phoneInput) {
      phoneInput.addEventListener("input", function () {
        var next = normalizeCompanyPhoneDigits(phoneInput.value);
        if (next !== phoneInput.value) {
          phoneInput.value = next;
        }
      });
      phoneInput.addEventListener("paste", function (event) {
        event.preventDefault();
        var text = (event.clipboardData || {}).getData("text") || "";
        phoneInput.value = normalizeCompanyPhoneDigits(text);
      });
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      showFeedback(feedback, "");
      setFieldError(logoInput, "");
      setFieldError(companyNameInput, "");
      setFieldError(phoneInput, "");
      setFieldError(cityInput, "");
      setFieldError(tagGroup, "");
      setFieldError(commercialInput, "");

      var hasError = false;
      var companyName = companyNameInput ? companyNameInput.value.trim() : "";
      var phoneDigits = phoneInput ? normalizeCompanyPhoneDigits(phoneInput.value) : "";
      var city = cityInput ? cityInput.value.trim() : "";
      var website = websiteInput ? websiteInput.value.trim() : "";
      var categoryArabic = getSelectedCategoryArabic(tagGroup);
      var categoryEnglish = CATEGORY_MAP[categoryArabic] || "";

      if (!logoInput || !logoInput.files || !logoInput.files.length) {
        setFieldError(logoInput, "يرجى رفع شعار الشركة.");
        hasError = true;
      }
      if (!companyName) {
        setFieldError(companyNameInput, "يرجى إدخال اسم الشركة.");
        hasError = true;
      }
      if (!phoneDigits) {
        setFieldError(phoneInput, "يرجى إدخال رقم الجوال.");
        hasError = true;
      } else if (phoneDigits.length !== 9) {
        setFieldError(phoneInput, "رقم الجوال يجب أن يكون 9 أرقام (بدون 0 أو +966).");
        hasError = true;
      }
      if (!city) {
        setFieldError(cityInput, "يرجى اختيار المدينة.");
        hasError = true;
      }
      if (!categoryArabic || !categoryEnglish) {
        setFieldError(tagGroup, "يرجى اختيار تصنيف الشركة.");
        hasError = true;
      }
      if (!commercialInput || !commercialInput.files || !commercialInput.files.length) {
        setFieldError(commercialInput, "يرجى إرفاق شهادة السجل التجاري.");
        hasError = true;
      } else {
        var cr = commercialInput.files[0];
        var isPdf =
          (cr.type && cr.type === "application/pdf") ||
          /\.pdf$/i.test(cr.name || "");
        if (!isPdf) {
          setFieldError(commercialInput, "شهادة السجل التجاري يجب أن تكون بصيغة PDF فقط.");
          hasError = true;
        }
      }
      if (hasError) return;

      if (typeof window.showPageLoader === "function") {
        window.showPageLoader();
      }
      if (window.setLoading && submitBtn) {
        window.setLoading(submitBtn, true);
      } else if (window.ButtonComponent && submitBtn) {
        window.ButtonComponent.setDisabled(submitBtn, true);
      }
      try {
        var payload = new FormData();
        payload.append("device_uid", window.getDeviceUID());
        payload.append("name", companyName);
        payload.append("image", logoInput.files[0]);
        payload.append("number", phoneDigits);
        payload.append("city", city);
        payload.append("pass", window.generatePass ? window.generatePass(8) : "A1b2C3d4");
        if (website) {
          payload.append("url", website);
        }
        payload.append("category_ar", categoryArabic);
        payload.append("category_en", categoryEnglish);
        payload.append("certificate", commercialInput.files[0]);

        var result = await window.registerCompany(payload);
        if (result && (result.success === true || result.status === "success")) {
          form.setAttribute("hidden", "");
          if (successNode) {
            successNode.removeAttribute("hidden");
          }
          return;
        }
        showFeedback(feedback, (result && (result.message || result.error)) || "حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
      } catch (error) {
        showFeedback(feedback, "تعذر إرسال الطلب حالياً. حاول مرة أخرى.");
      } finally {
        if (typeof window.hidePageLoader === "function") {
          window.hidePageLoader();
        }
        if (window.setLoading && submitBtn) {
          window.setLoading(submitBtn, false);
        } else if (window.ButtonComponent && submitBtn) {
          window.ButtonComponent.setDisabled(submitBtn, false);
        }
      }
    });
  });
})();

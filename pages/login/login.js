(function () {
  var PROFILE_PATH = "../profile/index.html";

  function isValidResponse(res) {
    if (!res || typeof res !== "object") return false;
    if (res.networkError === true) return false;
    if (Array.isArray(res) && res.length > 0) return true;
    if (
      res.success === true &&
      res.data &&
      Array.isArray(res.data) &&
      res.data.length > 0
    ) {
      return true;
    }
    if (res.user_id != null && String(res.user_id).trim() !== "") {
      return true;
    }
    return false;
  }

  function deviceCheckSucceeded(result) {
    return result && result.ok === true && isValidResponse(result.body);
  }

  function showFeedback(el, message) {
    if (!el) return;
    el.textContent = message || "";
    if (message) {
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  }

  function setInputError(inputEl, hasError) {
    if (!inputEl) return;
    inputEl.style.borderColor = hasError ? "var(--color-error)" : "";
  }

  function setSubmitLoading(submitBtn, isLoading) {
    if (window.setLoading && submitBtn) {
      window.setLoading(submitBtn, isLoading);
    } else if (submitBtn) {
      submitBtn.disabled = isLoading;
      if (isLoading) {
        submitBtn.dataset.originalText =
          submitBtn.dataset.originalText || submitBtn.textContent;
        submitBtn.textContent = "جارٍ التحميل...";
      } else {
        submitBtn.textContent = submitBtn.dataset.originalText || "تسجيل الدخول";
      }
    }
  }

  function showLoginForm(form, deviceCheckEl) {
    if (deviceCheckEl) {
      deviceCheckEl.setAttribute("hidden", "");
    }
    if (form) {
      form.removeAttribute("hidden");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("login-form");
    var deviceCheckEl = document.getElementById("login-device-check");
    var feedback = document.getElementById("form-feedback");
    var submitBtn = document.getElementById("submit-login");
    var userIdInput = document.getElementById("user-id-input");
    var passwordInput = document.getElementById("pass-input");

    if (!form || !window.getDeviceUID) return;

    if (userIdInput) {
      userIdInput.addEventListener("input", function () {
        userIdInput.value = userIdInput.value.replace(/[^0-9]/g, "");
      });
    }

    (async function runAutoLoginCheck() {
      if (typeof window.showPageLoader === "function") {
        window.showPageLoader();
      }
      try {
        var uid = window.getDeviceUID();
        if (!window.getCompanyDevice) {
          showLoginForm(form, deviceCheckEl);
          return;
        }
        var deviceCheck = await window.getCompanyDevice(uid);
        if (deviceCheckSucceeded(deviceCheck)) {
          window.location.href = PROFILE_PATH;
          return;
        }
        showLoginForm(form, deviceCheckEl);
      } finally {
        if (typeof window.hidePageLoader === "function") {
          window.hidePageLoader();
        }
      }
    })();

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      showFeedback(feedback, "");
      setInputError(userIdInput, false);
      setInputError(passwordInput, false);

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var user_id = userIdInput ? userIdInput.value.trim() : "";
      var pass = passwordInput ? passwordInput.value : "";

      if (!window.verifyLogin || !window.updateDevice || !window.getCompanyDevice) {
        showFeedback(
          feedback,
          "تعذر الاتصال بالسيرفر. حدّث الصفحة وحاول مرة أخرى."
        );
        return;
      }

      setSubmitLoading(submitBtn, true);

      try {
        var loginCheck = await window.verifyLogin(user_id, pass);

        if (
          loginCheck &&
          typeof loginCheck === "object" &&
          loginCheck.networkError === true
        ) {
          showFeedback(
            feedback,
            "تعذر الاتصال بالسيرفر. تحققي من الإنترنت أو أنفُق ngrok ثم أعيدي المحاولة."
          );
          return;
        }

        if (!isValidResponse(loginCheck)) {
          showFeedback(feedback, "رقم المستخدم أو كلمة المرور غير صحيحة");
          setInputError(userIdInput, true);
          setInputError(passwordInput, true);
          return;
        }

        var updateResult = await window.updateDevice(
          user_id,
          window.getDeviceUID()
        );

        if (
          updateResult &&
          typeof updateResult === "object" &&
          updateResult.networkError === true
        ) {
          showFeedback(
            feedback,
            "تعذر إكمال تسجيل الدخول. تحققي من الشبكة أو حاول لاحقاً."
          );
          return;
        }

        var recheck = await window.getCompanyDevice(window.getDeviceUID());
        if (deviceCheckSucceeded(recheck)) {
          if (window.safeLocalStorage) {
            window.safeLocalStorage.setItem("user_id", String(user_id));
            window.safeLocalStorage.setItem(
              "device_uid",
              window.getDeviceUID()
            );
          } else {
            try {
              localStorage.setItem("user_id", String(user_id));
              localStorage.setItem("device_uid", window.getDeviceUID());
            } catch (e) {
              console.warn("localStorage not available", e);
            }
          }
          window.location.href = PROFILE_PATH;
          return;
        }

        showFeedback(feedback, "حدث خطأ، يرجى المحاولة مرة أخرى");
      } catch (error) {
        showFeedback(
          feedback,
          "تعذر الاتصال بالسيرفر. تحققي من الإنترنت أو أعيدي المحاولة."
        );
      } finally {
        setSubmitLoading(submitBtn, false);
      }
    });
  });
})();

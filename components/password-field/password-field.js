(function () {
  function bindToggle(wrap) {
    var input = wrap.querySelector(".password-field__input");
    var btn = wrap.querySelector(".password-field__toggle");
    if (!input || !btn) return;

    function syncAria() {
      var revealed = input.type === "text";
      btn.setAttribute("aria-pressed", revealed ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        revealed ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
      );
    }

    syncAria();

    btn.addEventListener("click", function () {
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      syncAria();
    });
  }

  function initAll(scope) {
    var root = scope || document;
    root.querySelectorAll(".password-field__wrap").forEach(bindToggle);
  }

  window.PasswordFieldComponent = {
    initAll: initAll,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }
})();

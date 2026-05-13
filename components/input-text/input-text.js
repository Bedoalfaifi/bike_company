(function () {
  window.InputTextComponent = {
    setError: function (inputEl, message) {
      if (!inputEl || !inputEl.classList.contains("input-field")) return;
      inputEl.setAttribute("aria-invalid", message ? "true" : "false");
      var wrap = inputEl.closest(".input-text");
      if (wrap) {
        wrap.classList.toggle("input-text--error", Boolean(message));
      }
    },
  };
})();

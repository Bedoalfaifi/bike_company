(function () {
  window.ButtonComponent = {
    setDisabled: function (el, disabled) {
      if (!el || !el.classList.contains("btn-primary")) return;
      el.disabled = Boolean(disabled);
    },
  };
})();

(function () {
  function setActive(container, activeBtn) {
    var tabs = container.querySelectorAll(".tab");
    tabs.forEach(function (btn) {
      var on = btn === activeBtn;
      btn.classList.toggle("active", on);
      btn.classList.toggle("inactive", !on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function init(container) {
    if (!container || container.dataset.tabsBound === "true") return;
    container.dataset.tabsBound = "true";

    container.addEventListener("click", function (event) {
      var btn = event.target.closest(".tab");
      if (!btn || !container.contains(btn)) return;
      setActive(container, btn);
      container.dispatchEvent(
        new CustomEvent("tabs:change", {
          bubbles: true,
          detail: { index: Number(btn.getAttribute("data-tab-index")) || 0 },
        })
      );
    });
  }

  function initAll(scope) {
    var root = scope || document;
    root.querySelectorAll("[data-tabs]").forEach(init);
  }

  window.TabsComponent = {
    init: init,
    initAll: initAll,
    setActiveByIndex: function (container, index) {
      var btn = container.querySelector('.tab[data-tab-index="' + index + '"]');
      if (btn) setActive(container, btn);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }
})();

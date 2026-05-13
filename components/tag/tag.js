(function () {
  function initGroup(group) {
    if (!group || group.dataset.tagBound === "true") return;
    group.dataset.tagBound = "true";

    group.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-tag]");
      if (!btn || !group.contains(btn)) return;

      group.querySelectorAll("[data-tag]").forEach(function (node) {
        node.classList.remove("selected");
      });
      btn.classList.add("selected");

      group.dispatchEvent(
        new CustomEvent("tags:change", {
          bubbles: true,
          detail: { value: btn.textContent.trim() },
        })
      );
    });
  }

  function initAll(scope) {
    var root = scope || document;
    root.querySelectorAll("[data-tag-group]").forEach(initGroup);
  }

  window.TagComponent = {
    init: initGroup,
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

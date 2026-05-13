(function () {
  function bind(root) {
    if (!root || root.dataset.fileUploadBound === "true") return;
    root.dataset.fileUploadBound = "true";

    var input = root.querySelector(".upload-file-input");
    var hint = root.querySelector("[data-upload-hint]");
    var originalHint = hint ? hint.textContent : "";

    if (input) {
      var triggers = root.querySelectorAll("[data-upload-trigger]");
      triggers.forEach(function (node) {
        node.addEventListener("click", function () {
          input.click();
        });
      });
    }

    if (input && hint) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        hint.textContent = file ? file.name : originalHint;
        root.dispatchEvent(
          new CustomEvent("file-upload:change", {
            bubbles: true,
            detail: { file: file || null },
          })
        );
      });
    }
  }

  function initAll(scope) {
    var node = scope || document;
    node.querySelectorAll("[data-file-upload]").forEach(bind);
  }

  window.FileUploadComponent = {
    init: bind,
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

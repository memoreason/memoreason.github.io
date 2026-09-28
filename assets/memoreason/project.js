(() => {
  "use strict";

  const table = document.querySelector(".leaderboard-table");

  if (table) {
    const body = table.tBodies[0];
    const buttons = [...table.querySelectorAll("button[data-sort]")];
    const numericKeys = new Set(["accuracy", "gap", "ratio", "shortcut"]);
    let activeKey = "accuracy";
    let direction = "descending";

    const updateTable = (key, nextDirection) => {
      const rows = [...body.rows];
      const multiplier = nextDirection === "ascending" ? 1 : -1;

      rows.sort((a, b) => {
        if (numericKeys.has(key)) {
          return (Number(a.dataset[key]) - Number(b.dataset[key])) * multiplier;
        }

        return a.dataset.model.localeCompare(b.dataset.model) * multiplier;
      });

      rows.forEach((row) => body.append(row));

      table.querySelectorAll("th[data-sort-header]").forEach((header) => {
        header.setAttribute(
          "aria-sort",
          header.dataset.sortHeader === key ? nextDirection : "none",
        );
      });

      buttons.forEach((button) => {
        const icon = button.querySelector("span");
        const isActive = button.dataset.sort === key;
        icon.textContent = isActive ? (nextDirection === "ascending" ? "↑" : "↓") : "↕";
      });

      activeKey = key;
      direction = nextDirection;
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.sort;
        const nextDirection =
          key === activeKey
            ? direction === "ascending"
              ? "descending"
              : "ascending"
            : key === "model"
              ? "ascending"
              : "descending";

        updateTable(key, nextDirection);
      });
    });
  }

  const copyButton = document.querySelector("[data-copy-target]");

  if (copyButton) {
    const status = document.querySelector(".copy-status");

    copyButton.addEventListener("click", async () => {
      const target = document.getElementById(copyButton.dataset.copyTarget);
      const value = target ? target.textContent.trim() : "";

      try {
        await navigator.clipboard.writeText(value);
        copyButton.textContent = "Copied";
        status.textContent = "BibTeX copied to clipboard.";
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = "BibTeX selected—press Control or Command + C to copy.";
      }

      window.setTimeout(() => {
        copyButton.textContent = "Copy BibTeX";
      }, 1800);
    });
  }

  document.querySelectorAll("[data-dialog-open]").forEach((button) => {
    const dialog = document.getElementById(button.dataset.dialogOpen);

    if (!dialog || typeof dialog.showModal !== "function") {
      button.hidden = true;
      return;
    }

    button.addEventListener("click", () => {
      dialog.showModal();
    });
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    if (typeof dialog.showModal !== "function") return;

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  const navLinks = [...document.querySelectorAll(".nav-shell nav a[href^='#']")];
  const observedSections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && observedSections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          navLinks.forEach((link) => {
            link.classList.remove("is-current");
            link.removeAttribute("aria-current");
          });
          return;
        }
        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
          link.classList.toggle("is-current", isCurrent);
          if (isCurrent) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-20% 0px -65%", threshold: [0, 0.2, 0.6] },
    );

    observedSections.forEach((section) => observer.observe(section));
  }

  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compactLayout = window.matchMedia("(max-width: 899px)").matches;

  document.querySelectorAll("[data-memo-demo]").forEach((demo) => {
    const modeButtons = [...demo.querySelectorAll("[data-demo-mode]")];
    const tokens = [...demo.querySelectorAll(".entity-token[data-entity-id]")];
    const pauseButton = demo.querySelector("[data-demo-pause]");
    const status = demo.querySelector(".demo-mode-status");
    const stepButtons = [...demo.querySelectorAll("[data-demo-step]")];
    const stepStatusTitle = demo.querySelector("[data-demo-step-title]");
    const stepStatusCopy = demo.querySelector("[data-demo-step-copy]");
    const panels = [...demo.querySelectorAll("[data-demo-panel]")];
    const walkthroughSteps = [
      {
        panel: "document",
        ids: ["number_1", "number_2"],
        title: "Compare the document",
        factual: "The factual share values are 53.5% and 46.5%.",
        fictitious: "Those same slots now contain 61% and 39%.",
      },
      {
        panel: "rules",
        ids: ["number_1", "number_2"],
        title: "Preserve the rules",
        factual: "The factual values still satisfy 53.5 + 46.5 = 100.",
        fictitious: "The replacement values still satisfy 61 + 39 = 100.",
      },
      {
        panel: "questions",
        ids: ["number_1", "number_2", "derived_share_gap"],
        title: "Recompute the answer",
        factual: "The factual answer is 53.5 − 46.5 = 7 percentage points.",
        fictitious: "The fictitious answer is 61 − 39 = 22 percentage points.",
      },
    ];

    let mode = "factual";
    let paused = reduceMotion || compactLayout;
    let completed = false;
    let inView = false;
    let interacting = false;
    let lockedId = null;
    let stepIndex = 0;
    let timer = null;

    const clearTimer = () => {
      window.clearTimeout(timer);
      timer = null;
    };

    const clearHighlights = () => {
      tokens.forEach((token) => token.classList.remove("is-linked", "is-origin", "is-dimmed"));
    };

    const renderStoryHighlights = () => {
      const step = walkthroughSteps[stepIndex];
      const revealedPanels = new Set(
        walkthroughSteps.slice(0, stepIndex + 1).map((candidate) => candidate.panel),
      );

      tokens.forEach((token) => {
        const panelName = token.closest("[data-demo-panel]")?.dataset.demoPanel;
        const linked = step.ids.includes(token.dataset.entityId) && revealedPanels.has(panelName);
        token.classList.toggle("is-story-linked", linked);
      });
    };

    const syncPressedState = () => {
      tokens.forEach((token) => {
        token.setAttribute("aria-pressed", String(lockedId === token.dataset.entityId));
      });
    };

    const highlightEntity = (entityId, origin = null) => {
      tokens.forEach((token) => {
        const matches = token.dataset.entityId === entityId;
        token.classList.toggle("is-linked", matches);
        token.classList.toggle("is-origin", matches && token === origin);
        token.classList.toggle("is-dimmed", !matches);
      });
    };

    const writeToken = (token, nextMode) => {
      const value = token.dataset[nextMode];
      if (!value) return;
      const typeLabels = {
        "type-person": "person",
        "type-place": "place",
        "type-event": "event",
        "type-org": "organization",
        "type-temporal": "date",
        "type-number": "value",
        "type-product": "product",
      };
      const tokenType = token.classList.contains("answer-token")
        ? "recomputed answer"
        : Object.entries(typeLabels).find(([className]) => token.classList.contains(className))?.[1] || "entity";
      const traceLabel = `Trace this ${tokenType}`;
      token.textContent = value;
      token.dataset.traceLabel = traceLabel;
      token.setAttribute("aria-label", `${value}. ${traceLabel}.`);
      token.classList.remove("is-changing");
    };

    const updateModeStatus = () => {
      if (!status) return;
      status.textContent =
        mode === "factual"
          ? "World: factual source."
          : "World: coherent fictitious twin; the same constraints still hold.";
    };

    const updateStepStatus = () => {
      const step = walkthroughSteps[stepIndex];
      if (stepStatusTitle) {
        stepStatusTitle.textContent = `Step ${stepIndex + 1} of ${walkthroughSteps.length} · ${step.title}.`;
      }
      if (stepStatusCopy) stepStatusCopy.textContent = step[mode];
    };

    const activateStep = (nextIndex) => {
      stepIndex = Math.max(0, Math.min(walkthroughSteps.length - 1, nextIndex));
      const activeStep = walkthroughSteps[stepIndex];

      stepButtons.forEach((button, index) => {
        if (index === stepIndex) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      });
      panels.forEach((panel) => {
        panel.classList.toggle("is-step-active", panel.dataset.demoPanel === activeStep.panel);
      });
      renderStoryHighlights();
      updateStepStatus();
    };

    const setMode = (nextMode) => {
      if (!nextMode) return;
      const changed = nextMode !== mode;
      mode = nextMode;

      modeButtons.forEach((button) => {
        const active = button.dataset.demoMode === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      if (changed) {
        tokens.forEach((token) => {
          if (reduceMotion) {
            writeToken(token, mode);
            return;
          }

          token.classList.add("is-changing");
          window.setTimeout(() => writeToken(token, mode), 120);
        });
      }

      updateModeStatus();
      updateStepStatus();
    };

    const canAnimate = () => inView && !paused && !interacting && !lockedId && !reduceMotion;

    const syncPauseControl = () => {
      if (!pauseButton) return;
      if (reduceMotion || compactLayout) {
        pauseButton.textContent = "Manual walkthrough";
        pauseButton.disabled = true;
        pauseButton.setAttribute("aria-pressed", "true");
        return;
      }

      pauseButton.disabled = false;
      pauseButton.setAttribute("aria-pressed", String(paused || completed));
      pauseButton.textContent = completed
        ? "Replay walkthrough"
        : paused
          ? "Play walkthrough"
          : "Pause walkthrough";
    };

    const scheduleCycle = () => {
      clearTimer();
      if (!canAnimate()) return;

      timer = window.setTimeout(() => {
        if (stepIndex >= walkthroughSteps.length - 1) {
          completed = true;
          paused = true;
          syncPauseControl();
          clearTimer();
          return;
        }

        activateStep(stepIndex + 1);
        scheduleCycle();
      }, 4500);
    };

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.dataset.demoMode);
        scheduleCycle();
      });
    });

    stepButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        paused = true;
        completed = false;
        clearTimer();
        clearHighlights();
        activateStep(index);
        syncPauseControl();
      });
    });

    tokens.forEach((token) => {
      writeToken(token, mode);
      token.setAttribute("role", "button");
      token.setAttribute("aria-pressed", "false");

      token.addEventListener("pointerenter", () => {
        interacting = true;
        clearTimer();
        highlightEntity(token.dataset.entityId, token);
      });

      token.addEventListener("pointerleave", () => {
        interacting = false;
        if (lockedId) highlightEntity(lockedId);
        else {
          clearHighlights();
          renderStoryHighlights();
        }
        scheduleCycle();
      });

      token.addEventListener("focus", () => {
        interacting = true;
        clearTimer();
        highlightEntity(token.dataset.entityId, token);
      });

      token.addEventListener("blur", () => {
        interacting = false;
        if (lockedId) highlightEntity(lockedId);
        else {
          clearHighlights();
          renderStoryHighlights();
        }
        scheduleCycle();
      });

      const toggleLock = () => {
        lockedId = lockedId === token.dataset.entityId ? null : token.dataset.entityId;
        syncPressedState();
        if (lockedId) highlightEntity(lockedId, token);
        else {
          clearHighlights();
          renderStoryHighlights();
        }
        scheduleCycle();
      };

      token.addEventListener("click", toggleLock);
      token.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleLock();
      });
    });

    if (pauseButton) {
      if (!reduceMotion && !compactLayout) {
        pauseButton.addEventListener("click", () => {
          if (completed) {
            completed = false;
            paused = false;
            clearHighlights();
            activateStep(0);
            syncPauseControl();
            scheduleCycle();
            return;
          }

          paused = !paused;
          if (paused) {
            clearTimer();
          } else {
            scheduleCycle();
          }
          syncPauseControl();
        });
      }
      syncPauseControl();
    }

    activateStep(0);
    updateModeStatus();

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          if (inView) scheduleCycle();
          else clearTimer();
        },
        { threshold: 0.18 },
      );
      observer.observe(demo);
    } else {
      inView = true;
      scheduleCycle();
    }
  });

  const ridgeData = window.MemoReasonRidgeData;
  const ridgeCharts = [...document.querySelectorAll("[data-ridge-model]")];

  if (ridgeData?.models?.length && ridgeCharts.length) {
    const svgNamespace = "http://www.w3.org/2000/svg";
    const width = 1000;
    const height = 64;
    const baseline = 52;
    const amplitude = 42;
    const [sourceDomainMin] = ridgeData.domain;
    const domainMin = -14;
    const domainMax = 0;
    const modelById = new Map(ridgeData.models.map((model) => [model.id, model]));
    const sharedDensityMaximum = Math.max(
      ...ridgeData.models.flatMap((model) => model.density),
    );

    const xPosition = (value) => ((value - domainMin) / (domainMax - domainMin)) * width;
    const percentPosition = (value) => ((value - domainMin) / (domainMax - domainMin)) * 100;

    ridgeCharts.forEach((chart) => {
      const model = modelById.get(chart.dataset.ridgeModel);
      if (!model) return;

      const points = model.density
        .map((density, index) => ({
          density,
          value: sourceDomainMin + index * ridgeData.renderedStepPp,
        }))
        .filter(({ value }) => value >= domainMin - 0.0001 && value <= domainMax + 0.0001)
        .map(({ density, value }) => [
          xPosition(value),
          baseline - (density / sharedDensityMaximum) * amplitude,
        ]);
      const outline = points
        .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
        .join(" ");
      const area = `M0 ${baseline} ${outline.replace(/^M/, "L")} L${width} ${baseline} Z`;
      const gradientId = `ridge-fill-${model.id.replace(/[^a-z0-9-]/gi, "-")}`;
      const meanX = xPosition(model.mean);
      const ciStart = xPosition(model.ci[0]);
      const ciEnd = xPosition(model.ci[1]);
      const gridLines = [-12, -10, -8, -6, -4, -2]
        .map((value) => `<line class="ridge-grid" x1="${xPosition(value)}" x2="${xPosition(value)}" y1="6" y2="57" />`)
        .join("");

      const svg = document.createElementNS(svgNamespace, "svg");
      svg.classList.add("ridge-svg");
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = `
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e6ae69" stop-opacity="0.44" />
            <stop offset="100%" stop-color="#f4d9b6" stop-opacity="0.15" />
          </linearGradient>
        </defs>
        ${gridLines}
        <line class="ridge-zero" x1="${xPosition(0)}" x2="${xPosition(0)}" y1="4" y2="58" />
        <line class="ridge-baseline" x1="0" x2="${width}" y1="${baseline}" y2="${baseline}" />
        <path class="ridge-area" d="${area}" fill="url(#${gradientId})" />
        <path class="ridge-outline" d="${outline}" />
        <line class="ridge-ci-line" x1="${ciStart}" x2="${ciEnd}" y1="${baseline}" y2="${baseline}" />
      `;

      const meanDot = document.createElement("span");
      meanDot.className = "ridge-mean-dot";
      meanDot.style.setProperty("--mean-position", `${percentPosition(model.mean)}%`);
      meanDot.setAttribute("aria-hidden", "true");
      chart.replaceChildren(svg, meanDot);
      chart.classList.add("is-ready");
    });
  }

  const table2Data = window.MemoReasonTable2Data;
  const effectAtlas = document.querySelector("[data-effect-atlas]");

  if (table2Data?.models?.length && effectAtlas) {
    const answerButtons = [...effectAtlas.querySelectorAll("[data-atlas-answer]")];
    const questionButtons = [...effectAtlas.querySelectorAll("[data-atlas-question]")];
    const panel = effectAtlas.querySelector("[data-atlas-panel]");
    const grid = effectAtlas.querySelector("[data-atlas-grid]");
    const takeaway = effectAtlas.querySelector("[data-atlas-takeaway]");
    const selectionTitle = effectAtlas.querySelector("[data-atlas-selection-title]");
    const selectionValue = effectAtlas.querySelector("[data-atlas-selection-value]");
    const selectionCi = effectAtlas.querySelector("[data-atlas-selection-ci]");
    const selectionStatus = effectAtlas.querySelector("[data-atlas-selection-status]");
    const [domainMin, domainMax] = table2Data.domain;
    const zeroPosition = ((0 - domainMin) / (domainMax - domainMin)) * 100;
    const questionLabels = {
      arithmetic: "Arithmetic",
      temporal: "Temporal",
      inference: "Inference",
      reasoning: "Reasoning",
      extractive: "Extractive",
    };
    const answerLabels = {
      variant: "Variant",
      invariant: "Invariant",
      refusal: "Refusal",
    };
    const takeaways = {
      variant:
        "<strong>Variant:</strong> all 9 models lose aggregate reasoning accuracy; inference declines significantly for 8 of 9.",
      invariant:
        "<strong>Invariant:</strong> only 3 of 9 models show a significant aggregate decline, with no uniform per-class pattern.",
      refusal:
        "<strong>Refusal:</strong> 3 of 9 aggregate shifts are significant, split between one decrease and two increases.",
    };

    let activeAnswer = "variant";
    let activeQuestion = "reasoning";
    let selectedModelId = table2Data.models[0].id;

    const signedNumber = (value) => {
      const normalized = Math.abs(value) < 0.05 ? (value < 0 ? -0 : 0) : value;
      const sign = normalized < 0 || Object.is(normalized, -0) ? "−" : "+";
      return `${sign}${Math.abs(normalized).toFixed(1)}`;
    };

    const intervalText = ([lower, upper]) => `[${signedNumber(lower)}, ${signedNumber(upper)}]`;
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const setRovingTab = (buttons, activeButton) => {
      buttons.forEach((button) => {
        const active = button === activeButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
      });
    };

    const bindArrowNavigation = (buttons, activate) => {
      buttons.forEach((button, index) => {
        button.addEventListener("keydown", (event) => {
          let nextIndex = null;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            nextIndex = (index + 1) % buttons.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            nextIndex = (index - 1 + buttons.length) % buttons.length;
          } else if (event.key === "Home") {
            nextIndex = 0;
          } else if (event.key === "End") {
            nextIndex = buttons.length - 1;
          }

          if (nextIndex === null) return;
          event.preventDefault();
          activate(buttons[nextIndex]);
          buttons[nextIndex].focus();
        });
      });
    };

    const findResult = (modelId, answer, question) =>
      table2Data.models.find((model) => model.id === modelId)?.results?.[answer]?.[question];

    const updateSelection = (modelId, question, focusCell = false) => {
      const model = table2Data.models.find((candidate) => candidate.id === modelId);
      const result = findResult(modelId, activeAnswer, question);
      if (!model || !result) return;

      selectedModelId = modelId;
      activeQuestion = question;
      effectAtlas.dataset.activeQuestion = activeQuestion;

      const selectedQuestionButton = questionButtons.find(
        (button) => button.dataset.atlasQuestion === activeQuestion,
      );
      if (selectedQuestionButton) setRovingTab(questionButtons, selectedQuestionButton);

      grid.querySelectorAll(".effect-atlas-cell").forEach((cell) => {
        const selected =
          cell.dataset.model === selectedModelId && cell.dataset.question === activeQuestion;
        cell.setAttribute("aria-pressed", String(selected));
      });

      const direction = result.mean < 0 ? "decrease" : "increase";
      selectionTitle.textContent = `${model.label} · ${answerLabels[activeAnswer]} · ${questionLabels[question]}`;
      selectionValue.innerHTML = `${signedNumber(result.mean)} <small>pp</small>`;
      selectionCi.textContent = `95% CI ${intervalText(result.ci)}`;
      selectionStatus.textContent = result.significant
        ? `Significant ${direction}`
        : "Interval includes zero";

      if (focusCell) {
        grid
          .querySelector(
            `.effect-atlas-cell[data-model="${modelId}"][data-question="${question}"]`,
          )
          ?.focus();
      }
    };

    const makeCell = (model, question) => {
      const result = model.results[activeAnswer][question];
      const negative = result.mean < 0;
      const strength = clamp(Math.abs(result.mean) / 16, 0, 1);
      const alpha = (negative ? 0.07 : 0.055) + strength * (negative ? 0.25 : 0.2);
      const hoverAlpha = Math.min(alpha + 0.055, 0.4);
      const rgb = negative ? "230, 174, 105" : "94, 116, 98";
      const valuePosition =
        clamp((result.mean - domainMin) / (domainMax - domainMin), 0, 1) * 100;
      const barLeft = Math.min(valuePosition, zeroPosition);
      const barWidth = Math.abs(valuePosition - zeroPosition);

      const wrapper = document.createElement("div");
      wrapper.className = `effect-atlas-cell-wrap${question === "reasoning" ? " is-reasoning" : ""}`;
      wrapper.dataset.question = question;
      wrapper.setAttribute("role", "cell");

      const button = document.createElement("button");
      button.type = "button";
      button.className = `effect-atlas-cell is-${negative ? "decrease" : "increase"}${result.significant ? " is-significant" : ""}`;
      button.dataset.model = model.id;
      button.dataset.question = question;
      button.style.setProperty("--cell-fill", `rgba(${rgb}, ${alpha.toFixed(3)})`);
      button.style.setProperty("--cell-fill-hover", `rgba(${rgb}, ${hoverAlpha.toFixed(3)})`);
      button.style.setProperty("--cell-ink", negative ? "#8e5928" : "#4f6655");
      button.style.setProperty("--meter-color", negative ? "#d6974c" : "#5e7462");
      button.style.setProperty("--zero-position", `${zeroPosition}%`);
      button.style.setProperty("--bar-left", `${barLeft}%`);
      button.style.setProperty("--bar-width", `${barWidth}%`);
      button.setAttribute(
        "aria-label",
        `${model.label}, ${answerLabels[activeAnswer]} answer, ${questionLabels[question]} questions: ${signedNumber(result.mean)} percentage points; 95% confidence interval ${intervalText(result.ci)}; ${result.significant ? "interval excludes zero" : "interval includes zero"}.`,
      );
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `
        <span class="effect-atlas-value">${signedNumber(result.mean)}</span>
        <span class="effect-atlas-ci">${intervalText(result.ci)}</span>
        <span class="effect-atlas-meter" aria-hidden="true"><i></i></span>
      `;
      button.addEventListener("click", () => updateSelection(model.id, question));
      button.addEventListener("focus", () => updateSelection(model.id, question));
      wrapper.append(button);
      return wrapper;
    };

    const renderAtlas = () => {
      grid.replaceChildren();
      grid.setAttribute("role", "table");
      grid.setAttribute(
        "aria-label",
        `${answerLabels[activeAnswer]} answer performance changes by model and question type`,
      );

      const header = document.createElement("div");
      header.className = "effect-atlas-row is-header";
      header.setAttribute("role", "row");

      const modelHeader = document.createElement("div");
      modelHeader.className = "effect-atlas-model-heading";
      modelHeader.setAttribute("role", "columnheader");
      modelHeader.textContent = "Model";
      header.append(modelHeader);

      table2Data.questionTypes.forEach((question) => {
        const questionHeader = document.createElement("div");
        questionHeader.className = `effect-atlas-question-heading${question === "reasoning" ? " is-reasoning" : ""}`;
        questionHeader.dataset.question = question;
        questionHeader.setAttribute("role", "columnheader");
        questionHeader.innerHTML = `${questionLabels[question]}${question === "reasoning" ? "<small>aggregate</small>" : ""}`;
        header.append(questionHeader);
      });
      grid.append(header);

      table2Data.models.forEach((model) => {
        const row = document.createElement("div");
        row.className = "effect-atlas-row";
        row.setAttribute("role", "row");

        const modelName = document.createElement("div");
        modelName.className = "effect-atlas-model";
        modelName.setAttribute("role", "rowheader");
        modelName.textContent = model.label;
        row.append(modelName);

        table2Data.questionTypes.forEach((question) => row.append(makeCell(model, question)));
        grid.append(row);
      });

      const activeTab = answerButtons.find(
        (button) => button.dataset.atlasAnswer === activeAnswer,
      );
      panel.setAttribute("aria-labelledby", activeTab.id);
      takeaway.innerHTML = takeaways[activeAnswer];
      updateSelection(selectedModelId, activeQuestion);
    };

    const activateAnswer = (button) => {
      activeAnswer = button.dataset.atlasAnswer;
      setRovingTab(answerButtons, button);
      renderAtlas();
    };

    const activateQuestion = (button) => {
      activeQuestion = button.dataset.atlasQuestion;
      setRovingTab(questionButtons, button);
      updateSelection(selectedModelId, activeQuestion);
    };

    answerButtons.forEach((button) =>
      button.addEventListener("click", () => activateAnswer(button)),
    );
    questionButtons.forEach((button) =>
      button.addEventListener("click", () => activateQuestion(button)),
    );
    bindArrowNavigation(answerButtons, activateAnswer);
    bindArrowNavigation(questionButtons, activateQuestion);
    effectAtlas.dataset.activeQuestion = activeQuestion;
    renderAtlas();
  }
})();

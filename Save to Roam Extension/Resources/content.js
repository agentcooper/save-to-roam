/**
 *
 * @param {() => void} code
 * @param  {...any} args
 */
function run(code, ...args) {
  const actualCode =
    "(" + code + ")(" + args.map((arg) => JSON.stringify(arg)).join(",") + ");";
  const script = document.createElement("script");
  script.textContent = actualCode;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

/**
 *
 * @param {string} selector
 * @returns Promise<any>
 */
function waitFor(selector) {
  return new Promise((resolve) => {
    (function tick() {
      const element = document.querySelector(selector);

      if (!element) {
        setTimeout(tick, 500);
        return;
      }

      resolve();
    })();
  });
}

waitFor(".roam-body-main").then(() => {
  browser.runtime.sendMessage({ type: "roam-ready" });
});

browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "ping") {
    sendResponse("pong");
    return;
  }

  if (request.type === "add-block") {
    console.log("Ready!");

    window.addEventListener(
      "page-res",
      function (evt) {
        // @ts-ignore
        sendResponse(evt.detail.success ? "OK" : "Not OK");
      },
      {
        once: true,
      }
    );
    run(
      (
        /** @type {any} */ title,
        /** @type {any} */ url,
        /** @type {any} */ text
      ) => {
        try {
          function dispatch(params) {
            window.dispatchEvent(
              new CustomEvent("page-res", { detail: params })
            );
          }

          function dailyNoteUID() {
            const [yyyy, mm, dd] = new Date()
              .toISOString()
              .slice(0, 10)
              .split("-");
            return [mm, Number(dd) + 1, yyyy].join("-");
          }
          // @ts-ignore
          const createResult = window.roamAlphaAPI.createBlock({
            block: { string: `[${title}](${url}) ${text}` },
            location: { "parent-uid": dailyNoteUID(), order: 0 },
          });
          dispatch({ success: createResult });
        } catch (e) {
          dispatch({ success: false });
        }
      },
      request.title,
      request.url,
      request.text || "?"
    );
  }
});

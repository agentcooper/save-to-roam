/**
 *
 * @param {() => void} code
 * @param  {...unknown} args
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
 * @returns Promise<void>
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
        sendResponse(evt.detail.success ? "Done" : "Error");
      },
      {
        once: true,
      }
    );
    run(
      (
        /** @type {string} */ title,
        /** @type {string} */ url,
        /** @type {string} */ text,
        /** @type {string} */ tag
      ) => {
        try {
          /**
           * @param {Record<string, unknown>} params
           */
          function dispatch(params) {
            window.dispatchEvent(
              new CustomEvent("page-res", { detail: params })
            );
          }

          function dailyNoteUID() {
            const isoString = new Date().toISOString();

            const [yyyy, mm, dd] = isoString.slice(0, 10).split("-");
            console.log(isoString);

            return [mm, Number(dd), yyyy].join("-");
          }

          function getMarkdown(title, url, text, tag) {
            const link = `[${title}](${url})`;
            return [link, text, tag ? `#[[${tag}]]` : ""].join(" ");
          }

          const block = {
            block: { string: getMarkdown(title, url, text, tag) },
            location: { "parent-uid": dailyNoteUID(), order: 0 },
          };
          console.log("[Save to Roam] Creating block", block);

          // @ts-ignore
          const createResult = window.roamAlphaAPI.createBlock(block);
          dispatch({ success: createResult });
        } catch (e) {
          dispatch({ success: false });
        }
      },
      request.title,
      request.url,
      request.text,
      request.tag
    );
  }
});

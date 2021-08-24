/**
 * Run the code in the page context to get access to the global variables.
 *
 * @param {{ code: () => void, prefix: string }} options
 * @param  {...unknown} args
 */
function run({ code, prefix }, ...args) {
  const actualCode =
    prefix +
    "\n\n(" +
    code +
    ")(" +
    args.map((arg) => JSON.stringify(arg)).join(",") +
    ");";
  const script = document.createElement("script");
  script.textContent = actualCode;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

/**
 *
 * @param {string} selector
 * @param {number} timeout
 * @returns Promise<void>
 */
function waitFor(selector, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        `couldn't find selector '${selector}', please verify that you're logged in to Roam Research in Safari`
      );
    }, timeout);

    (function tick() {
      console.log(`[Save to Roam] Tick`);
      const element = document.querySelector(selector);

      if (!element) {
        setTimeout(tick, 500);
        return;
      }

      clearTimeout(timeoutId);
      resolve();
    })();
  });
}

const selector = ".roam-body-main";
console.log(`[Save to Roam] Waiting for selector '${selector}'`);
waitFor(selector, 15000).then(
  () => {
    console.log(
      `[Save to Roam] Found selector '${selector}', sending a message`
    );
    browser.runtime.sendMessage({ type: "roam-page", success: true });
  },
  (e) => {
    console.log(`[Save to Roam] Error: ${e}`);
    browser.runtime.sendMessage({
      type: "roam-page",
      success: false,
      error: `❌ Error: ${e}`,
    });
  }
);

browser.runtime.onMessage.addListener(
  async (
    /** @type {{ type: string; title: string; url: string; text: string; tag: string; templateFunction: string }} */ request,
    /** @type {any} */ sender,
    /** @type {(arg0: string) => void} */ sendResponse
  ) => {
    if (request.type !== "add-block") {
      return;
    }
    window.addEventListener(
      "page-res",
      /**
       * @param {CustomEvent} event
       */
      (event) => {
        sendResponse(
          event.detail.success ? "Done" : `❌ Error: ${event.detail.error}`
        );
      },
      {
        once: true,
      }
    );
    try {
      run(
        {
          prefix: request.templateFunction,
          code: (
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
                const now = new Date();
                return [
                  String(now.getMonth() + 1).padStart(2, "0"),
                  String(now.getDate()).padStart(2, "0"),
                  now.getFullYear(),
                ].join("-");
              }

              function useTemplate() {
                try {
                  return getMarkdown(title, url, text, tag);
                } catch (e) {
                  console.error(e);
                  return "⚠️ [Save to Roam] Error in a template function, please check your code.";
                }
              }

              const block = {
                block: { string: useTemplate() },
                location: { "parent-uid": dailyNoteUID(), order: 0 },
              };
              console.log("[Save to Roam] Creating block", block);

              // @ts-ignore
              const createResult = window.roamAlphaAPI.createBlock(block);
              dispatch({ success: createResult });
            } catch (e) {
              dispatch({ success: false, error: e });
            }
          },
        },
        request.title,
        request.url,
        request.text,
        request.tag
      );
    } catch (e) {
      console.error(e);
      sendResponse(`❌ Error: ${e}`);
    }
  }
);

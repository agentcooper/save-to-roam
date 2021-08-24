const LISTEN_TIMEOUT = 20000;

function getMarkdown(title, url, text, tag) {
  let markdown = `[${title}](${url})`;
  if (text) markdown += ` ${text}`;

  const actualTag = tag.startsWith("#") ? tag.slice(1) : tag;
  if (actualTag) markdown += ` #[[${actualTag}]]`;

  return markdown;
}

/**
 * @param {string} url
 */
async function findOrCreateTab(baseUrl, url) {
  const existingTabs = await browser.tabs.query({
    url: baseUrl,
  });

  const existingTab = existingTabs.find(
    (/** @type {{ url: string; }} */ tab) => tab.url.length > 0
  );
  if (existingTab) {
    return [existingTab, false];
  }

  const currentWindow = await browser.windows.getCurrent();

  const newWindow = await browser.windows.create({
    url,
    focused: false,
    left: currentWindow.left,
    top: currentWindow.top,
    height: currentWindow.height,
    width: currentWindow.width,
  });

  return [newWindow.tabs[0], true];
}

const form = {
  /**
   * @param {boolean} isLoading
   */
  toggleLoading(isLoading) {
    document.getElementById("loading").style.display = isLoading
      ? "inline"
      : "none";
  },

  /**
   * @param {boolean} isDisabled
   */
  disable(isDisabled) {
    const fieldset = /** @type {HTMLFieldSetElement} */ (
      document.getElementById("fieldset")
    );

    fieldset.disabled = isDisabled;
  },

  setError(message) {
    console.error(`[Save to Roam] Showing error`, message);
    this.setStatus(message);
    this.toggleLoading(false);
    this.disable(false);
  },

  /**
   * @param {string} message
   */
  setStatus(message) {
    document.getElementById("status").textContent = message;
  },

  /**
   * @param {string} id
   */
  getInput(id) {
    const input = /** @type {HTMLInputElement} */ (document.getElementById(id));
    return input;
  },

  getGraphUrl() {
    return this.getInput("graph-url-input").value;
  },

  getText() {
    return this.getInput("text-input").value;
  },

  getTag() {
    return this.getInput("tag-input").value;
  },

  getTemplateFunction() {
    return this.getInput("template-function-input").value;
  },

  init() {
    document.getElementById("form").onsubmit = async (event) => {
      event.preventDefault();

      this.setStatus("");
      this.toggleLoading(true);
      this.disable(true);

      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTab = tabs[0];

      const [roamTab, isNew] = await findOrCreateTab(
        settings.baseUrl,
        this.getGraphUrl()
      );

      const callRoamAPI = async () => {
        const message = {
          type: "add-block",
          url: currentTab.url,
          title: currentTab.title,
          text: form.getText(),
          tag: form.getTag(),
          templateFunction: form.getTemplateFunction(),
        };
        console.log(`[Save to Roam] Calling Roam page API`, message);
        const result = await browser.tabs.sendMessage(roamTab.id, message);
        console.log(`[Save to Roam] Got result from Roam page API`, result);
        this.setStatus(result);
        this.toggleLoading(false);
        this.disable(false);
      };

      if (isNew) {
        console.log(
          `[Save to Roam] New tab, waiting for the message from the Roam tab`,
          roamTab
        );
        listenOnce((/** @type {{ type: string; success: true }} */ request) => {
          console.log(`[Save to Roam] Got request`, request);

          // @ts-ignore
          if (request.error) {
            // @ts-ignore
            this.setError(request.error);
            return;
          }

          callRoamAPI();
        }, LISTEN_TIMEOUT);
      } else {
        console.log(`[Save to Roam] Existing tab`, roamTab);
        await delay(200);
        callRoamAPI();
      }
    };

    settings.init();
  },
};

const settings = {
  keys: {
    graphUrl: "graphUrl",
    templateFunction: "templateFunction_v1",
  },

  baseUrl: "https://roamresearch.com/",
  graphUrl: "https://roamresearch.com/#/app/WTF",

  async getStoredTemplateFunction() {
    const results = await browser.storage.local.get(this.keys.templateFunction);
    if (results.templateFunction) {
      return results.templateFunction;
    }
    return this.getDefaultTemplateFunction();
  },

  async fetchKey(name, otherwise) {
    const results = await browser.storage.local.get(name);
    if (results[name]) {
      return results[name];
    }
    return otherwise;
  },

  async load() {
    try {
      browser.tabs.executeScript(
        {
          code: "window.getSelection().toString();",
        },
        (selection) => {
          form.getInput("text-input").value = selection[0] || "";
        }
      );
    } catch (e) {
      console.error(`[Save to Roam] Could not execute script`, e);
    }

    form.getInput("template-function-input").value = await this.fetchKey(
      this.keys.templateFunction,
      this.getDefaultTemplateFunction()
    );

    form.getInput("graph-url-input").value = await this.fetchKey(
      this.keys.graphUrl,
      ""
    );

    this.toggleWarning(form.getInput("graph-url-input").value);
  },

  toggleWarning(value) {
    const hasValue = value.trim().length > 0;
    form.disable(!hasValue);
    form.setStatus(hasValue ? "" : "⚠️ Set graph URL in settings.");
  },

  init() {
    var details = document.querySelector("details");
    details.addEventListener("toggle", () => {
      const isOpen = details.hasAttribute("open");
      document.querySelector("body").style.width = isOpen ? "500px" : "180px";
    });

    document.getElementById("reset-button").onclick = async (event) => {
      event.preventDefault();
      await browser.storage.local.remove(this.keys.templateFunction);
      await this.load();
    };

    form.getInput("template-function-input").oninput = () => {
      const value = form.getTemplateFunction();
      browser.storage.local.set({ [this.keys.templateFunction]: value });
    };

    form.getInput("graph-url-input").oninput = () => {
      const value = form.getGraphUrl();
      browser.storage.local.set({ [this.keys.graphUrl]: value });
      this.toggleWarning(value);
    };

    this.load();
  },

  getDefaultTemplateFunction() {
    return `
/**
 * @returns {string} Markdown string to be insterted into Roam.
 */
${getMarkdown.toString()}
`.trim();
  },
};

/**
 * @param {number} ms
 */
function delay(ms) {
  return new Promise((resolve) => {
    return setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * @param {(request: any, sender: any, sendResponse: any) => void} handler
 * @param {number} timeout
 */
function listenOnce(handler, timeout) {
  let timeoutId;

  function removeListener() {
    clearTimeout(timeoutId);
    browser.runtime.onMessage.removeListener(_handler);
  }

  function _handler(/** @type {Parameters<typeof handler>} */ ...args) {
    console.log(`[Save to Roam] Got message`, args);
    handler(...args);
    removeListener();
  }

  browser.runtime.onMessage.addListener(_handler);

  timeoutId = setTimeout(() => {
    removeListener();
    handler({
      type: "timeout",
      success: false,
      error: `❌ Error: didn't get any messages from the Roam tab. Please check extension permissions. Make sure roamresearch.com is set to Allow. Then restart Safari and try again.`,
    });
  }, timeout);
}

form.init();

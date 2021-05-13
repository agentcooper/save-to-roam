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

      const send = async () => {
        const result = await browser.tabs.sendMessage(roamTab.id, {
          type: "add-block",
          url: currentTab.url,
          title: currentTab.title,
          text: form.getText(),
          tag: form.getTag(),
          templateFunction: form.getTemplateFunction(),
        });
        this.setStatus(result);
        this.toggleLoading(false);
        this.disable(false);
      };

      if (isNew) {
        listenOnce(
          async (
            /** @type {{ type: string; }} */ request,
            /** @type {any} */ sender,
            /** @type {any} */ sendResponse
          ) => {
            if (request.type === "roam-ready") {
              send();
            }
          }
        );
      } else {
        await delay(200);
        send();
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
    console.log({ name, results });
    if (results[name]) {
      return results[name];
    }
    return otherwise;
  },

  async load() {
    form.getInput("template-function-input").value = await this.fetchKey(
      this.keys.templateFunction,
      this.getDefaultTemplateFunction()
    );

    console.log("load");
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
      document.querySelector("body").style.width = isOpen ? "500px" : "150px";
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
  return new Promise((resolve, reject) => {
    return setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * @param {(request: any, sender: any, sendResponse: any) => Promise<void>} handler
 */
function listenOnce(handler) {
  const _handler = (/** @type {Parameters<typeof handler>} */ ...args) => {
    browser.runtime.onMessage.removeListener(_handler);
    handler(...args);
  };

  browser.runtime.onMessage.addListener(_handler);
}

form.init();

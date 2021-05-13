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
 * @param {string} message
 */
function setStatus(message) {
  document.getElementById("status").textContent = message;
}

/**
 * @param {string} url
 */
async function findOrCreateTab(url) {
  const existingTabs = await browser.tabs.query({
    url: "https://roamresearch.com/",
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

function getText() {
  const input = /** @type {HTMLInputElement} */ (
    document.getElementById("text-input")
  );
  return input.value;
}

function getTag() {
  const input = /** @type {HTMLInputElement} */ (
    document.getElementById("tag-input")
  );
  return input.value;
}

function toggleForm(disabled) {
  document.getElementById("loading").style.display = disabled
    ? "inline"
    : "none";

  const fieldset = /** @type {HTMLFieldSetElement} */ (
    document.getElementById("fieldset")
  );

  fieldset.disabled = disabled;
}

document.getElementById("form").onsubmit = async (event) => {
  event.preventDefault();

  setStatus("");
  toggleForm(true);

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  const [roamTab, isNew] = await findOrCreateTab(
    "https://roamresearch.com/#/app/WTF"
  );

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

  async function send() {
    const result = await browser.tabs.sendMessage(roamTab.id, {
      type: "add-block",
      url: currentTab.url,
      title: currentTab.title,
      text: getText(),
      tag: getTag(),
    });
    toggleForm(false);
    setStatus(result);
  }
};

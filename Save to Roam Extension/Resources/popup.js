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
    (/** @type {{ url: string | any[]; }} */ tab) => tab.url.length > 0
  );
  if (existingTab) {
    return [existingTab, false];
  }

  const newWindow = await browser.windows.create({
    url,
    focused: false,
    height: 100,
    width: 100,
  });

  return [newWindow.tabs[0], true];
}

/**
 * @param {{ (request: any, sender: any, sendResponse: any): Promise<void>; (arg0: any): void; }} handler
 */
function listenOnce(handler) {
  const _handler = (/** @type {any[]} */ ...args) => {
    browser.runtime.onMessage.removeListener(_handler);
    // @ts-ignore
    handler(...args);
  };

  browser.runtime.onMessage.addListener(_handler);
}

document.getElementById("btn").onclick = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];

  const [roamTab, isNew] = await findOrCreateTab(
    "https://roamresearch.com/#/app/WTF"
  );

  if (isNew) {
    setStatus("Launching Roam...");

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
    send();
  }

  async function send() {
    const result = await browser.tabs.sendMessage(roamTab.id, {
      type: "add-block",
      url: currentTab.url,
      title: currentTab.title,
      text: "bla",
    });
    setStatus(result);
  }
};

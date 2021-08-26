☕️ [Buy me a coffee](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=SC4D2NS8G2JJ8&source=url)

# Save to Roam for Safari
Safari extension for [Roam Research](https://roamresearch.com).

The extension opens the Roam Research (or reuse an existing window) in the background and communicates with it using the JavaScript API.

Demo:

![Demo video](https://user-images.githubusercontent.com/794591/122137950-10cf8480-ce46-11eb-89e8-a469308b54af.gif)

## Install and run

Install [Save to Roam from macOS App Store](https://apps.apple.com/us/app/save-to-roam/id1578763303).

## Install and run (without App Store) 

1. Download the [latest release](https://github.com/agentcooper/save-to-roam/releases).
2. Move `Save to Roam.app` to Applications, then open.
3. Go to Safari, from the top menu > `Preferences` > `Advanced` > `Show Develop menu in menu bar`.
4. From the top menu > `Develop` > `Allow Unsigned Extensions`.
5. Enable the extension in `Preferences` > `Extensions`.

If you save and see the loading indicator hanging, check if there is a pending permission request in the other Safari window with Roam.

⚠️ You will need to do step 4 every time you open Safari (this is a limitation for extensions installed not from the App Store).

## How to use

1. Make sure you're logged in to [Roam Research](http://roamresearch.com) in Safari.
2. Go to some page you want to save (e.g. https://en.wikipedia.org/wiki/Memex) and click the extension icon.
3. If you're using the extension for the first time, click on "Settings" and fill the "Graph url" input (it should look like `https://roamresearch.com/#/app/YOUR-GRAPH-NAME`).
4. Click "Save".
5. The spinner takes some time if the extension can't find the open tab with Roam Research. In that case it will open it in the foreground window. Otherwise, an existing tab will be used.
6. Verify your highlight by opening your Daily Notes in Roam Research.

If you see the warning icon on the extension icon, you need to click it and allow the extension to access Roam Research website. If you don't see the warning icon, but the spinner is taking to long, please check other windows in Safari (Top Menu > Window), the warning icon might appear there.

## Development

1. Clone the project.
2. Open with [Xcode](https://apps.apple.com/us/app/xcode/id497799835), run the project.
3. Follow step 3 to 5 from the list above.

## Troubleshooting

If you see `❌ Error: didn't get any messages from the Roam tab. Please check extension permissions. Make sure roamresearch.com is set to Allow. Then restart Safari and try again.`, then:

1. Check **all** Safari windows for the warning sign on top of the extension icon. Safari may be asking for permissions in a different window.
2. Make sure roamresearch.com is set to **Allow** in extension settings.

## Privacy policy

Save to Roam does not collect or retain any data from users.



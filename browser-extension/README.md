# Browser Extension

This directory contains the code for the browser extension that integrates with the Bookmark Managers API.

## Building the Extension

1. Navigate to this `browser-extension` directory:

   ```bash
   cd browser-extension
   ```

2. Setup environment variables:

   ```bash
   cp .env.example .env
   ```

   Customize the `.env` file with your API URL.

3. Build the extension:

   ```bash
    bun install
    bun run build # for Chrome
    bun run build:firefox # for Firefox
   ```

4. Load the extension in your browser:

   - For Chrome:
     - Go to `chrome://extensions/`
     - Enable "Developer mode"
     - Click "Load unpacked" and select the `.output/chrome-mv3` directory
   - For Firefox:
     - Go to `about:debugging#/runtime/this-firefox`
     - Click "Load Temporary Add-on" and select the `manifest.json` file in the `.output/firefox-mv2` directory

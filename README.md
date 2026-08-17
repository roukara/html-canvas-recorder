# HTML Canvas Recorder

https://github.com/user-attachments/assets/81c31b55-84dd-452d-b980-b81bbeb4210b

HTML Canvas Recorder is a Chrome extension for recording HTML5 `<canvas>` elements as video files from web pages. It is designed for local installation from this repository and works well for capturing WebGL animations, 2D canvas graphics, generative visuals, and interactive demos.

The extension runs entirely in the browser. It does not send captured frames, settings, page data, or recordings to an external service.

## Features

- Detects canvas elements in the active page and in same-tab iframes
- Lets you select a canvas from the popup or by clicking it directly on the page
- Shows numbered in-page badges and a highlight overlay for detected canvases
- Records with `MediaRecorder` or, where available, a WebCodecs MP4 path
- Supports pause and resume without splitting the output file
- Provides bitrate presets, FPS control, MIME capability detection, and auto-stop timing
- Can arm a one-shot recording and reload the page to capture from startup
- Can periodically call `requestFrame()` to help stabilize frame capture
- Stores global settings and optional per-site overrides locally
- Shows a toolbar `REC` badge while recording continues outside the popup

## Requirements

- Google Chrome or another Chromium-based browser
- Node.js 20 or newer
- pnpm 10.15 or newer

This project uses `pnpm@10.15.0`, as declared in `package.json`.

## Local Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/roukara/html-canvas-recorder.git
cd html-canvas-recorder
pnpm install
```

Build the extension:

```bash
pnpm build
```

Load the built extension in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's `dist/` directory.

Chrome will keep using that local `dist/` folder. After pulling updates from the repository, run `pnpm install` if dependencies changed, run `pnpm build`, then click the extension's reload button on `chrome://extensions`.

## Usage

1. Open a page that renders one or more `<canvas>` elements.
2. Click the HTML Canvas Recorder extension icon.
3. Select a canvas from the list, or click **Pick on page** and choose the canvas directly in the page.
4. Adjust recording settings if needed.
5. Click **Start recording**.
6. Click **Stop & save** to download the video file.

When a start delay is configured, an in-page countdown appears before capture starts. To capture from the beginning of a page load, use **Arm & reload**. The extension stores a one-shot reservation, reloads the page, and starts recording once the selected canvas is available with a non-zero size.

Downloaded files use this pattern:

```text
canvas-{id}-{timestamp}.{extension}
```

## Settings

- **FPS:** target capture frame rate. The default is 60 FPS.
- **Bitrate:** preset video bitrate values, such as 1, 2, 4, 6, 8, 10, 12, or 16 Mbps.
- **Encoding:** `MediaRecorder` for broad browser support, or WebCodecs MP4 where supported.
- **Format:** MIME options are checked with `MediaRecorder.isTypeSupported`; unsupported options are disabled.
- **Start delay:** waits before recording and shows a countdown in the page.
- **Frame pump:** periodically calls `requestFrame()` on the canvas capture track.
- **Auto stop:** stops recording after the configured number of seconds.
- **Site profile:** saves settings for the current host. Turning it off removes the host override and returns to global settings.

## Permissions And Privacy

The extension requests these permissions:

- `storage`
- `scripting`
- `activeTab`
- `tabs`
- `webNavigation`
- host access for `http://*/*` and `https://*/*`

These permissions are used to inject the content script, scan canvases, communicate with frames, keep recording state, support keyboard shortcuts, and store local settings.

Privacy behavior:

- No external network requests are made by the extension.
- Recordings are generated locally in the browser and saved through a local download.
- Settings and transient recording state are stored with Chrome extension local storage.
- The extension does not collect analytics.

See [PRIVACY.md](./PRIVACY.md) for a concise privacy statement.

## Browser Support

HTML Canvas Recorder targets Chromium-based browsers that support:

- `HTMLCanvasElement.captureStream()`
- `MediaRecorder`
- `MediaRecorder.isTypeSupported()`

MP4 support depends on the browser and platform. WebCodecs MP4 recording also requires `VideoEncoder` support. The popup disables unsupported MIME options where support can be detected.

## Known Limitations

- Audio capture is not supported.
- Tab-level capture and DOM overlay capture are not supported.
- Cross-origin canvas tainting can prevent thumbnail extraction, but it does not necessarily prevent recording.
- Background tabs may drop frames because browsers throttle rendering work. The frame pump option can help in some cases.
- Some pages block extension content scripts through browser or site constraints.

## Troubleshooting

- **No canvases appear:** reload the target page, open the popup again, and confirm that the page uses real `<canvas>` elements.
- **The selected canvas is blank:** wait until the page finishes rendering, scan again, or use **Arm & reload** for startup capture.
- **The output has fewer frames than expected:** keep the tab visible, lower FPS, or enable the frame pump option.
- **A format is disabled:** the current browser does not report support for that MIME type.
- **The extension did not update after pulling changes:** run `pnpm build`, then reload the unpacked extension on `chrome://extensions`.

## Development

Run the popup preview:

```bash
pnpm dev:popup
```

The popup preview uses a mocked Chrome API from `src/popup/dev/mock-chrome.ts`. It is useful for UI work, but it does not control a live browser tab.

Build for local extension loading:

```bash
pnpm build
```

Run linting:

```bash
pnpm lint
```

Format and lint:

```bash
pnpm check
```

## Project Structure

```text
.
├── icons/                 Extension icons
├── src/
│   ├── background.ts      Manifest V3 service worker
│   ├── content/           Content script, canvas scanning, recording, overlays
│   ├── popup/             React popup UI
│   ├── settings.ts        Settings defaults and storage helpers
│   └── types.ts           Shared TypeScript types
├── manifest.json          Chrome extension manifest
├── vite.config.ts         Vite and CRX build configuration
└── package.json           Scripts and dependencies
```

## Contributing

Issues and pull requests are welcome. For changes that affect recording behavior, please include a short manual test note with the browser version, target page type, selected encoder, MIME type, FPS, and bitrate.

Before opening a pull request, run:

```bash
pnpm install
pnpm check
pnpm build
```

## License

MIT. See [LICENSE](./LICENSE).

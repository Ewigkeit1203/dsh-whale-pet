# vendor/live2d

Third-party Live2D code used by `live2d/runtime.ts` and embedded into `lib/client.js` by `build.js`. See [docs/THIRD_PARTY_NOTICES.md](../../docs/THIRD_PARTY_NOTICES.md).

- `CubismWebFramework/` — unmodified copy of Live2D Cubism Web Framework 5-r.5 (`src/`, `Shaders/`), Live2D Open Software License. Source commit in `VERSION.txt`.
- `Core/` — Live2D Cubism Core from Cubism SDK for Web 5-r.5. Download it yourself from https://www.live2d.com/sdk/download/web/ (accepting the Live2D Proprietary Software License) and copy the SDK's `Core` folder here. Only the files listed in `RedistributableFiles.txt` may be redistributed. Without `Core/live2dcubismcore.min.js`, `npm run build` still works and produces an illustrations-only bundle.

Updating: replace both folders with the same SDK release, rebuild, run the tests and check the model in DSH (moc3 version support is reported in the Core changelog).

The DeepSeek-chan (大肥鱼) model is never stored in this repository.

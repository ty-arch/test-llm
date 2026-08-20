import { heroui } from "@heroui/theme";

// `@plugin` loads the default export as the plugin itself. `heroui` is a
// factory that returns the plugin (`{ handler, config }`), so it must be
// *called* here — exporting the bare function would pass Tailwind's plugin
// API object in as `config` and discard the returned plugin, registering
// nothing.
export default heroui();

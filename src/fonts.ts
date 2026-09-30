// Self-hosted Dataslate fonts (docs/dataslate-migration.md §2). Bundled
// rather than loaded from Google so the app keeps its type offline: the
// woff2 files land in the PWA precache with the rest of the build. Each
// per-weight stylesheet declares every subset with its unicode-range, so a
// browser only downloads the Latin and Cyrillic files it actually renders.
import "@fontsource/fira-sans-extra-condensed/500.css";
import "@fontsource/fira-sans-extra-condensed/600.css";
import "@fontsource/fira-sans-extra-condensed/700.css";
import "@fontsource/fira-sans-extra-condensed/800.css";
import "@fontsource/fira-sans-condensed/400.css";
import "@fontsource/fira-sans-condensed/500.css";
import "@fontsource/fira-sans-condensed/600.css";
import "@fontsource/fira-sans-condensed/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";

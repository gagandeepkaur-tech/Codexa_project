# Stylesheet ownership

- `../styles.css` contains the base reset, document typography, and core variables.
- The token and light-theme files here contain global custom properties and document colors.
- Reusable components own styles in `components/<Component>/`. The faculty component family shares `components/faculty/` styles.
- `components/shared/` contains reusable forms, buttons, cards, status indicators, selection controls, roster cards, and shared surface treatments. Reuse these classes instead of copying declarations into pages.
- Page and feature styles live in `pages/<feature>/`, including their workspace, theme, and responsive rules.
- Static styles formerly rendered in JSX are imported by their owning components or pages. Keep data-dependent inline values in JSX.

## Loading and cascade

`main.jsx` imports `index.css`, the ordered stylesheet entry point. It contains imports only. The original stylesheet interleaved base styles, themes, redesigns, and several overlapping breakpoints. The entry point preserves that order, including the split responsive sections, so moving files does not change precedence. The numbered responsive sections are successive portions of the original cascade, not different breakpoints.

Edit the existing owner file for a selector. Keep overrides in their existing theme or responsive section; do not append page rules to global CSS or import an entry-managed file again from JSX. New isolated components can import their own stylesheet directly. Avoid moving entry imports without checking overlapping selectors and media conditions.

CSS imported by a lazy route remains loaded after navigation. Page classes should have a feature prefix or be scoped to the page container. Login's shared form overrides use `:where(.lc-login-container)` to prevent leakage while retaining their original specificity.

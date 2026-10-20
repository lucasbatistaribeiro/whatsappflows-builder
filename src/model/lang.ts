// The languages authored content can be written in. Lives in the model because
// the templates and the sample flow are model data, and the model must not
// import from src/ui (it is shared with the Figma sandbox, which has no UI).
//
// Kept in step with `Lang` in src/ui/i18n.ts and `LangPref` in
// src/shared/messages.ts — adding a locale means widening all three.
export type TemplateLang = "en" | "pt";

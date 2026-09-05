import { loader } from "fumadocs-core/source";
import { docs } from "@/.source/server";
import { docsI18n } from "./i18n";

export const source = loader({
  baseUrl: "/developers",
  i18n: docsI18n,
  source: docs.toFumadocsSource(),
});

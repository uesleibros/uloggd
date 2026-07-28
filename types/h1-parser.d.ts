declare module "h1-parser" {
  export class HTMLElement {
    readonly tagName: string;
    readonly textContent: string;
    readonly innerText: string;
    readonly children: HTMLElement[];
    readonly parentNode: HTMLElement | null;
    readonly href: string;
    readonly className: string;
    getAttribute(name: string): string | null;
    hasAttribute(name: string): boolean;
    querySelector(selector: string): HTMLElement | null;
    querySelectorAll(selector: string): HTMLElement[];
    closest(selector: string): HTMLElement | null;
    matches(selector: string): boolean;
  }

  export class Document extends HTMLElement {
    readonly title: string;
    readonly body: HTMLElement | null;
    readonly head: HTMLElement | null;
  }

  export function parse(html: string): Document;
  export default parse;
}

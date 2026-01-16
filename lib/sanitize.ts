export const sanitizeHtml = (input: string) => {
  if (typeof window === "undefined") {
    return "";
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  const allowedTags = new Set(["DIV", "SPAN", "STYLE"]);
  const allowedAttrs = new Set(["class", "id"]);

  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.remove();
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        if (!allowedAttrs.has(attr.name) && !attr.name.startsWith("data-")) {
          child.removeAttribute(attr.name);
        }
        if (attr.name.startsWith("on")) {
          child.removeAttribute(attr.name);
        }
      });
      walk(child);
    });
  };

  if (doc.body) {
    walk(doc.body);
  }

  return doc.body?.innerHTML ?? "";
};

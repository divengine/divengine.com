export function configureMarkdown() {
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight(code, lang) {
        if (window.hljs) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        }
        return code;
      }
    });
  }
}

const ALLOWED_ATTR = ['href', 'title', 'alt', 'src', 'class', 'rel', 'target'];

export function markdownToHTML(markdown) {
  const raw = window.marked ? marked.parse(markdown ?? '') : markdown ?? '';
  if (window.DOMPurify) {
    return DOMPurify.sanitize(raw, { ALLOWED_ATTR });
  }
  return raw;
}

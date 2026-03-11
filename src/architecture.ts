import architectureCss from "./architecture-map.css";
import architectureComponent from "./architecture-component.txt";

/**
 * Returns a self-contained HTML page that renders the ArchitectureOverviewPage
 * React component. Loads React 18 + Babel standalone from CDN for in-browser
 * JSX transpilation. The component and CSS are imported as text modules.
 */
export function getArchitectureHtml(): string {
  // Build the page by concatenation to avoid template literal escaping issues
  const parts: string[] = [];

  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="en">');
  parts.push('<head>');
  parts.push('  <meta charset="UTF-8" />');
  parts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  parts.push('  <title>Architecture Overview — Cloudflare RAG Demo</title>');
  parts.push('  <link rel="icon" href="https://www.cloudflare.com/favicon.ico" />');
  parts.push('  <style>');
  parts.push(architectureCss);
  parts.push('  </style>');
  parts.push('  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>');
  parts.push('  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>');
  parts.push('</head>');
  parts.push('<body>');
  parts.push('  <div id="root"></div>');
  parts.push('  <script>');
  parts.push(architectureComponent);
  parts.push('');
  parts.push('// Mount the component');
  parts.push('const root = ReactDOM.createRoot(document.getElementById("root"));');
  parts.push('root.render(React.createElement(ArchitectureOverviewPage, {');
  parts.push('  onClose: () => { window.location.href = "/"; }');
  parts.push('}));');
  parts.push('  </script>');
  parts.push('</body>');
  parts.push('</html>');

  return parts.join('\n');
}

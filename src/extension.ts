import * as vscode from "vscode";
import { parseExplain } from "./parser/index";
import { PlanData } from "./types";

let currentPanel: vscode.WebviewPanel | undefined;
let latestPlanData: PlanData | undefined;

export const activate = (context: vscode.ExtensionContext) => {
  // Command: Visualize selected text
  context.subscriptions.push(
    vscode.commands.registerCommand("pgExplain.visualizeSelection", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);

      if (!text.trim()) {
        vscode.window.showErrorMessage(
          "No text selected. Please select EXPLAIN output first."
        );
        return;
      }

      visualize(context, text);
    })
  );

  // Command: Visualize current file
  context.subscriptions.push(
    vscode.commands.registerCommand("pgExplain.visualizeFile", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const text = editor.document.getText();
      if (!text.trim()) {
        vscode.window.showErrorMessage("The file is empty.");
        return;
      }

      visualize(context, text);
    })
  );
};

const visualize = (context: vscode.ExtensionContext, rawText: string): void => {
  let planData: PlanData;

  try {
    planData = parseExplain(rawText);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Failed to parse EXPLAIN output: ${message}`);
    return;
  }

  latestPlanData = planData;

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    // Force webview to reload so it shows the new plan (cache-bust script URL)
    currentPanel.webview.html = getWebviewContent(
      currentPanel.webview,
      context.extensionUri,
      Date.now().toString()
    );
    currentPanel.webview.postMessage({
      type: "setPlanData",
      data: planData,
      version: Date.now(),
    });
    return;
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      "pgExplainVisualizer",
      "PG Explain Visualizer",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist")],
      }
    );

    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
    });

    currentPanel.webview.onDidReceiveMessage((message) => {
      if (message.type === "ready" && latestPlanData) {
        currentPanel?.webview.postMessage({
          type: "setPlanData",
          data: latestPlanData,
          version: Date.now(),
        });
      }
    });
  }

  currentPanel.webview.html = getWebviewContent(
    currentPanel.webview,
    context.extensionUri
  );

  setTimeout(() => {
    currentPanel?.webview.postMessage({
      type: "setPlanData",
      data: planData,
      version: Date.now(),
    });
  }, 300);
};

const getWebviewContent = (
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  _cacheBust?: string
): string => {
  const scriptPath = vscode.Uri.joinPath(extensionUri, "dist", "webview.js");
  const scriptUri = webview.asWebviewUri(scriptPath);
  const scriptSrc = _cacheBust
    ? `${scriptUri.toString()}?v=${_cacheBust}`
    : scriptUri.toString();

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview.css")
  );

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>PG Explain Visualizer</title>
  <link rel="stylesheet" href="${styleUri}">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptSrc}"></script>
</body>
</html>`;
};

const getNonce = (): string => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export const deactivate = () => {};

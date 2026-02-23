import * as vscode from "vscode";
import { parseExplain } from "./parser/index";
import { PlanData } from "./types";

let currentPanel: vscode.WebviewPanel | undefined;

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

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
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
  }

  currentPanel.webview.html = getWebviewContent(
    currentPanel.webview,
    context.extensionUri
  );

  // Send data to webview once it's ready
  // Small delay to ensure the webview script is loaded
  setTimeout(() => {
    currentPanel?.webview.postMessage({
      type: "setPlanData",
      data: planData,
    });
  }, 300);

  // Also handle messages from webview requesting data
  currentPanel.webview.onDidReceiveMessage((message) => {
    if (message.type === "ready") {
      currentPanel?.webview.postMessage({
        type: "setPlanData",
        data: planData,
      });
    }
  });
};

const getWebviewContent = (webview: vscode.Webview, extensionUri: vscode.Uri): string => {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "webview.js")
  );
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
  <script nonce="${nonce}" src="${scriptUri}"></script>
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

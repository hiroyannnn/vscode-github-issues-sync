import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('GitHub Issues Sync extension is now active');

  // Register commands
  const syncCommand = vscode.commands.registerCommand('githubIssuesSync.syncNow', async () => {
    vscode.window.showInformationMessage('GitHub Issues: Sync started (not implemented yet)');
  });

  const configCommand = vscode.commands.registerCommand('githubIssuesSync.configure', async () => {
    vscode.window.showInformationMessage('GitHub Issues: Configure (not implemented yet)');
  });

  context.subscriptions.push(syncCommand, configCommand);
}

export function deactivate() {
  console.log('GitHub Issues Sync extension is now deactivated');
}

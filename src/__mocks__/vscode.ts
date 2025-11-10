/**
 * VS Code APIのモック
 */

export const authentication = {
  getSession: jest.fn(),
};

export const window = {
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn(),
  workspaceFolders: [],
  fs: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    delete: jest.fn(),
    createDirectory: jest.fn(),
  },
};

export interface ExtensionContext {
  secrets: SecretStorage;
  subscriptions: any[];
  workspaceState: any;
  globalState: any;
  extensionPath: string;
  storagePath?: string;
  globalStoragePath: string;
  logPath: string;
}

export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
  onDidChange: any;
}

export interface AuthenticationSession {
  accessToken: string;
  account: {
    id: string;
    label: string;
  };
  id: string;
  scopes: string[];
}

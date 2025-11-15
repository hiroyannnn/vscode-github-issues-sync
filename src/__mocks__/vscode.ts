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

export class Uri {
  static file(path: string): Uri {
    return new Uri(path);
  }

  constructor(public readonly path: string) {}
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class ThemeIcon {
  constructor(
    public readonly id: string,
    public readonly color?: ThemeColor
  ) {}
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  contextValue?: string;
  iconPath?: ThemeIcon;
  command?: {
    command: string;
    title: string;
    arguments?: unknown[];
  };

  constructor(label: string, _collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
  }
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => unknown> = [];

  get event() {
    return (listener: (e: T) => unknown) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const index = this.listeners.indexOf(listener);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
        },
      };
    };
  }

  fire(data: T): void {
    this.listeners.forEach((listener) => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

export interface ExtensionContext {
  secrets: SecretStorage;
  subscriptions: unknown[];
  workspaceState: unknown;
  globalState: unknown;
  extensionPath: string;
  storagePath?: string;
  globalStoragePath: string;
  logPath: string;
}

export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
  onDidChange: unknown;
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

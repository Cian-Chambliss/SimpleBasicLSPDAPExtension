import * as vscode from 'vscode';
import * as path from 'path';
import * as net from 'net';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';
import { DebugAdapterDescriptorFactory, DebugAdapterExecutable, DebugAdapterServer } from 'vscode';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('BASIC Language Support is now active! Starting up...');

    // Get the path to the interpreter
    const config = vscode.workspace.getConfiguration('basic');
    const interpreterPath = config.get<string>('interpreterPath', 'c:/dev/dap/build/Debug/basic_interpreter.exe');
    const debugPort = config.get<number>('debugPort', 4711);

    console.log('interpreterPath:', interpreterPath);

    // Set up LSP client
    const serverModule = context.asAbsolutePath(path.join('out', 'server', 'lspServer.js'));
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    const serverOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    };

    console.log('Setting up options');    
    const clientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'basic' },
            { scheme: 'file', pattern: '**/*.bas' },
            { scheme: 'file', pattern: '**/*.basic' }
        ],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/*.bas'),
        }
    };
    console.log('Starting Language Client');
    client = new LanguageClient(
        'basicLanguageServer',
        'BASIC Language Server',
        serverOptions,
        clientOptions
    );

    client.start();

    console.log('Setting up Debug Adapter Protocol');
    // Set up DAP
    const factory = new BasicDebugAdapterDescriptorFactory(interpreterPath, debugPort);
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('basic', factory));

    // Register commands
    let disposable = vscode.commands.registerCommand('basic.startDebugging', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && (editor.document.languageId === 'basic' || 
                      editor.document.fileName.endsWith('.bas') || 
                      editor.document.fileName.endsWith('.basic'))) {
            vscode.debug.startDebugging(vscode.workspace.workspaceFolders?.[0], {
                name: 'Debug BASIC Program',
                type: 'basic',
                request: 'launch',
                program: editor.document.fileName,
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
                trace: 'verbose' // <-- Add this line for trace support
            });
        } else {
            vscode.window.showErrorMessage('No BASIC file is currently open');
        }
    });

    context.subscriptions.push(disposable);

    // Register configuration change listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('basic')) {
                vscode.window.showInformationMessage('BASIC configuration changed. Please restart the extension.');
            }
        })
    );
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

class BasicDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
    constructor(private interpreterPath: string, private debugPort: number) {}

    createDebugAdapterDescriptor(session: vscode.DebugSession, executable: DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        // For now, we'll use a server-based approach
        // In a real implementation, you might want to start the interpreter as a process
        return new DebugAdapterServer(this.debugPort);
    }
}
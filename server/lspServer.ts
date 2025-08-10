import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    Hover,
    Definition,
    Location,
    Range,
    Position,
    DocumentSymbol,
    SymbolKind,
    TextEdit,
    FormattingOptions
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';

import * as cp from 'child_process';
import * as path from 'path';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// BASIC keywords
const keywords = [
    'LET', 'IF', 'THEN', 'ELSE', 'FOR', 'TO', 'STEP', 'NEXT',
    'WHILE', 'WEND', 'DO', 'LOOP', 'UNTIL', 'SUB', 'END',
    'FUNCTION', 'RETURN', 'PRINT', 'INPUT', 'READ', 'DATA',
    'RESTORE', 'DIM'
];

// BASIC built-in functions
const builtinFunctions = [
    'ABS', 'SIN', 'COS', 'TAN', 'SQRT', 'LOG', 'EXP',
    'LEN', 'MID', 'LEFT', 'RIGHT', 'VAL', 'STR'
];

connection.onInitialize((params: InitializeParams): InitializeResult => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: false,
                triggerCharacters: ['.', ' ']
            },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
            documentSymbolProvider: true,
            documentFormattingProvider: true,
            workspaceSymbolProvider: true
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
interface ExampleSettings {
    maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <ExampleSettings>(
            (change.settings.languageServerExample || defaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'languageServerExample'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
    documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    // In this simple example we get the settings for every validate run.
    const settings = await getDocumentSettings(textDocument.uri);

    // The validator creates diagnostics for all uppercase words length 2 and more
    const text = textDocument.getText();
    const pattern = /\b[A-Z]{2,}\b/g;
    let m: RegExpExecArray | null;

    let problems = 0;
    const diagnostics: any[] = [];
    var _maxNumberOfProblems = 1000;
    if( settings ) {
        _maxNumberOfProblems = settings.maxNumberOfProblems || 1000;
    }
    while ((m = pattern.exec(text)) && problems < _maxNumberOfProblems) {
        problems++;
        const diagnostic: any = {
            severity: 2, // Warning
            range: {
                start: textDocument.positionAt(m.index),
                end: textDocument.positionAt(m.index + m[0].length)
            },
            message: `${m[0]} might be a keyword`,
            source: 'ex'
        };
        if (hasDiagnosticRelatedInformationCapability) {
            diagnostic.relatedInformation = [
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Spell this correctly'
                },
                {
                    location: {
                        uri: textDocument.uri,
                        range: Object.assign({}, diagnostic.range)
                    },
                    message: 'Use all lowercase if this is not a keyword'
                }
            ];
        }
        diagnostics.push(diagnostic);
    }

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
    // Monitored files have change in VSCode
    connection.console.log('We received a file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        const completions: CompletionItem[] = [];

        // Add keywords
        keywords.forEach(keyword => {
            completions.push({
                label: keyword,
                kind: CompletionItemKind.Keyword,
                detail: 'BASIC keyword'
            });
        });

        // Add built-in functions
        builtinFunctions.forEach(func => {
            completions.push({
                label: func,
                kind: CompletionItemKind.Function,
                detail: 'Built-in function'
            });
        });

        return completions;
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
    (item: CompletionItem): CompletionItem => {
        if (item.data === 1) {
            item.detail = 'TypeScript details',
            item.documentation = 'TypeScript documentation';
        } else if (item.data === 2) {
            item.detail = 'JavaScript details',
            item.documentation = 'JavaScript documentation';
        }
        return item;
    }
);

connection.onHover((params: TextDocumentPositionParams): Hover => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { contents: [] };
    }

    const position = params.position;
    const text = document.getText();

    // Simple hover implementation
    return {
        contents: [
            {
                language: 'simplebasic',
                value: 'BASIC Simple Language'
            },
            'This is a BASIC program. You can use keywords like LET, IF, FOR, etc.'
        ]
    };
});

connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    // Simple definition implementation - could be enhanced
    return null;
});

connection.onReferences((params: TextDocumentPositionParams): Location[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    // Simple references implementation - could be enhanced
    return [];
});

connection.onDocumentSymbol((params): DocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const symbols: DocumentSymbol[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Look for function definitions
        if (trimmedLine.startsWith('FUNCTION ')) {
            const name = trimmedLine.substring(9).split('(')[0].trim();
            symbols.push({
                name: name,
                kind: SymbolKind.Function,
                range: Range.create(Position.create(index, 0), Position.create(index, line.length)),
                selectionRange: Range.create(Position.create(index, 0), Position.create(index, line.length))
            });
        }
        
        // Look for sub definitions
        if (trimmedLine.startsWith('SUB ')) {
            const name = trimmedLine.substring(4).split('(')[0].trim();
            symbols.push({
                name: name,
                kind: SymbolKind.Function,
                range: Range.create(Position.create(index, 0), Position.create(index, line.length)),
                selectionRange: Range.create(Position.create(index, 0), Position.create(index, line.length))
            });
        }
    });

    return symbols;
});

connection.onDocumentFormatting((params): TextEdit[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return [];
    }

    const text = document.getText();
    const lines = text.split('\n');
    const formattedLines: string[] = [];

    lines.forEach(line => {
        // Trim whitespace and ensure consistent formatting
        const trimmed = line.trim();
        if (trimmed.length > 0) {
            formattedLines.push(trimmed);
        }
    });

    if (formattedLines.length === 0) {
        return [];
    }

    const range = Range.create(
        Position.create(0, 0),
        Position.create(lines.length, 0)
    );

    return [TextEdit.replace(range, formattedLines.join('\n') + '\n')];
});

connection.onWorkspaceSymbol((params): any[] => {
    // Simple workspace symbol implementation
    return [];
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen(); 
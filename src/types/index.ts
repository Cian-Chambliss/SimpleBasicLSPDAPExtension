export interface BasicDocument {
    uri: string;
    content: string;
    version: number;
}

export interface BasicPosition {
    line: number;
    character: number;
}

export interface BasicRange {
    start: BasicPosition;
    end: BasicPosition;
}

export interface BasicCompletionItem {
    label: string;
    kind: number;
    detail?: string;
    documentation?: string;
}

export interface BasicDiagnostic {
    range: BasicRange;
    severity: number;
    message: string;
    source?: string;
}
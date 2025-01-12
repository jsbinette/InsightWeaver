'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TagsController } from './tagsController';

export class Commands {
    private controller: TagsController;

    constructor(controller: TagsController) {
        this.controller = controller;
    }

    refresh(): void {
        Object.keys(this.controller.tags).forEach((uri) => {
            vscode.workspace.openTextDocument(vscode.Uri.parse(uri)).then((document) => {
                this.controller.updateTags(document);
            });
        });
    }

    showSelectTag(filter?: (resource: string) => boolean, placeHolder?: string): void {
        const entries: CustomEntry[] = [];

        Object.keys(this.controller.tags).forEach((uri) => {
            const resource = vscode.Uri.parse(uri).fsPath;
            const fname = path.parse(resource).base;

            if (filter && !filter(resource)) {
                return;
            }

            Object.keys(this.controller.tags[uri]).forEach((cat) => {
                this.controller.tags[uri][cat].forEach((b) => {
                    entries.push({
                        label: b.text,
                        description: fname,
                        target: new vscode.Location(vscode.Uri.file(resource), b.range),
                    });
                });
            });
        });

        vscode.window
            .showQuickPick(entries, { placeHolder: placeHolder || 'Select tags' })
            .then((item) => {
                if (item && (item as any).target) {
                    vscode.commands.executeCommand(
                        'instructions.jumpToRange',
                        (item as any).target.uri,
                        (item as any).target.range
                    );
                }
            });
    }

    showSelectVisibleTag(): void {
        const visibleEditorUris = vscode.window.visibleTextEditors.map((te) => te.document.uri.fsPath);
        this.showSelectTag((resFsPath) => visibleEditorUris.includes(resFsPath), 'Select visible tags');
    }

    showListTags(filter?: (resource: string) => boolean): void {
        if (!vscode.window.createOutputChannel) return;

        const outputChannel = vscode.window.createOutputChannel('instructions');
        outputChannel.clear();

        const entries: { label: string; description: string; target: vscode.Location }[] = [];

        Object.keys(this.controller.tags).forEach((uri) => {
            const resource = vscode.Uri.parse(uri).fsPath;
            const fname = path.parse(resource).base;

            if (filter && !filter(resource)) {
                return;
            }

            Object.keys(this.controller.tags[uri]).forEach((cat) => {
                this.controller.tags[uri][cat].forEach((b) => {
                    entries.push({
                        label: b.text,
                        description: fname,
                        target: new vscode.Location(vscode.Uri.file(resource), b.range),
                    });
                });
            });
        });

        if (entries.length === 0) {
            vscode.window.showInformationMessage('No results');
            return;
        }

        entries.forEach((v, i) => {
            const patternA = `#${i + 1}\t${v.target.uri}#${v.target.range.start.line + 1}`;
            const patternB = `#${i + 1}\t${v.target.uri}:${v.target.range.start.line + 1}:${v.target.range.start.character + 1}`;
            const patternType = os.platform() === 'linux' ? 1 : 0;

            outputChannel.appendLine([patternA, patternB][patternType]);
            outputChannel.appendLine(`\t${v.label}\n`);
        });

        outputChannel.show();
    }

    showListVisibleTags(): void {
        const visibleEditorUris = vscode.window.visibleTextEditors.map((te) => te.document.uri.fsPath);
        this.showListTags((resFsPath) => visibleEditorUris.includes(resFsPath));
    }

    scanWorkspaceTags(): void {
        vscode.workspace
            .findFiles(this.controller.includePattern, this.controller.excludePattern, this.controller.maxFilesLimit)
            .then(
                (files) => {
                    if (!files || files.length === 0) {
                        console.log('No files found');
                        return;
                    }

                    function isTextFile(filePath: string): boolean {
                        const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
                        const textChars = buffer.toString('utf8').split('').filter(char => {
                            const code = char.charCodeAt(0);
                            return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13;
                        });

                        return textChars.length / buffer.length > 0.9; // Adjust the threshold as needed
                    }

                    files.forEach((file) => {
                        if (isTextFile(file.fsPath)) {
                            vscode.workspace.openTextDocument(file).then(
                                (document) => {
                                    this.controller.updateTags(document);
                                },
                                (err) => console.error(err)
                            );
                        }
                    });
                },
                (err) => console.error(err)
            );
    }

}

interface CustomEntry {
    label: string;
    description: string;
    target: vscode.Location;
}
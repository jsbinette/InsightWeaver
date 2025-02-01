'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TagsController, Location } from './tagsController';

export class Commands {
    private _tagsController: TagsController;

    constructor(controller: TagsController) {
        this._tagsController = controller;
    }

    refresh(): void {
        Object.keys(this._tagsController.tags).forEach((uri) => {
            vscode.workspace.openTextDocument(vscode.Uri.parse(uri)).then((document) => {
                this._tagsController.updateTags(document);
            });
        });
    }

    goToTag(resource: vscode.Uri, location:Location): void {
        
        vscode.commands.executeCommand(
            'instructions-manager.jumpToRange',
            resource,
            location.range
        );
    }



    scanWorkspaceTags(): void {
        vscode.workspace
            .findFiles(this._tagsController.includePattern, this._tagsController.excludePattern, this._tagsController.maxFilesLimit)
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
                                    this._tagsController.updateTags(document);
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
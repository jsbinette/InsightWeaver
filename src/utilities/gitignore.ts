'use strict';

import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import ignore, { Ignore } from 'ignore';
import * as path from 'path';

export class GitIgnore {
    private _gitIgnoreFile: Record<string, { ignore: Ignore; cache: Record<string, boolean> }>;

    constructor() {
        this._gitIgnoreFile = {}; // { ignore: GitIgnore instance, cache: {path => result}}
    }

    /**
     * Handles changes to a .gitignore file.
     * @param uri URI of the changed file.
     */
    onDidChange(uri: vscode.Uri): void {
        vscode.workspace.fs.readFile(uri).then((data) => {
            this._gitIgnoreFile[Utils.dirname(uri).toString()] = {
                ignore: ignore().add(new TextDecoder().decode(data)),
                cache: {}, // fullpath -> result
            };
        });
    }

    /**
     * Handles deletion of a .gitignore file.
     * @param uri URI of the deleted file.
     */
    onDidDelete(uri: vscode.Uri): void {
        delete this._gitIgnoreFile[Utils.dirname(uri).toString()];
    }

    /**
     * Gets active ignore patterns for a given file.
     * @param uri URI of the target file.
     * @returns Array of sorted .gitignore locations.
     */
    private _getActiveIgnorePatternsForFile(uri: vscode.Uri): string[] {
        function isSubdir(parent: string, target: string): boolean {
            const relative = path.relative(parent, target);
            return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
        }

        if (!Object.keys(this._gitIgnoreFile).length) {
            return [];
        }

        return Object.keys(this._gitIgnoreFile)
            .filter((gitIgnoreLocation) =>
                isSubdir(vscode.Uri.parse(gitIgnoreLocation).fsPath, uri.fsPath)
            )
            .sort((a, b) => a.split('/').length - b.split('/').length);
    }

    /**
     * Determines if the given file should be ignored based on .gitignore rules.
     * @param uri URI of the target file.
     * @returns True if the file should be ignored, otherwise false.
     */
    ignores(uri: vscode.Uri): boolean {
        const gitIgnoreFiles = this._getActiveIgnorePatternsForFile(uri);
        if (!gitIgnoreFiles) {
            return true;
        }

        const ignoreIt = gitIgnoreFiles.some((gitIgnoreLocation) => {
            const ig = this._gitIgnoreFile[gitIgnoreLocation];
            if (ig.cache[uri.fsPath] !== undefined) {
                return ig.cache[uri.fsPath]; // Return cached result
            }

            const result = ig.ignore.ignores(
                path.relative(vscode.Uri.parse(gitIgnoreLocation).fsPath, uri.fsPath)
            );
            ig.cache[uri.fsPath] = result;
            return result;
        });

        return ignoreIt;
    }

    /**
     * Filters the given file based on .gitignore rules.
     * @param uri URI of the target file.
     * @returns True if the file passes the filter (not ignored), otherwise false.
     */
    filter(uri: vscode.Uri): boolean {
        return !this.ignores(uri); // ignores.true ==> filter.false (exclude)
    }
}
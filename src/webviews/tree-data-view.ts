'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { getExtensionConfig } from '../utilities/utility.service';
import { TagsController } from '../utilities/tagsController';


class TagsDataModel {
    private controller: TagsController;

    constructor(controller: TagsController) {
        this.controller = controller;
    }

    getRoot(): TreeElement[] {
        let fileTags = Object.keys(this.controller.tags);

        if (getExtensionConfig().view.showVisibleFilesOnly) {
            let visibleEditorUris: string[];

            if (getExtensionConfig().view.showVisibleFilesOnlyMode === 'onlyActiveEditor') {
                const activeEditor = vscode.window.activeTextEditor;
                visibleEditorUris = activeEditor ? [activeEditor.document.uri.path] : [];
            } else {
                visibleEditorUris = vscode.window.visibleTextEditors.map((te) => te.document.uri.path);
            }

            fileTags = fileTags.filter((v) =>
                visibleEditorUris.includes(vscode.Uri.parse(v).path)
            );
        }

        return fileTags.sort().map((v) => ({
            resource: vscode.Uri.parse(v),
            tooltip: v,
            name: v,
            type: NodeType.FILE,
            parent: null,
            iconPath: vscode.ThemeIcon.File,
            location: null,
            label: path.basename(vscode.Uri.parse(v).fsPath)
        }));
    }

    getChildren(element: TreeElement): TreeElement[] {
        if (element.type === NodeType.FILE) {
            const extractTextAfterLastAtWord = (inputString: string): string => {
                const zeroedRegex = /^@summarize\([^)]*\)\s*/;
                const zeroedMatch = inputString.match(zeroedRegex);
                if (zeroedMatch) {
                    return zeroedMatch[0].trim();
                }

                const firstRegex = /@[\w-]+[^@]*$/;
                const firstMatch = inputString.match(firstRegex);

                if (firstMatch) {
                    let remainingText = firstMatch[0];
                    let secondRegex: RegExp;

                    while (true) {
                        if (remainingText.startsWith('@summarize(')) {
                            secondRegex = /^@summarize\([^)]*\)\s*/;
                        } else {
                            secondRegex = /^@[\w-]+\s+/;
                        }

                        const secondMatch = remainingText.match(secondRegex);

                        if (secondMatch) {
                            remainingText = remainingText.substring(secondMatch[0].length);
                        } else {
                            break;
                        }
                    }

                    return remainingText.trim();
                }

                return '';
            };

            const tags = Object.keys(this.controller.tags[element.name]).flatMap((cat) => {
                return this.controller.tags[element.name][cat].map((v: any) => {
                    const location = new vscode.Location(element.resource, v.range);
                    return {
                        resource: element.resource,
                        location: location,
                        label: extractTextAfterLastAtWord(v.text),
                        name: v.text.trim(),
                        type: NodeType.LOCATION,
                        category: cat,
                        parent: element,
                        iconPath: this.controller.styles[cat]?.options?.gutterIconPath,
                    };
                });
            });

            return tags.sort((a, b) => a.location!.range.start.line - b.location!.range.start.line);
        }

        return [];
    }

    getNeighbors(element: TreeElement): { previous: TreeElement | null; next: TreeElement | null } {
        const ret: { previous: TreeElement | null; next: TreeElement | null } = { previous: null, next: null };
        let parent = element.parent;

        if (!parent) {
            parent = { ...element, type: NodeType.FILE, name: element.resource.toString() } as TreeElement;
        }

        const tags = this.getChildren(parent);

        let gotElement = false;

        for (const b of tags) {
            if (!gotElement && JSON.stringify(b.location) === JSON.stringify(element.location)) {
                gotElement = true;
                continue;
            }

            if (!gotElement) {
                ret.previous = b;
            } else {
                ret.next = b;
                break;
            }
        }

        return ret;
    }
}


export class TagsTreeDataProvider implements vscode.TreeDataProvider<TreeElement> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeElement | undefined | null | void> = new vscode.EventEmitter<TreeElement | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeElement | undefined | null | void> = this._onDidChangeTreeData.event;

    private controller: any; // Replace `any` with the actual type of your instructionsController
    public model: TagsDataModel;
    private filterTreeViewWords: string[];
    private gitIgnoreHandler: { filter: (resource: vscode.Uri) => boolean } | undefined;

    constructor(instructionsController: any) {
        this.controller = instructionsController;
        this.model = new TagsDataModel(instructionsController);
        this.filterTreeViewWords = [];
        this.gitIgnoreHandler = undefined;
    }

    /** TreeDataProvider Methods */

    public getChildren(element?: TreeElement): Thenable<TreeElement[]> {
        const elements = element ? this.model.getChildren(element) : this.model.getRoot();
        return Promise.resolve(this._filterTreeView(elements));
    }

    getParent(element: TreeElement): TreeElement | null {
        return element.parent || null;
    }

    getTreeItem(element: TreeElement): vscode.TreeItem {
        let label = this._formatLabel(element.label)
        if (label == undefined) {
            label = ""
        }
        const item = new vscode.TreeItem(
            label, // Pass a valid label
            element.type === NodeType.LOCATION
                ? vscode.TreeItemCollapsibleState.None
                : getExtensionConfig().view.expanded
                    ? vscode.TreeItemCollapsibleState.Expanded
                    : vscode.TreeItemCollapsibleState.Collapsed
        );

        item.id =
            element.type === NodeType.LOCATION && element.location
                ? this._getId(element.location)
                : this._getId(element.resource);

        item.resourceUri = element.resource;
        item.iconPath = element.iconPath;
        item.command =
            element.type === NodeType.LOCATION && element.location
                ? {
                    command: "instructions-manager.jumpToRange",
                    arguments: [element.location.uri, element.location.range],
                    title: "JumpTo",
                }
                : undefined;

        return item;
    }

    /** Utility Methods */

    private _getId(o: vscode.Location | vscode.Uri): string {
        return crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex');
    }

    private _formatLabel(label?: string): string | undefined {
        if (!getExtensionConfig().view.words.hide || !label) {
            return label;
        }
        const words = Object.values(this.controller.words).flat() as string[];
        return words.reduce((prevs, word) => prevs.replace(new RegExp(word, 'g'), ''), label);
    }

    /// Jan2025 JSB I left this function there but it doesn't work
    /// because the label passed to the the three is not 'just' the label
    /// I'm skipping the file level types (type 1) so the filter would not be that
    /// great anyway because the files would still ALL show
    private _filterTreeView(elements: TreeElement[]): TreeElement[] {
        if (this.gitIgnoreHandler?.filter) {
            elements = elements.filter((e) => this.gitIgnoreHandler!.filter(e.resource));
        }

        if (this.filterTreeViewWords.length) {
            elements = elements.filter((e) => {
                if (e.type === 1) {
                    return true; // Include all elements of type=1
                } else if (e.type === 2) {
                    return this.filterTreeViewWords.some((rx) => new RegExp(rx, 'g').test(e.label || ''));
                }
                return false; // Exclude elements of other types
            });
        }

        return elements;
    }

    /** Public Methods */

    setTreeViewFilterWords(words: string[]): void {
        this.filterTreeViewWords = words;
    }

    setTreeViewGitIgnoreHandler(gi: { filter: (resource: vscode.Uri) => boolean }): void {
        this.gitIgnoreHandler = gi;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

/**
 * Finds the nearest tag in a document.
 * @param documentUri The URI of the document.
 * @param treeDataProvider The tree data provider for tags.
 * @param anchor The position to anchor the search to.
 * @param overrideStrategy Optional strategy to override the default follow mode.
 * @returns The nearest tag, if any.
 */
export async function editorFindNearestTag(
    documentUri: vscode.Uri,
    treeDataProvider: TagsTreeDataProvider,
    anchor: vscode.Position,
    overrideStrategy?: string
): Promise<TreeElement | null> {
    const children = await treeDataProvider.getChildren(); // Wait for the promise to resolve
    const root = children.find((f) => f.name === documentUri.toString());

    if (!root) {
        return null; // File not found
    }

    const focusLine = anchor.line;

    // Strategy: nearest tag
    function strategyNearestTag(previous: TreeElement | null, current: TreeElement): TreeElement {
        if (!previous) return current;
        return Math.abs(focusLine - current.location!.range.start.line) <=
            Math.abs(focusLine - previous.location!.range.start.line)
            ? current
            : previous;
    }

    // Strategy: previous tag (chapter style)
    function strategyLastKnownTag(previous: TreeElement | null, current: TreeElement): TreeElement {
        if (!previous) return current;
        return focusLine >= current.location!.range.start.line &&
            focusLine - current.location!.range.start.line <=
            focusLine - previous.location!.range.start.line
            ? current
            : previous;
    }

    let followMode = strategyNearestTag;
    const strategy = overrideStrategy || getExtensionConfig().view.followMode;

    switch (strategy) {
        case 'chapter':
            followMode = strategyLastKnownTag;
            break;
        case 'nearest':
        default:
            followMode = strategyNearestTag;
    }

    const tags = await treeDataProvider.getChildren(root);

    return tags.reduce<TreeElement | null>((prev, current) => followMode(prev, current), null);
}

/**
 * Jumps to the specified range in a text editor.
 * @param range The range to jump to.
 * @param editor Optional editor to use, defaults to the active editor.
 */
export function editorJumptoRange(range: vscode.Range, editor?: vscode.TextEditor): void {
    editor = editor || vscode.window.activeTextEditor; // Provided editor or fallback to active

    if (!editor) return; // No active editor, nothing to do

    let revealType = vscode.TextEditorRevealType.InCenter;
    const selection = new vscode.Selection(
        range.start.line,
        range.start.character,
        range.end.line,
        range.end.character
    );

    if (range.start.line === editor.selection.active.line) {
        revealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }

    editor.selection = selection;
    editor.revealRange(selection, revealType);
}


export async function jumpToPrevious(treeView: vscode.TreeView<TreeElement>, treeDataProvider: TagsTreeDataProvider): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    let element: TreeElement | null = null;
    const lineMode = getExtensionConfig().view.lineMode;

    if (treeView.visible && treeView.selection.length && lineMode === "selected-tag") {
        // TreeView is visible and an item is selected
        element = treeView.selection[0];
    } else {
        // No selection, find the nearest tag in the editor
        if (!activeEditor || !activeEditor.selections.length || !activeEditor.document) {
            return;
        }
        element = await editorFindNearestTag(
            activeEditor.document.uri,
            treeDataProvider,
            activeEditor.selections[0].anchor,
            "chapter"
        );
    }

    if (!element) {
        return;
    }

    const neighbors = treeDataProvider.model.getNeighbors(element);
    let target = neighbors.previous;

    if (
        lineMode === "current-line" &&
        activeEditor &&
        activeEditor.selections[0].anchor.line > element.location!.range.start.line
    ) {
        // Override to "element" except when the anchor is on the same line as the tag
        target = element;
    }

    if (target && target.location) {
        vscode.workspace.openTextDocument(target.location.uri).then((doc) => {
            vscode.window.showTextDocument(doc).then((editor) => {
                editorJumptoRange(target.location!.range, editor);
            });
        });
    }
}

export async function jumpToNext(treeView: vscode.TreeView<TreeElement>, treeDataProvider: TagsTreeDataProvider): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    let element: any;
    const lineMode = getExtensionConfig().view.lineMode;

    if (treeView.visible && treeView.selection.length && lineMode === 'selected-tag') {
        // TreeView is visible and item selected
        element = treeView.selection[0];
    } else {
        // No selection, find nearest tag in editor
        if (!activeEditor || !activeEditor.selections.length || !activeEditor.document) {
            return;
        }
        element = editorFindNearestTag(
            activeEditor.document.uri,
            treeDataProvider,
            activeEditor.selections[0].anchor,
            'chapter'
        );
    }

    if (!element) {
        return;
    }

    const neighbors = treeDataProvider.model.getNeighbors(element);
    let target = neighbors.next;

    if (
        lineMode === 'current-line' &&
        !neighbors.previous &&
        activeEditor &&
        activeEditor.selections[0].anchor.line < element.location.range.start.line
    ) {
        // When lineMode is enabled, the chapter "next" target is almost always correct,
        // except when the anchor is before the first tag
        target = element;
    }

    if (target && target.location) {
        vscode.workspace.openTextDocument(target.location.uri).then((doc) => {
            vscode.window.showTextDocument(doc).then((editor) => {
                editorJumptoRange(target.location!.range, editor);
            });
        });
    }
}

export function chooseFilterWords(words: string[] | undefined, treeDataProvider: TagsTreeDataProvider) {
    if (!words || !words.length) {
        // Show input dialog if no words are provided
        const options: vscode.InputBoxOptions = {
            prompt: "Filter Tags View:",
            placeHolder: "(e.g. @audit-info; @follow-up; leave empty to disable filter)",
        };

        vscode.window.showInputBox(options).then((value) => {
            const filterWords = value
                ? value.trim().split(/[\s;]+/).map((v) => v.trim()).filter((v) => v.length > 0)
                : [];
            treeDataProvider.setTreeViewFilterWords(filterWords);
        });
    } else {
        // Words provided directly (e.g., by another extension)
        treeDataProvider.setTreeViewFilterWords(words);
    }
}


enum NodeType {
    FILE = 1,
    LOCATION = 2,
}

export interface TreeElement {
    resource: vscode.Uri;
    tooltip?: string;
    name: string;
    type: NodeType;
    parent: TreeElement | null;
    iconPath: vscode.ThemeIcon | string | undefined;
    location?: vscode.Location | null;
    label?: string;
    category?: string;
}
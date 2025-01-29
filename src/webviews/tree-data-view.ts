'use strict';

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { getExtensionConfig } from '../utilities/utility.service';
import { TagsController, Location } from '../utilities/tagsController';
import { TreeElement, TreeDataModel, NodeType } from '../utilities/treeDataModel';

export class TagsTreeDataProvider implements vscode.TreeDataProvider<TreeElement> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeElement | undefined | null | void> = new vscode.EventEmitter<TreeElement | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeElement | undefined | null | void> = this._onDidChangeTreeData.event;

    private _tagsController: TagsController;
    public model: TreeDataModel;
    private _filterTreeViewWords: string[];
    private _gitIgnoreHandler: { filter: (resource: vscode.Uri) => boolean } | undefined;

    constructor(controller: TagsController) {
        this._tagsController = controller;
        this.model = new TreeDataModel(this._tagsController);
        this._filterTreeViewWords = [];
        this._gitIgnoreHandler = undefined;
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
                : getExtensionConfig().view.expanded //T
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
                    arguments: [element.resource, element.location.range],
                    title: "JumpTo",
                }
                : undefined;
        return item;
    }

    /** Utility Methods */

    private _getId(o: Location | vscode.Uri): string {
        return crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex');
    }

    private _formatLabel(label?: string): string | undefined {
        if (!getExtensionConfig().view.words.hide || !label) {
            return label;
        }
        const words = Object.values(this._tagsController.words).flat() as string[];
        return words.reduce((prevs, word) => prevs.replace(new RegExp(word, 'g'), ''), label);
    }

    /// Jan2025 JSB I left this function there but it doesn't work
    /// because the label passed to the the three is not 'just' the label
    /// I'm skipping the file level types (type 1) so the filter would not be that
    /// great anyway because the files would still ALL show
    private _filterTreeView(elements: TreeElement[]): TreeElement[] {
        if (this._gitIgnoreHandler?.filter) {
            elements = elements.filter((e) => this._gitIgnoreHandler!.filter(e.resource));
        }

        if (this._filterTreeViewWords.length) {
            elements = elements.filter((e) => {
                if (e.type === 1) {
                    return true; // Include all elements of type=1
                } else if (e.type === 2) {
                    return this._filterTreeViewWords.some((rx) => new RegExp(rx, 'g').test(e.label || ''));
                }
                return false; // Exclude elements of other types
            });
        }

        return elements;
    }

    /** Public Methods */

    setTreeViewFilterWords(words: string[]): void {
        this._filterTreeViewWords = words;
    }

    setTreeViewGitIgnoreHandler(gi: { filter: (resource: vscode.Uri) => boolean }): void {
        this._gitIgnoreHandler = gi;
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

    // Strategy: nearest tag
    function strategyNearestTag(previous: TreeElement | null, current: TreeElement): TreeElement {
        if (!previous) return current;
        
        const currentLineDiff = Math.abs(anchor.line - current.location!.range.start.line);
        const previousLineDiff = Math.abs(anchor.line - previous.location!.range.start.line);
    
        if (currentLineDiff < previousLineDiff) {
            return current;
        } else if (currentLineDiff > previousLineDiff) {
            return previous;
        } else {
            // Lines are the same, compare character positions
            const currentCharDiff = Math.abs(anchor.character - current.location!.range.start.character);
            const previousCharDiff = Math.abs(anchor.character  - previous.location!.range.start.character);
            return currentCharDiff <= previousCharDiff ? current : previous;
        }
    }

    // Strategy: previous tag (chapter style)
    function strategyLastKnownTag(previous: TreeElement | null, current: TreeElement): TreeElement {
        if (!previous) return current;
        return anchor.line >= current.location!.range.start.line &&
            anchor.line - current.location!.range.start.line <=
            anchor.line - previous.location!.range.start.line
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
    //const neighbors = { previous: null, next: null }
    let target = neighbors.previous;

    if (
        lineMode === "current-line" &&
        activeEditor &&
        activeEditor.selections[0].anchor.line > element.location!.range.start.line
    ) {
        // Override to "element" except when the anchor is on the same line as the tag
        //target = element;
    }
    if (target && target.location) {
        vscode.workspace.openTextDocument(target.resource).then((doc) => {
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
        vscode.workspace.openTextDocument(target.resource).then((doc) => {
            vscode.window.showTextDocument(doc).then((editor) => {
                editorJumptoRange(target.location!.range, editor);
            });
        });
    }

}

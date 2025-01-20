'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { getExtensionConfig } from '../utilities/utility.service';
import { TagsController, Tag, Location } from '../utilities/tagsController';
import { InstructionsController } from '../utilities/instructionsController';


export class TagsDataModel {
    private _tagsController: TagsController;
    private _groupBy: string;

    constructor(controller: TagsController, groupBy: string = 'file') {
        this._tagsController = controller;
        this._groupBy = groupBy;
    }

    public changeGoupBy(groupBy: string) {
        this._groupBy = groupBy;
    }

    getRoot(): TreeElement[] {
        let tagsGroupedByObj : {
            [key: string]: Tag[];
        }
        if (this._groupBy === 'file') {
            tagsGroupedByObj = this._tagsController.groupBy(this._tagsController.tags, 'resource', (uri) => uri.toString());
        } else if (this._groupBy === 'style') {
            tagsGroupedByObj = this._tagsController.groupBy(this._tagsController.tags, 'category');
        } else if (this._groupBy === 'tagName'){
            tagsGroupedByObj = this._tagsController.groupBy(this._tagsController.tags, 'label');
        } else { //default empty
            tagsGroupedByObj = {};
        }


        if (getExtensionConfig().view.showVisibleFilesOnly) {
            let visibleEditorUris: string[];

            if (getExtensionConfig().view.showVisibleFilesOnlyMode === 'onlyActiveEditor') {
                const activeEditor = vscode.window.activeTextEditor;
                visibleEditorUris = activeEditor ? [activeEditor.document.uri.path] : [];
            } else {
                visibleEditorUris = vscode.window.visibleTextEditors.map((te) => te.document.uri.path);
            }

            Object.keys(tagsGroupedByObj).forEach((filename) => {
                tagsGroupedByObj[filename].forEach((tag: Tag) => {
                    // Remove tags that are not in visible editors
                    if (!visibleEditorUris.includes(tag.resource.path)) {
                        tagsGroupedByObj[filename].splice(tagsGroupedByObj[filename].indexOf(tag), 1);
                    }
                });
            });
        }


        let roots: TreeElement[] = []


        
        Object.keys(tagsGroupedByObj).forEach((item) => {
            /*
            RIGHT NOW they are all equivalent but that will change
            */
            if (this._groupBy === 'file') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    iconPath: vscode.ThemeIcon.File,
                    label: path.basename(vscode.Uri.parse(item).fsPath),
                    name: item,
                    type: NodeType.FILE,
                    parent: null,
                    out: false,
                    children: getChildren(tagsGroupedByObj[item], this._tagsController),
                })
            } else if (this._groupBy === 'style') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    iconPath: this._tagsController.styles[item]?.options?.gutterIconPath,
                    label: item,
                    name: item,
                    type: NodeType.FILE,
                    parent: null,
                    out: false,
                    children: getChildren(tagsGroupedByObj[item], this._tagsController),
                });
            } else if (this._groupBy === 'tagName') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    iconPath: vscode.ThemeIcon.File,
                    label: item,
                    name: item,
                    type: NodeType.FILE,
                    parent: null,
                    out: false,
                    children: getChildren(tagsGroupedByObj[item], this._tagsController),
                });
            }
        });

        function getChildren(tags: Tag[], _tagsController: TagsController ): TreeElement[] {
            return tags.map((tag: Tag) => {
                return {
                    resource: tag.resource,
                    label: tag.label,
                    name: tag.label.trim(),
                    location: tag.location,
                    type: NodeType.LOCATION,
                    parent: null,
                    out: false,
                    iconPath: _tagsController.styles[tag.category]?.options?.gutterIconPath,
                };
            });
        }
        

        function sortRootsByLabels(roots: TreeElement[]): TreeElement[] {
            return roots.sort((a, b) => {
                return a.label.localeCompare(b.label);
            });
        }

        function sortChildrenByLocation(roots: TreeElement[]): TreeElement[] {
            roots.forEach(root => {
                if (root.children) {
                    root.children = root.children.sort((a, b) => {
                        if (a.location && b.location) {
                            const startComparison = a.location.range.start.compareTo(b.location.range.start);
                            if (startComparison !== 0) {
                                return startComparison;
                            }
                            return a.location.range.end.compareTo(b.location.range.end);
                        }
                        return 0; // If either location is undefined, consider them equal
                    });
                }
            });
            return roots;
        }

        function assignParents(roots: TreeElement[]): TreeElement[] {
            roots.forEach(root => {
                if (root.children) {
                    root.children.forEach(child => {
                        child.parent = root;
                    });
                }
            });
            return roots;
        }



        return assignParents(sortChildrenByLocation(sortRootsByLabels(roots)));
    }


    getChildren(element: TreeElement): TreeElement[] {
        if (element.type === NodeType.FILE) {
            //NOT USED ANYMORE
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

                return inputString.trim();
            };
        }
        return element.children || [];
    }

    getNeighbors(element: TreeElement): { previous: TreeElement | null; next: TreeElement | null } {
        const ret: { previous: TreeElement | null; next: TreeElement | null } = { previous: null, next: null };
        let parent = element.parent;

        if (!parent) {
            parent = { ...element, type: NodeType.FILE, name: element.resource.toString() } as TreeElement;
        }

        //Jan2025 JSB Not too much my thing but this is a way to get the previous and next elements
        //As long as it doesn't find the current element it will assign to the previous
        //When it finds it, the next element skips the compare and is assigned to the next
        const tags = this.getChildren(parent);
        let gotElement = false;
        const elementStr = JSON.stringify(element.location!);
        for (const b of tags) {
            if (!gotElement && JSON.stringify(b.location!) === elementStr) {
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

    private _tagsController: TagsController;
    public model: TagsDataModel;
    private _filterTreeViewWords: string[];
    private _gitIgnoreHandler: { filter: (resource: vscode.Uri) => boolean } | undefined;

    constructor(controller: TagsController) {
        this._tagsController = controller;
        this.model = new TagsDataModel(this._tagsController);
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
    location?: Location | null;
    label: string;
    category?: string;
    out: boolean;
    children?: TreeElement[];
}
'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { getExtensionConfig } from './utility.service';
import { TagsController, Tag, Location } from './tagsController';
import { get } from 'http';


export class TreeDataModel {
    private _tagsController: TagsController;
    private _context: vscode.ExtensionContext;
    public groupBy: string;
    public lastRoots: RootElement[] = [];

    constructor(controller: TagsController, context: vscode.ExtensionContext) {
        this._tagsController = controller;
        this._context = context;
        this.groupBy = 'file';
        this.loadFromWorkspace();
    }

    public changeGoupBy(groupBy: string) {
        this.groupBy = groupBy;
    }

    getRoot(): RootElement[] {
        let tagsConsidered = this._tagsController.tags;

        //filter tags if showFilesMode not wholeWorkspace
        let visibleEditorUris: string[];
        if (getExtensionConfig().view.showFilesMode !== 'wholeWorkspace') {
            // do nothing here
            if (getExtensionConfig().view.showFilesMode === 'onlyActiveEditor') {
                const activeEditor = vscode.window.activeTextEditor;
                visibleEditorUris = activeEditor ? [activeEditor.document.uri.path] : [];
            } else { // showFilesMode === 'allVisibleEditors'
                visibleEditorUris = vscode.window.tabGroups.all
                    .flatMap(group => group.tabs)
                    .filter(tab => tab.input && (tab.input as any).uri) // Ensure tab has a file
                    .map(tab => (tab.input as any).uri.fsPath);
            }
            tagsConsidered = tagsConsidered.filter(tag => visibleEditorUris.includes(tag.resource.path));
        }

        //Create the groups
        let tagsGroupedByObj: {
            [key: string]: Tag[];
        }
        if (this.groupBy === 'file') {
            tagsGroupedByObj = this._tagsController.groupBy(tagsConsidered, 'resource', (uri) => uri.toString());
        } else if (this.groupBy === 'style') {
            tagsGroupedByObj = this._tagsController.groupBy(tagsConsidered, 'category');
        } else if (this.groupBy === 'tagName') {
            tagsGroupedByObj = this._tagsController.groupBy(tagsConsidered, 'tagName');
        } else { //default empty
            tagsGroupedByObj = {};
        }

        let roots: RootElement[] = []
        Object.keys(tagsGroupedByObj).forEach((item) => {
            let expanded = getExtensionConfig().view.expanded ? true : false;
            if (this.groupBy === 'file') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    label: path.basename(vscode.Uri.parse(item).fsPath),
                    out: tagsGroupedByObj[item][0].outFile,
                    id: this._getIdRoot(JSON.stringify(tagsGroupedByObj[item][0].resource.fsPath)),
                    expanded: expanded,
                    children: tagsGroupedByObj[item]
                })
            } else if (this.groupBy === 'style') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    label: item,
                    out: tagsGroupedByObj[item][0].outStyle,
                    id: this._getIdRoot(tagsGroupedByObj[item][0].style),
                    expanded: false,
                    children: tagsGroupedByObj[item]
                });
            } else if (this.groupBy === 'tagName') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    label: item,
                    out: tagsGroupedByObj[item][0].outTagName,
                    id: this._getIdRoot(tagsGroupedByObj[item][0].tagName),
                    expanded: false,
                    children: tagsGroupedByObj[item]
                });
            }
        });

        if (!getExtensionConfig().view.expanded) {
            roots.forEach((root) => {
                const lastRoot = this.lastRoots.find((r) => r.id === root.id);
                if (lastRoot) {
                    root.expanded = lastRoot.expanded;
                }
            });
        }

        function sortRootsByLabels(roots: RootElement[]): RootElement[] {
            return roots.sort((a, b) => {
                return a.label.localeCompare(b.label);
            });
        }

        function sortChildrenByLocation(roots: RootElement[]): RootElement[] {
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

        this.lastRoots = sortChildrenByLocation(sortRootsByLabels(roots));
        this.saveToWorkspace();
        return this.lastRoots;
    }

    private _getIdRoot(o: string): string {
        return crypto.createHash('sha1').update(o).digest('hex');
    }

    private _isWorkspaceAvailable() {
        //single or multi root
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1;
    }

    public loadFromWorkspace(): void {
        if (!this._isWorkspaceAvailable()) return; //cannot load
        if (getExtensionConfig().view.files.inFiles) {
            return; //no support
        } else if (getExtensionConfig().view.files.workspace) {
            let obj = JSON.parse(this._context.workspaceState.get("treeData.object", "{}"));
            if (Object.keys(obj).length === 0) {
                return;
            }
            this.groupBy = obj.groupBy;
            this.lastRoots = obj.lastMiniRoots;
        }
    }

    public saveToWorkspace(): void {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        if (getExtensionConfig().view.files.inFiles) {
            return; //no support
        } else if (getExtensionConfig().view.files.workspace) {
            let lastMiniRoots: RootElement[] = this.lastRoots.map((root) => {
                return {
                    label: root.label,
                    out: root.out,
                    id: root.id,
                    expanded: root.expanded
                }
            });
            this._context.workspaceState.update("treeData.object", JSON.stringify({
                groupBy: this.groupBy,
                lastMiniRoots: lastMiniRoots
            }));
        }
    }

    public resetWorkspace(): void {
        this._context.workspaceState.update("treeData.object", "{}");
    }
}

export interface RootElement {
    resource?: vscode.Uri; //made this optional for serializing
    label: string;
    out: boolean; //could be file, style, tagName
    id: string;
    expanded: boolean;
    children?: Tag[];
}


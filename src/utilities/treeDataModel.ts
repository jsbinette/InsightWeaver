'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { getExtensionConfig } from './utility.service';
import { TagsController, Tag, Location } from './tagsController';


export class TreeDataModel {
    private _tagsController: TagsController;
    public groupBy: string;
    public lastRoots: RootElement[] = [];

    constructor(controller: TagsController, groupBy: string = 'file') {
        this._tagsController = controller;
        this.groupBy = groupBy;
    }

    public changeGoupBy(groupBy: string) {
        this.groupBy = groupBy;
    }

    getRoot(): RootElement[] {
        let tagsGroupedByObj: {
            [key: string]: Tag[];
        }
        if (this.groupBy === 'file') {
            tagsGroupedByObj = this._tagsController.groupBy(this._tagsController.tags, 'resource', (uri) => uri.toString());
        } else if (this.groupBy === 'style') {
            tagsGroupedByObj = this._tagsController.groupBy(this._tagsController.tags, 'category');
        } else if (this.groupBy === 'tagName') {
            tagsGroupedByObj = this._tagsController.groupBy(this._tagsController.tags, 'tagName');
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

        let roots: RootElement[] = []
        Object.keys(tagsGroupedByObj).forEach((item) => {
            /*
            RIGHT NOW they are all equivalent but that will change
            */
            if (this.groupBy === 'file') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    label: path.basename(vscode.Uri.parse(item).fsPath),
                    out: tagsGroupedByObj[item][0].outFile,
                    id: this._getIdRoot(JSON.stringify(tagsGroupedByObj[item][0].resource)),
                    expanded: false,
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
                    id: this._getIdRoot(tagsGroupedByObj[item][0].style),
                    expanded: false,
                    children: tagsGroupedByObj[item]
                });
            }
        });

        roots.forEach((root) => {
            const lastRoot = this.lastRoots.find((r) => r.id === root.id);
            if (lastRoot) {
                root.expanded = lastRoot.expanded;
            }
        });

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
        return this.lastRoots;
    }

    private _getIdRoot(o: string): string {
        return crypto.createHash('sha1').update(o).digest('hex');
    }
}

export interface RootElement {
    resource: vscode.Uri;
    label: string;
    out: boolean; //could be file, style, tagName
    id: string;
    expanded: boolean;
    children?: Tag[];
}
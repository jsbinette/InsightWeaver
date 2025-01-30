'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { getExtensionConfig } from './utility.service';
import { TagsController, Tag, Location } from './tagsController';


export class TreeDataModel {
    private _tagsController: TagsController;
    public groupBy: string;

    constructor(controller: TagsController, groupBy: string = 'file') {
        this._tagsController = controller;
        this.groupBy = groupBy;
    }

    public changeGoupBy(groupBy: string) {
        this.groupBy = groupBy;
    }

    getRoot(): TreeElement[] {
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

        let roots: TreeElement[] = []
        Object.keys(tagsGroupedByObj).forEach((item) => {
            /*
            RIGHT NOW they are all equivalent but that will change
            */
            if (this.groupBy === 'file') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    iconPath: vscode.ThemeIcon.File,
                    label: path.basename(vscode.Uri.parse(item).fsPath),
                    name: item,
                    type: NodeType.FILE,
                    parent: null,
                    location: tagsGroupedByObj[item][0].location,
                    out: false,
                    id: this._getIdRoot(JSON.stringify(tagsGroupedByObj[item][0].resource)),
                    children: getChildren(tagsGroupedByObj[item], this._tagsController),
                })
            } else if (this.groupBy === 'style') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    iconPath: this._tagsController.styles[item]?.options?.gutterIconPath,
                    label: item,
                    name: item,
                    type: NodeType.FILE,
                    parent: null,
                    location: tagsGroupedByObj[item][0].location,
                    out: false,
                    id: this._getIdRoot(tagsGroupedByObj[item][0].style),
                    children: getChildren(tagsGroupedByObj[item], this._tagsController),
                });
            } else if (this.groupBy === 'tagName') {
                roots.push({
                    resource: tagsGroupedByObj[item][0].resource,
                    iconPath: vscode.ThemeIcon.File,
                    label: item,
                    name: item,
                    type: NodeType.FILE,
                    parent: null,
                    location: tagsGroupedByObj[item][0].location,
                    out: false,
                    id: this._getIdRoot(tagsGroupedByObj[item][0].tagName),
                    children: getChildren(tagsGroupedByObj[item], this._tagsController),
                });
            }
        });

        function getChildren(tags: Tag[], _tagsController: TagsController): TreeElement[] {
            
            
            return tags.map((tag: Tag) => {
                return {
                    resource: tag.resource,
                    label: tag.label,
                    name: tag.label.trim(),
                    location: tag.location,
                    type: NodeType.LOCATION,
                    parent: null,
                    out: false,
                    id: crypto.createHash('sha1').update(JSON.stringify(tag.resource)+ JSON.stringify(tag.location)).digest('hex'),
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


    public getChildren(element: TreeElement): TreeElement[] {
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

    private _getIdRoot(o: string): string {
        return crypto.createHash('sha1').update(o).digest('hex');
    }
}


export enum NodeType {
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
    location: Location;
    label: string;
    category?: string;
    out: boolean;
    id: string;
    children?: TreeElement[];
}
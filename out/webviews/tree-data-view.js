"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/webviews/tree-data-view.ts
var tree_data_view_exports = {};
__export(tree_data_view_exports, {
  TagsTreeDataProvider: () => TagsTreeDataProvider,
  chooseFilterWords: () => chooseFilterWords,
  editorFindNearestTag: () => editorFindNearestTag,
  editorJumptoRange: () => editorJumptoRange,
  jumpToNext: () => jumpToNext,
  jumpToPrevious: () => jumpToPrevious
});
module.exports = __toCommonJS(tree_data_view_exports);
var vscode2 = __toESM(require("vscode"));
var path = __toESM(require("path"));
var crypto = __toESM(require("crypto"));

// src/utilities/utility.service.ts
var vscode = __toESM(require("vscode"));
var EventEmitter = require("events");
function getExtensionConfig() {
  return vscode.workspace.getConfiguration("instructions-manager");
}
var clickHistoryQuestionEventEmitter = new EventEmitter();

// src/webviews/tree-data-view.ts
var TagsDataModel = class {
  constructor(controller) {
    this.controller = controller;
  }
  getRoot() {
    let fileTags = Object.keys(this.controller.tags);
    if (getExtensionConfig().view.showVisibleFilesOnly) {
      let visibleEditorUris;
      if (getExtensionConfig().view.showVisibleFilesOnlyMode === "onlyActiveEditor") {
        const activeEditor = vscode2.window.activeTextEditor;
        visibleEditorUris = activeEditor ? [activeEditor.document.uri.path] : [];
      } else {
        visibleEditorUris = vscode2.window.visibleTextEditors.map((te) => te.document.uri.path);
      }
      fileTags = fileTags.filter(
        (v) => visibleEditorUris.includes(vscode2.Uri.parse(v).path)
      );
    }
    return fileTags.sort().map((v) => ({
      resource: vscode2.Uri.parse(v),
      tooltip: v,
      name: v,
      type: NodeType.FILE,
      parent: null,
      iconPath: vscode2.ThemeIcon.File,
      location: null,
      label: path.basename(vscode2.Uri.parse(v).fsPath)
    }));
  }
  getChildren(element) {
    if (element.type === NodeType.FILE) {
      const extractTextAfterLastAtWord = (inputString) => {
        const zeroedRegex = /^@summarize\([^)]*\)\s*/;
        const zeroedMatch = inputString.match(zeroedRegex);
        if (zeroedMatch) {
          return zeroedMatch[0].trim();
        }
        const firstRegex = /@[\w-]+[^@]*$/;
        const firstMatch = inputString.match(firstRegex);
        if (firstMatch) {
          let remainingText = firstMatch[0];
          let secondRegex;
          while (true) {
            if (remainingText.startsWith("@summarize(")) {
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
        return "";
      };
      const tags = Object.keys(this.controller.tags[element.name]).flatMap((cat) => {
        return this.controller.tags[element.name][cat].map((v) => {
          const location = new vscode2.Location(element.resource, v.range);
          return {
            resource: element.resource,
            location,
            label: extractTextAfterLastAtWord(v.text),
            name: v.text.trim(),
            type: NodeType.LOCATION,
            category: cat,
            parent: element,
            iconPath: this.controller.styles[cat]?.options?.gutterIconPath
          };
        });
      });
      return tags.sort((a, b) => a.location.range.start.line - b.location.range.start.line);
    }
    return [];
  }
  getNeighbors(element) {
    const ret = { previous: null, next: null };
    let parent = element.parent;
    if (!parent) {
      parent = { ...element, type: NodeType.FILE, name: element.resource.toString() };
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
};
var TagsTreeDataProvider = class {
  constructor(instructionsController) {
    this._onDidChangeTreeData = new vscode2.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.controller = instructionsController;
    this.model = new TagsDataModel(instructionsController);
    this.filterTreeViewWords = [];
    this.gitIgnoreHandler = void 0;
  }
  /** TreeDataProvider Methods */
  getChildren(element) {
    const elements = element ? this.model.getChildren(element) : this.model.getRoot();
    return Promise.resolve(this._filterTreeView(elements));
  }
  getParent(element) {
    return element.parent || null;
  }
  getTreeItem(element) {
    let label = this._formatLabel(element.label);
    if (label == void 0) {
      label = "";
    }
    const item = new vscode2.TreeItem(
      label,
      // Pass a valid label
      element.type === NodeType.LOCATION ? vscode2.TreeItemCollapsibleState.None : getExtensionConfig().view.expanded ? vscode2.TreeItemCollapsibleState.Expanded : vscode2.TreeItemCollapsibleState.Collapsed
    );
    item.id = element.type === NodeType.LOCATION && element.location ? this._getId(element.location) : this._getId(element.resource);
    item.resourceUri = element.resource;
    item.iconPath = element.iconPath;
    item.command = element.type === NodeType.LOCATION && element.location ? {
      command: "instructions-manager.jumpToRange",
      arguments: [element.location.uri, element.location.range],
      title: "JumpTo"
    } : void 0;
    return item;
  }
  /** Utility Methods */
  _getId(o) {
    return crypto.createHash("sha1").update(JSON.stringify(o)).digest("hex");
  }
  _formatLabel(label) {
    if (!getExtensionConfig().view.words.hide || !label) {
      return label;
    }
    const words = Object.values(this.controller.words).flat();
    return words.reduce((prevs, word) => prevs.replace(new RegExp(word, "g"), ""), label);
  }
  /// Jan2025 JSB I left this function there but it doesn't work
  /// because the label passed to the the three is not 'just' the label
  /// I'm skipping the file level types (type 1) so the filter would not be that
  /// great anyway because the files would still ALL show
  _filterTreeView(elements) {
    if (this.gitIgnoreHandler?.filter) {
      elements = elements.filter((e) => this.gitIgnoreHandler.filter(e.resource));
    }
    if (this.filterTreeViewWords.length) {
      elements = elements.filter((e) => {
        if (e.type === 1) {
          return true;
        } else if (e.type === 2) {
          return this.filterTreeViewWords.some((rx) => new RegExp(rx, "g").test(e.label || ""));
        }
        return false;
      });
    }
    return elements;
  }
  /** Public Methods */
  setTreeViewFilterWords(words) {
    this.filterTreeViewWords = words;
  }
  setTreeViewGitIgnoreHandler(gi) {
    this.gitIgnoreHandler = gi;
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
};
async function editorFindNearestTag(documentUri, treeDataProvider, anchor, overrideStrategy) {
  const children = await treeDataProvider.getChildren();
  const root = children.find((f) => f.name === documentUri.toString());
  if (!root) {
    return null;
  }
  const focusLine = anchor.line;
  function strategyNearestTag(previous, current) {
    if (!previous)
      return current;
    return Math.abs(focusLine - current.location.range.start.line) <= Math.abs(focusLine - previous.location.range.start.line) ? current : previous;
  }
  function strategyLastKnownTag(previous, current) {
    if (!previous)
      return current;
    return focusLine >= current.location.range.start.line && focusLine - current.location.range.start.line <= focusLine - previous.location.range.start.line ? current : previous;
  }
  let followMode = strategyNearestTag;
  const strategy = overrideStrategy || getExtensionConfig().view.followMode;
  switch (strategy) {
    case "chapter":
      followMode = strategyLastKnownTag;
      break;
    case "nearest":
    default:
      followMode = strategyNearestTag;
  }
  const tags = await treeDataProvider.getChildren(root);
  return tags.reduce((prev, current) => followMode(prev, current), null);
}
function editorJumptoRange(range, editor) {
  editor = editor || vscode2.window.activeTextEditor;
  if (!editor)
    return;
  let revealType = vscode2.TextEditorRevealType.InCenter;
  const selection = new vscode2.Selection(
    range.start.line,
    range.start.character,
    range.end.line,
    range.end.character
  );
  if (range.start.line === editor.selection.active.line) {
    revealType = vscode2.TextEditorRevealType.InCenterIfOutsideViewport;
  }
  editor.selection = selection;
  editor.revealRange(selection, revealType);
}
async function jumpToPrevious(treeView, treeDataProvider) {
  const activeEditor = vscode2.window.activeTextEditor;
  let element = null;
  const lineMode = getExtensionConfig().view.lineMode;
  if (treeView.visible && treeView.selection.length && lineMode === "selected-tag") {
    element = treeView.selection[0];
  } else {
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
  if (lineMode === "current-line" && activeEditor && activeEditor.selections[0].anchor.line > element.location.range.start.line) {
    target = element;
  }
  if (target && target.location) {
    vscode2.workspace.openTextDocument(target.location.uri).then((doc) => {
      vscode2.window.showTextDocument(doc).then((editor) => {
        editorJumptoRange(target.location.range, editor);
      });
    });
  }
}
async function jumpToNext(treeView, treeDataProvider) {
  const activeEditor = vscode2.window.activeTextEditor;
  let element;
  const lineMode = getExtensionConfig().view.lineMode;
  if (treeView.visible && treeView.selection.length && lineMode === "selected-tag") {
    element = treeView.selection[0];
  } else {
    if (!activeEditor || !activeEditor.selections.length || !activeEditor.document) {
      return;
    }
    element = editorFindNearestTag(
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
  let target = neighbors.next;
  if (lineMode === "current-line" && !neighbors.previous && activeEditor && activeEditor.selections[0].anchor.line < element.location.range.start.line) {
    target = element;
  }
  if (target && target.location) {
    vscode2.workspace.openTextDocument(target.location.uri).then((doc) => {
      vscode2.window.showTextDocument(doc).then((editor) => {
        editorJumptoRange(target.location.range, editor);
      });
    });
  }
}
function chooseFilterWords(words, treeDataProvider) {
  if (!words || !words.length) {
    const options = {
      prompt: "Filter Tags View:",
      placeHolder: "(e.g. @audit-info; @follow-up; leave empty to disable filter)"
    };
    vscode2.window.showInputBox(options).then((value) => {
      const filterWords = value ? value.trim().split(/[\s;]+/).map((v) => v.trim()).filter((v) => v.length > 0) : [];
      treeDataProvider.setTreeViewFilterWords(filterWords);
    });
  } else {
    treeDataProvider.setTreeViewFilterWords(words);
  }
}
var NodeType = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["FILE"] = 1] = "FILE";
  NodeType2[NodeType2["LOCATION"] = 2] = "LOCATION";
  return NodeType2;
})(NodeType || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TagsTreeDataProvider,
  chooseFilterWords,
  editorFindNearestTag,
  editorJumptoRange,
  jumpToNext,
  jumpToPrevious
});
//# sourceMappingURL=tree-data-view.js.map

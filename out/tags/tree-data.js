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

// src/tags/tree-data.ts
var tree_data_exports = {};
__export(tree_data_exports, {
  TagsTreeDataProvider: () => TagsTreeDataProvider
});
module.exports = __toCommonJS(tree_data_exports);
var vscode2 = __toESM(require("vscode"));
var path = __toESM(require("path"));
var crypto = __toESM(require("crypto"));

// src/utilities/utility.service.ts
var import_vscode = require("vscode");
var vscode = __toESM(require("vscode"));
var EventEmitter = require("events");
function getExtensionConfig() {
  return vscode.workspace.getConfiguration("instructions-manager");
}
var clickHistoryQuestionEventEmitter = new EventEmitter();

// src/tags/tree-data.ts
var InstructionsDataModel = class {
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
    this.model = new InstructionsDataModel(instructionsController);
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
  _filterTreeView(elements) {
    if (this.gitIgnoreHandler?.filter) {
      elements = elements.filter((e) => this.gitIgnoreHandler.filter(e.resource));
    }
    if (this.filterTreeViewWords.length) {
      elements = elements.filter(
        (e) => this.filterTreeViewWords.some((rx) => new RegExp(rx, "g").test(e.label || ""))
      );
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
var NodeType = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["FILE"] = 1] = "FILE";
  NodeType2[NodeType2["LOCATION"] = 2] = "LOCATION";
  return NodeType2;
})(NodeType || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TagsTreeDataProvider
});
//# sourceMappingURL=tree-data.js.map

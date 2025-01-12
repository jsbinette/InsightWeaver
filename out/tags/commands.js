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

// src/tags/commands.ts
var commands_exports = {};
__export(commands_exports, {
  Commands: () => Commands
});
module.exports = __toCommonJS(commands_exports);
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var Commands = class {
  constructor(controller) {
    this.controller = controller;
  }
  refresh() {
    Object.keys(this.controller.tags).forEach((uri) => {
      vscode.workspace.openTextDocument(vscode.Uri.parse(uri)).then((document) => {
        this.controller.updateTags(document);
      });
    });
  }
  showSelectTag(filter, placeHolder) {
    const entries = [];
    Object.keys(this.controller.tags).forEach((uri) => {
      const resource = vscode.Uri.parse(uri).fsPath;
      const fname = path.parse(resource).base;
      if (filter && !filter(resource)) {
        return;
      }
      Object.keys(this.controller.tags[uri]).forEach((cat) => {
        this.controller.tags[uri][cat].forEach((b) => {
          entries.push({
            label: b.text,
            description: fname,
            target: new vscode.Location(vscode.Uri.file(resource), b.range)
          });
        });
      });
    });
    vscode.window.showQuickPick(entries, { placeHolder: placeHolder || "Select tags" }).then((item) => {
      if (item && item.target) {
        vscode.commands.executeCommand(
          "instructions.jumpToRange",
          item.target.uri,
          item.target.range
        );
      }
    });
  }
  showSelectVisibleTag() {
    const visibleEditorUris = vscode.window.visibleTextEditors.map((te) => te.document.uri.fsPath);
    this.showSelectTag((resFsPath) => visibleEditorUris.includes(resFsPath), "Select visible tags");
  }
  showListTags(filter) {
    if (!vscode.window.createOutputChannel)
      return;
    const outputChannel = vscode.window.createOutputChannel("instructions");
    outputChannel.clear();
    const entries = [];
    Object.keys(this.controller.tags).forEach((uri) => {
      const resource = vscode.Uri.parse(uri).fsPath;
      const fname = path.parse(resource).base;
      if (filter && !filter(resource)) {
        return;
      }
      Object.keys(this.controller.tags[uri]).forEach((cat) => {
        this.controller.tags[uri][cat].forEach((b) => {
          entries.push({
            label: b.text,
            description: fname,
            target: new vscode.Location(vscode.Uri.file(resource), b.range)
          });
        });
      });
    });
    if (entries.length === 0) {
      vscode.window.showInformationMessage("No results");
      return;
    }
    entries.forEach((v, i) => {
      const patternA = `#${i + 1}	${v.target.uri}#${v.target.range.start.line + 1}`;
      const patternB = `#${i + 1}	${v.target.uri}:${v.target.range.start.line + 1}:${v.target.range.start.character + 1}`;
      const patternType = os.platform() === "linux" ? 1 : 0;
      outputChannel.appendLine([patternA, patternB][patternType]);
      outputChannel.appendLine(`	${v.label}
`);
    });
    outputChannel.show();
  }
  showListVisibleTags() {
    const visibleEditorUris = vscode.window.visibleTextEditors.map((te) => te.document.uri.fsPath);
    this.showListTags((resFsPath) => visibleEditorUris.includes(resFsPath));
  }
  scanWorkspaceTags() {
    vscode.workspace.findFiles(this.controller.includePattern, this.controller.excludePattern, this.controller.maxFilesLimit).then(
      (files) => {
        if (!files || files.length === 0) {
          console.log("No files found");
          return;
        }
        function isTextFile(filePath) {
          const buffer = fs.readFileSync(filePath, { encoding: null, flag: "r" });
          const textChars = buffer.toString("utf8").split("").filter((char) => {
            const code = char.charCodeAt(0);
            return code >= 32 && code <= 126 || code === 9 || code === 10 || code === 13;
          });
          return textChars.length / buffer.length > 0.9;
        }
        files.forEach((file) => {
          if (isTextFile(file.fsPath)) {
            vscode.workspace.openTextDocument(file).then(
              (document) => {
                this.controller.updateTags(document);
              },
              (err) => console.error(err)
            );
          }
        });
      },
      (err) => console.error(err)
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Commands
});
//# sourceMappingURL=commands.js.map

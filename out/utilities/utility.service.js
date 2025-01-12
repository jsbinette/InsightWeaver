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

// src/utilities/utility.service.ts
var utility_service_exports = {};
__export(utility_service_exports, {
  FireClickHistoryQuestionEvent: () => FireClickHistoryQuestionEvent,
  clickHistoryQuestionEventEmitter: () => clickHistoryQuestionEventEmitter,
  getAsWebviewUri: () => getAsWebviewUri,
  getChatData: () => getChatData,
  getExtensionConfig: () => getExtensionConfig,
  getHistoryData: () => getHistoryData,
  getNonce: () => getNonce,
  getStoreData: () => getStoreData,
  getVSCodeUri: () => getVSCodeUri,
  globalStateManager: () => globalStateManager,
  setChatData: () => setChatData,
  setHistoryData: () => setHistoryData,
  setStoreData: () => setStoreData
});
module.exports = __toCommonJS(utility_service_exports);
var vscode = __toESM(require("vscode"));
var EventEmitter = require("events");
function getExtensionConfig() {
  return vscode.workspace.getConfiguration("instructions-manager");
}
var clickHistoryQuestionEventEmitter = new EventEmitter();
function FireClickHistoryQuestionEvent(historyQuestion) {
  clickHistoryQuestionEventEmitter.emit("clickHistoryQuestion", historyQuestion);
}
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
function getAsWebviewUri(webview, extensionUri, pathList) {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}
function getVSCodeUri(extensionUri, pathList) {
  return vscode.Uri.joinPath(extensionUri, ...pathList);
}
function setStoreData(context, storeData) {
  const state = globalStateManager(context);
  if (storeData !== void 0) {
    state.write({
      storeData
    });
  }
}
function setHistoryData(context, historyData) {
  const state = globalStateManager(context);
  if (historyData !== void 0) {
    state.writeHistory({
      historyData
    });
  }
}
function setChatData(context, chatData) {
  const state = globalStateManager(context);
  if (chatData !== void 0) {
    state.writeChat({
      chatData
    });
  }
}
function getStoreData(context) {
  const state = globalStateManager(context);
  const { storeData } = state.read();
  return storeData;
}
function getHistoryData(context) {
  const state = globalStateManager(context);
  const { historyData } = state.readHistory();
  return historyData;
}
function getChatData(context) {
  const state = globalStateManager(context);
  const { chatData } = state.readChat();
  return chatData;
}
function globalStateManager(context) {
  return {
    read,
    write,
    writeHistory,
    readHistory,
    writeChat,
    readChat
  };
  function read() {
    return {
      storeData: context.globalState.get("storeData")
    };
  }
  function readHistory() {
    var historyData = context.globalState.get("historyData");
    if (historyData == void 0) {
      historyData = [];
    }
    return {
      historyData
    };
  }
  function readChat() {
    var chatData = context.globalState.get("chatData");
    if (chatData == void 0) {
      chatData = [];
    }
    return {
      chatData
    };
  }
  function write(newState) {
    context.globalState.update("storeData", newState.storeData);
  }
  function writeChat(newState) {
    context.globalState.update("chatData", newState.chatData);
  }
  function writeHistory(newState) {
    context.globalState.update("historyData", newState.historyData);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FireClickHistoryQuestionEvent,
  clickHistoryQuestionEventEmitter,
  getAsWebviewUri,
  getChatData,
  getExtensionConfig,
  getHistoryData,
  getNonce,
  getStoreData,
  getVSCodeUri,
  globalStateManager,
  setChatData,
  setHistoryData,
  setStoreData
});
//# sourceMappingURL=utility.service.js.map

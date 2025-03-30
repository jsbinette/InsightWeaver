import * as vscode from "vscode"
import EventEmitter = require('events')

export function getExtensionConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('instructions-manager')
}

/**
 * Gets nonce
 * @returns string
 */
export function getNonce() {
  let text = ""
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

/**
 * Create a vscode.Uri as WebviewUri for source files.
 * @param webview :vscode.Weview
 * @param extensionUri :vscode.Uri
 * @param pathList :string[]
 * @returns vscode.Uri
 */
export function getAsWebviewUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList))
}

/**
 * Create a vscode.Uri for source files.
 * @param extensionUri :vscode.Uri
 * @param pathList :strig[]
 * @returns vscode.Uri
 */
export function getVSCodeUri(extensionUri: vscode.Uri, pathList: string[]) {
  return vscode.Uri.joinPath(extensionUri, ...pathList)
}

/**
 * Set storeData into context.globalState.
 * @param context :vscode.ExtensionContext
 * @param storeData : any
 */
export function setStoreData(context: vscode.ExtensionContext, storeData: any) {
  const state = globalStateManager(context)

  if (storeData !== undefined) {
    state.write({
      storeData: storeData
    })
  }
}

export function setHistoryData(context: vscode.ExtensionContext, historyData: any) {
  const state = globalStateManager(context)

  if (historyData !== undefined) {
    state.writeHistory({
      historyData: historyData
    })
  }
}

export function setChatData(context: vscode.ExtensionContext, chatData: any) {
  const state = globalStateManager(context)

  if (chatData !== undefined) {
    state.writeChat({
      chatData: chatData
    })
  }
}

/**
 * Gets storeData from context.globalState.
 * @param context :vscode.ExtensionContext
 * @returns string
 */
export function getStoreData(context: vscode.ExtensionContext): any {
  const state = globalStateManager(context)

  const { storeData } = state.read()
  return storeData as any
}

export function getHistoryData(context: vscode.ExtensionContext): any {
  const state = globalStateManager(context)

  const { historyData } = state.readHistory()
  return historyData as any
}

export function getChatData(context: vscode.ExtensionContext): any {
  const state = globalStateManager(context)

  const { chatData } = state.readChat()
  return chatData as any
}

export function deserializeWithUri(json: string): any {
  return JSON.parse(json, (key, value) => {
    let a = value
    if (key == 'resource') {
      a = vscode.Uri.parse(value)
    } else if (['range', 'textAfterTagRange', 'textBeforeTagRange'].includes(key)) {
      a = new vscode.Range(value[0].line, value[0].character, value[1].line, value[1].character)
    }
    return a
  })
}

/**
* State Manager has read and write methods for api key. This methods set and get the api key from context.globalState.
* @param context :vscode.ExtensionContext.
* @returns void.
*/
export function globalStateManager(context: vscode.ExtensionContext) {
  return {
    read,
    write,
    writeHistory,
    readHistory,
    writeChat,
    readChat,
  }

  function read() {
    return {
      storeData: context.globalState.get('storeData')
    }
  }

  function readHistory() {
    var historyData = context.globalState.get('historyData')
    if (historyData == undefined) {
      historyData = []
    }
    return {
      historyData
    }
  }

  function readChat() {
    var chatData = context.globalState.get('chatData')
    if (chatData == undefined) {
      chatData = []
    }
    return {
      chatData
    }
  }

  function write(newState: any) {
    context.globalState.update('storeData', newState.storeData)
  }

  function writeChat(newState: any) {
    context.globalState.update('chatData', newState.chatData)
  }

  function writeHistory(newState: any) {
    context.globalState.update('historyData', newState.historyData)
  }
}


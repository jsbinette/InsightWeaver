import * as vscode from "vscode"
import * as fs from 'fs'
import * as path from 'path'
import { getStoreData, getNonce, getAsWebviewUri, setHistoryData, getVSCodeUri, getHistoryData, setChatData, getChatData, getExtensionConfig } from "../utilities/utility.service"
import { askToChatGptAsStream, askToChatGpt } from "../utilities/chat-gpt-api.service"
import { TagsController } from '../utilities/tagsController'
import { InstructionsController } from "../utilities/instructionsController"


/**
 * Webview panel class
 */
export class ChatGptPanel {
    public static currentPanel: ChatGptPanel | undefined
    private readonly _panel: vscode.WebviewPanel
    private _disposables: vscode.Disposable[] = []
    private _context: vscode.ExtensionContext

    // The tagsController is passed by the app, not resinstantiated here
    // because we need the "live" tags
    private static _tagsController: TagsController

    private static _instructionsController: InstructionsController

    // declare an array for search history.
    private _searchHistory: string[] = []

    /**
     * Constructor
     * @param context :vscode.ExtensionContext.
     * @param panel :vscode.WebviewPanel.
     * @param extensionUri :vscode.Uri.
     */
    private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._context = context
        this._panel = panel
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri)
        this._setWebviewMessageListener(this._panel.webview)

        this.sendHistoryAgain()

        //clear chat
        setChatData(this._context, [])
    }

    /**
     * Render method of webview that is triggered from "extension.ts" file.
     * @param context :vscode.ExtensionContext.
    */
    public static render(context: vscode.ExtensionContext, controller: TagsController) {
        // if exist show 
        if (ChatGptPanel.currentPanel) {
            ChatGptPanel.currentPanel._panel.reveal(vscode.ViewColumn.One)
        } else {
            // if not exist create a new one.
            const extensionUri: vscode.Uri = context.extensionUri
            const panel = vscode.window.createWebviewPanel("vscode-chat-gpt", "Ask To Chat Gpt", vscode.ViewColumn.One, {
                // Enable javascript in the webview.
                enableScripts: true,
                // Restrict the webview to only load resources from the `out` directory.
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')],
                // retain info when panel is hidden
                retainContextWhenHidden: true
            })

            this._tagsController = controller
            this._instructionsController = new InstructionsController(context, controller)

            const logoMainPath = getVSCodeUri(extensionUri, ['out/media', 'chat-gpt-logo.jpeg'])
            const icon = {
                "light": logoMainPath,
                "dark": logoMainPath
            }
            panel.iconPath = icon

            ChatGptPanel.currentPanel = new ChatGptPanel(context, panel, extensionUri)
        }

        const historyData = getHistoryData(context)
        ChatGptPanel.currentPanel._panel.webview.postMessage({ command: 'history-data', data: historyData })
    }

    /**
     * Dispose panel.
     */
    public dispose() {
        ChatGptPanel.currentPanel = undefined

        this._panel.dispose()

        while (this._disposables.length) {
            const disposable = this._disposables.pop()
            if (disposable) {
                disposable.dispose()
            }
        }
    }

    /**
     * Add listeners to catch messages from mainview js.
     * @param webview :vscode.Webview.
     */
    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                const command = message.command

                switch (command) {
                    case "press-ask-button":
                        let instructions = await ChatGptPanel._instructionsController.getInstructions()
                        this._panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions.length })
                        if (instructions.length > 200000) {
                            //vscode.window.showInformationMessage('Instrucitons too long')
                            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Instrucitons too long' })
                            return
                        }
                        this._askToChatGpt(message.data, instructions)
                        this.addHistoryToStore(message.data)
                        return
                    case "press-ask-no-instr-button":
                        this._askToChatGpt(message.data)
                        this.addHistoryToStore(message.data)
                        return
                    case "press-ask-button-no-stream":
                        let instructions2 = await ChatGptPanel._instructionsController.getInstructions()
                        this._panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions2.length })
                        if (instructions2.length > 200000) {
                            //vscode.window.showInformationMessage('Instrucitons too long')
                            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Instrucitons too long' })
                            return
                        }
                        this._askToChatGpt(message.data, instructions2, false)
                        this.addHistoryToStore(message.data)
                        break
                    case "history-request":
                        this.sendHistoryAgain()
                        break
                    case "clear-history":
                        this.clearHistory()
                        break
                    case "clear-chat":
                        this.clearChat()
                        break
                    case "show-instructions-set":
                        await this.showInstuctionSet()
                        break
                }
            },
            undefined,
            this._disposables
        )
    }

    /**
     * Gets Html content of webview panel.
     * @param webview :vscode.Webview.
     * @param extensionUri :vscode.Uri.
     * @returns string
     */
    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {

        // get uris from out directory based on vscode.extensionUri
        const webviewUri = getAsWebviewUri(webview, extensionUri, ["out/webviews", "main-webview.js"])
        const nonce = getNonce()
        const styleVSCodeUri = getAsWebviewUri(webview, extensionUri, ['out/media', 'vscode.css'])
        const logoMainPath = getAsWebviewUri(webview, extensionUri, ['out/media', 'chat-gpt-logo.jpeg'])

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'self' 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: blob: https:; script-src 'nonce-${nonce}';">
            <link href="${styleVSCodeUri}" rel="stylesheet">
            <link rel="icon" type="image/jpeg" href="${logoMainPath}">
          </head>
          <body>        
          <div class="content-container">  
          <div class="top-section">
            <p id="history-header" class="answer-header" style="display:none"> Question History: </p>   
            <ul id="history-id"  style="display:none">
			</ul>
            <p id="instructions-header" class="answer-header" style="display:none"> Instructions: </p>   
            <pre class="pre"><code class="code instructions" id="instructions-id" style="display:none"></code></pre>
            <div id="instructions-image-container" style="display:none"></div>
            <p class="answer-header"> Chat: </p>            
            <pre class="pre"><code class="code" id="answers-id"></code></pre>
            </div>
            <p id="error-message" class="red" style="display:none"></p> 
            <div class="bottom-section">
            <div class="text-area mt-20"  id="drag-drop-area">
                <label>Question:</label>
                <div id="file-list-container" class="drag-drop-label">
                    <ul id="file-list" style="list-style: none; padding: 0;"></ul>
                </div>
                <textarea id="question-text-id" class="question-text" rows="3" cols="100"></textarea>
            </div>
            <div class="flex-container" style="margin-bottom:15px">
              <vscode-button id="ask-button-id">Ask</vscode-button>
              <vscode-button id="ask-no-instructions-button-id">Ask (No instructions)</vscode-button>
              <vscode-button id="ask-no-stream-button-id">Ask (No Stream)</vscode-button>
              <vscode-button class="danger" id="clear-button-id">Clear</vscode-button>
              <vscode-button class="grayish" id="show-history-button">Show History</vscode-button>
              <vscode-button class="grayish" id="clear-history-button">Clear History</vscode-button>
              <vscode-button id="show-instructions-button" class="instruction-button">Show Instructions</vscode-button>
              <div id="instructions-character-count"></div>
              <vscode-progress-ring id="progress-ring-id" class="progress-ring"></vscode-progress-ring>
            </div>
            <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
        `
    }

    public sendHistoryAgain() {
        const historyData = getHistoryData(this._context)
        this._panel.webview.postMessage({ command: 'history-data', data: historyData })
    }


    private async _injectImageMessagesFromMarkdown(developerContent: string): Promise<ContentItem[]> {
        function extractImagePathsFromMarkdown(markdown: string): string[] {
            const imageRegex = /!\[.*?\]\((.*?)\)/g
            const matches: string[] = []
            let match: RegExpExecArray | null
            while ((match = imageRegex.exec(markdown)) !== null) {
                let path = match[1].trim()
                // Remove angle brackets if present
                if (path.startsWith("<") && path.endsWith(">")) {
                    path = path.slice(1, -1).trim()
                }
                // Prepend "./" if no slash
                if (!path.includes("/")) {
                    path = `./${path}`
                }
                matches.push(path)
            }
            return matches
        }

        function encodeFileToBase64(filePath: string): Promise<string> {
            return new Promise((resolve, reject) => {
                fs.readFile(filePath, (err, data) => {
                    if (err) reject(err)
                    else resolve(`data:image/${path.extname(filePath).slice(1)};base64,${data.toString('base64')}`)
                })
            })
        }

        const imagePaths = extractImagePathsFromMarkdown(developerContent)
        const contentItems: ContentItem[] = []

        const workspaceFolders = vscode.workspace.workspaceFolders
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error("No workspace is open.")
        }
        const rootPath = workspaceFolders[0].uri.fsPath

        for (const imagePath of imagePaths) {
            const absolutePath = path.resolve(rootPath, imagePath)
            try {
                const base64 = await encodeFileToBase64(absolutePath)
                contentItems.push({ type: "image_url", image_url: { url: base64 } })
            } catch (error) {
                console.error("Failed to load image:", imagePath, error)
            }
        }

        return contentItems
    }

    /**
     * Ask to ChatGpt a question ans send 'answer' command with data to mainview.js.
     */
    private _askToChatGpt(content: ContentItem[], developerContent: string = "", asStream = true) {
        const textItem = content.find(item => item.type === "text") as { type: "text"; text: string } | undefined
        if (!textItem || !textItem.text.trim()) {
            //vscode.window.showInformationMessage('Please enter a question!')
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please enter a question!' })
            return
        }
        const storeData = getStoreData(this._context)
        const existApiKey = storeData.apiKey
        const existTemperature = storeData.temperature
        const existModel = storeData.model
        var asssistantResponse = { role: "assistant", content: '' }
        if (existApiKey == undefined || existApiKey == null || existApiKey == '') {
            //vscode.window.showInformationMessage('Please add your ChatGpt api key!')
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please add your ChatGpt api key!' })
        } else if (existTemperature == undefined || existTemperature == null || existTemperature == 0) {
            //vscode.window.showInformationMessage('Please add temperature!')
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please add temperature!' })
        } else if (existModel == undefined || existModel == null || existModel == '') {
            //vscode.window.showInformationMessage('Please add model!')
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please add model!' })
        }
        else {
            // get previous messages
            let messages = getChatData(this._context)
            if (messages.length != 0) {
                developerContent = ""
            }

            this._injectImageMessagesFromMarkdown(developerContent).then((imageMessages) => {
                if (messages.length === 0 && developerContent.length > 0) {
                    if (imageMessages.length > 0) {
                        const textContent = { type: "text", text: developerContent }
                        //this doesn't work yet so I split it instead
                        //messages.push({ role: "developer", content: [textContent, ...imageMessages] })
                        messages.push({ role: "developer", content: developerContent })
                        messages.push({ role: "user", content: [{ type: "text", text: "Here are the images refered in the developer message" }, ...imageMessages] })
                    } else {
                        messages.push({ role: "developer", content: developerContent })
                    }
                }

                messages.push({ role: "user", content: content })
                setChatData(this._context, messages)
                if (asStream) {
                    async function handleChat(context: vscode.ExtensionContext, model: string, query: Array<any> | undefined, apiKey: string, temperature: number) {
                        try {
                            let content = ""
                            for await (const answer of askToChatGptAsStream(existModel, messages, existApiKey, existTemperature)) {
                                if (answer === "END MESSAGE") {
                                    // Save final content
                                    const chatData = getChatData(context)
                                    asssistantResponse.content = content
                                    chatData.push(asssistantResponse)
                                    setChatData(context, chatData)
                                } else {
                                    content += answer
                                    ChatGptPanel.currentPanel?._panel.webview.postMessage({
                                        command: "answer",
                                        data: answer,
                                    })
                                }
                            }
                        } catch (error) {
                            console.error("(JSB Backend) Error occurred:", error)
                            ChatGptPanel.currentPanel?._panel.webview.postMessage({
                                command: "error-message",
                                data: String(error),
                            })
                        }
                    }

                    handleChat(this._context, existModel, messages, existApiKey, existTemperature)
                } else {
                    askToChatGpt(existModel, messages, existApiKey, existTemperature).then(data => {
                        asssistantResponse.content += data
                        ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'answer', data: data })
                    })
                        .catch(error => {
                            // Handle the error here
                            console.error('(JSB Backend) Error occurred:', error)
                            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: error })
                        })
                }
            }).catch(err => {
                console.error("(JSB Backend) Error loading images:", err)
                ChatGptPanel.currentPanel?._panel.webview.postMessage({
                    command: "error-message",
                    data: String(err),
                })
            })
        }
    }

    clearHistory() {
        this._searchHistory = []
        setHistoryData(this._context, this._searchHistory)
    }

    clearChat() {
        setChatData(this._context, [])
    }

    addHistoryToStore(question: string) {
        this._searchHistory = getHistoryData(this._context)
        this._searchHistory.push(question)
        setHistoryData(this._context, this._searchHistory)
    }

    getHistoryFromStore() {
        const history = getHistoryData(this._context)
        return history
    }

    async showInstuctionSet() {
        let instructions = await ChatGptPanel._instructionsController.getInstructions()
        this._injectImageMessagesFromMarkdown(instructions).then((images) => {
            this._panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions.length })
            if (images.length > 0) {
                const textContent = { type: "text", text: instructions }
                this._panel.webview.postMessage({ command: 'instructions-data', data: [textContent, ...images] });
            } else {
                this._panel.webview.postMessage({ command: 'instructions-data', data: instructions })
            }
        })
            .catch(err => {
                console.error("(JSB Backend) Error loading images:", err)
                ChatGptPanel.currentPanel?._panel.webview.postMessage({
                    command: "error-message",
                    data: String(err),
                })
            })
    }

}

type ContentItem =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };
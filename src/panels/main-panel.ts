import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import { getStoreData, getNonce, getAsWebviewUri, setHistoryData, getVSCodeUri, getHistoryData, setChatData, getChatData, getExtensionConfig } from "../utilities/utility.service";
import { askToChatGptAsStream } from "../utilities/chat-gpt-api.service";
import { TagsController } from '../utilities/tagsController';
import { InstructionsController } from "../utilities/instructionsController";


/**
 * Webview panel class
 */
export class ChatGptPanel {
    public static currentPanel: ChatGptPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _context: vscode.ExtensionContext;

    // The tagsController is passed by the app, not resinstantiated here
    // because we need the "live" tags
    private static _tagsController: TagsController;

    private static _instructionsController: InstructionsController

    // declare an array for search history.
    private _searchHistory: string[] = [];

    /**
     * Constructor
     * @param context :vscode.ExtensionContext.
     * @param panel :vscode.WebviewPanel.
     * @param extensionUri :vscode.Uri.
     */
    private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._context = context;
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        this._setWebviewMessageListener(this._panel.webview);

        this.sendHistoryAgain();

        //clear chat
        setChatData(this._context, []);
    }

    /**
     * Render method of webview that is triggered from "extension.ts" file.
     * @param context :vscode.ExtensionContext.
    */
    public static render(context: vscode.ExtensionContext, controller: TagsController) {
        // if exist show 
        if (ChatGptPanel.currentPanel) {
            ChatGptPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            // if not exist create a new one.
            const extensionUri: vscode.Uri = context.extensionUri;
            const panel = vscode.window.createWebviewPanel("vscode-chat-gpt", "Ask To Chat Gpt", vscode.ViewColumn.One, {
                // Enable javascript in the webview.
                enableScripts: true,
                // Restrict the webview to only load resources from the `out` directory.
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'out')],
                // retain info when panel is hidden
                retainContextWhenHidden: true
            });

            this._tagsController = controller;
            this._instructionsController = new InstructionsController(context, controller)

            const logoMainPath = getVSCodeUri(extensionUri, ['out/media', 'chat-gpt-logo.jpeg']);
            const icon = {
                "light": logoMainPath,
                "dark": logoMainPath
            };
            panel.iconPath = icon;

            ChatGptPanel.currentPanel = new ChatGptPanel(context, panel, extensionUri);
        }

        const historyData = getHistoryData(context);
        ChatGptPanel.currentPanel._panel.webview.postMessage({ command: 'history-data', data: historyData });
    }

    /**
     * Dispose panel.
     */
    public dispose() {
        ChatGptPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
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
                const command = message.command;

                switch (command) {
                    case "press-ask-button":
                        let instructions = await ChatGptPanel._instructionsController.getInstructions()
                        this._panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions.length });
                        if (instructions.length > 120000) {
                            //vscode.window.showInformationMessage('Instrucitons too long');
                            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Instrucitons too long' });
                            return;
                        }
                        this._askToChatGpt(message.data, instructions);
                        this.addHistoryToStore(message.data);
                        return;
                    case "press-ask-no-instr-button":
                        this._askToChatGpt(message.data);
                        this.addHistoryToStore(message.data);
                        return;
                    case "history-question-clicked":
                        this.clickHistoryQuestion(message.data);
                        break;
                    case "history-request":
                        this.sendHistoryAgain();
                        break;
                    case "clear-history":
                        this.clearHistory();
                        break;
                    case "clear-chat":
                        this.clearChat();
                        break;
                    case "show-instructions-set":
                        await this.showInstuctionSet();
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    /**
     * Gets Html content of webview panel.
     * @param webview :vscode.Webview.
     * @param extensionUri :vscode.Uri.
     * @returns string;
     */
    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {

        // get uris from out directory based on vscode.extensionUri
        const webviewUri = getAsWebviewUri(webview, extensionUri, ["out/webviews", "main-webview.js"]);
        const nonce = getNonce();
        const styleVSCodeUri = getAsWebviewUri(webview, extensionUri, ['out/media', 'vscode.css']);
        const logoMainPath = getAsWebviewUri(webview, extensionUri, ['out/media', 'chat-gpt-logo.jpeg']);

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'self' 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
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
            <p class="answer-header"> Chat: </p>            
            <pre class="pre"><code class="code" id="answers-id"></code></pre>
            </div>
            <div class="bottom-section">
            <div class="text-area mt-20">
                <label>Question:</label>
                <textarea id="question-text-id" class="question-text" rows="3" cols="100"></textarea>
            </div>
            <div class="flex-container" style="margin-bottom:15px">
              <vscode-button id="ask-button-id">Ask</vscode-button>
              <vscode-button id="ask-no-instructions-button-id">Ask (No instructions)</vscode-button>
              <vscode-button class="danger" id="clear-button-id">Clear</vscode-button>
              <vscode-button class="grayish" id="show-history-button">Show History</vscode-button>
              <vscode-button class="grayish" id="clear-history-button">Clear History</vscode-button>
              <vscode-button id="show-instructions-button" class="instruction-button">Show Instructions</vscode-button>
              <div id="instructions-character-count"></div>
              <vscode-progress-ring id="progress-ring-id" class="progress-ring"></vscode-progress-ring>
              <p id="error-message" class="red" style="display:none"></p> 
            </div>
            <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
        `;
    }

    /**
     * Ask history question to ChatGpt and send 'history-question-clicked' command with data to mainview.js.
     * @param hisrtoryQuestion :string
     */
    public clickHistoryQuestion(hisrtoryQuestion: string) {
        this._askToChatGpt(hisrtoryQuestion);
    }

    public sendHistoryAgain() {
        const historyData = getHistoryData(this._context);
        this._panel.webview.postMessage({ command: 'history-data', data: historyData });
    }

    /**
     * Ask to ChatGpt a question ans send 'answer' command with data to mainview.js.
     * @param question :string
     */
    private _askToChatGpt(question: string, systemcontent: string = "") {
        if (question == undefined || question == null || question == '') {
            //vscode.window.showInformationMessage('Please enter a question!');
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please enter a question!' });
            return;
        }
        const storeData = getStoreData(this._context);
        const existApiKey = storeData.apiKey;
        const existTemperature = storeData.temperature;
        var asssistantResponse = { role: "assistant", content: '' };
        if (existApiKey == undefined || existApiKey == null || existApiKey == '') {
            //vscode.window.showInformationMessage('Please add your ChatGpt api key!');
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please add your ChatGpt api key!' });
        } else if (existTemperature == undefined || existTemperature == null || existTemperature == 0) {
            //vscode.window.showInformationMessage('Please add temperature!');
            ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'error-message', data: 'Please add temperature!' });

        }
        else {
            // make the message
            let questionMessage = { role: "user", content: question };
            // get previous messages
            let messages = getChatData(this._context);
            //if it's empty this is where we add the system message
            if (messages.length == 0) {
                if (systemcontent != "") {
                    messages.push({ role: "system", content: systemcontent });
                }
            }
            messages.push(questionMessage);
            setChatData(this._context, messages);
            askToChatGptAsStream(messages, existApiKey, existTemperature).subscribe(answer => {
                //check for 'END MESSAGE' string, 
                if (answer == 'END MESSAGE') {
                    var chatData = getChatData(this._context);
                    chatData.push(asssistantResponse);
                    setChatData(this._context, chatData);
                } else {
                    asssistantResponse.content += answer;
                    ChatGptPanel.currentPanel?._panel.webview.postMessage({ command: 'answer', data: answer });
                }
            });
        }
    }

    clearHistory() {
        this._searchHistory = [];
        setHistoryData(this._context, this._searchHistory);
    }

    clearChat() {
        setChatData(this._context, []);
    }

    addHistoryToStore(question: string) {
        this._searchHistory = getHistoryData(this._context);
        this._searchHistory.push(question);
        setHistoryData(this._context, this._searchHistory);
    }

    getHistoryFromStore() {
        const history = getHistoryData(this._context);
        return history;
    }

    async showInstuctionSet() {
        let instructions = await ChatGptPanel._instructionsController.getInstructions()
        this._panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions.length });
        this._panel.webview.postMessage({ command: 'instructions-data', data: instructions });
    }

}
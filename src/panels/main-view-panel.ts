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
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private context: vscode.ExtensionContext;

    // The tagsController is passed by the app, not resinstantiated here
    // because we need the "live" tags
    private static tagsController : TagsController;

    private static instructionsController: InstructionsController

    // declare an array for search history.
    private searchHistory: string[] = [];

    /**
     * Constructor
     * @param context :vscode.ExtensionContext.
     * @param panel :vscode.WebviewPanel.
     * @param extensionUri :vscode.Uri.
     */
    private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.context = context;
        this.panel = panel;
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.html = this.getWebviewContent(this.panel.webview, extensionUri);
        this.setWebviewMessageListener(this.panel.webview);

        this.sendHistoryAgain();

        //clear chat
        setChatData(this.context, []);
    }

    /**
     * Render method of webview that is triggered from "extension.ts" file.
     * @param context :vscode.ExtensionContext.
    */
    public static render(context: vscode.ExtensionContext, tagsControllerPassed: TagsController) {
        // if exist show 
        if (ChatGptPanel.currentPanel) {
            ChatGptPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
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

            this.tagsController = tagsControllerPassed;
            this.instructionsController = new InstructionsController(context, tagsControllerPassed)

            const logoMainPath = getVSCodeUri(extensionUri, ['out/media', 'chat-gpt-logo.jpeg']);
            const icon = {
                "light": logoMainPath,
                "dark": logoMainPath
            };
            panel.iconPath = icon;

            ChatGptPanel.currentPanel = new ChatGptPanel(context, panel, extensionUri);
        }

        const historyData = getHistoryData(context);
        ChatGptPanel.currentPanel.panel.webview.postMessage({ command: 'history-data', data: historyData });
    }

    /**
     * Dispose panel.
     */
    public dispose() {
        ChatGptPanel.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Add listeners to catch messages from mainview js.
     * @param webview :vscode.Webview.
     */
    private setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                const command = message.command;

                switch (command) {
                    case "press-ask-button":
                        let instructions = await ChatGptPanel.instructionsController.getInstructions()
                        this.panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions.length });
                        if (instructions.length > 120000) {
                            //vscode.window.showInformationMessage('Instrucitons too long');
                            ChatGptPanel.currentPanel?.panel.webview.postMessage({ command: 'error-message', data: 'Instrucitons too long' });
                            return;
                        }
                        this.askToChatGpt(message.data, instructions);
                        this.addHistoryToStore(message.data);
                        return;
                    case "press-ask-no-instr-button":
                        this.askToChatGpt(message.data);
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
            this.disposables
        );
    }

    /**
     * Gets Html content of webview panel.
     * @param webview :vscode.Webview.
     * @param extensionUri :vscode.Uri.
     * @returns string;
     */
    private getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {

        // get uris from out directory based on vscode.extensionUri
        const webviewUri = getAsWebviewUri(webview, extensionUri, ["out/webviews", "main-view.js"]);
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
        this.askToChatGpt(hisrtoryQuestion);
    }

    public sendHistoryAgain() {
        const historyData = getHistoryData(this.context);
        this.panel.webview.postMessage({ command: 'history-data', data: historyData });
    }

    /**
     * Ask to ChatGpt a question ans send 'answer' command with data to mainview.js.
     * @param question :string
     */
    private askToChatGpt(question: string, systemcontent: string = "") {
        if (question == undefined || question == null || question == '') {
            //vscode.window.showInformationMessage('Please enter a question!');
            ChatGptPanel.currentPanel?.panel.webview.postMessage({ command: 'error-message', data: 'Please enter a question!' });
            return;
        }
        const storeData = getStoreData(this.context);
        const existApiKey = storeData.apiKey;
        const existTemperature = storeData.temperature;
        var asssistantResponse = { role: "assistant", content: '' };
        if (existApiKey == undefined || existApiKey == null || existApiKey == '') {
            //vscode.window.showInformationMessage('Please add your ChatGpt api key!');
            ChatGptPanel.currentPanel?.panel.webview.postMessage({ command: 'error-message', data: 'Please add your ChatGpt api key!' });
        } else if (existTemperature == undefined || existTemperature == null || existTemperature == 0) {
            //vscode.window.showInformationMessage('Please add temperature!');
            ChatGptPanel.currentPanel?.panel.webview.postMessage({ command: 'error-message', data: 'Please add temperature!' });

        }
        else {
            // make the message
            let questionMessage = { role: "user", content: question };
            // get previous messages
            let messages = getChatData(this.context);
            //if it's empty this is where we add the system message
            if (messages.length == 0) {
                if (systemcontent != "") {
                    messages.push({ role: "system", content: systemcontent });
                }
            }
            messages.push(questionMessage);
            setChatData(this.context, messages);
            askToChatGptAsStream(messages, existApiKey, existTemperature).subscribe(answer => {
                //check for 'END MESSAGE' string, 
                if (answer == 'END MESSAGE') {
                    var chatData = getChatData(this.context);
                    chatData.push(asssistantResponse);
                    setChatData(this.context, chatData);
                } else {
                    asssistantResponse.content += answer;
                    ChatGptPanel.currentPanel?.panel.webview.postMessage({ command: 'answer', data: answer });
                }
            });
        }
    }

    clearHistory() {
        this.searchHistory = [];
        setHistoryData(this.context, this.searchHistory);
    }

    clearChat() {
        setChatData(this.context, []);
    }

    addHistoryToStore(question: string) {
        this.searchHistory = getHistoryData(this.context);
        this.searchHistory.push(question);
        setHistoryData(this.context, this.searchHistory);
    }

    getHistoryFromStore() {
        const history = getHistoryData(this.context);
        return history;
    }

    async showInstuctionSet() {
        let instructions = await ChatGptPanel.instructionsController.getInstructions()
        this.panel.webview.postMessage({ command: 'upadate-instructions-character-count', data: instructions.length });
        this.panel.webview.postMessage({ command: 'instructions-data', data: instructions});
    }

}
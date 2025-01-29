import * as vscode from 'vscode';
import { TreeDataModel, TreeElement } from '../utilities/treeDataModel';
import { getNonce, getAsWebviewUri } from '../utilities/utility.service';

export class InstructionTreeWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'treeView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri,
        private readonly dataModel: TreeDataModel) {

    }


    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getWebviewContent(this._view.webview, this._extensionUri);
    
        this.addReceiveMessageEvents(webviewView.webview);
    }

    public refresh() {
        // Called whenever your data changes
        if (this._view) {
            this._view.webview.html = this._getWebviewContent(this._view.webview, this._extensionUri);
        }
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        if (this._view) {
            const scriptUri = getAsWebviewUri(webview, extensionUri, ["out/webviews", "tree-webview.js"]);
            const styleVSCodeUri = getAsWebviewUri(webview, extensionUri, ['out/media', 'vscode.css']);
            const codiconsUri = getAsWebviewUri(webview, extensionUri, ['node_modules', '@vscode/codicons', 'dist', 'codicon.css']);
            const nonce = getNonce();
            //JSB here is the important part
            const rootElements = this.dataModel.getRoot();
            return `<!DOCTYPE html>
            <html>
            <head>
            	<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleVSCodeUri}" rel="stylesheet">			
				<title>Panel</title>
                <link href="${codiconsUri}" rel="stylesheet" />
            </head>
            <body class="tree">
            <select id="groupByComboBox">
            <option value="file" ${this.dataModel.groupBy === 'file' ? 'selected' : ''}>File</option>
            <option value="style" ${this.dataModel.groupBy === 'style' ? 'selected' : ''}>Style</option>
            <option value="tagName" ${this.dataModel.groupBy === 'tagName' ? 'selected' : ''}>Tag Name</option>
            </select>
            <ul class="tree">
               ${this.createListMarkup(rootElements)}
            </ul>
			<script nonce="${nonce}" src="${scriptUri}"></script>
            </body></html>`;
        }
        else {
            return '';
        }
    }

    private createListMarkup(elements: TreeElement[]): string {
        return elements.map(el => {
            return `
                <li class="list-item ${el.out ? 'grayed-out' : ''}">
            ${el.children ? `<span class="toggle"><i class="codicon codicon-chevron-right"></i></span>` : ''}
            <label>
                <input type="checkbox" ${el.out ? 'disabled' : ''}/> 
                ${el.label}
            </label>
            ${el.children ? `<ul class="child-container">${this.createListMarkup(el.children)}</ul>` : ''}
        </li>`;
        }).join('');
    }

    private addReceiveMessageEvents(webview: vscode.Webview) {
        webview.onDidReceiveMessage((message: { command: string, args?: any[] }) => {
            vscode.commands.executeCommand("instructions-manager." + message.command, ...(message.args || []));
        });
    }
}
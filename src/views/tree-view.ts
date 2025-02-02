import * as vscode from 'vscode';
import { getExtensionConfig } from '../utilities/utility.service';
import { getNonce, getAsWebviewUri } from '../utilities/utility.service';
import { TreeDataModel, RootElement } from '../utilities/treeDataModel';
import { Tag } from '../utilities/tagsController';

export class TreeWebviewProvider implements vscode.WebviewViewProvider {
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
               ${this.createRootListMarkup(rootElements)}
            </ul>
			<script nonce="${nonce}" src="${scriptUri}"></script>
            </body></html>`;
        }
        else {
            return '';
        }
    }

    private createRootListMarkup(elements: RootElement[]): string {
        return elements.map(el => {
            return `
                <li class="list-item ${el.out ? 'grayed-out' : ''} ${el.expanded ? 'expanded' : ''}" id="${el.id}">
            ${el.children ? `<span class="toggle"><i class="codicon codicon-chevron-right"></i></span>` : ''}
            <label>
                <input type="checkbox" id="${el.id}" class="rootCheckbox" ${el.out ? 'grayed-out' : ''}/> 
            <label id="${el.id}"  class="treeLabel">${el.label}</label>
            </label>
            ${el.children ? `<ul class="child-container">${this.createTagListMarkup(el.children)}</ul>` : ''}
        </li>`;
        }).join('');
    }

    private createTagListMarkup(elements: Tag[]): string {
        return elements.map(el => {
            return `
                <li class="list-item ${el.out ? 'grayed-out' : ''}">
            <label>
                <input type="checkbox" id="${el.id}" class="treeCheckbox" ${el.out ? '' : 'checked'}/> 
            <label id="${el.id}"  class="treeLabel">${el.label}</label>
            </label>
        </li>`;
        }).join('');
    }

    private addReceiveMessageEvents(webview: vscode.Webview) {
        webview.onDidReceiveMessage((message: { command: string, args?: any[] }) => {
            vscode.commands.executeCommand("instructions-manager." + message.command, ...(message.args || []));
        });
    }
}

/**
 * Jumps to the specified range in a text editor.
 * @param range The range to jump to.
 * @param editor Optional editor to use, defaults to the active editor.
 */
export function editorJumptoRange(range: vscode.Range, editor?: vscode.TextEditor): void {
    editor = editor || vscode.window.activeTextEditor; // Provided editor or fallback to active

    if (!editor) return; // No active editor, nothing to do

    let revealType = vscode.TextEditorRevealType.InCenter;
    const selection = new vscode.Selection(
        range.start.line,
        range.start.character,
        range.end.line,
        range.end.character
    );

    if (range.start.line === editor.selection.active.line) {
        revealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }

    editor.selection = selection;
    editor.revealRange(selection, revealType);
}
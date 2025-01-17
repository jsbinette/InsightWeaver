import * as vscode from 'vscode';
import { TagsDataModel, TreeElement } from '../webviews/tree-data-view';

export class DataTreeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'myDataTreeView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri,
        private readonly dataModel: TagsDataModel) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.generateHtml();
    }

    public refresh() {
        // Called whenever your data changes
        if (this._view) {
            this._view.webview.html = this.generateHtml();
        }
    }

    private generateHtml(): string {
        if (this._view) {
            const codiconsUri = this._view.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
            const rootElements = this.dataModel.getRoot();
            // Recursively build <li>... for each element, 
            // check for children, apply grayed-out classes, etc.
            return `<!DOCTYPE html>
            <html>
            <head>
            <link href="${codiconsUri}" rel="stylesheet" />
                    <style>
    body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        line-height: var(--vscode-line-height);
        color: var(--vscode-foreground);
        margin: 0;
        padding: 0;
    }
    ul, li {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    .child-container li {
        display: flex;
    }
    .toggle {
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        margin-left: 10px;
        flex-shrink: 0;
        cursor: pointer;
    }
    label {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        flex: 1;                /* use remaining space for label text */
    }
    label input[type="checkbox"] {
        margin-right: 8px;
        flex-shrink: 0;
    }
    li.grayed-out{
        opacity: 0.5;
    }
    /* Child container is hidden unless expanded */
    .child-container {
        display: none;
        padding-left: 38px;
    }
    li.expanded > .child-container {
        display: block;
    }
</style>
            </head>
            <body>
            <ul class="monaco-tree">
               ${this.createListMarkup(rootElements)}
            </ul>
    <script>
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const parentLi = toggle.parentElement;
                parentLi.classList.toggle('expanded');
                 const icon = toggle.querySelector('i');

          if (parentLi.classList.contains('expanded')) {
              icon.classList.remove('codicon-chevron-right');
              icon.classList.add('codicon-chevron-down');
          } else {
              icon.classList.remove('codicon-chevron-down');
              icon.classList.add('codicon-chevron-right');
          }
            });
        });
    </script>
            </body></html>`;
        }
        else {
            return '';
        }
    }

    private createListMarkup(elements: TreeElement[]): string {
        return elements.map(el => {
            return `
                <li class="${el.out ? 'grayed-out' : ''}">
            ${el.children ? `<span class="toggle"><i class="codicon codicon-chevron-right"></i></span>` : ''}
            <label>
                <input type="checkbox" ${el.out ? 'disabled' : ''}/> 
                ${el.label}
            </label>
            ${el.children ? `<ul class="child-container">${this.createListMarkup(el.children)}</ul>` : ''}
        </li>`;
        }).join('');
    }


    /*
resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtmlForWebview();
    
    webviewView.webview.onDidReceiveMessage(async (message) => {
        // Handle checkbox toggles or any other interaction here
    });
}

private getHtmlForWebview(): string {
    return `<!DOCTYPE html>
<html>
<head>
<style>
    ul.tree, ul.tree ul {
        list-style: none;
        margin: 0;
        padding-left: 1em;
    }
    ul.tree ul {
        display: none;
    }
    ul.tree li.expanded > ul {
        display: block;
    }
    .toggle::before {
        content: '▶';
        display: inline-block;
        margin-right: 4px;
        cursor: pointer;
    }
    .expanded > .toggle::before {
        content: '▼';
    }
    .grayed-out {
        opacity: 0.5;
    }
</style>
</head>
<body>
<ul class="tree">
    <li>
        <span class="toggle"></span>
        <label><input type="checkbox" />Root 1</label>
        <ul>
            <li class="grayed-out">
                <label><input type="checkbox" disabled />Child 1.1</label>
            </li>
            <li>
                <label><input type="checkbox" />Child 1.2</label>
            </li>
        </ul>
    </li>
    <li>
        <span class="toggle"></span>
        <label><input type="checkbox" />Root 2</label>
        <ul>
            <li>
                <label><input type="checkbox" />Child 2.1</label>
            </li>
        </ul>
    </li>
</ul>
<script>
    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const parentLi = toggle.parentElement;
            parentLi.classList.toggle('expanded');
        });
    });
</script>
</body>
</html>`;
}
*/
}
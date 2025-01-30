
import * as vscode from 'vscode';
import { ImagePanel } from './panels/image-panel';
import { ChatGptPanel } from './panels/main-panel';
import { SideBarViewProvider } from './views/sidebar-view';
import { InstructionTreeWebviewProvider, editorJumptoRange } from './views/tree-view';
import { getStoreData, getExtensionConfig } from './utilities/utility.service';
import { registerContextMenuCommands } from './utilities/context-menu-command';
import { TagsController } from './utilities/tagsController';
import { TreeDataModel } from './utilities/treeDataModel';
import { Commands } from './utilities/commands';
import { GitIgnore } from './utilities/gitignore';


export async function activate(context: vscode.ExtensionContext) {

	const tagsController = new TagsController(context);
	const commands = new Commands(tagsController)
	const treeDataModel = new TreeDataModel(tagsController);
	const instructionTreeWebviewProvider = new InstructionTreeWebviewProvider(context.extensionUri, treeDataModel)

	// Chat panel register
	const chatPanelCommand = vscode.commands.registerCommand("instructions-manager.start", () => {
		//Jan2025 JSB I'm passing the instructionController so that the instance that has the tags is available to the view.
		ChatGptPanel.render(context, tagsController);
	});
	context.subscriptions.push(chatPanelCommand);

	// Image panel register
	const imagePanelCommand = vscode.commands.registerCommand("instructions-manager.start-image", () => {
		ImagePanel.render(context);
	});
	context.subscriptions.push(imagePanelCommand);

	// Side Bar View Provider
	const provider = new SideBarViewProvider(context.extensionUri, context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SideBarViewProvider.viewType, provider, { webviewOptions: { retainContextWhenHidden: true } })
	);

	// Context Menu Commands
	const storeData = getStoreData(context);
	registerContextMenuCommands(storeData.apiKey);


	/** Register commands */
	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.jumpToRange', (documentUri: vscode.Uri, range: vscode.Range) => {
			vscode.workspace.openTextDocument(documentUri).then((doc) => {
				vscode.window.showTextDocument(doc).then((editor) => {
					editorJumptoRange(range, editor);
				});
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.refresh', () => {
			commands.refresh();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.toggleShowVisibleFilesOnly', () => {
			getExtensionConfig().update(
				'view.showVisibleFilesOnly',
				!getExtensionConfig().view.showVisibleFilesOnly
			);
			commands.refresh();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.chooseGroupBy", (selectedChoice: string) => {
			treeDataModel.changeGoupBy(selectedChoice);
			commands.refresh();
			//treeDataProvider.refresh();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.debug.state.reset", () => {
			tagsController.resetWorkspace();
			tagsController.loadFromWorkspace();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.showSelectTag", () => {
			commands.showSelectTag();
		})
	);

	//JSB
	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.goToTag", (id:string) => {
			const tree = treeDataModel.getRoot();
			const element = tree.find((element) => element.id === id);
			if (element) { //we have a root; we do nothing
			} else {
				tree.forEach((element) => {
					if (element.children) {
						const child = element.children.find((child) => child.id === id);
						if (child) {
							commands.goToTag(child.resource, child.location);
						}
					}
				});
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.showSelectVisibleTag", () => {
			commands.showSelectVisibleTag();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.listTags", () => {
			commands.showListTags();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.listVisibleTags", () => {
			commands.showListVisibleTags();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.scanWorkspace", () => {
			commands.scanWorkspaceTags();
		})
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(InstructionTreeWebviewProvider.viewId, instructionTreeWebviewProvider)
	);

	/** Module Initialization */
	commands.refresh();
	instructionTreeWebviewProvider.refresh();
	onDidChange();

	/** Event Setup */
	/***** OnChange */
	vscode.window.onDidChangeActiveTextEditor((editor) => {
		if (editor) {
			onDidChange(editor);
		}
	}, null, context.subscriptions);

	/***** OnChange */
	vscode.workspace.onDidChangeTextDocument((event) => {
		if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
			onDidChange(vscode.window.activeTextEditor, event);
		}
	}, null, context.subscriptions);

	/***** OnSave */
	vscode.workspace.onDidSaveTextDocument((document) => {
		if (vscode.window.activeTextEditor) {
			onDidSave(vscode.window.activeTextEditor);
		}
	}, null, context.subscriptions);

	/***** OnOpen */
	vscode.workspace.onDidOpenTextDocument(() => {
		if (vscode.window.activeTextEditor) {
			onDidSave(vscode.window.activeTextEditor);
		}
	}, null, context.subscriptions);

	/***** OnClose */
	vscode.workspace.onDidCloseTextDocument(() => {
		onDidSave();
	}, null, context.subscriptions);

	/************* Handlers */
	async function onDidChange(editor?: vscode.TextEditor, event?: vscode.TextDocumentChangeEvent): Promise<void> {
		if (!editor) {
			// If no editor, refresh only the tree view
			instructionTreeWebviewProvider.refresh();
			return;
		}

		if (getExtensionConfig().enable) {
			await tagsController.decorate(editor);
		}
		instructionTreeWebviewProvider.refresh();
	}

	async function onDidSave(editor?: vscode.TextEditor): Promise<void> {
		if (editor && getExtensionConfig().enable) {
			await tagsController.decorate(editor);
		}
		instructionTreeWebviewProvider.refresh();
	}


	/************* File-System Watcher Features */
	if (getExtensionConfig().view.exclude.gitIgnore) {
		/* Optional Feature */
		const gitIgnoreFilter = new GitIgnore();


		const gitIgnoreWatcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
		context.subscriptions.push(gitIgnoreWatcher);

		gitIgnoreWatcher.onDidChange((uri) => gitIgnoreFilter.onDidChange(uri));
		gitIgnoreWatcher.onDidDelete((uri) => gitIgnoreFilter.onDidDelete(uri));
		gitIgnoreWatcher.onDidCreate((uri) => gitIgnoreFilter.onDidChange(uri));

		vscode.workspace.findFiles('**/.gitignore', '**/node_modules/**', 20).then((uris) => {
			if (uris && uris.length) {
				uris.forEach((uri) => gitIgnoreFilter.onDidChange(uri));
			}
		});
	}

}

export function deactivate() { }



import * as vscode from 'vscode';
import { ImagePanel } from './panels/image-panel';
import { ChatGptPanel } from './panels/main-panel';
import { SideBarViewProvider } from './views/sidebar-view';
import { InstructionTreeWebviewProvider } from './views/tree-view';
import { getStoreData, getExtensionConfig } from './utilities/utility.service';
import { registerContextMenuCommands } from './utilities/context-menu-command';
import { TagsDataModel, TagsTreeDataProvider, editorFindNearestTag, jumpToPrevious, jumpToNext, editorJumptoRange } from './webviews/tree-data-view';
import { TagsController } from './utilities/tagsController';
import { Commands } from './utilities/commands';
import { GitIgnore } from './utilities/gitignore';


export async function activate(context: vscode.ExtensionContext) {

	const tagsController = new TagsController(context);
	const commands = new Commands(tagsController)
	const treeDataProvider = new TagsTreeDataProvider(tagsController);
	const tagsDataModel = new TagsDataModel(tagsController);
	const instructionTreeWebviewProvider = new InstructionTreeWebviewProvider(context.extensionUri, tagsDataModel)

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


	/** Instruction Tree View */
	const treeView = vscode.window.createTreeView('instructionsExplorer', { treeDataProvider });
	context.subscriptions.push(treeView);

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
			treeDataProvider.refresh();
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
			treeDataProvider.refresh();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.jumpToPrevious", async () => {
			await jumpToPrevious(treeView, treeDataProvider);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.jumpToNext', async () => {
			await jumpToNext(treeView, treeDataProvider);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.chooseGroupBy", (selectedChoice: string) => {
			tagsDataModel.changeGoupBy(selectedChoice);
			commands.refresh();
			//treeDataProvider.refresh();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.debug.state.reset", () => {
			tagsController.resetWorkspace();
			tagsController.loadFromWorkspace();
			treeDataProvider.refresh();
			instructionTreeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.showSelectTag", () => {
			commands.showSelectTag();
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
	treeDataProvider.refresh();
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

	/***** onDidChangeTextEditorSelection */
	vscode.window.onDidChangeTextEditorSelection((event) => {
		onDidSelectionChange(event);
	}, null, context.subscriptions);

	/************* Handlers */
	async function onDidChange(editor?: vscode.TextEditor, event?: vscode.TextDocumentChangeEvent): Promise<void> {
		if (!editor) {
			// If no editor, refresh only the tree view
			treeDataProvider.refresh();
			instructionTreeWebviewProvider.refresh();
			return;
		}

		if (getExtensionConfig().enable) {
			await tagsController.decorate(editor);
		}
		treeDataProvider.refresh();
		instructionTreeWebviewProvider.refresh();
	}

	async function onDidSave(editor?: vscode.TextEditor): Promise<void> {
		if (editor && getExtensionConfig().enable) {
			await tagsController.decorate(editor);
		}
		treeDataProvider.refresh();
		instructionTreeWebviewProvider.refresh();
	}



	async function onDidSelectionChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
		if (!treeView.visible || !getExtensionConfig().view.follow) {
			return; // Not visible, no action
		}

		const documentUri = event.textEditor.document.uri;

		if (event.textEditor.visibleRanges.length <= 0 || event.selections.length <= 0) {
			return; // No visible range open; no selection
		}

		const focusTag = await editorFindNearestTag(
			documentUri,
			treeDataProvider,
			event.selections[0].anchor
		);

		if (!focusTag) {
			return; // No tag found
		}

		treeView.reveal(focusTag, { select: true, focus: false });
	}

	/************* File-System Watcher Features */
	if (getExtensionConfig().view.exclude.gitIgnore) {
		/* Optional Feature */
		const gitIgnoreFilter = new GitIgnore();
		treeDataProvider.setTreeViewGitIgnoreHandler(gitIgnoreFilter);

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


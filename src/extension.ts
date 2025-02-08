
import * as vscode from 'vscode';
import * as fs from 'fs';

import { ImagePanel } from './panels/image-panel';
import { ChatGptPanel } from './panels/main-panel';
import { SideBarViewProvider } from './views/sidebar-view';
import { TreeWebviewProvider, editorJumptoRange } from './views/tree-view';
import { getStoreData, getExtensionConfig } from './utilities/utility.service';
import { registerContextMenuCommands } from './utilities/context-menu-command';
import { TagsController } from './utilities/tagsController';
import { TreeDataModel } from './utilities/treeDataModel';
import { GitIgnore } from './utilities/gitignore';


export async function activate(context: vscode.ExtensionContext) {

	const tagsController = new TagsController(context);
	const treeDataModel = new TreeDataModel(tagsController, context);
	const treeWebviewProvider = new TreeWebviewProvider(context.extensionUri, treeDataModel)

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
		vscode.commands.registerCommand('instructions-manager.refresh', async () => {
			await tagsController.scanWorkspace();
			treeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.showFilesModeAllVisibleEditors', () => {
			getExtensionConfig().update('view.showFilesMode', 'allVisibleEditors');
			treeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.showFilesModeOnlyActiveEditor', () => {
			getExtensionConfig().update('view.showFilesMode', 'onlyActiveEditor');
			treeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('instructions-manager.reloadWordsAndStyles', () => {
			tagsController.reloadWordsAndStyles();
			if (vscode.window.activeTextEditor) {
				tagsController.decorate(vscode.window.activeTextEditor);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.chooseGroupBy", async (selectedChoice: string) => {
			treeDataModel.changeGoupBy(selectedChoice);
			await tagsController.scanWorkspace();
			treeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.debug.state.reset", () => {
			tagsController.resetWorkspace();
			treeDataModel.resetWorkspace();
			tagsController.loadFromWorkspace();
			treeDataModel.loadFromWorkspace();
			treeWebviewProvider.refresh();
		})
	);

	//JSB
	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.goToTag", (id: string) => {
			const tree = treeDataModel.getRoot();
			const element = tree.find((element) => element.id === id);
			if (element) { //we have a root; we do nothing
			} else {
				tree.forEach((element) => {
					if (element.children) {
						const child = element.children.find((child) => child.id === id);
						if (child) {
							vscode.commands.executeCommand(
								'instructions-manager.jumpToRange',
								child.resource,
								child.location.range
							);
						}
					}
				});
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.rootToggle", (id: string) => {
			const tree = treeDataModel.lastRoots;
			const element = tree.find((element) => element.id === id);
			if (element) {
				element.expanded = !element.expanded;
				treeDataModel.saveToWorkspace();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.outGroupToggle", async (id: string) => {
			const tree = treeDataModel.lastRoots;
			const element = tree.find((element) => element.id === id);
			if (element) {
				if (treeDataModel.groupBy === 'file') {
					if (element.out) {
						await tagsController.removeOutFileTag(element.resource);
					} else {
						await tagsController.addOutFileTag(element.resource);
					}
					if (getExtensionConfig().enable) {
						let document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === element.resource?.toString());
						if (document) {
							await tagsController.updateTags(document);
							treeWebviewProvider.refresh();
							const openEditor = vscode.window.visibleTextEditors.find(
								(editor) => editor.document.uri.toString() === document.uri.toString()
							);
							if (openEditor) {
								await tagsController.decorate(openEditor);
							}
						}
					}
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.outToggle", async (id: string) => {
			const tags = tagsController.tags;
			const element = tags.find((element) => element.id === id);
			if (element) {
				if (element.out) {
					//Need to remove the @out tag that fallows the tag in the file
					await tagsController.removeOutTag(element);
				} else {
					await tagsController.addOutTag(element);
				}
				if (getExtensionConfig().enable) {
					let document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === element.resource.toString());
					if (document) {
						await tagsController.updateTags(document);
						treeWebviewProvider.refresh();
					}
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.draggedRootElement", async (id: string, idNext: string | null) => {
			const tree = treeDataModel.lastRoots;
			const element = tree.find((el) => el.id === id);
			
			if (!element) return; // If element doesn't exist, exit early
		
			let newRank: number;
			let insertIndex: number;
		
			if (idNext) {
				const elementNext = tree.find((el) => el.id === idNext);
				if (!elementNext) return; // Invalid case, do nothing
		
				newRank = elementNext.rank;
				insertIndex = tree.findIndex(el => el.id === idNext); // Find position BEFORE removing
			} else {
				// If dropped at the end, assign the highest rank + 1
				newRank = Math.max(...tree.map(el => el.rank), 0) + 1;
				insertIndex = tree.length; // Last position
			}
		
			// Remove element from its old position **after** determining the insertIndex
			tree.splice(tree.indexOf(element), 1);
		
			// Insert at the determined position
			tree.splice(insertIndex, 0, element);
		
			// Reassign ranks sequentially to maintain order
			tree.forEach((el, index) => {
				el.rank = index + 1
				el.children?.forEach((child) => {
					child.rank = el.rank;
				});
			});
		
			treeDataModel.saveToWorkspace();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("instructions-manager.scanWorkspace", async () => {
			await tagsController.scanWorkspace();
			treeWebviewProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(TreeWebviewProvider.viewId, treeWebviewProvider)
	);

	/** Module Initialization */
	await tagsController.scanWorkspace();
	treeWebviewProvider.refresh();
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
			//onDidChange runs concurrently with onDidSave so no need
			//onDidSave(vscode.window.activeTextEditor);
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
			treeWebviewProvider.refresh();
			return;
		}

		if (getExtensionConfig().enable) {
			await tagsController.decorate(editor);
			treeWebviewProvider.refresh();
		}
	}

	async function onDidSave(editor?: vscode.TextEditor): Promise<void> {
		if (editor && getExtensionConfig().enable) {
			await tagsController.decorate(editor);
			treeWebviewProvider.refresh();
		}
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


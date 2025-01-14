'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { getExtensionConfig } from './utility.service';
import { InstructionsController } from './instructionsController';


export class TagsController {
    private _context: vscode.ExtensionContext;
    public styles: Record<string, any>;
    public words: Record<string, string[]>;
    public tags: Tags;

    public includePattern: string;
    public excludePattern: string;
    public maxFilesLimit: number;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
        this.styles = this._reLoadDecorations();
        this.words = this._reLoadWords();

        this.tags = {};

        const arrayToSearchGlobPattern = (config: string | string[]): string => {
            return Array.isArray(config)
                ? `{${config.join(',')}}`
                : typeof config === 'string'
                    ? config
                    : '';
        };

        this.includePattern = arrayToSearchGlobPattern(getExtensionConfig().search.includes) || '{**/*}';
        this.excludePattern = arrayToSearchGlobPattern(getExtensionConfig().search.excludes);
        this.maxFilesLimit = getExtensionConfig().search.maxFiles;

        this.loadFromWorkspace();
    }


    async decorate(editor: vscode.TextEditor): Promise<void> {
        if (!editor || !editor.document) return;
        if (minimatch(editor.document.fileName, this.excludePattern)) return;

        this._clearTagsOfFile(editor.document);

        if (this._extensionIsBlacklisted(editor.document.fileName)) return;

        for (const style in this.words) {
            if (
                !this.words.hasOwnProperty(style) ||
                this.words[style].length === 0 ||
                this._wordIsOnIgnoreList(this.words[style])
            ) {
                continue;
            }
            await this._decorateWords(editor, this.words[style], style, editor.document.fileName.startsWith('extension-output-'));
        }

        this._saveToWorkspace();
    }

    async updateTags(document: vscode.TextDocument): Promise<void> {
        if (!document || document.fileName.startsWith('extension-output-')) return;

        this._clearTagsOfFile(document);

        if (this._extensionIsBlacklisted(document.fileName)) return;

        for (const style in this.words) {
            if (
                !this.words.hasOwnProperty(style) ||
                this.words[style].length === 0 ||
                this._wordIsOnIgnoreList(this.words[style])
            ) {
                continue;
            }
            await this._updateTagsForWordAndStyle(document, this.words[style], style);
        }

        this._saveToWorkspace();
    }

    /** -- private -- */

    private _extensionIsBlacklisted(fileName: string): boolean {
        const ignoreList = getExtensionConfig().exceptions.file.extensions.ignore;
        if (!ignoreList || ignoreList.length === 0) return false;
        if (minimatch(fileName, this.excludePattern)) return false;
        return this._commaSeparatedStringToUniqueList(ignoreList).some((ext) => fileName.endsWith(ext.trim()));
    }

    private _wordIsOnIgnoreList(words: string[]): boolean {
        const ignoreList = getExtensionConfig().exceptions.words.ignore;
        return this._commaSeparatedStringToUniqueList(ignoreList).some((ignoreWord) =>
            words.some((word) => word.startsWith(ignoreWord.trim()))
        );
    }

    private _commaSeparatedStringToUniqueList(input: string): string[] {
        if (!input) return [];
        return [...new Set(input.trim().split(',').map((e) => e.trim()).filter((e) => e.length))];
    }

    private async _decorateWords(
        editor: vscode.TextEditor,
        words: string[],
        style: string,
        noAdd: boolean
    ): Promise<void> {
        const decoStyle = this.styles[style]?.type || this.styles['default'].type;

        const locations = this._findWords(editor.document, words);
        editor.setDecorations(decoStyle, locations);

        if (locations.length && !noAdd) {
            this._addTag(editor.document, style, locations);
        }
    }

    private async _updateTagsForWordAndStyle(
        document: vscode.TextDocument,
        words: string[],
        style: string
    ): Promise<void> {
        const locations = this._findWords(document, words);

        if (locations.length) {
            this._addTag(document, style, locations);
        }
    }

    private _findWords(document: vscode.TextDocument, words: string[]): { range: vscode.Range; text: string }[] {
        const text = document.getText();
        const locations: { range: vscode.Range; text: string }[] = [];

        words.forEach((word) => {
            const regEx = new RegExp(word, 'g');
            let match;
            while ((match = regEx.exec(text))) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].trim().length);

                const fullLine = document.getWordRangeAtPosition(startPos, /(.+)$/);

                if (fullLine) {
                    locations.push({
                        range: new vscode.Range(startPos, endPos),
                        text: document.getText(fullLine),
                    });
                }
            }
        });

        return locations;
    }

    private _clearTagsOfFile(document: vscode.TextDocument): void {
        const filename = document.uri.toString();
        if (!this.tags.hasOwnProperty(filename)) return;
        delete this.tags[filename];
    }

    private _addTag(
        document: vscode.TextDocument,
        style: string,
        locations: { range: vscode.Range; text: string }[]
    ): void {
        const filename = document.uri.toString();
        if (!this.tags.hasOwnProperty(filename)) {
            this.tags[filename] = {};
        }
        this.tags[filename][style] = locations;
    }

    private _reLoadWords(): Record<string, string[]> {
        const defaultWords = {
            blue: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.blue),
            purple: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.purple),
            brown: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.brown),
            sky: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.sky),
            lime: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.lime),
            green: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.green),
            red: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.red),
            yellow: this._commaSeparatedStringToUniqueList(getExtensionConfig().default.words.yellow),
        };

        return { ...defaultWords, ...getExtensionConfig().expert.custom.words.mapping };
    }

    private _getDecorationStyle(decoOptions: any) {
        return { type: vscode.window.createTextEditorDecorationType(decoOptions), options: decoOptions };
    }

    private _getTagDataUri(color: string) {
        return vscode.Uri.parse(
            "data:image/svg+xml," +
            encodeURIComponent(`<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48"><path fill="${color}" d="M37,43l-13-6l-13,6V9c0-2.2,1.8-4,4-4h18c2.2,0,4,1.8,4,4V43z"/></svg>`)
        );
    }

    private _getDecorationDefaultStyle(color: string) {
        return this._getDecorationStyle({
            "gutterIconPath": this._getTagDataUri(color),
            "overviewRulerColor": color + "B0",   // this is safe/suitable for the defaults only.  Custom ruler color is handled below.
            "light": {
                "fontWeight": "bold"
            },
            "dark": {
                "color": color
            }
        })
    }

    private _reLoadDecorations(): Record<string, any> {
        const blue = '#1874e2';
        const green = '#10a37f';
        const purple = '#C679E0';
        const red = '#F44336';
        const brown = '#cc6d2e';
        const sky = '#03A9F4';
        const lime = '#CDDC39';
        const yellow = '#cdb116';
        let styles = {
            "default": this._getDecorationDefaultStyle(blue),
            "red": this._getDecorationDefaultStyle(red),
            "blue": this._getDecorationDefaultStyle(blue),
            "green": this._getDecorationDefaultStyle(green),
            "purple": this._getDecorationDefaultStyle(purple),
            "brown": this._getDecorationDefaultStyle(brown),
            "sky": this._getDecorationDefaultStyle(sky),
            "lime": this._getDecorationDefaultStyle(lime),
            "yellow": this._getDecorationDefaultStyle(yellow)
        };

        let customStyles = getExtensionConfig().expert.custom.styles;

        for (var decoId in customStyles) {

            if (!customStyles.hasOwnProperty(decoId)) {
                continue;
            }

            let decoOptions = { ...customStyles[decoId] };

            // default to blue if neither an icon path nor an icon color is specified
            if (!decoOptions.gutterIconPath) {
                decoOptions.gutterIconColor = decoOptions.gutterIconColor || blue;
            }

            //apply icon color if provided, otherwise fix the path
            decoOptions.gutterIconPath = decoOptions.gutterIconColor ? this._getTagDataUri(decoOptions.gutterIconColor) : this._context.asAbsolutePath(decoOptions.gutterIconPath);

            //overview
            if (decoOptions.overviewRulerColor) {
                decoOptions.overviewRulerLane = vscode.OverviewRulerLane.Full;
            }
            //background color
            if (decoOptions.backgroundColor) {
                decoOptions.isWholeLine = true;
            }
            styles[decoId as keyof typeof styles] = this._getDecorationStyle(decoOptions);
        }

        return styles;
    }

    /// This function is called only by vscode settings click and it will remove
    public resetWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        this._context.workspaceState.update("tags.object", "{}");
        let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
        fs.unlinkSync(workspaceFolder + '/.instructions/instructions-processed.md')
        fs.unlinkSync(workspaceFolder + '/.instructions/instructions.md')
        fs.unlinkSync(workspaceFolder + '/.instructions/tags.json')

    }

    public getTransformedTags(): TransformedData {
        let transformedData: TransformedData = {}; // Use explicit type
        let allTags: Tags

        if (getExtensionConfig().view.files.workspace) {
            allTags = JSON.parse(this._context.workspaceState.get("tags.object", "{}"));
        } else {
            allTags = this.tags
        }


        // JAN2024: Order by file path
        let sortedEntries = Object.entries(allTags).sort((a, b) => a[0].localeCompare(b[0]));

        for (const [filePath, tags] of sortedEntries) {
            let fileData: FileDataEntry[] = [];
            for (const [tag, entries] of Object.entries(tags)) {
                for (const entry of entries) {
                    let tagTextSplit = entry.text.split(' ', 1);
                    fileData.push({
                        line: entry.range.start.line,
                        startCharacter: entry.range.start.character,
                        endCharacter: entry.range.end.character,
                        tag: tagTextSplit[0].trim(),
                        tagText: tagTextSplit.length > 1 ? tagTextSplit[1].substring(0, 50) : '',
                    });
                }
            }

            fileData.sort((a, b) => a.line - b.line || a.startCharacter - b.startCharacter);
            transformedData[filePath] = fileData; // No error now
        }

        return transformedData;
    }


    /// Jan2025 JSB 
    /// This function has been heavily modified from it's original version.
    /// Originally, the author saved the data to a simple workspace state (the tags only)
    /// I kept this possible with a vscode setting boolean
    /// And used this cache on reopen the workspace
    /// I used it to save to a file and then process the tags including summaries
    /// I decided not to use this system anymore later on when I merge the code with the chat.
    /// I'm leaving it there for debug (for now) with a vscode setting boolean
    /// Instead of reloading from tags, I scan the workspace on opening
    private async _saveToWorkspace(): Promise<void> {
        if (!this._isWorkspaceAvailable()) return;
        if (getExtensionConfig().view.files.inFiles) {
            let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
            if (workspaceFolder) {
                //check if .instructions folder exists
                if (!fs.existsSync(workspaceFolder + '/.instructions')) {
                    fs.mkdirSync(workspaceFolder + '/.instructions');
                }
                fs.writeFile(workspaceFolder + '/.instructions/tags.json', JSON.stringify(this.tags), (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    };
                });
                let instructionController = new InstructionsController(this._context, this)
                let output = await instructionController.getInstructions()
                fs.writeFile(workspaceFolder + '/.instructions/instructions.md', output, (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    };
                });
            }
        } else if (getExtensionConfig().view.files.workspace) {
            this._context.workspaceState.update("tags.object", JSON.stringify(this.tags));
        }
    }

    private _isWorkspaceAvailable() {
        //single or multi root
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1;
    }

    public loadFromWorkspace(): void {
        if (!this._isWorkspaceAvailable()) return; //cannot load
        if (getExtensionConfig().view.files.inFiles) {
            const filePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions', 'tags.json');
            this.tags = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } else if (getExtensionConfig().view.files.workspace) {
            this.tags = JSON.parse(this._context.workspaceState.get("tags.object", "{}"));
        } //else this.tags == {} no arms done

        function deserializeTag(serializedTag: any): Tag {
            const start = new vscode.Position(serializedTag.range[0].line, serializedTag.range[0].character);
            const end = new vscode.Position(serializedTag.range[1].line, serializedTag.range[1].character);
            const range = new vscode.Range(start, end);
            return {
                range: range,
                text: serializedTag.text
            };
        }
        //remove all non existing files
        Object.keys(this.tags).forEach(filepath => {
            const fsPath = vscode.Uri.parse(filepath).fsPath;
            if (!fs.existsSync(fsPath) || minimatch(fsPath, this.excludePattern)) {
                delete this.tags[filepath];
                return;
            }
            Object.keys(this.tags[filepath]).forEach(cat => {
                // For each category
                this.tags[filepath][cat] = this.tags[filepath][cat].map((serializedTag: any) => {
                    // Deserialize the serialized tag to a real Tag object
                    return deserializeTag(serializedTag);
                });
            });
        });
    }
}



interface Tag {
    range: vscode.Range;
    text: string;
}

type Tags = {
    [file: string]: {
        [style: string]: Tag[];
    };
}

interface FileDataEntry {
    line: number;
    startCharacter: number;
    endCharacter: number;
    tag: string;
    tagText: string;
}

type TransformedData = {
    [filePath: string]: FileDataEntry[];
};
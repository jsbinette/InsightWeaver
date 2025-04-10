'use strict'

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { minimatch } from 'minimatch'
import { getExtensionConfig, deserializeWithUri } from './utility.service'
import { InstructionsController } from './instructionsController'


export class TagsController {
    private _context: vscode.ExtensionContext
    public styles: Record<string, any>
    public words: Record<string, string[]>
    public includePattern: string
    public excludePattern: string
    public maxFilesLimit: number
    //The private tags are used by TagsContoller to decorate and update tags
    private _tags: Tag[]
    //The public tags are used by the webview to display the tags
    get tags(): Tag[] {
        //filter tags to find tagName = @out-file
        const outFileTags = this._tags.filter(tag => tag.tagName === '@out-file')
        //From all the tags, set the outFile property to true for all the tags that have the same resource as the @out-file tag
        this._tags.forEach(tag => tag.outFile = outFileTags.some(outTag => outTag.resource === tag.resource))
        //same thing for @out-style and @out-tagName
        const outStyleTags = this._tags.filter(tag => tag.tagName === '@out-style')
        this._tags.forEach(tag => tag.outStyle = outStyleTags.some(outTag => outTag.style === tag.style))
        const outTagNameTags = this._tags.filter(tag => tag.tagName === '@out-tagName')
        this._tags.forEach(tag => tag.outTagName = outTagNameTags.some(outTag => outTag.tagName === tag.tagName))
        //same thing for @out-line
        const outLineTags = this._tags.filter(tag => tag.tagName === '@out-line')
        //for each @out-line tag, set the outLine property to true for all the tags that have the same resource ON THE SAME line as the @out-line tag
        this._tags.forEach(tag => tag.outLine = outLineTags.some(outTag => outTag.resource === tag.resource && outTag.location.range.start.line === tag.location.range.start.line))

        //we can then filter out the @out-file tags to show
        let tagsToShow = this._tags.filter(tag => !['@out-file', '@out-line', '@out-style', '@out-tagName'].includes(tag.tagName))
        //sort the tags by ressource and order by location.range.start
        let tags = tagsToShow.sort((a, b) => a.resource.fsPath.localeCompare(b.resource.fsPath) || a.location.range.start.compareTo(b.location.range.start))
        //for any @out tag, set the out property of the preceding tag out property to true
        for (let i = 0; i < tags.length; i++) {
            if (tags[i].tagName === '@out') {
                //find the index of the current tag
                let index = tags.indexOf(tags[i])
                //if the index is not the first one, set the out property of the preceding tag to true
                if (index > 0) {
                    tags[index - 1].out = true
                }
            }
        }
        //return the tags filtered from the @out tags and order them by rank then by location.range.start
        return tags.filter(tag => tag.tagName !== '@out')
    }

    constructor(context: vscode.ExtensionContext) {
        this._context = context
        this.styles = this._reLoadDecorations()
        this.words = this._reLoadWords()
        this._tags = []

        const arrayToSearchGlobPattern = (config: string | string[]): string => {
            return Array.isArray(config)
                ? `{${config.join(',')}}`
                : typeof config === 'string'
                    ? config
                    : ''
        }
        this.includePattern = arrayToSearchGlobPattern(getExtensionConfig().search.includes) || '{**/*}'
        this.excludePattern = arrayToSearchGlobPattern(getExtensionConfig().search.excludes)
        this.maxFilesLimit = getExtensionConfig().search.maxFiles

        this.loadFromWorkspace()
    }


    async decorate(editor: vscode.TextEditor): Promise<void> {
        if (!editor || !editor.document) return
        if (minimatch(editor.document.fileName, this.excludePattern)) return

        this._clearTagsOfFile(editor.document)

        if (this._extensionIsBlacklisted(editor.document.fileName)) return

        for (const style in this.words) {
            if (!this.words.hasOwnProperty(style) || this.words[style].length === 0 || this._wordIsOnIgnoreList(this.words[style])) {
                continue
            }
            await this._decorateWords(editor, this.words[style], style, editor.document.fileName.startsWith('extension-output-'))
        }

        this._setTagTextForFile(editor.document)

        this.saveToWorkspace()
    }

    async updateTags(document: vscode.TextDocument): Promise<void> {
        if (!document || document.fileName.startsWith('extension-output-')) return

        this._clearTagsOfFile(document)

        if (this._extensionIsBlacklisted(document.fileName)) return

        for (const style in this.words) {
            if (!this.words.hasOwnProperty(style) || this.words[style].length === 0 || this._wordIsOnIgnoreList(this.words[style])) {
                continue
            }
            await this._updateTagsForWordAndStyle(document, this.words[style], style)
        }

        this._setTagTextForFile(document)

        this.saveToWorkspace()
    }

    private _extensionIsBlacklisted(fileName: string): boolean {
        const ignoreList = getExtensionConfig().exceptions.file.extensions.ignore
        if (!ignoreList || ignoreList.length === 0) return false
        if (minimatch(fileName, this.excludePattern)) return false
        return this._commaSeparatedStringToUniqueList(ignoreList).some((ext) => fileName.endsWith(ext.trim()))
    }

    private _wordIsOnIgnoreList(words: string[]): boolean {
        const ignoreList = getExtensionConfig().exceptions.words.ignore
        return this._commaSeparatedStringToUniqueList(ignoreList).some((ignoreWord) =>
            words.some((word) => word.startsWith(ignoreWord.trim()))
        )
    }

    private _commaSeparatedStringToUniqueList(input: string): string[] {
        if (!input) return []
        return [...new Set(input.trim().split(',').map((e) => e.trim()).filter((e) => e.length))]
    }

    private async _decorateWords(editor: vscode.TextEditor, words: string[], style: string, noAdd: boolean): Promise<void> {
        const decoStyle = this.styles[style]?.type || this.styles['default'].type

        const locations = this._findWords(editor.document, words)
        editor.setDecorations(decoStyle, locations)

        if (locations.length && !noAdd) {
            this._addTags(editor.document, style, locations)
        }
    }

    private async _updateTagsForWordAndStyle(document: vscode.TextDocument, words: string[], style: string): Promise<void> {
        const locations = this._findWords(document, words)

        if (locations.length) {
            this._addTags(document, style, locations)
        }
    }

    private _findWords(document: vscode.TextDocument, words: string[]): Location[] {
        const text = document.getText()
        const locations: Location[] = []

        words.forEach((word) => {
            const regEx = new RegExp(word, 'g')
            let match
            while ((match = regEx.exec(text))) {
                const startPos = document.positionAt(match.index)
                const endPos = document.positionAt(match.index + match[0].trim().length)

                const fullLine = document.getWordRangeAtPosition(startPos, /(.+)$/)

                if (fullLine) {
                    locations.push({
                        range: new vscode.Range(startPos, endPos),
                        text: document.getText(fullLine),
                        tagName: word.indexOf("[") !== -1 ? word.substring(0, word.indexOf("[")) : word
                    })
                }
            }
        })

        return locations
    }

    private _clearTagsOfFile(document: vscode.TextDocument): void {
        const resource = document.uri
        this._tags = this._tags.filter((tag) => tag.resource.fsPath != resource.fsPath)
    }

    private _addTags(document: vscode.TextDocument, style: string, locations: Location[]): void {

        for (let i = 0; i < locations.length; i++) {

            let label = document.getText(new vscode.Range(locations[i].range.end, document.lineAt(locations[i].range.end.line).range.end))
            if (!getExtensionConfig().view.words.hide) {
                label = "<div class=\"" + style + "-style\">" + document.getText(new vscode.Range(locations[i].range.start, locations[i].range.end)) + "</div> <span>" + label + "</span>"
            }
            //splice the "@out " or "@out-file " from the label
            label = label.replace(/@out /, '').replace(/@out-file /, '').replace(/@out-line /, '')

            this._tags.push({
                resource: document.uri,
                tooltip: locations[i].text,
                style: style,
                iconPath: this.styles[style]?.options.gutterIconPath || this.styles['default'].options.gutterIconPath,
                location: locations[i],
                label: label,
                category: style,
                tagName: locations[i].tagName,
                out: false,
                outLine: false,
                outFile: false,
                outStyle: false,
                outTagName: false,
                id: crypto.createHash('sha1').update(JSON.stringify(document.uri) + JSON.stringify(label)).digest('hex'),
                rank: 0,
                textBeforeTagRange: locations[i].range, //this is a dummy value that will be updated later
                textAfterTagRange: locations[i].range //this is a dummy value that will be updated later 
            })
        }
    }

    private _setTagTextForFile(document: vscode.TextDocument): void {
        const resource = document.uri
        const sortedTags = this._sortLocationsByRange(this._tags.filter((tag) => tag.resource.fsPath === resource.fsPath))
        for (let i = 0; i < sortedTags.length; i++) {
            let curTagStart: number = document.offsetAt(sortedTags[i].location.range.start)
            let curTagLineStart: number = curTagStart - sortedTags[i].location.range.start.character
            let nextTagStart: number
            let nextTagLineStart: number
            let tagEnd: number

            if (i + 1 < sortedTags.length) {
                nextTagStart = document.offsetAt(sortedTags[i + 1].location.range.start)

                if (sortedTags[i + 1].location.range.start.character !== 0 && sortedTags[i + 1].location.range.start.line !== sortedTags[i + 1].location.range.start.line) {
                    nextTagLineStart = nextTagStart - sortedTags[i + 1].location.range.start.character
                } else {
                    nextTagLineStart = nextTagStart
                }
                tagEnd = nextTagLineStart
            } else {
                tagEnd = document.offsetAt(document.lineAt(document.lineCount - 1).range.end)
            }

            //will eventually need to handle the case where the tag is the last thing in the file
            sortedTags[i].textBeforeTagRange = new vscode.Range(document.positionAt(curTagLineStart), document.positionAt(curTagStart))
            sortedTags[i].textAfterTagRange = new vscode.Range(document.positionAt(document.offsetAt(sortedTags[i].location.range.end) + 1), document.positionAt(tagEnd))
        }
    }

    private _sortLocationsByRange(tags: Tag[]): Tag[] {
        return tags.sort((a, b) => {
            const startComparison = a.location.range.start.compareTo(b.location.range.start)
            if (startComparison !== 0) {
                return startComparison
            }
            return a.location.range.end.compareTo(b.location.range.end)
        })
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
        }

        return { ...defaultWords, ...getExtensionConfig().expert.custom.words.mapping }
    }

    private _getDecorationStyle(decoOptions: any) {
        return { type: vscode.window.createTextEditorDecorationType(decoOptions), options: decoOptions }
    }

    private _getTagDataUri(color: string) {
        return vscode.Uri.parse(
            "data:image/svg+xml," +
            encodeURIComponent(`<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48"><path fill="${color}" d="M37,43l-13-6l-13,6V9c0-2.2,1.8-4,4-4h18c2.2,0,4,1.8,4,4V43z"/></svg>`)
        )
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
        const blue = '#1874e2'
        const green = '#10a37f'
        const purple = '#C679E0'
        const red = '#F44336'
        const brown = '#cc6d2e'
        const sky = '#03A9F4'
        const lime = '#CDDC39'
        const yellow = '#cdb116'
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
        }

        let customStyles = getExtensionConfig().expert.custom.styles

        for (var decoId in customStyles) {

            if (!customStyles.hasOwnProperty(decoId)) {
                continue
            }

            let decoOptions = { ...customStyles[decoId] }

            // default to blue if neither an icon path nor an icon color is specified
            if (!decoOptions.gutterIconPath) {
                decoOptions.gutterIconColor = decoOptions.gutterIconColor || blue
            }

            //apply icon color if provided, otherwise fix the path
            decoOptions.gutterIconPath = decoOptions.gutterIconColor ? this._getTagDataUri(decoOptions.gutterIconColor) : this._context.asAbsolutePath(decoOptions.gutterIconPath)

            //overview
            if (decoOptions.overviewRulerColor) {
                decoOptions.overviewRulerLane = vscode.OverviewRulerLane.Full
            }
            //background color
            if (decoOptions.backgroundColor) {
                decoOptions.isWholeLine = true
            }
            styles[decoId as keyof typeof styles] = this._getDecorationStyle(decoOptions)
        }

        return styles
    }

    /// This function is called only by vscode settings click and it will remove
    public resetWorkspace() {
        if (!this._isWorkspaceAvailable()) return; //cannot save
        this._context.workspaceState.update("tags.array", "[]")
        let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined
        if (workspaceFolder) {
            if (fs.existsSync(workspaceFolder + '/.instructions')) {
                fs.rmdirSync(workspaceFolder + '/.instructions', { recursive: true })
            }
        }
    }

    public reloadWordsAndStyles() {
        this.styles = this._reLoadDecorations()
        this.words = this._reLoadWords()
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
    public async saveToWorkspace(): Promise<void> {
        if (!this._isWorkspaceAvailable()) return
        if (getExtensionConfig().view.files.inFiles) {
            let workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined
            if (workspaceFolder) {
                //check if .instructions folder exists
                if (!fs.existsSync(workspaceFolder + '/.instructions')) {
                    fs.mkdirSync(workspaceFolder + '/.instructions')
                }
                fs.writeFile(workspaceFolder + '/.instructions/tags.json', JSON.stringify(this._tags), (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
                let instructionController = new InstructionsController(this._context, this)
                let output = await instructionController.getInstructions()
                fs.writeFile(workspaceFolder + '/.instructions/instructions.md', output, (err) => {
                    if (err) {
                        console.error(err)
                        return
                    }
                })
            }
        } else if (getExtensionConfig().view.files.workspace) {
            function serializeWithUri(obj: any): string {
                return JSON.stringify(obj, (key, value) => {
                    let a = key == 'resource' ? value.path : value
                    return a
                })
            }
            this._context.workspaceState.update("tags.array", serializeWithUri(this._tags.sort((a, b) => a.rank - b.rank || a.location.range.start.compareTo(b.location.range.start))))
        }
    }

    private _isWorkspaceAvailable() {
        //single or multi root
        return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1
    }

    public loadFromWorkspace(): void {
        if (!this._isWorkspaceAvailable()) return; //cannot load
        if (getExtensionConfig().view.files.inFiles) {
            const filePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions', 'tags.json')
            this._tags = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        } else if (getExtensionConfig().view.files.workspace) {
            this._tags = deserializeWithUri(this._context.workspaceState.get("tags.array", "[]"))
        } //else this._tags == {} no arms done

        //remove all non existing files
        this._tags = this._tags.filter((tag) => fs.existsSync(tag.resource.fsPath))
    }

    public async scanWorkspace(): Promise<void> {
        try {
            const files = await vscode.workspace.findFiles(this.includePattern, this.excludePattern, this.maxFilesLimit)

            if (!files || files.length === 0) {
                return
            }

            function isTextFile(filePath: string): boolean {
                const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' })
                const textChars = buffer.toString('utf8').split('').filter(char => {
                    const code = char.charCodeAt(0)
                    return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13
                })

                return textChars.length / buffer.length > 0.9; // Adjust the threshold as needed
            }

            for (const file of files) { // Use for...of to properly await async calls
                if (isTextFile(file.fsPath)) {
                    try {
                        const document = await vscode.workspace.openTextDocument(file)
                        await this.updateTags(document)
                    } catch (err) {
                        console.error(err)
                    }
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    public groupBy<T>(array: T[], key: keyof T, keyToString: (keyValue: any) => string = String): { [key: string]: T[] } {
        return array.reduce((result, currentValue) => {
            const groupKey = keyToString(currentValue[key])
            if (!result[groupKey]) {
                result[groupKey] = []
            }
            result[groupKey].push(currentValue)
            return result
        }, {} as { [key: string]: T[] })
    }

    //remove an @out word in the file that fallows immediately the range of the tag passed as argument using the tag.ressource url and tag.location.range
    public async removeOutTag(tag: Tag) {
        let document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === tag.resource.toString())
        if (!document) return
        let text = document.getText()
        let tagStart = document.offsetAt(tag.location.range.start)
        if (tagStart !== -1) {
            //find the next @out tag
            let outStart = text.indexOf('@out', tagStart)
            if (outStart === -1) return
            let outEnd = outStart + 4 + 1
            let range = new vscode.Range(document.positionAt(outStart), document.positionAt(outEnd))
            let edit = new vscode.WorkspaceEdit()
            edit.delete(document.uri, range)
            await vscode.workspace.applyEdit(edit)
            await document.save()
            //onDidChange will be called after the edit is applied because 
            //the onDidChangeTextDocument event will be triggered BUT
            //the active editor is not the document but the webview
        }
    }

    public async addOutTag(tag: Tag) {
        let document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === tag.resource.toString())
        if (!document) return
        let text = document.getText()
        let outTagStart = document.offsetAt(tag.location.range.end)
        if (outTagStart !== -1) {
            let edit = new vscode.WorkspaceEdit()
            edit.insert(document.uri, document.positionAt(outTagStart), ' @out')
            await vscode.workspace.applyEdit(edit)
            await document.save()
            //onDidChange will be called after the edit is applied because 
            //the onDidChangeTextDocument event will be triggered BUT
            //the active editor is not the document but the webview
        }
    }

    public async removeOutFileTag(resource?: vscode.Uri) {
        if (!resource) return
        let document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === resource.toString())
        if (!document) return
        let text = document.getText()
        let outTagStart = text.indexOf('@out-file')
        if (outTagStart !== -1) {
            let outTagEnd = outTagStart + 9
            let range = new vscode.Range(document.positionAt(outTagStart), document.positionAt(outTagEnd + 1))
            let edit = new vscode.WorkspaceEdit()
            edit.delete(document.uri, range)
            await vscode.workspace.applyEdit(edit)
            await document.save()
            //onDidChange will be called after the edit is applied because 
            //the onDidChangeTextDocument event will be triggered BUT
            //the active editor is not the document but the webview
        }
    }

    public async addOutFileTag(resource?: vscode.Uri) {
        if (!resource) return
        let document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === resource.toString())
        if (!document) return
        let text = document.getText()
        let outTagStart = text.indexOf('@out-file')
        if (outTagStart === -1) {
            //use _tags to find the first tag in the file
            let tags = this._tags.filter(tag => tag.resource === resource)
            let firstTag = tags.sort((a, b) => a.location.range.start.compareTo(b.location.range.start))[0]
            let edit = new vscode.WorkspaceEdit()
            edit.insert(document.uri, firstTag.location.range.end, ' @out-file')
            await vscode.workspace.applyEdit(edit)
            await document.save()





            //onDidChange will be called after the edit is applied because 
            //the onDidChangeTextDocument event will be triggered BUT
            //the active editor is not the document but the webview
        }
    }
}


export interface Location {
    range: vscode.Range
    text: string
    tagName: string
}

export interface Tag {
    resource: vscode.Uri
    tooltip?: string
    style: string
    iconPath: vscode.ThemeIcon | string | undefined
    location: Location
    label: string
    category: string
    tagName: string
    out: boolean
    outLine: boolean
    outFile: boolean
    outStyle: boolean
    outTagName: boolean
    id: string
    rank: number
    textBeforeTagRange: vscode.Range
    textAfterTagRange: vscode.Range
}


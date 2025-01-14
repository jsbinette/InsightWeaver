'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getStoreData, getExtensionConfig } from './utility.service';
import { askToChatGpt } from "../utilities/chat-gpt-api.service";
import { TagsController } from './tagsController';


export class InstructionsController {
    private _context: vscode.ExtensionContext;
    private _tagsController: TagsController


    constructor(context: vscode.ExtensionContext, controller: TagsController) {
        this._context = context;
        this._tagsController = controller
    }

    private async _processTags(inputJson: Record<string, any>) {
        let output = []
        for (const filePath of Object.keys(inputJson)) {
            const sortedTags = inputJson[filePath]
            try {
                const file = await vscode.workspace.openTextDocument(vscode.Uri.parse(filePath))
                let fileContents = file.getText()
                let firstTag = sortedTags[0]
                firstTag.tagStart = fileContents.indexOf(firstTag.tag)
                firstTag.tagLineStart = firstTag.tagStart - firstTag.startCharacter

                for (let i = 0; i < sortedTags.length; i++) {
                    const tag = sortedTags[i]
                    let tagEnd

                    if (i + 1 < sortedTags.length) {
                        const nextTag = sortedTags[i + 1]
                        nextTag.tagStart = fileContents.indexOf(nextTag.tag, tag.tagStart + tag.tag.length)

                        if (nextTag.startCharacter !== 0 && tag.line !== nextTag.line) {
                            nextTag.tagLineStart = nextTag.tagStart - nextTag.startCharacter
                        } else {
                            nextTag.tagLineStart = nextTag.tagStart
                        }
                        tagEnd = nextTag.tagLineStart
                    } else {
                        tagEnd = fileContents.length
                    }
                    let textBeforeTag = fileContents.substring(tag.tagLineStart, tag.tagStart)
                    let textAfterTag = fileContents.substring(tag.tagStart + tag.tag.length + 1, tagEnd)
                    if (tag.tag.indexOf('@summarize(') == 0) {
                        textAfterTag = fileContents.substring(tag.tagStart, tagEnd) + '@end-summarize\n'
                    }

                    if (textAfterTag !== '' && tag.tag == '@out-file') {
                        break //stop processing the file
                    }

                    if (textAfterTag !== '' && tag.tag !== '@out') {
                        output.push(textBeforeTag + textAfterTag)
                    }
                }
            } catch (error) {
                console.error(error)
            }
        }
        return output.join('\n')
    }


    private async _getSummary(variables: string, text: string): Promise<string> {
        const params = variables.split(',');
        const name = params[0];
        let orig_ratio = params.length > 1 ? params[1].trim() : '1/10';
        let ratio = orig_ratio.replace('1/', 'one_in_');
        let workspacePath = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
        const summaryDirPath = path.join(workspacePath, '.instructions', 'summaries');
        const summarySourceDirPath = path.join(workspacePath, '.instructions', 'summary_sources');

        // Ensure the directories exist
        if (!fs.existsSync(summaryDirPath)) {
            fs.mkdirSync(summaryDirPath, { recursive: true });
        }
        if (!fs.existsSync(summarySourceDirPath)) {
            fs.mkdirSync(summarySourceDirPath, { recursive: true });
        }


        const summaryFilePath = path.join(summaryDirPath, `${name}_${ratio}.md`);
        const summarySourcePath = path.join(summarySourceDirPath, `${name}_${ratio}.md`);

        if (!fs.existsSync(summarySourcePath) || fs.readFileSync(summarySourcePath, 'utf8') !== text || !fs.existsSync(summaryFilePath)) {
            // Update the summary
            fs.writeFileSync(summarySourcePath, text);
            const storeData = getStoreData(this._context);
            const summary = await askToChatGpt(`Please summarize the following text: '''${text}''' The length of the summary should be ${orig_ratio} of the original text. Output only the summary but keep the title.  Following the title add in parenthesis (Summary ratio ${orig_ratio}) to indicate this is a summary. You can use markdown to format the summary.`, storeData.apiKey);
            fs.writeFileSync(summaryFilePath, summary);
        }

        return fs.readFileSync(summaryFilePath, 'utf8');
    }

    private async _processInstructionsFile(): Promise<void> {
        const summarizeRegex = /@summarize\((.*?)\)\s([\s\S]*?)@end-summarize/g;
        const vscodeDirPath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions');
        const inputFilename = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions', 'instructions.md');
        const outputFilename = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions', 'instructions-processed.md');

        if (!fs.existsSync(vscodeDirPath)) {
            fs.mkdirSync(vscodeDirPath);
        }

        if (!fs.existsSync(inputFilename)) {
            fs.writeFileSync(inputFilename, '');
        }

        const content = fs.readFileSync(inputFilename, 'utf8');
        let processedContent = content;

        const matches = [...content.matchAll(summarizeRegex)];

        for (const match of matches) {
            if (match[0]) {
                const summary = await this._getSummary(match[1], match[2]);
                processedContent = processedContent.replace(match[0], summary + '\n');
            }
        }

        fs.writeFileSync(outputFilename, processedContent);
    }


    public async getInstructions(): Promise<string> {
        var instructions = 'No instructions found!';
        //files (debug) case handled here, and workspace or live tags handled in tagsController
        if (getExtensionConfig().view.files.inFiles) {
            await this._processInstructionsFile();
            //read instructions from file .instructions/instructions.md from the workspaceFolder
            const filePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions', 'instructions-processed.md');
            instructions = fs.readFileSync(filePath, 'utf8');
        } else {
            instructions = await this._processTags(this._tagsController.getTransformedTags())
        }
        return instructions;
    }
}


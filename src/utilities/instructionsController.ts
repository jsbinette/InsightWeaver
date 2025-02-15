'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getStoreData, getExtensionConfig, deserializeWithUri } from './utility.service';
import { askToChatGpt } from "../utilities/chat-gpt-api.service";
import { TagsController, Tag } from './tagsController';


export class InstructionsController {
    private _context: vscode.ExtensionContext;
    private _tagsController: TagsController


    constructor(context: vscode.ExtensionContext, controller: TagsController) {
        this._context = context;
        this._tagsController = controller
    }

    public async getInstructions(): Promise<string> {
        var instructions = 'No instructions found!';
        //files (debug) case handled here, and workspace or live tags handled in tagsController
        if (getExtensionConfig().view.files.inFiles) {
            await this._processInstructionsFileNOTUSEDNOW();
            //read instructions from file .instructions/instructions.md from the workspaceFolder
            const filePath = path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, '.instructions', 'instructions-processed.md');
            instructions = fs.readFileSync(filePath, 'utf8');
        } else {
            let allTags: Tag[]
            if (getExtensionConfig().view.files.workspace) {
                allTags = deserializeWithUri(this._context.workspaceState.get("tags.array", "[]"));
            } else {
                allTags = this._tagsController.tags;
            }
            //get instructions from tags
            //filter tags to find tagName = @out-file
            const outFileTags = allTags.filter(tag => tag.tagName === '@out-file');
            //filter out of outTags all the tags that have resourse (URI) that are present in outFileTags
            let instructionsTags = allTags.filter(tag => !outFileTags.some(outTag => outTag.resource.fsPath == tag.resource.fsPath));
            //filter out of instructionsTags all the tags that have out = true
            //NOT! The outs are handled like in the treeView,
            //We need to filter the tagName = @out and the text from the other tags is space only.
            instructionsTags = instructionsTags.filter(tag => !(tag.tagName == '@out' || tag.tagName == '@out-line'));
            //filter th tags that are out
            instructionsTags = instructionsTags.filter(tag => !tag.out);
            //filter the tags that are outLine
            instructionsTags = instructionsTags.filter(tag => !tag.outLine);


            //summary tags should be handled here later

            //create instructions string from instructionsTags
            let instructionChunks: string[] = [];
            for (let i = 0; i < instructionsTags.length; i++) {
                const tag = instructionsTags[i];
                const document = await vscode.workspace.openTextDocument(tag.resource);
                //remove the tags from the text
                instructionChunks.push(document.getText(tag.textBeforeTagRange).replace(/@\S+ /g, '') + ' ' + document.getText(tag.textAfterTagRange))
            }
            instructions = instructionChunks.join('\n');
        }
        return instructions
    }

    private async _getSummaryNOTUSEDNOW(variables: string, text: string): Promise<string> {
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
            const summary = await askToChatGpt(storeData.model, `Please summarize the following text: '''${text}''' The length of the summary should be ${orig_ratio} of the original text. Output only the summary but keep the title.  Following the title add in parenthesis (Summary ratio ${orig_ratio}) to indicate this is a summary. You can use markdown to format the summary.`, storeData.apiKey);
            fs.writeFileSync(summaryFilePath, summary);
        }

        return fs.readFileSync(summaryFilePath, 'utf8');
    }

    private async _processInstructionsFileNOTUSEDNOW(): Promise<void> {
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
                const summary = await this._getSummaryNOTUSEDNOW(match[1], match[2]);
                processedContent = processedContent.replace(match[0], summary + '\n');
            }
        }

        fs.writeFileSync(outputFilename, processedContent);
    }

}


# Notes

This is a fork of the inline-bookmarks extension by [tintinweb](https://github.com/tintinweb) (which has been translated to Typescripyt) and merged with the chat-gpt-vscode-extension by [ismailkasan] (https://github.com/ismailkasan)

The two extension offered a great start to do what I wanted to do which was to create a gpt chatbox well setup to handle large instruction sets.

## To compile this extension

Change the version in package.json, add a new entry in the changelog above, and then run the following commands:

```javascript
vsce package
```

## DEBUG

You can debug the front end in workspace and put some breakpoints there.
If you have trouble you can put a line of code in the file:

```javascript
debugger;
```

# NOTES

TAGS:
Tags are created by a scan of each file.
Tags are pulled two places and the data transformed according to needs.

treeDataModel: In this tree data object, the tags are grouped either by file or style (color) or tagName.  This is used to create the tree view.
The view is two level deep and allow for manipulating the @out tags and the @out-file tags.

InstructionController:  In this controller, the filenames are sorted and the tags are used to create the instruction set for GPT.

## Conclusion

For now, tags work and the system is written this way; additionnaly the information needed for the other things are not yet analysed so maybe we keep it this way.

In therms of the InstructionsControler, there's the issue of ordering and summarizing so the needs are a bit different.

END

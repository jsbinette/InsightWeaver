# NOTES

TAGS:
Tags are created by a scan of each file.  It is a nested structure [filname][style][locations] (locations are vscode locations which includes the line of text and the range of the "word" in the file).  I wanted to flatten it but at this point the actual tagName is not identifed and the whole thing works.

Tags are pulled two places and the data transformed according to needs.

Tree-Data-View: In this tree data object, right now the tags are pulled by filename and transformed into TreeElement (but vscode TreeElement has few properties).  It could be pulled by other "header" and I'm thinking to create a full scale view so we can cross the out etc.

InstructionController:  In this controller, the filenames are sorted and the tags are transformed in TransformedData which is a flat structure.  This is used to create the instruction set.

## Conclusion

For now, tags work and the system is written this way; additionnaly the information needed for the other things are not yet analysed so maybe we keep it this way.

In terms of the Tree-Data structure, we would want to group them differently and make it manipulatable from there.  We'll see.

In therms of the InstructionsControler, there's the issue of ordering and summarizing so the needs are a bit different.

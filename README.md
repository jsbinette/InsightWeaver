
# InsightWeaver – Intelligent AI Instruction Manager for VSCode

Unlock deeper insights and more thoughtful interactions with ChatGPT directly within Visual Studio Code. **InsightWeaver** transforms how you query AI by allowing you to effortlessly weave together tagged content from multiple files, creating context-rich instructions that enhance your AI-driven workflow.

## Why InsightWeaver?

InsightWeaver is tailored for creative professionals, writers, researchers, designers, legal teams, and anyone working on intricate, multifaceted projects. Unlike traditional vector-based context management, InsightWeaver utilizes intuitive, inline tagging—perfect for situations where thoughtful curation and interpretation outweigh semantic search.

## Core Features

### Powerful Inline Tagging

Mark relevant content within your files to automatically compile detailed, custom instruction sets. Toggle content effortlessly with `@out` and `@out-file` tags, allowing dynamic, flexible management of your knowledge base.

### Smart Contextual Chats

Start interactive sessions with customized instructions, historical queries, and file-based content. InsightWeaver provides flexible chat options:

- **Ask with Instructions**: Engage the AI with context from your tagged files.
- **Ask (No Instructions)**: Simple, direct queries without additional context.
- **Ask (No Stream)**: Receive full answers without incremental streaming.

### Rich Interaction History

Maintain a robust query history beyond individual chats—ideal for revisiting complex or recurring themes within your projects. Quickly reuse past queries to foster iterative exploration.

### Intuitive Tree View

Explore tags effortlessly with InsightWeaver’s sophisticated sidebar:

- Navigate swiftly between files and tags.
- Easily toggle tags on or off to adjust instruction scope.
- Organize and visualize your tags by file, name, or style (color).

### Seamless Image Integration

Drag-and-drop images directly into your conversations. Perfect for visual design, storyboarding, or any visual-heavy projects.

### Complete Control Sidebar

Configure your experience exactly how you want it:

- Choose your preferred GPT model and temperature.
- Select image parameters (size, resolution) for DALL-E 3.
- Quickly launch new chats or image conversations.```

## Ideal Use Cases

InsightWeaver shines brightest when dealing with projects demanding nuanced thinking:

- Writing novels or complex narratives.
- Managing intricate design or branding projects.
- Building comprehensive legal cases.
- Developing educational courses with multifaceted content.

## Get Started Now

Bring a deeper level of intelligence, organization, and creativity to your VSCode workspace. Install **InsightWeaver** today and start crafting richer, more thoughtful AI interactions.

## Getting Started

### Things you need to know about

1. **The working of Tags**
   The system includes the text from the line where it is all the way to the end of the line *before* the next tag.  Use tags that have meaning for you by choosing in the list of "known tags" below.  You can also create your own tags in the settings section. You can have multiple tags on the same line.  Any tag followed by the special tag `@out` will be excluded from the AI instructions.  If you want to exclude all the tags on the line, you can use the special tag `@out-line`.  If you want to exclude a whole file, you can use the special tag `@out-file` in the first line of the file.

   Each tag is in a color group which can also be changed in settings as needed.

2. **Known Tags**
    Some tags are already configured in the extension.  You can add your own tags in the settings.  The default tags are:
    - `@overview`,`@general`, `@concept`, `@facts`, `@instr-header`, `@must-have`, `@important` - These tags will be used to mark the text that you want to be included in the AI instructions and also in the overview of the project.
    - `@character`,`@plot`, `@world`  - These tags will be used to mark the text that you want to be included in the AI instructions and also in a storyboard or book project.
    - `@out`,`@out-line`,`@out-file` - See in "The working of Tags" above.

### Activate InsightWeaver

1. Open a Workspace
Ensure you have a folder opened in VSCode (File → Open Folder). InsightWeaver relies on workspace context.
2. Start Your First Chat
Click the InsightWeaver icon in the VSCode sidebar to initiate a chat session or an image conversation. Once initiated, the extension activates and loads your tagged instructions automatically.
3. Enter your openAI API key
4. In your opened workspace, create a new text file or open an existing one.
5. Add at least one "known" tag into your file. Tags are customizable keywords listed (and editable) under InsightWeaver’s settings in VSCode.

   For example:

   ```markdown
    @instr-header This text will become part of the AI instructions when using the character tag.
    This text will also be included.
    This text will also be included @overview but it will be indepedent from what cam before since there's a new tag there.
    On this line @general @out the tag is followed by @out so it will be excluded from the AI instructions.
    But, this text has a @plot plot tag and will be included in the AI instructions.
    ```

## To compile this extension

Change the version in package.json, add a new entry in the changelog above, and then run the following commands:

```javascript
vsce package
```

This will create a .vsix file in the root directory. You can then install it in VSCode by going to the Extensions view, clicking on the three dots in the top right corner, and selecting "Install from VSIX...". Select the .vsix file you just created.

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

## Contact

For any questions or feedback, please contact me at [jsbinette@yahoo.com] or(<https://twitter.com/jsbinette>) on X.

## Acknowledgements

This is a fork of the inline-bookmarks extension by [tintinweb](<https://github.com/tintinweb/>) (which has been translated to Typescripyt) and merged with the chat-gpt-vscode-extension by [ismailkasan](<https://github.com/ismailkasan/>)

The two extension offered a great start to do what I wanted to do which was to create a gpt chatbox well setup to handle large instruction sets.

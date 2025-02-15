import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeTextArea,
    vsCodeDivider,
    vsCodeProgressRing,
    vsCodeTextField,
    ProgressRing,
    Button,
    TextArea,
} from "@vscode/webview-ui-toolkit";

/**
 * Register "@vscode/webview-ui-toolkit" component to vscode design system.
 */
provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeProgressRing(), vsCodeTextArea(), vsCodeDivider(), vsCodeTextField());

const vscode = acquireVsCodeApi();

// Add load event listener.
window.addEventListener("load", main);

// declare an array for search history.
let searchHistory: string[] | Object[] = [];

vscode.postMessage({
    command: "history-request",
});

// Declare Html elements
const answer = document.getElementById("answers-id") as HTMLElement;
const instructions = document.getElementById("instructions-id") as HTMLElement;
const chatQuestionTextArea = document.getElementById("question-text-id") as TextArea;
const dropArea = document.getElementById('drag-drop-area') as HTMLElement;
const askButton = document.getElementById("ask-button-id") as Button;
const asknoinstrButton = document.getElementById("ask-no-instructions-button-id") as Button;
const asknoStreamButton = document.getElementById("ask-no-stream-button-id") as Button;
const clearButton = document.getElementById("clear-button-id") as Button;
const showHistoryButton = document.getElementById("show-history-button");
const clearHistoryButton = document.getElementById("clear-history-button");
const showInstructionsButton = document.getElementById("show-instructions-button");
const characterCount = document.getElementById("instructions-character-count") as HTMLElement;

// image
const askImageButton = document.getElementById("ask-image-button-id") as Button;
const promptTextArea = document.getElementById("prompt-text-id") as TextArea;
const clearImageButton = document.getElementById("clear-image-button-id") as Button;

let noStream = false;

//for drag and drop
let droppedFiles: File[] = [];
renderFileList()
type ContentItem =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

/**
 * Main function
 */
function main() {

    hideProgressRing();

    // Add the eventLsteners.
    askButton?.addEventListener("click", handleAskClick);
    asknoinstrButton?.addEventListener("click", handleAskNoInstrClick);
    asknoStreamButton?.addEventListener("click", handleAskNoStreamClick);
    clearButton?.addEventListener("click", handleClearClick);
    showHistoryButton?.addEventListener("click", handleShowHistoryButtonClick);
    clearHistoryButton?.addEventListener("click", handleClearHistoryButtonClick);
    showInstructionsButton?.addEventListener("click", handleShowInstructionsButtonClick);
    // image button events
    askImageButton?.addEventListener("click", handleImageAskClick);
    clearImageButton?.addEventListener("click", handleImageClearClick);
    // chat enter event
    chatQuestionTextArea?.addEventListener("keypress", function (event) {
        /* if (event.key === "Enter") {
             event.preventDefault();
             // Trigger the button element with a click
             handleAskClick();
         }*/
    });

    dropArea.addEventListener("dragover", (event: DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
        }
        dropArea.classList.add("drag-over");
    });

    dropArea.addEventListener("dragleave", (_event: DragEvent) => {
        dropArea.classList.remove("drag-over");
    });

    dropArea.addEventListener("drop", (event: DragEvent) => {
        event.preventDefault();
        dropArea.classList.remove("drag-over");
        if (event.dataTransfer) {
            const newFiles = Array.from(event.dataTransfer.files);
            droppedFiles = droppedFiles.concat(newFiles);
            renderFileList()
        }
    });


    // image enter event
    promptTextArea?.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            // Trigger the button element with a click
            handleImageAskClick();
        }
    });

    try {
        // Handle messages sent from the extension to the webview
        window.addEventListener('message', event => {
            const message = event.data; // The json data that the extension sent
            showErrorMessage(''); // Clear error message.
            switch (message.command) {
                case 'answer':
                    // Append answer.
                    hideProgressRing();
                    const data = document.createTextNode(message.data);
                    answer?.appendChild(data);
                    break;
                case 'history-data':
                    searchHistory = message.data;
                    updateHistoryList();
                    break;
                case 'image-urls-answer':
                    // Append answer.
                    const imageList = message.data as any[];
                    updateImageList(imageList)
                    hideProgressRing();
                    break;
                case 'error-message':
                    // Append answer.
                    showErrorMessage(message.data);
                    hideProgressRing();
                    break;
                case 'instructions-data':
                    hideProgressRing();
                    instructions.innerHTML = message.data
                    break;
                case 'upadate-instructions-character-count':
                    characterCount.textContent = message.data;
                    break;
                case 'error':
                    break;
            }
        });
    } catch (err: any) {
        console.log('errrr js');
        console.log(err);
    }
}

//#region Chat

/**
 * Handle ask button click event.
 */
function handleAskClick(): void {
    showProgressRing();
    const textContent: ContentItem = { type: "text", text: chatQuestionTextArea.value };

    // If there are files, encode them all, otherwise just build the payload with text.
    if (droppedFiles.length > 0) {
        // Encode all dropped image files.
        const encodePromises = droppedFiles.map((file) => encodeImageFileToBase64(file));

        Promise.all(droppedFiles.map(file => encodeImageFileToBase64(file)))
            .then((base64Strings: string[]) => {
                const imageContents: ContentItem[] = base64Strings.map(base64String => ({
                    type: "image_url",
                    image_url: { url: base64String },
                }));
                const content: ContentItem[] = [textContent, ...imageContents];
                // Use content here.
                vscode.postMessage({
                    command: "press-ask-button" + (noStream ? "-no-stream" : ""),
                    data: content,
                });
                noStream = false;
                droppedFiles = [];
                renderFileList()
            })
            .catch(error => console.error("Error encoding files:", error));
    } else {
        const content: ContentItem[] = [textContent]
        vscode.postMessage({
            command: "press-ask-button" + (noStream ? "-no-stream" : ""),
            data: content,
        });
        noStream = false;
        droppedFiles = [];
        renderFileList()
    }

    const data = document.createElement("div");
    data.className = "userChatLog";
    const questionSpan = document.createElement("span");
    questionSpan.textContent = chatQuestionTextArea.value;
    questionSpan.addEventListener("click", () => {
        onHistoryClicked(chatQuestionTextArea.value);
    });
    data.appendChild(questionSpan);
    if (droppedFiles.length > 0) {
        droppedFiles.forEach((file) => {
            if (file.type.startsWith("image/")) {
                const img = document.createElement("img");
                const objectUrl = URL.createObjectURL(file);
                img.src = objectUrl;
                img.style.maxWidth = "100px";
                img.style.maxHeight = "100px";
                img.style.margin = "5px";
                img.style.cursor = "pointer";
                //not practical to download the image.
                //have to encode base64 and send it to the extension
                //and then the extension can save it to the disk
                //and then it opens the temp file.  burk.

                data.appendChild(img);
            }
        });
    }
    answer?.appendChild(data);

    addHistory(chatQuestionTextArea.value);
    chatQuestionTextArea.value = "";
}

function handleAskNoInstrClick() {
    showProgressRing();
    // Send messages to Panel.
    vscode.postMessage({
        command: "press-ask-no-instr-button",
        data: [{ type: "text", text: chatQuestionTextArea.value }],
    });

    var data = document.createElement('div');
    data.className = 'userChatLog'
    data.addEventListener('click', () => {
        onHistoryClicked(chatQuestionTextArea.value);
    });
    data.appendChild(document.createTextNode(chatQuestionTextArea.value));
    answer?.appendChild(data);
    // Clear answer filed.
    //answer.innerHTML = '';

    addHistory(chatQuestionTextArea.value);
    chatQuestionTextArea.value = ''

}

function handleAskNoStreamClick() {
    noStream = true;
    handleAskClick();
}

function encodeImageFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error("Provided file is not an image."));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
                // FileReader.readAsDataURL already includes the proper MIME prefix.
                resolve(result);
            } else {
                reject(new Error("Failed to convert image to Base64."));
            }
        };
        reader.onerror = () => {
            reject(new Error("Error reading the image file."));
        };
        reader.readAsDataURL(file);
    });
}

function renderFileList() {
    const fileList = document.getElementById("file-list");
    if (!fileList) {
        return;
    }
    fileList.innerHTML = "";

    if (droppedFiles.length === 0) {
        fileList.textContent = "Drag-and-drop supported.";
        return;
    }

    droppedFiles.forEach((file, index) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.alignItems = "center";
        li.style.padding = "4px 8px";
        li.style.borderBottom = "1px solid #ccc";

        // Create a 64x64 thumbnail.
        const img = document.createElement("img");
        if (file.type.startsWith("image/")) {
            img.src = URL.createObjectURL(file);
        } else {
            img.src = "path/to/default-64x64-icon.png"; // Replace with your default icon path.
        }
        img.width = 64;
        img.height = 64;
        img.style.marginRight = "10px";
        li.appendChild(img);

        // Display file name.
        const nameSpan = document.createElement("span");
        nameSpan.textContent = file.name;
        li.appendChild(nameSpan);

        // Create a removal button.
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "X";
        removeBtn.style.marginLeft = "auto";
        removeBtn.style.cursor = "pointer";
        removeBtn.addEventListener("click", () => {
            // Remove the file from the array.
            droppedFiles.splice(index, 1);
            // Re-render the file list.
            renderFileList();
        });
        li.appendChild(removeBtn);

        fileList.appendChild(li);
    });
}

/**
 * Handle clear button click event.
 */
function handleClearClick() {
    // Clear answer field.
    answer.innerHTML = '';

    // Clear question field.
    chatQuestionTextArea.value = '';

    // Clear chatData
    vscode.postMessage({
        command: "clear-chat",
    });
}


function handleShowHistoryButtonClick() {
    const el = document.getElementById('history-id');
    if (el?.style.getPropertyValue("display") == "none") el?.style.setProperty("display", "block")
    else el?.style.setProperty("display", "none")
    const el2 = document.getElementById('history-header');
    if (el2?.style.getPropertyValue("display") == "none") el2?.style.setProperty("display", "block")
    else el2?.style.setProperty("display", "none")
}

/**
 * Handle clear button click event.
 */
function handleClearHistoryButtonClick() {
    searchHistory = [];

    // Send messages to Panel.
    vscode.postMessage({
        command: "clear-history",
    });

    updateHistoryList()
}

function handleShowInstructionsButtonClick() {
    const el = document.getElementById('instructions-id');
    if (el?.style.getPropertyValue("display") == "none") {
        showProgressRing();
        vscode.postMessage({ command: 'show-instructions-set' });
        el?.style.setProperty("display", "block")
    }
    else el?.style.setProperty("display", "none")

    const el2 = document.getElementById('instructions-header');
    if (el2?.style.getPropertyValue("display") == "none") el2?.style.setProperty("display", "block")
    else el2?.style.setProperty("display", "none")
}

/**
 * Update history list.
 */
function updateHistoryList() {

    const ul = document.getElementById('history-id');

    if (ul != null) {
        ul.textContent = '';
        let index = 0;
        for (const content of searchHistory) {
            if (content != undefined) {

                index++;
                const spanContainer = document.createElement('span');
                spanContainer.id = "container-span-id"
                spanContainer.className = "flex-container"
                spanContainer.style.marginTop = '15px';

                const spanNumber = document.createElement('span');
                spanNumber.id = "span-number-id"
                spanNumber.textContent = index + ') ';
                spanNumber.style.minWidth = '10px';
                spanNumber.style.width = '10px';
                spanNumber.style.fontSize = '14px';
                spanContainer.appendChild(spanNumber);

                const li = document.createElement('li');
                let contentText: string;
                if (typeof content === 'string') {
                    contentText = content;
                } else if (Array.isArray(content)) { //if content is an array
                    //new system with content type
                    let obj = content.find((c) => c.type === 'text');
                    if (obj) {
                        contentText = obj.text;
                    } else {
                        contentText = '';
                    }
                } else contentText = '';
                li.textContent = contentText.length > 50 ? contentText.substring(0, 250) + '...' : contentText;
                li.addEventListener('click', () => {
                    onHistoryClicked(contentText);
                });
                li.title = contentText;
                li.style.cursor = 'pointer';
                li.style.fontSize = '14px';
                li.style.listStyleType = 'none';

                spanContainer.appendChild(li);
                ul.appendChild(spanContainer);
            }
        }
    }
}

/**
 * Handle on click history question event.
 */
function onHistoryClicked(question: string) {
    vscode.postMessage({ command: 'history-question-clicked', data: question });

    // clear fields
    //answer.innerHTML = '';
    var data = document.createElement('div');
    data.addEventListener('click', () => {
        onHistoryClicked(question);
    });
    data.className = 'userChatLog'
    data.appendChild(document.createTextNode(question));
    answer?.appendChild(data);
    //chatQuestionTextArea.value = question;
}

/**
 * Add last search to history.
 * @param content :string
 */
function addHistory(content: string) {
    if (content != undefined) {
        if (searchHistory.length < 10) {
            if (!searchHistory.includes(content))
                searchHistory.unshift(content);
        }
        if (searchHistory.length == 10) {
            searchHistory.pop();
            if (!searchHistory.includes(content)) {
                searchHistory.unshift(content);
            }
        }
    }
    updateHistoryList();
}

//#endregion Chat

//#region Image

/**
 * Update history list.
 */
function updateImageList(imageUrls: any[]) {

    const galleryContainer = document.getElementById('gallery-container');

    if (galleryContainer != null) {
        galleryContainer.textContent = '';
        let index = 0;
        for (const img of imageUrls) {
            if (img != undefined) {

                index++;

                const galleryDivTag = document.createElement('div');
                galleryDivTag.className = "gallery"

                const aTag = document.createElement('a');
                aTag.target = '_blank';
                aTag.href = img.url;

                const imgNode = document.createElement('img');
                imgNode.src = img.url;
                imgNode.width = 400;
                imgNode.height = 400;
                imgNode.alt = promptTextArea.value + '-' + index;
                imgNode.style.cursor = 'pointer';
                aTag.appendChild(imgNode);

                const descDivTag = document.createElement('div');
                descDivTag.className = "desc";
                descDivTag.textContent = promptTextArea.value + '-' + index;

                galleryDivTag.appendChild(aTag);
                galleryDivTag.appendChild(descDivTag);
                galleryContainer.appendChild(galleryDivTag);
            }
        }
    }
}


/**
 * Handle generate image button click event.
 */
function handleImageAskClick() {

    showProgressRing();

    const pError = document.getElementById('error-message') as any;
    pError.textContent = '';

    // Send messages to Panel.
    vscode.postMessage({
        command: "press-image-ask-button",
        data: promptTextArea.value,
    });

    // Clear images filed.
    updateImageList([]);
}

/**
 * Handle clear image button click event.
 */
function handleImageClearClick() {

    // Clear images filed.
    updateImageList([]);

    // Clear question field.
    promptTextArea.value = '';

}


function showErrorMessage(message: string) {
    const pError = document.getElementById('error-message') as any;
    if (message == '') {
        pError?.style.setProperty("display", "none")
        return;
    }
    pError.textContent = message;
    pError?.style.setProperty("display", "inline")
}

//#endregion Image

/**
 * Show progessing ring.
 */
function showProgressRing() {
    // add progress ring.
    const progressRing = document.getElementById("progress-ring-id") as ProgressRing;
    progressRing.style.display = 'inline-block';
}

/**
 * Hide progressing ring.
 */
function hideProgressRing() {
    const progressRing = document.getElementById("progress-ring-id") as ProgressRing;
    progressRing.style.display = 'none';
}

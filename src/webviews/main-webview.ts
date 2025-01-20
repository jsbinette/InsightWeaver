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
let searchHistory: string[] = [];

vscode.postMessage({
    command: "history-request",
});

// Declare Html elements
const answer = document.getElementById("answers-id") as HTMLElement;
const instructions = document.getElementById("instructions-id") as HTMLElement;
const chatQuestionTextArea = document.getElementById("question-text-id") as TextArea;
const askButton = document.getElementById("ask-button-id") as Button;
const asknoinstrButton = document.getElementById("ask-no-instructions-button-id") as Button;
const clearButton = document.getElementById("clear-button-id") as Button;
const showHistoryButton = document.getElementById("show-history-button");
const clearHistoryButton = document.getElementById("clear-history-button");
const showInstructionsButton = document.getElementById("show-instructions-button");
const characterCount = document.getElementById("instructions-character-count") as HTMLElement;

// image
const askImageButton = document.getElementById("ask-image-button-id") as Button;
const promptTextArea = document.getElementById("prompt-text-id") as TextArea;
const clearImageButton = document.getElementById("clear-image-button-id") as Button;

/**
 * Main function
 */
function main() {

    hideProgressRing();

    // Add the eventLsteners.
    askButton?.addEventListener("click", handleAskClick);
    asknoinstrButton?.addEventListener("click", handleAskNoInstrClick);
    clearButton?.addEventListener("click", handleClearClick);
    showHistoryButton?.addEventListener("click", handleShowHistoryButtonClick);
    clearHistoryButton?.addEventListener("click", handleClearHistoryButtonClick);
    showInstructionsButton?.addEventListener("click", handleShowInstructionsButtonClick);

    // image button events
    askImageButton?.addEventListener("click", handleImageAskClick);
    clearImageButton?.addEventListener("click", handleImageClearClick);

    // chat enter event
    chatQuestionTextArea?.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            // Trigger the button element with a click
            handleAskClick();
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
function handleAskClick() {
    showProgressRing();
    // Send messages to Panel.
    vscode.postMessage({
        command: "press-ask-button",
        data: chatQuestionTextArea.value,
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

function handleAskNoInstrClick() {
    showProgressRing();
    // Send messages to Panel.
    vscode.postMessage({
        command: "press-ask-no-instr-button",
        data: chatQuestionTextArea.value,
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
    if (el?.style.getPropertyValue("display") == "none")  {
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
                li.textContent = content.length > 50 ? content.substring(0, 250) + '...' : content;
                li.addEventListener('click', () => {
                    onHistoryClicked(content);
                });
                li.title = content;
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

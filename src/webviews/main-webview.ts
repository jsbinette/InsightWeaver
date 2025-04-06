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
} from "@vscode/webview-ui-toolkit"
import { text } from "node:stream/consumers"

/**
 * Register "@vscode/webview-ui-toolkit" component to vscode design system.
 */
provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeProgressRing(), vsCodeTextArea(), vsCodeDivider(), vsCodeTextField())

const vscode = acquireVsCodeApi()

// Add load event listener.
window.addEventListener("load", main)

// declare an array for search history.
let searchHistory: ContentItem[][] = []

vscode.postMessage({
    command: "history-request",
})

// Declare Html elements
const answer = document.getElementById("answers-id") as HTMLElement
const instructions = document.getElementById("instructions-id") as HTMLElement
const imageContainer = document.getElementById('instructions-image-container') as HTMLElement
const chatQuestionTextArea = document.getElementById("question-text-id") as TextArea
const dropArea = document.getElementById('drag-drop-area') as HTMLElement
const askButton = document.getElementById("ask-button-id") as Button
const asknoinstrButton = document.getElementById("ask-no-instructions-button-id") as Button
const asknoStreamButton = document.getElementById("ask-no-stream-button-id") as Button
const clearButton = document.getElementById("clear-button-id") as Button
const showHistoryButton = document.getElementById("show-history-button")
const clearHistoryButton = document.getElementById("clear-history-button")
const showInstructionsButton = document.getElementById("show-instructions-button")
const characterCount = document.getElementById("instructions-character-count") as HTMLElement

// image
const askImageButton = document.getElementById("ask-image-button-id") as Button
const promptTextArea = document.getElementById("prompt-text-id") as TextArea
const clearImageButton = document.getElementById("clear-image-button-id") as Button
const fileList = document.getElementById("file-list") as HTMLElement
let noStream = false
let noInstruction = false

//for drag and drop
let droppedImages: Extract<ContentItem, { type: "image_url" }>[] = []
renderFileList()
type ContentItem =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }

/**
 * Main function
 */
function main() {

    hideProgressRing()

    // Add the eventLsteners.
    askButton?.addEventListener("click", handleAskClick)
    asknoinstrButton?.addEventListener("click", handleAskNoInstrClick)
    asknoStreamButton?.addEventListener("click", handleAskNoStreamClick)
    clearButton?.addEventListener("click", handleClearClick)
    showHistoryButton?.addEventListener("click", handleShowHistoryButtonClick)
    clearHistoryButton?.addEventListener("click", handleClearHistoryButtonClick)
    showInstructionsButton?.addEventListener("click", handleShowInstructionsButtonClick)
    // image button events
    askImageButton?.addEventListener("click", handleImageAskClick)
    clearImageButton?.addEventListener("click", handleImageClearClick)
    // chat enter event
    chatQuestionTextArea?.addEventListener("keypress", function (event) {
        /* if (event.key === "Enter") {
             event.preventDefault()
             // Trigger the button element with a click
             handleAskClick()
         }*/
    })

    dropArea.addEventListener("dragover", (event: DragEvent) => {
        event.preventDefault()
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy"
        }
        dropArea.classList.add("drag-over")
    })

    dropArea.addEventListener("dragleave", (_event: DragEvent) => {
        dropArea.classList.remove("drag-over")
    })

    dropArea.addEventListener("drop", (event: DragEvent) => {
        event.preventDefault()
        dropArea.classList.remove("drag-over")
        if (event.dataTransfer) {
            const newFiles = Array.from(event.dataTransfer.files)
            const encodePromises = newFiles.map(file => encodeImageFileToBase64(file))
    
            Promise.all(encodePromises).then(base64Strings => {
                const newImages: Extract<ContentItem, { type: "image_url" }>[] = base64Strings.map(base64 => ({
                    type: "image_url",
                    image_url: { url: base64 }
                }))
                droppedImages.push(...newImages)
                renderFileList()
            })
        }
    })

    // image enter event
    promptTextArea?.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault()
            // Trigger the button element with a click
            handleImageAskClick()
        }
    })

    try {
        // Handle messages sent from the extension to the webview
        window.addEventListener('message', event => {
            const message = event.data; // The json data that the extension sent
            showErrorMessage(''); // Clear error message.
            switch (message.command) {
                case 'answer':
                    // Append answer.
                    hideProgressRing()
                    const data = document.createTextNode(message.data)
                    answer?.appendChild(data)
                    break
                case 'history-data':
                    searchHistory = message.data
                    updateHistoryList()
                    break
                case 'image-urls-answer':
                    // Append answer.
                    const imageList = message.data as any[]
                    updateImageList(imageList)
                    hideProgressRing()
                    break
                case 'error-message':
                    // Append answer.
                    showErrorMessage(message.data)
                    hideProgressRing()
                    break
                case 'instructions-data':
                    hideProgressRing()
                    imageContainer.innerHTML = ''; // Clear previous images
                    if (typeof (message.data) === 'string') {
                        instructions.textContent = message.data
                    } else {
                        //message.data is an array of of ojbects, one of them should by of type text
                        const textContent = message.data.find((c: ContentItem) => c.type === 'text')
                        if (textContent) {
                            instructions.textContent = textContent.text
                        }
                        const imageContents = (message.data as ContentItem[]).filter(
                            (c): c is Extract<ContentItem, { type: "image_url" }> => c.type === "image_url"
                        )
                        if (imageContents.length > 0) {
                            imageContents.forEach((imgObj) => {
                                const img = document.createElement('img')
                                if (isSafeImageBase64(imgObj.image_url.url)) {
                                    img.src = imgObj.image_url.url
                                }
                                //img.style.maxWidth = '150px'
                                img.style.maxHeight = '150px'
                                img.style.margin = '5px'
                                img.style.cursor = 'pointer'
                                //this does not work even thought I have the security setting allow popups because I'm in an iframe.
                                img.addEventListener('click', () => {
                                    const newTab = window.open(imgObj.image_url.url, '_blank')
                                    if (newTab) {
                                        newTab.focus()
                                    } else {
                                        console.error('Failed to open image in new tab')
                                    }
                                })
                                imageContainer.appendChild(img)
                            })
                        }
                    }
                    break
                case 'upadate-instructions-character-count':
                    characterCount.textContent = message.data
                    break
                case 'error':
                    break
            }
        })
    } catch (err: any) {
        console.log('errrr js')
        console.log(err)
    }
}

//#region Chat

/**
 * Handle ask button click event.
 */
function handleAskClick(): void {
    showProgressRing()
    const textContent: ContentItem = { type: "text", text: chatQuestionTextArea.value }
    const content: ContentItem[] = [textContent, ...droppedImages]
    vscode.postMessage({
        command: (noInstruction ? "press-ask-no-instr-button" : "press-ask-button") + (noStream ? "-no-stream" : ""),
        data: content,
    })

    const data = document.createElement("div")
    data.className = "userChatLog"
    const questionSpan = document.createElement("div")
    questionSpan.textContent = chatQuestionTextArea.value
    questionSpan.addEventListener("click", () => onHistoryClicked(content))
    data.appendChild(questionSpan)
    droppedImages.forEach(item => {
        const img = document.createElement("img")
        if (isSafeImageBase64(item.image_url.url)) {
            img.src = item.image_url.url
        }
        //img.style.maxWidth = "150px"
        img.style.maxHeight = "150px"
        img.style.margin = "5px"
        img.style.cursor = "pointer"
        data.appendChild(img)
    })
    answer?.appendChild(data)

    noStream = false
    noInstruction = false
    droppedImages.length = 0
    renderFileList()
    
    addHistory(content)
    chatQuestionTextArea.value = ""
}

function handleAskNoInstrClick() {
    noInstruction = true
    handleAskClick()
}

function handleAskNoStreamClick() {
    noStream = true
    handleAskClick()
}

function encodeImageFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith("image/")) {
            reject(new Error("Provided file is not an image."))
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result
            if (typeof result === "string") {
                // FileReader.readAsDataURL already includes the proper MIME prefix.
                resolve(result)
            } else {
                reject(new Error("Failed to convert image to Base64."))
            }
        }
        reader.onerror = () => {
            reject(new Error("Error reading the image file."))
        }
        reader.readAsDataURL(file)
    })
}

function renderFileList() {
    fileList.innerHTML = ""
    if (droppedImages.length === 0) {
        fileList.textContent = "Drag-and-drop supported."
        return
    }

    droppedImages.forEach((item, index) => {
        const li = document.createElement("li")
        li.style.display = "flex"
        li.style.alignItems = "center"
        li.style.padding = "4px 8px"
        li.style.borderBottom = "1px solid #ccc"

        const img = document.createElement("img")
        if (isSafeImageBase64(item.image_url.url)) {
            img.src = item.image_url.url
        }
        //img.style.maxWidth = "150px"
        img.style.maxHeight = "150px"
        img.style.marginRight = "10px"
        li.appendChild(img)

        const nameSpan = document.createElement("span")
        nameSpan.textContent = "Image"
        li.appendChild(nameSpan)

        const removeBtn = document.createElement("button")
        removeBtn.textContent = "X"
        removeBtn.style.marginLeft = "auto"
        removeBtn.style.cursor = "pointer"
        removeBtn.style.width = "50px"
        removeBtn.addEventListener("click", () => {
            droppedImages.splice(index, 1)
            renderFileList()
        })
        li.appendChild(removeBtn)

        fileList.appendChild(li)
    })
}

/**
 * Handle clear button click event.
 */
function handleClearClick() {
    // Clear answer field.
    answer.innerHTML = ''

    // Clear question field.
    chatQuestionTextArea.value = ''

    // Clear chatData
    vscode.postMessage({
        command: "clear-chat",
    })
}


function handleShowHistoryButtonClick() {
    const el = document.getElementById('history-id')
    if (el?.style.getPropertyValue("display") == "none") el?.style.setProperty("display", "block")
    else el?.style.setProperty("display", "none")
    const el2 = document.getElementById('history-header')
    if (el2?.style.getPropertyValue("display") == "none") el2?.style.setProperty("display", "block")
    else el2?.style.setProperty("display", "none")
}

/**
 * Handle clear button click event.
 */
function handleClearHistoryButtonClick() {
    searchHistory = []

    // Send messages to Panel.
    vscode.postMessage({
        command: "clear-history",
    })

    updateHistoryList()
}

function handleShowInstructionsButtonClick() {
    if (instructions?.style.getPropertyValue("display") == "none") {
        showProgressRing()
        vscode.postMessage({ command: 'show-instructions-set' })
        instructions?.style.setProperty("display", "block")
    }
    else instructions?.style.setProperty("display", "none")

    const el2 = document.getElementById('instructions-header')
    if (el2?.style.getPropertyValue("display") == "none") el2?.style.setProperty("display", "block")
    else el2?.style.setProperty("display", "none")

    const el3 = document.getElementById('instructions-image-container')
    if (el3?.style.getPropertyValue("display") == "none") el3?.style.setProperty("display", "block")
    else el3?.style.setProperty("display", "none")
}

function createHistoryElement(htmlElement: HTMLElement, content: ContentItem[]) {
    const textDiv = document.createElement('div')
    textDiv.textContent = ''
    let textContent = content.find((c) => c.type === 'text')
    if (textContent) {
        textDiv.textContent = textContent.text
    }
    htmlElement.appendChild(textDiv)

    let images = content.filter((c) => c.type === 'image_url')
    if (images.length > 0) {
        const imageContainer = document.createElement('div')
        imageContainer.className = "image-container"
        images.forEach((imgObj) => {
            const img = document.createElement('img')
            if (isSafeImageBase64(imgObj.image_url.url)) {
                img.src = imgObj.image_url.url
            }
            //img.style.maxWidth = '150px'
            img.style.maxHeight = '150px'
            img.style.margin = '5px'
            img.style.cursor = 'pointer'
            imageContainer.appendChild(img)
        })
        imageContainer.style.display = 'flex'
        htmlElement.appendChild(imageContainer)
    }

    htmlElement.addEventListener('click', () => {
        onHistoryClicked(content)
    })
    htmlElement.title = textDiv.textContent
}

/**
 * Update history list.
 */
function updateHistoryList() {

    const ul = document.getElementById('history-id')

    if (ul != null) {
        ul.textContent = ''
        let index = 0
        for (const content of searchHistory) {
            if (content != undefined) {
                index++; //JSB will use this index to pass in case of click
                const spanContainer = document.createElement('span')
                spanContainer.id = "container-span-id"
                spanContainer.className = "flex-container"
                spanContainer.style.marginTop = '15px'
                const li = document.createElement('li')
                li.id = 'history-item-' + index
                createHistoryElement(li, content)
                li.style.cursor = 'pointer'
                li.style.fontSize = '14px'
                li.style.listStyleType = 'auto'
                li.style.borderBottom = "1px solid"
                spanContainer.appendChild(li)
                ul.appendChild(spanContainer)
            }
        }
    }
}

/**
 * Handle on click history question event.
 */
function onHistoryClicked(content: ContentItem[]) {
    // Place the content in the question field.
    const textContent = content.find((c) => c.type === 'text')
    if (textContent) {
        chatQuestionTextArea.value = textContent.text
    }
    // Place the images in the image field.
    droppedImages = content.filter((c) => c.type === 'image_url')
    renderFileList()
}

/**
 * Add last search to history.
 * @param content :string
 */
function addHistory(content: ContentItem[]) {
    if (content != undefined) {
        if (searchHistory.length < 10) {
            if (!searchHistory.includes(content))
                searchHistory.unshift(content)
        }
        if (searchHistory.length == 10) {
            searchHistory.pop()
            if (!searchHistory.includes(content)) {
                searchHistory.unshift(content)
            }
        }
    }
    updateHistoryList()
}

//#endregion Chat

//#region Image

/**
 * Update history list.
 */
function updateImageList(imageUrls: any[]) {

    const galleryContainer = document.getElementById('gallery-container')

    if (galleryContainer != null) {
        galleryContainer.textContent = ''
        let index = 0
        for (const img of imageUrls) {
            if (img != undefined) {

                index++

                const galleryDivTag = document.createElement('div')
                galleryDivTag.className = "gallery"

                const aTag = document.createElement('a')
                aTag.target = '_blank'
                aTag.href = img.url
                if (isSafeImageBase64(img.url)) {
                    aTag.href = img.url
                }
                const imgNode = document.createElement('img')
                if (isSafeImageBase64(img.url)) {
                    imgNode.src  = img.url
                }
                imgNode.width = 400
                imgNode.height = 400
                imgNode.alt = promptTextArea.value + '-' + index
                imgNode.style.cursor = 'pointer'
                aTag.appendChild(imgNode)

                const descDivTag = document.createElement('div')
                descDivTag.className = "desc"
                descDivTag.textContent = promptTextArea.value + '-' + index

                galleryDivTag.appendChild(aTag)
                galleryDivTag.appendChild(descDivTag)
                galleryContainer.appendChild(galleryDivTag)
            }
        }
    }
}


/**
 * Handle generate image button click event.
 */
function handleImageAskClick() {

    showProgressRing()

    const pError = document.getElementById('error-message') as any
    pError.textContent = ''

    // Send messages to Panel.
    vscode.postMessage({
        command: "press-image-ask-button",
        data: promptTextArea.value,
    })

    // Clear images filed.
    updateImageList([])
}

/**
 * Handle clear image button click event.
 */
function handleImageClearClick() {

    // Clear images filed.
    updateImageList([])

    // Clear question field.
    promptTextArea.value = ''

}


function showErrorMessage(message: string) {
    const pError = document.getElementById('error-message') as any
    if (message == '') {
        pError?.style.setProperty("display", "none")
        return
    }
    pError.textContent = message
    pError?.style.setProperty("display", "inline")
}

//#endregion Image

/**
 * Show progessing ring.
 */
function showProgressRing() {
    // add progress ring.
    const progressRing = document.getElementById("progress-ring-id") as ProgressRing
    progressRing.style.display = 'inline-block'
}

function isSafeImageBase64(dataUrl: string): boolean {
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-zA-Z0-9+/=]+={0,2}$/.test(dataUrl)
}

/**
 * Hide progressing ring.
 */
function hideProgressRing() {
    const progressRing = document.getElementById("progress-ring-id") as ProgressRing
    progressRing.style.display = 'none'
}

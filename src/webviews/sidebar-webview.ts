const sidebarVscode = acquireVsCodeApi()

/**
 * Add load event.
 */
window.addEventListener("load", main)

// Declare Html elements.
const startChatButton = document.getElementById("start-chat-gpt-button")
const imageButton = document.getElementById("image-generate-button")
const apiKeySaveButton = document.getElementById("api-key-save-button-id") as any
const apiKeyTextField = document.getElementById("api-key-text-field-id") as any
const temperatureTextField = document.getElementById("temperature-text-field-id") as any
const imageSizeTextField = document.getElementById("image-size-text-field-id") as any
const modelSelect = document.getElementById("model-select-id") as any

/**
 * Main function
 */
function main() {

    // Add eventLsteners of Html elements.
    startChatButton?.addEventListener("click", handleStartButtonClick)
    imageButton?.addEventListener("click", handleImageButtonClick)
    apiKeySaveButton?.addEventListener("click", handleSaveClick)

    // Handle messages sent from the extension or panel to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'settings-exist':
                apiKeyTextField.value = message.data.apiKey
                temperatureTextField.value = message.data.temperature || "1"
                imageSizeTextField.value = message.data.imageSize || "1792x1024"
                modelSelect.innerHTML = ""
                // Populate options dynamically
                message.data.models = ["gpt-4o","gpt-4o-mini","o3-mini","o1","gpt-4.5-preview"]
                message.data.models.forEach( (optionText:string) => {
                    const optionElement = document.createElement("option")
                    optionElement.value = optionText; // Set the value
                    optionElement.textContent = optionText; // Set the display text
                    modelSelect.appendChild(optionElement); // Append to select
                })
                modelSelect.value = message.data.model
                break
            case 'error':
                console.log(message)
                break
        }
    })
}

/**
 * Handle start button click event.
 */
function handleStartButtonClick() {
    // Send messages to Panel.
    sidebarVscode.postMessage({
        command: "start-chat-command",
        text: 'start-chat',
    })
}

/**
 * Handle image button click event.
 */
function handleImageButtonClick() {
    // Send messages to Panel.
    sidebarVscode.postMessage({
        command: "image-buton-clicked-command",
        text: 'image-button',
    })
}

/**
 * Handle save  click event. 
 */
function handleSaveClick() {
    const data = {
        apiKey: apiKeyTextField?.value,
        temperature: temperatureTextField?.value,
        imageSize: imageSizeTextField?.value,
        model: modelSelect?.value
    }
    sidebarVscode.postMessage({
        command: "save-settings",
        data: data,
    })
}
"use strict";
(() => {
  // src/webviews/side-bar-view.ts
  var vscode = acquireVsCodeApi();
  window.addEventListener("load", main);
  var startChatButton = document.getElementById("start-chat-gpt-button");
  console.log("HERE!");
  var imageButton = document.getElementById("image-generate-button");
  var apiKeySaveButton = document.getElementById("api-key-save-button-id");
  var apiKeyTextField = document.getElementById("api-key-text-field-id");
  var temperatureTextField = document.getElementById("temperature-text-field-id");
  var imageNumberTextField = document.getElementById("image-number-text-field-id");
  var imageSizeTextField = document.getElementById("image-size-text-field-id");
  function main() {
    startChatButton?.addEventListener("click", handleStartButtonClick);
    imageButton?.addEventListener("click", handleImageButtonClick);
    apiKeySaveButton?.addEventListener("click", handleSaveClick);
    window.addEventListener("message", (event) => {
      const message = event.data;
      switch (message.command) {
        case "settings-exist":
          const apiKey = message.data.apiKey;
          const temperature = message.data.temperature;
          const responseNumber = message.data.responseNumber;
          const imageSize = message.data.imageSize;
          apiKeyTextField.value = apiKey;
          temperatureTextField.value = temperature;
          imageNumberTextField.value = responseNumber;
          imageSizeTextField.value = imageSize;
          break;
        case "error":
          console.log(message);
          break;
      }
    });
  }
  function handleStartButtonClick() {
    vscode.postMessage({
      command: "start-chat-command",
      text: "start-chat"
    });
  }
  function handleImageButtonClick() {
    vscode.postMessage({
      command: "image-buton-clicked-command",
      text: "image-button"
    });
  }
  function handleSaveClick() {
    const data = {
      apiKey: apiKeyTextField?.value,
      temperature: temperatureTextField?.value,
      responseNumber: imageNumberTextField?.value,
      imageSize: imageSizeTextField?.value
    };
    vscode.postMessage({
      command: "save-settings",
      data
    });
  }
})();
//# sourceMappingURL=side-bar-view.js.map

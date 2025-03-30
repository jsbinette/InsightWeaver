const treeVscode = acquireVsCodeApi();

window.addEventListener("load", treeMain);
function treeMain() {
    // Handle messages sent from the extension or panel to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {

        }
    });

    document.getElementById("groupByComboBox")?.addEventListener("change", (event) => {
        // Send messages to Vew.
        treeVscode.postMessage({
            command: "chooseGroupBy",
            args: [(event.target as HTMLSelectElement).value], // Pass text as an argument
        });
    });

    document.querySelectorAll('.toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const parentLi = toggle.parentElement;
            if (!parentLi) {
                return;
            }
            parentLi.classList.toggle('expanded');
            const icon = toggle.querySelector('i');
            if (!icon) {
                return;
            }
            treeVscode.postMessage({
                command: "rootToggle",
                args: [parentLi.id], // Pass text as an argument
            });
            if (parentLi.classList.contains('expanded')) {
                icon.classList.remove('codicon-chevron-right');
                icon.classList.add('codicon-chevron-down');
            } else {
                icon.classList.remove('codicon-chevron-down');
                icon.classList.add('codicon-chevron-right');
            }
        });
    });

    document.querySelectorAll('.rootLabel').forEach(rootLabel => {
        rootLabel.addEventListener('click', () => {
            const id = rootLabel.id;
            treeVscode.postMessage({
                command: "outGroupToggle",
                args: [id],
            });
        }
        );
    });

    document.querySelectorAll('.treeLabel').forEach(treeLabel => {
        treeLabel.addEventListener('click', () => {
            const id = treeLabel.id;
            treeVscode.postMessage({
                command: "outToggle",
                args: [id], // Pass text as an argument
            });
        }
        );
    });

    document.querySelectorAll('.eyeIcon').forEach(eyeIcon => {
        eyeIcon.addEventListener('click', () => {
            const id = eyeIcon.id;
            treeVscode.postMessage({
                command: "goToTag",
                args: [id],
            });
        }
        );
    });

    const list = document.getElementById("tree-list") as HTMLUListElement;
    let draggedItem: HTMLLIElement | null = null;

    list.querySelectorAll("li").forEach(item => {
        item.addEventListener("dragstart", (event: DragEvent) => {
            draggedItem = event.currentTarget as HTMLLIElement;
            event.dataTransfer!.effectAllowed = "move";
            event.dataTransfer!.setData("text/plain", ""); // Required for Firefox
        });

        item.addEventListener("dragover", (event: DragEvent) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = "move";
        });

        item.addEventListener("drop", (event: DragEvent) => {
            event.preventDefault();
            if (draggedItem && draggedItem !== item) {
                const parent = item.parentNode!;
                const next = (draggedItem === item.nextSibling) ? item.nextSibling?.nextSibling : item.nextSibling;
                parent.insertBefore(draggedItem, next);
                treeVscode.postMessage({
                    command: "draggedRootElement",
                    args: [draggedItem.id, item.id] // Sending the dragged and dropped-on item
                });
    
            }
        });

        item.addEventListener("dragend", () => {
            draggedItem = null;
        });
    });
}

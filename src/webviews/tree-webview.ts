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



    /**
     * Create list markup.
     * @param elements 
     * @returns 
     */
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
            if (parentLi.classList.contains('expanded')) {
                icon.classList.remove('codicon-chevron-right');
                icon.classList.add('codicon-chevron-down');
            } else {
                icon.classList.remove('codicon-chevron-down');
                icon.classList.add('codicon-chevron-right');
            }
        });
    });
}

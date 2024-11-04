//import * as smd from "./smd.js"
import { marked } from "./scripts/marked.esm.js";
// import * as mmd from "./scripts/nlux-markdown-esm/markdown.js"; // https://www.npmjs.com/package/@nlux/markdown

// window.addEventListener("message", function(event) {
//     if (event.data.action === 'init') {
//         const selectedText = event.data.text;
//         console.log(selectedText); // logs the selected text
//     }
//   });

let tabId;

var query = { active: true, currentWindow: true };
function callback(tabs) {
    let currentTab = tabs[0]; // there will be only one in this array
    tabId = currentTab.id; // also has properties like currentTab.id
    //console.log(tabId);
}
chrome.tabs.query(query, callback);

// Get the input and button elements
const chatInput = document.getElementById("chat-input");
const chatMessagesContainer = document.getElementById("chat-messages");
const form = document.querySelector('#chat-form');

chatInput.focus();
chatInput.setSelectionRange(0, 0);

// const messageElement = document.createElement('div');
// messageElement.id = 'markdown';
// chatMessagesContainer.appendChild(messageElement);

// const renderer = smd.default_renderer(messageElement)
// const parser   = smd.parser(renderer)

let mdStreamParser;


chatInput.addEventListener("keydown", function(e) {
    if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        const newline = '\n';
        const startPosition = chatInput.selectionStart;
        const endPosition = chatInput.selectionEnd;
        chatInput.value = chatInput.value.substring(0, startPosition) + newline + chatInput.value.substring(endPosition);
        chatInput.selectionStart = startPosition + newline.length;
        chatInput.selectionEnd = startPosition + newline.length;
        chatInput.focus();
    }
    else  if (e.key === "Enter") {
        e.preventDefault(); // Prevent the default behavior of the Enter key
        const message = chatInput.value;
        chatInput.value = '';
        chrome.runtime.sendMessage({ action: "sendMessage", tabId, message }, ()=>{
            //$("#response-generating").show();
        });
    }
});



// Add an event listener to the form's submit event
form.addEventListener('submit', (e) => {
  // Prevent the default form submission behavior
    e.preventDefault();

    const message = chatInput.value;
    chatInput.value = '';
    chrome.runtime.sendMessage({ action: "sendMessage", tabId, message }, ()=>{
        //$("#response-generating").show();
    });
});

// Listen for messages from the background script

function waitForElement(selector, callback, interval = 100) {
    const checkExist = setInterval(() => {
        if ($(selector).length) {
            clearInterval(checkExist);
            callback();
        }
    }, interval);
}

function encodeHtml(input) {
    return input.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'display-loading-status'){
        waitForElement('#chat-messages', function() {
            if (request.isShow){
                let inprogressElement = $(".inprogress-message");
                if (!inprogressElement.length){
                    inprogressElement = createInProgressMessage();
                    chatMessagesContainer.appendChild(inprogressElement[0]);
                }
                
                if (request.message != null && typeof request.message != "undefined" && request.message.length > 0){
                    inprogressElement.find("span").html(request.message);
                }
                else{
                    inprogressElement.find("span").html(`<span class="inline-block h-1.5 w-1.5 rounded-full bg-blue-600"></span>AI's thinking...`);
                }

                inprogressElement[0].scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
            else{
                $(".inprogress-message").remove();
            }            
        });
    } else if (request.action === "addUserMessage"){
        if (request.message == null || typeof request.message == "undefined" || request.message == ""){
            return;
        }

        // let userMsgElement = document.createElement('div');
        // userMsgElement.id = `msg-key-${request.msgId}`;
        // userMsgElement.classList.add('chat-message');
        // userMsgElement.classList.add('user-message');
        // //userMsgElement.innerText = request.message;

        // marked.setOptions({
        //     breaks: true // Enable GFM line breaks
        // });

        // const htmlContent = marked.parse(request.message);
        // userMsgElement.innerHTML = htmlContent;
        
        // chatMessagesContainer.appendChild(userMsgElement);


        let userMsgElement = createUserMessageElement(request.msgId);

        // marked.setOptions({
        //     breaks: true // Enable GFM line breaks
        // });

        //console.log(request.message);
        //const htmlContent = encodeHtml(marked.parse(request.message));
        userMsgElement.find(".jin-message-content").html(encodeHtml(request.message));
        
        chatMessagesContainer.appendChild(userMsgElement[0]);
        userMsgElement[0].scrollIntoView({ behavior: 'smooth', block: 'end' });

    } else if (request.action === "addSuggestionQuestions"){
        let promptSuggestions = document.querySelector("#prompt-suggestions");
        promptSuggestions.innerHTML = '';

        let questions = request?.questions || [];
        questions.forEach((q, idx)=>{
            let buttonElm = $(`<button style="display: flex" 
                class="text-left rounded-lg bg-slate-200 p-2 mt-2 hover:bg-blue-600 hover:text-slate-200 dark:bg-slate-800 dark:hover:bg-blue-600 dark:hover:text-slate-50">${encodeHtml(q)}</button>`);
            buttonElm.click(()=>{
                chrome.runtime.sendMessage({ action: "sendMessage", tabId, message: buttonElm.text() });
            });

            promptSuggestions.appendChild(buttonElm[0]);
            
            promptSuggestions.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
        
    } else if (request.action === "addAssistantMessage") {
        if (request.message == null || typeof request.message == "undefined"){
            return;
        }

        const isError = request.isError || false;
        if (isError){
            let errorMsgElement = createErrorMessageElement(request.msgId);
            errorMsgElement.find(".jin-message-content").text(request.message);
            chatMessagesContainer.appendChild(errorMsgElement[0]);
            return;
        }

        let assistantMsgElement = createAssistantMessageElement(request.msgId);

        marked.setOptions({
            breaks: true // Enable GFM line breaks
        });

        const htmlContent = marked.parse(request.message);
        assistantMsgElement.find(".jin-message-content").html(htmlContent); // .replace(/\n/g, "<br>")

        
        chatMessagesContainer.appendChild(assistantMsgElement[0]);

        //$("#response-generating").hide();

        document.querySelectorAll(`#msg-key-${request.msgId} .jin-message-content pre code`).forEach((el) => {
            hljs.highlightElement(el);
        });

        assistantMsgElement[0].scrollIntoView({ behavior: 'smooth', block: 'end' });
        
        return;

        // console.log(hljs);
        

        // //console.log(message);

        // const isFirst = request.isFirst || false;
        // const isDone = request.isDone || false;

        // // smd sample    
        // //smd.parser_write(parser, message)

        // // On each chunk of markdown
        // let assistantMsgElement = document.querySelector(`#msg-key-${request.msgId}`);

        // if (isFirst){            
        //     //chatMessagesContainer.innerHTML = '';
        //     // nlux markdown sample
        //     const options = {
        //         // markdownLinkTarget?: 'blank' | 'self';                       // default: 'blank'
        //         // syntaxHighlighter: (( Highlighter from @nlux/highlighter )), // default: undefined — for code blocks syntax highlighting
        //         showCodeBlockCopyButton: false,                           // default: true — for code blocks
        //         // skipStreamingAnimation?: boolean,                            // default: false
        //         streamingAnimationSpeed: 2,                            // default: 10 ( milliseconds )
        //         // waitTimeBeforeStreamCompletion?: number | 'never',           // default: 2000 ( milliseconds )
        //         onComplete: () => {
        //             // let msgElement = document.querySelector(`#msg-key-${request.msgId}`);
        //             // msgElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        //             //console.log("Parsing complete");

        //             document.querySelectorAll('.code-block pre').forEach((el) => {
        //                 hljs.highlightElement(el);
        //             });

        //             if (assistantMsgElement){
        //                 assistantMsgElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        //             }
        //         },           // triggered after the end of the stream


        //     };

        //     if (!assistantMsgElement){
        //         let assistantMsgJqueryElement = createAssistantMessageElement(request.msgId);
        //         assistantMsgElement = assistantMsgJqueryElement.find(".jin-message-content")[0];
        //         chatMessagesContainer.appendChild(assistantMsgJqueryElement[0]);
        //     }

        //     mdStreamParser = mmd.createMarkdownStreamParser(
        //         assistantMsgElement,
        //         options,
        //     );
        // }

        // try{
        //     mdStreamParser.next(message);
        // }catch{}

        // if (isDone){
        //     mdStreamParser.complete();
        // } 

        // document.querySelectorAll('.code-block pre').forEach((el) => {
        //     hljs.highlightElement(el);
        // });

        // if (assistantMsgElement){
        //     assistantMsgElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        // }
        
    }

    $(".inprogress-message").hide();
});


function createUserMessageElement(elementId){
    let element = $(
`<div id="msg-key-${elementId}" class="flex flex-row px-2 py-4 sm:px-4 text-yellow-600">
	<img class="mr-2 flex h-8 w-8 rounded-full sm:mr-4" src="https://dummyimage.com/256x256/363536/ffffff&text=User"/>
	<div class="flex-col max-w-12xl jin-message-content">

	</div>
</div>`);

    return element;
}

function createAssistantMessageElement(elementId){
//     <div class="mb-2 flex w-full flex-row justify-end gap-x-2 text-slate-500">
// 	<button class="hover:text-blue-600">
// 		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
// 			<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
// 			<path d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3"/>
// 		</svg>
// 	</button>
// 	<button class="hover:text-blue-600" type="button">
// 		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
// 			<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
// 			<path d="M7 13v-8a1 1 0 0 0 -1 -1h-2a1 1 0 0 0 -1 1v7a1 1 0 0 0 1 1h3a4 4 0 0 1 4 4v1a2 2 0 0 0 4 0v-5h3a2 2 0 0 0 2 -2l-1 -5a2 3 0 0 0 -2 -2h-7a3 3 0 0 0 -3 3"/>
// 		</svg>
// 	</button>
// 	<button class="hover:text-blue-600" type="button">
// 		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
// 			<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
// 			<path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z"/>
// 			<path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2"/>
// 		</svg>
// 	</button>
// </div>

    let element = $(
`
<div id="msg-key-${elementId}" class="mb-4 flex rounded-xl bg-slate-50 px-2 py-6 dark:bg-slate-900 sm:px-4">
	<img class="mr-2 flex h-8 w-8 rounded-full sm:mr-4" src="https://dummyimage.com/256x256/354ea1/ffffff&text=AI"/>
	<div class="flex-col max-w-12xl jin-message-content">

	</div>
</div>`);

    return element;
}

function createErrorMessageElement(elementId){
        let element = $(
    `
    <div id="msg-key-${elementId}" class="mb-4 flex rounded-xl bg-slate-50 px-2 py-6 dark:bg-slate-900 sm:px-4">
        <img class="mr-2 flex h-8 w-8 rounded-full sm:mr-4" src="https://dummyimage.com/256x256/354ea1/ffffff&text=AI"/>
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline jin-message-content"></span>
        </div>
    </div>`);
    
        return element;
    }

function createInProgressMessage(){
    return $(`<div class="inprogress-message m4"><span class="inline-flex items-center gap-x-2 rounded-full bg-blue-600/20 px-2.5 py-1 text-sm font-semibold leading-5 text-blue-600"></span>
</div>`);
}
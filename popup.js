// //import * as smd from "./smd.js"

// import * as mmd from "./scripts/nlux-markdown-esm/markdown.js"; // https://www.npmjs.com/package/@nlux/markdown

// // Get the input and button elements
// const messageInput = document.getElementById("message-input");
// const chatLog = document.getElementById("chat-log");

// messageInput.focus();
// messageInput.setSelectionRange(0, 0);

// // const messageElement = document.createElement('div');
// // messageElement.id = 'markdown';
// // chatLog.appendChild(messageElement);

// // const renderer = smd.default_renderer(messageElement)
// // const parser   = smd.parser(renderer)

// let mdStreamParser;

// messageInput.addEventListener("keydown", function(event) {
//     if (event.key === "Enter") {
//         event.preventDefault(); // Prevent the default behavior of the Enter key
//         const message = messageInput.value;
//         messageInput.value = '';
//         chrome.runtime.sendMessage({ action: "sendMessage", message });
//     }
// });

// // Listen for messages from the background script
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "addUserMessage"){
//         let userMsgElement = document.createElement('div');
//         userMsgElement.id = `msg-key-${request.msgId}`;
//         userMsgElement.classList.add('chat-message');
//         userMsgElement.classList.add('user-message');
        
//         chatLog.appendChild(userMsgElement);
//         //userMsgElement.innerText = request.message;

//         const options = {
//             // markdownLinkTarget?: 'blank' | 'self';                       // default: 'blank'
//             // syntaxHighlighter: (( Highlighter from @nlux/highlighter )), // default: undefined — for code blocks syntax highlighting
//             showCodeBlockCopyButton: true,                           // default: true — for code blocks
//             // skipStreamingAnimation?: boolean,                            // default: false
//             //streamingAnimationSpeed: 2,                            // default: 10 ( milliseconds )
//             // waitTimeBeforeStreamCompletion?: number | 'never',           // default: 2000 ( milliseconds )
//             onComplete: () => console.log("Parsing complete"),           // triggered after the end of the stream
//         };

//         let userMdStreamParser = mmd.createMarkdownStreamParser(
//             userMsgElement,
//             options,
//         );

//         userMdStreamParser.next(request.message);
//         userMdStreamParser.complete();

//         userMsgElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
//     } else if (request.action === "streamMessage") {
    
//         const message = request.message;
//         if (message == null || typeof message == "undefined"){
//             return;
//         }

//         //console.log(message);

//         const isFirst = request.isFirst || false;
//         const isDone = request.isDone || false;

//         // smd sample    
//         //smd.parser_write(parser, message)

//         // On each chunk of markdown
//         let assistantMsgElement = document.querySelector(`#msg-key-${request.msgId}`);
        
//         if (isFirst){
//             //chatLog.innerHTML = '';
//             // nlux markdown sample
//             const options = {
//                 // markdownLinkTarget?: 'blank' | 'self';                       // default: 'blank'
//                 // syntaxHighlighter: (( Highlighter from @nlux/highlighter )), // default: undefined — for code blocks syntax highlighting
//                 showCodeBlockCopyButton: true,                           // default: true — for code blocks
//                 // skipStreamingAnimation?: boolean,                            // default: false
//                 streamingAnimationSpeed: 2,                            // default: 10 ( milliseconds )
//                 // waitTimeBeforeStreamCompletion?: number | 'never',           // default: 2000 ( milliseconds )
//                 onComplete: () => {
//                     // let msgElement = document.querySelector(`#msg-key-${request.msgId}`);
//                     // msgElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
//                     //console.log("Parsing complete");
//                 },           // triggered after the end of the stream
//             };

//             if (!assistantMsgElement){
//                 assistantMsgElement = document.createElement('div');
//                 assistantMsgElement.id = `msg-key-${request.msgId}`;
//                 assistantMsgElement.classList.add('chat-message');
//                 assistantMsgElement.classList.add('assistant-message');
//                 chatLog.appendChild(assistantMsgElement);
//             }

//             mdStreamParser = mmd.createMarkdownStreamParser(
//                 assistantMsgElement,
//                 options,
//             );

//         }

//         try{
//             mdStreamParser.next(message);
//         }catch{}

//         if (isDone){
//             mdStreamParser.complete();
//         } 

//         if (assistantMsgElement){
//             assistantMsgElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
//         }
        
//     }
// });

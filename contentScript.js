// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === 'simple-chat'){
//         chrome.windows.create({
//             url: 'chatPopup.html',
//             type: 'popup',
//             width: "80%",
//             height: "80%"
//         });
//     }
// });

function getSelectedContent() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const clonedContent = range.cloneContents();
        
        const allContent = [];
        
        // Get text nodes, image, and video elements from the cloned content
        const walker = document.createTreeWalker(clonedContent, NodeFilter.SHOW_ALL, null, false);
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    allContent.push({ type: 'text', content: text });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
                const imgUrl = node.src;
                allContent.push({ type: 'image', url: imgUrl });
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'VIDEO') {
                const videoUrl = node.src;
                allContent.push({ type: 'video', url: videoUrl });
            }
        }

        return allContent;
    }

    return [];
}

function contentToString(contentArray) {
    let result = '';

    contentArray.forEach((item) => {
        if (item.type === 'text') {
            result += `${item.content}\n`;
        } else if (item.type === 'image') {
            result += `${item.url}\n`;
        } else if (item.type === 'video') {
            result += `${item.url}\n`;
        }
    });

    return result;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'getSelectedContent') {
        const selectedContent = contentToString(getSelectedContent());
        sendResponse({ selectedContent });
    }
});

function generateRandomGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

function chatLogStorageKey(tabId){
  return `chatlog-${tabId}`;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sendMessage") {
    const message = request.message;
    
    let chatLogKey = chatLogStorageKey(request.tabId);

    chrome.storage.local.get([chatLogKey], (result) => {
      const chatLog = result[chatLogKey] || [];
      chatLog.push({ role: "user", content: message });

      chrome.storage.local.set({[chatLogKey] : chatLog}, (result) =>
      {
        chrome.tabs.sendMessage(request.tabId, { action: "addUserMessage", msgId: generateRandomGuid(), message }).then(()=>{
          sendChatRequest(request.tabId, chatLog);
        });
      });
    }); 
  }
});

// Send a chat request to the OpenAI API
function sendChatRequest(tabId, chatLog) {

  chrome.tabs.sendMessage(tabId, {
    action: "display-loading-status",
    isShow: true,
    //message: `<span class="inline-block h-1.5 w-1.5 rounded-full bg-blue-600"></span>Hi, give me a sec...`
  }, ()=>{

    chrome.storage.sync.get([
      'completionProvider',
      'groqApiUrl', 'groqApiKey', 'groqModelName', 'groqTemperature', 'groqMaxToken', 
      'openAiApiUrl', 'openAiApiKey', 'openAiModelName', 'openAiTemperature', 'openAiMaxToken',
      'deepSeekApiUrl', 'deepSeekApiKey', 'deepSeekModelName', 'deepSeekTemperature', 'deepSeekMaxToken'
    ], (items) => {
      const completionProvider = items.completionProvider || 'groq';
      
      let apiUrl = "";
      let apiKey = "";
      let modelName = "";
      let temperature = 0;
      let maxToken = 0;

      switch (completionProvider){
        case "groq":
          apiUrl = items.groqApiUrl;
          apiKey = items.groqApiKey;
          modelName = items.groqModelName;
          temperature = (items.groqTemperature || 0);
          maxToken = (items.groqMaxToken || 8192);
          break;
        case "openai":
          apiUrl = items.openAiApiUrl;
          apiKey = items.openAiApiKey;
          modelName = items.openAiModelName;
          temperature = (items.openAiTemperature || 0);
          maxToken = (items.openAiMaxToken || 4096);
          break;
        case "deepseek":
          apiUrl = items.deepSeekApiUrl;
          apiKey = items.deepSeekApiKey;
          modelName = items.deepSeekModelName;
          temperature = (items.deepSeekTemperature || 0);
          maxToken = (items.deepSeekMaxToken || 8192);
          break;
      }

      if (!apiUrl || !apiKey || !modelName) {
        //console.error("API URL or API Key or Model Name not configured.");
        sendResponse({ error: "API not configured" });
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      const data = {
        model: modelName,
        stream: false,
        temperature: temperature,
        max_tokens: maxToken, 
        messages: chatLog,
      };
      fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })
      .then(response => response.json())
      .then(data => {
        let isFirst = true;
        let msgId = generateRandomGuid();
    
        console.log("API Response:", data); 
    
        if (data.choices && data.choices[0] && data.choices[0].message) {
          msg = data.choices[0].message.content;
    
          //console.log(msg);
          // requestObj.messages.push({
          //   role: "assistant",
          //   content: msg
          // });
    
          chatLog.push({ role: "assistant", content: msg });
    
          let chatLogKey = chatLogStorageKey(tabId);
          chrome.storage.local.set({[chatLogKey] : chatLog}, (result) =>
          {
            console.log(chatLog);
            chrome.tabs.sendMessage(tabId, { action: "addAssistantMessage", msgId: msgId, isFirst: isFirst, isDone : true, message: msg }, ()=>{
              generateSuggestQuestions(tabId, 2);
            });
          });
    
          // setTabItems(sender.tab.id, {
          //   defaultMessages: defaultMessages,
          //   lastSelectedCommand: request.type,
          //   chatMessages: requestObj.messages
          // }, ()=>{
          //   sendResponse({ result: msg });
          // });
        } else {
          let msg = data.error.message;
          
          const errorMsgId = generateRandomGuid();
          chrome.tabs.sendMessage(tabId, {
              action: "addAssistantMessage",
              msgId: errorMsgId,
              isError: true,
              message: msg
          });
    
          return true; 
        }
      })
      //.then((response) => response.body.getReader())
      // .then((reader) => {
      //     let isFirst = true;
      //     let msgId = generateRandomGuid();
      //     const readChunk = () => {
      //       reader.read().then(({ done, value }) => {
      //         if (done) {
      //           return;
      //         }
    
      //         const chunk = new TextDecoder("utf-8").decode(value); // convert Uint8Array to string
              
      //         try{
      //           var msgObj = JSON.parse(chunk);
    
      //           if (msgObj?.error != null && typeof msgObj?.error != 'undefined'){
      //             console.error("Error:", msgObj?.error); // Log the error for debugging
      //             let detailedErrorMessage = msgObj.error.message || "Unknown error";
              
      //             // Send an error message to indicate that the API call failed
      //             const errorMsgId = generateRandomGuid();
      //             chrome.runtime.sendMessage({
      //                 action: "streamMessage",
      //                 msgId: errorMsgId,
      //                 isError: true,
      //                 message: detailedErrorMessage
      //             });
                  
      //             return;
      //           }
      //         }catch{}
              
      //         const jsonChunks = chunk.split("\n"); // split into individual JSON objects
      //         let assistantAnswer = "";
    
      //         jsonChunks.forEach((jsonChunk) => {
      //           if (jsonChunk) { // ignore empty strings
      //             const jsonData = jsonChunk.replace(/^data: /, ''); // remove "data: " prefix
      //             if (jsonData && !jsonData.startsWith('[DONE]')) {
      //               let chunkData;
      //               try{
      //                 chunkData = JSON.parse(jsonData);
      //               }catch{}
    
      //               if (chunkData.choices && chunkData.choices[0].delta) {
      //                 let message = "";
                      
      //                 try{
      //                   message = chunkData.choices[0].delta.content || "";
      //                 }catch{}
    
      //                 assistantAnswer += message;
    
      //                 chrome.runtime.sendMessage({ action: "streamMessage", msgId: msgId, isFirst: isFirst, isDone : false, message });
    
      //                 isFirst = false;
    
      //                 // marked.setOptions({
      //                 //     sanitize: true,
      //                 //     gfm: true,
      //                 //     tables: true,
      //                 //     breaks: false // Enable GFM line breaks
      //                 // });
                    
      //                 // if (message){
      //                 //     const htmlContent = marked.parse(message);
    
      //                 //     chrome.runtime.sendMessage({ action: "streamMessage", msgId: msgId, htmlContent });
      //                 // }                    
      //               }
      //             }
      //             else{
      //                 chrome.runtime.sendMessage({ action: "streamMessage", msgId: msgId, isDone : true });
      //                 chatLog.push({ role: "assistant", content: assistantAnswer });
      //             }
      //           }
      //         });
      //         readChunk();
      //       });
      //     };
      //     //readChunk();
    
      //     chrome.runtime.sendMessage({ action: "streamMessage", msgId: msgId, isFirst: isFirst, isDone : true, message });
      //     chatLog.push({ role: "assistant", content: assistantAnswer });
      //   })
      .catch((error) => {
        console.error("Error:", error); // Log the error for debugging
    
        // Create a detailed error message
        const detailedErrorMessage = `An error occurred: ${error.message || "Unknown error"}. Please try again.`;
    
        // Send an error message to indicate that the API call failed
        const errorMsgId = generateRandomGuid();
        chrome.tabs.sendMessage(tabId, {
            action: "addAssistantMessage",
            msgId: errorMsgId,
            isError: true,
            message: detailedErrorMessage
        });
      })
      .finally(()=>{
        chrome.tabs.sendMessage(tabId, {
          action: "display-loading-status",
          isShow: false
        });
      });
    });
  });
}

function parseEmbeddedJSON(text) {
  try {
    // Match JSON structure: starts with `{` and ends with `}`
    const jsonMatch = text.match(/{.*}/s);

    if (jsonMatch) {
      // Parse the JSON content
      const jsonString = jsonMatch[0];
      return JSON.parse(jsonString);

    } else {
      return {};
      //throw new Error("No JSON structure found in text.");
    }
  } catch (error) {
    //console.error("Error parsing embedded JSON:", error);
    //return null;
    return {};
  }
}

function generateSuggestQuestions(tabId, nbrOfQuestions){
  let chatLogKey = chatLogStorageKey(tabId);
  chrome.storage.local.get([chatLogKey], (result) => {
    const chatLog = result[chatLogKey] || [];

    chrome.storage.sync.get([
      'completionProvider',
      'groqApiUrl', 'groqApiKey', 'groqModelName', 'groqTemperature', 'groqMaxToken', 
      'openAiApiUrl', 'openAiApiKey', 'openAiModelName', 'openAiTemperature', 'openAiMaxToken',
      'deepSeekApiUrl', 'deepSeekApiKey', 'deepSeekModelName', 'deepSeekTemperature', 'deepSeekMaxToken'
    ], (items) => {
      const completionProvider = items.completionProvider || 'groq';
      
      let apiUrl = "";
      let apiKey = "";
      let modelName = "";
      let temperature = 0;
      let maxToken = 0;

      switch (completionProvider){
        case "groq":
          apiUrl = items.groqApiUrl;
          apiKey = items.groqApiKey;
          modelName = items.groqModelName;
          temperature = (items.groqTemperature || 0);
          maxToken = (items.groqMaxToken || 8192);
          break;
        case "openai":
          apiUrl = items.openAiApiUrl;
          apiKey = items.openAiApiKey;
          modelName = items.openAiModelName;
          temperature = (items.openAiTemperature || 0);
          maxToken = (items.openAiMaxToken || 4096);
          break;
        case "deepseek":
          apiUrl = items.deepSeekApiUrl;
          apiKey = items.deepSeekApiKey;
          modelName = items.deepSeekModelName;
          temperature = (items.deepSeekTemperature || 0);
          maxToken = (items.deepSeekMaxToken || 8192);
          break;
      }

      if (!apiUrl || !apiKey || !modelName) {
        //console.error("API URL or API Key or Model Name not configured.");
        sendResponse({ error: "API not configured" });
        return;
      }
    
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
  
      var messages =[{content: `Based on the conversation between the user and the AI Assistant below, as user's role, please suggest 2 short valuable questions to AI Assistant ${nbrOfQuestions} to continue the conversation. 
        Respond to me in the following JSON format: {"questions": ["question 1", "question 2"]}. Here is the conversation:\n${JSON.stringify(chatLog)}`, role: "user"}];
    
      const data = {
        model: modelName,
        stream: false,
        temperature: 0.7,
        max_tokens: maxToken, 
        messages: messages
      };
      fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })
      .then(response => response.json())
      .then(data => {
        let isFirst = true;
        let msgId = generateRandomGuid();
    
        console.log("API Response:", data); 
    
        if (data.choices && data.choices[0] && data.choices[0].message) {
          msg = data.choices[0].message.content;
  
          let questions = parseEmbeddedJSON(msg)?.questions || [];
          
          chrome.tabs.sendMessage(tabId, { action: "addSuggestionQuestions", msgId: msgId, questions: questions });
    
        } else {
          let msg = data.error.message;      
          return true; 
        }
      })
      .catch((error) => {
        console.error("Error:", error); // Log the error for debugging
  
        // Create a detailed error message
        const detailedErrorMessage = `An error occurred: ${error.message || "Unknown error"}. Please try again.`;
  
        // Send an error message to indicate that the API call failed
        const errorMsgId = generateRandomGuid();
        chrome.tabs.sendMessage(tabId, {
            action: "addAssistantMessage",
            msgId: errorMsgId,
            isError: true,
            message: detailedErrorMessage
        });
      });
    });    
  }); 

}

chrome.contextMenus.removeAll();

chrome.contextMenus.create({
  id: "ask-image",
  title: "🖼️ Ask about this image",
  contexts: ["image"]
});

// Create context menu items
chrome.contextMenus.create({
  id: "new-chat",
  title: "☀️ New Chat",
  //contexts: ["all"]
  contexts: ["all"]
});

chrome.contextMenus.create({
  id: "ask-selection-text",
  title: "🌷 Ask selection text",
  //contexts: ["all"]
  contexts: ["selection"]
});

 // separates here...
chrome.contextMenus.create({
  id: 's',
  title: 'Separator',
  type: "separator",
  contexts: ['selection'],
});

chrome.contextMenus.create({
  id: "summarize",
  title: "✨ Summarize Selection",
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: "translate",
  title: "🌏 Translate Selection",
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: "correct-english",
  title: "👌 Correct English",
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: "teach-me",
  title: "🎓 Teach Me This",
  contexts: ["selection"]
});

//let currentTabId;

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'getSelectedContent' }, function(response) {
    //const selectionText = info.selectionText;

    let selectionText = response?.selectedContent || ( info.selectionText || "");

    // console.log(selectionText);

    chrome.windows.getAll({populate: true}, function(windows) {
      chrome.tabs.query({}, function(tabs){
        let chatLog = [];
        var screenWidth = windows[0].width;
        var screenHeight = windows[0].height;
  
        let foundTab = false;
          // for (const tab of tabs) {
          //   if (tab.id === currentTabId) {
          //     chrome.windows.update(tab.windowId, { focused: true }).then(function(){
          //       chatLog.push({ role: "user", content: selectionText });
  
          //       chrome.tabs.sendMessage(currentTabId, {
          //         action: "addUserMessage",
          //         msgId: generateRandomGuid(),
          //         message: selectionText
          //       }, sendChatRequest(chatLog));
  
          //       foundTab = true;
          //     });
  
          //     return;
          //   }
          // }
  
          if (!foundTab){
            chrome.windows.create({
              url: "chatPopup.html",
              type: "popup",
              width: Math.floor(screenWidth * 0.8), // 80% of screen width
              height: Math.floor(screenHeight * 0.8), // 60% of screen height
              left: Math.floor(screenWidth * 0.1), // 10% from left edge
              top: Math.floor(screenHeight * 0.1) // 20% from top edge
            }, function(window) {
              //currentTabId = window.tabs[0].id;
              
              chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                let messageSent = false;
                let chatLogKey = chatLogStorageKey(tabId);

                if (tabId === window.tabs[0].id && changeInfo.status === 'complete') {
  
                  chrome.storage.sync.get([
                    'completionProvider',
                    'groqApiUrl', 'groqApiKey', 'groqModelName', 'groqTemperature', 'groqMaxToken', 
                    'openAiApiUrl', 'openAiApiKey', 'openAiModelName', 'openAiTemperature', 'openAiMaxToken',
                    'deepSeekApiUrl', 'deepSeekApiKey', 'deepSeekModelName', 'deepSeekTemperature', 'deepSeekMaxToken'
                  ], (items) => {
                    const completionProvider = items.completionProvider || 'groq';

                    switch (info.menuItemId){
                      case 'ask-image':
                        selectionText =  ``;

                        if (completionProvider === 'openai'){
                          chatLog.push({ role: "user", content: [
                            {
                              "type": "image_url",
                              "image_url": {
                                "url": info.srcUrl
                              }
                            }
                          ]});
                        }
                        else{
                          
                        }
                        
                        chrome.storage.local.set({[chatLogKey] : chatLog}, (result) =>
                        {
                          chrome.tabs.sendMessage(window.tabs[0].id, {
                            action: "addUserMessage",
                            msgId: generateRandomGuid(),
                            message: completionProvider === 'openai' ? info.srcUrl : "",
                            isAskImage: true
                          });
                          
                          //sendChatRequest(tabId, chatLog);
                        });
                      break;
  
                      case 'new-chat':
                      case 'ask-selection-text':
                        chatLog.push({ role: "user", content: selectionText || '' });
                        chrome.storage.local.set({[chatLogKey] : chatLog}, (result) =>
                        {
                          chrome.tabs.sendMessage(window.tabs[0].id, {
                            action: "addUserMessage",
                            msgId: generateRandomGuid(),
                            message: selectionText
                          });                   
                        });
                        break;
        
                      case 'summarize':
                        if (selectionText != null && typeof selectionText != "undefined" && selectionText != ""){
                      
                          chatLog.push({
                            role: "system",
                            content: `You are a helpful AI assistant`
                          });
          
                          chatLog.push({
                            role: "user",
                            content: `Bạn có thể vui lòng cung cấp một bản tóm tắt ngắn gọn và đầy đủ về văn bản đã cho không? 
                            - Phần tóm tắt phải nắm bắt được những điểm chính, chi tiết chính của văn bản đồng thời truyền tải chính xác ý muốn của tác giả. 
                            - Hãy đảm bảo rằng phần tóm tắt được tổ chức tốt và dễ đọc, có tiêu đề các điểm chính và tiêu đề phụ chi tiết bổ sung rõ ràng để hướng dẫn người đọc qua từng phần. 
                            - Bao gồm một hoặc hai trích dẫn quan trọng từ tài liệu để minh họa các điểm chính hoặc làm nổi bật thông tin quan trọng.
                            - Độ dài của phần tóm tắt phải phù hợp để nắm bắt được những điểm chính và chi tiết chính của văn bản, không đưa vào những thông tin không thật sự cần thiết. 
                            - Chỉ tóm tắt theo nội dung được cung cấp, không bịa đặt.
                            - Nếu không có yêu cầu đặc biệt, hãy trả lời bằng ngôn ngữ của câu hỏi mà bạn nhận được
                            - Câu trả lời phải là định dạng Markdown, có tiêu đề lớn mô tả nội dung, được đặt vào thẻ h2`
                          });
          
                          chatLog.push({
                            role: "user",
                            content: `Dưới đây là nội dung cần tóm tắt (You must always answer in Vietnamese (unless otherwise requested)):\n${selectionText}`
                          });
          
                          sendChatRequest(tabId, chatLog);
                        }
                        break;
    
                        case 'summarize':
                        if (selectionText != null && typeof selectionText != "undefined" && selectionText != ""){
                      
                          chatLog.push({
                            role: "system",
                            content: `You are a helpful AI assistant`
                          });
          
                          chatLog.push({
                            role: "user",
                            content: `Bạn có thể vui lòng cung cấp một bản tóm tắt ngắn gọn và đầy đủ về văn bản đã cho không? 
                            - Phần tóm tắt phải nắm bắt được những điểm chính, chi tiết chính của văn bản đồng thời truyền tải chính xác ý muốn của tác giả. 
                            - Hãy đảm bảo rằng phần tóm tắt được tổ chức tốt và dễ đọc, có tiêu đề các điểm chính và tiêu đề phụ chi tiết bổ sung rõ ràng để hướng dẫn người đọc qua từng phần. 
                            - Bao gồm một hoặc hai trích dẫn quan trọng từ tài liệu để minh họa các điểm chính hoặc làm nổi bật thông tin quan trọng.
                            - Độ dài của phần tóm tắt phải phù hợp để nắm bắt được những điểm chính và chi tiết chính của văn bản, không đưa vào những thông tin không thật sự cần thiết. 
                            - Chỉ tóm tắt theo nội dung được cung cấp, không bịa đặt.
                            - Nếu không có yêu cầu đặc biệt, hãy trả lời bằng ngôn ngữ của câu hỏi mà bạn nhận được
                            - Câu trả lời phải là định dạng Markdown, có tiêu đề lớn mô tả nội dung, được đặt vào thẻ h2`
                          });
          
                          chatLog.push({
                            role: "user",
                            content: `Dưới đây là nội dung cần tóm tắt (You must always answer in Vietnamese (unless otherwise requested)):\n${selectionText}`
                          });
          
                          sendChatRequest(tabId, chatLog);
                        }
                        break;
    
                        case 'translate':
                          chatLog.push({
                            role: "system",
                            content: `You are a helpful AI assistant`
                          });
            
                          chatLog.push({
                            role: "user",
                            content: `Bạn sẽ được đưa 1 câu văn hoặc đoạn văn bên dưới, hãy dịch nội dung sang tiếng Việt, ngược lại, nếu nội dung được cho là tiếng Việt thì dịch sang tiếng Anh.
            YÊU CẦU KHI DỊCH:
            - Nếu là code hoặc chứa code thì giữ nguyên phần code - không dịch phần code.
            - Phát hiện chủ đề, chuyên ngành của nội dung cần dịch và dịch theo đúng chuyên ngành, ví dụ chuyên ngành công nghệ thông tin, lập trình, trí tuệ nhân tạo, AI, machine learning, LLM (ngôn ngữ lớn), thời trang, kiến trúc...
            - Những từ hoặc cụm từ thuộc chuyên ngành thì không cần dịch, vì nếu dịch có thể rất tối nghĩa (nên cố gắng giải thích ý nghĩa ngắn gọn trong ngoặc đơn), ví dụ "fine-tuning" (tinh chỉnh)
            - Văn phong tốt, diễn đạt trôi chảy, liền mạch, thể hiện sự thông thạo ngôn ngữ của người bản địa, dựa dựa ngôn ngữ và văn hóa của người Việt Nam, tôn trọng sự giàu đẹp của tiếng Việt
            - Bản dịch phải rõ ràng các từ, cụm từ viết tắt của bản gốc.
            - Nếu không có yêu cầu đặc biệt, hãy trả lời bằng ngôn ngữ của câu hỏi mà bạn nhận được
            - Câu trả lời phải là định dạng Markdown
            - Chỉ trả lời kết quả, đừng thêm những câu ở đầu như: 'Here is the translation:', 'Here is the translated content:'...."
            `
            
            /*
            - Chỉ dịch và không tự ý thêm thông tin gì, nhưng nên có 1 bảng tóm tắt giải thích các từ vựng, loại từ, phiên âm IPA UK/US ở dưới cùng cùng với tên chuyên ngành. 
            
            ### Kết quả dịch
            - Hiển thị cả bản gốc và bản dịch (nếu câu cần dịch quá dài thì chỉ hiển thị bản dịch)
            - Format đoạn văn để tăng tính nhận diện, dễ đọc, dễ thấy
            
            ### Thông tin bổ sung
            **Phát âm:**
            - Phiên âm: Cung cấp phiên âm IPA để người học biết cách phát âm chính xác.
            
            **Ngữ pháp và từ loại:**
            - Từ loại: Hiển thị từ loại của từ đó (danh từ, động từ, tính từ, trạng từ, v.v.).
            - Hình thái từ: Bao gồm các dạng khác của từ đó (dạng số nhiều, dạng quá khứ, phân từ, v.v.).
            
            **Định nghĩa:**
            - Định nghĩa chi tiết: Cung cấp định nghĩa chi tiết của từ trong ngữ cảnh tiếng Anh.
            - Định nghĩa đơn giản: Định nghĩa dễ hiểu hoặc phổ biến hơn cho người mới học.
            
            **Ví dụ câu:**
            - Câu ví dụ: Cung cấp câu ví dụ để minh họa cách sử dụng từ đó trong ngữ cảnh.
            - Dịch câu ví dụ: Dịch các câu ví dụ sang ngôn ngữ của người học để họ hiểu rõ hơn.
            
            **Ngữ cảnh và từ đồng nghĩa/đối nghĩa:**
            - Ngữ cảnh: Giải thích các ngữ cảnh khác nhau mà từ đó có thể được sử dụng.
            - Từ đồng nghĩa và từ trái nghĩa: Cung cấp danh sách các từ đồng nghĩa và từ trái nghĩa để mở rộng vốn từ vựng.
            
            **Cụm từ liên quan và thành ngữ:**
            - Cụm từ liên quan: Các cụm từ hoặc collocations phổ biến liên quan đến từ đó.
            - Thành ngữ: Các thành ngữ hoặc idioms chứa từ đó.
            
            **Ghi chú văn hóa và sử dụng đặc biệt:**
            - Ghi chú văn hóa: Giải thích các khác biệt văn hóa hoặc các cách sử dụng đặc biệt của từ trong các ngữ cảnh khác nhau.
            - Phong cách sử dụng: Chỉ rõ xem từ đó là trang trọng, thân mật, chuyên ngành hay thông dụng.
            */
            
                          });
    
                          chatLog.push({
                            role: "user",
                            content: `You must always respond in Vietnamese (unless otherwise requested)`
                          });
                          
                          chatLog.push({
                            role: "user",
                            content: `OK, dưới đây là nội dung cần dịch:\n${selectionText}`
                          });
    
                          sendChatRequest(tabId, chatLog);
                          break;
    
                          case 'correct-english':
                            chatLog.push({
                              role: "system",
                              content: `You are a helpful AI assistant`
                            });
                
                            chatLog.push({
                              role: "user",
                              content: `Bạn sẽ đóng vai là một chuyên gia về ngôn ngữ, có hiểu biết sâu sắc văn hóa bản địa, đặc biệt là tiếng Anh và tiếng Việt, bạn sẽ giúp sửa lỗi tiếng Anh.
                - Câu trả lời phải là định dạng markdown
                - Đừng đưa ra những câu "introduce prompt words or opening remarks" trong câu trả lời. Hãy đi thẳng vào câu trả lời. Đừng lan man, dài dòng.
                - Nếu không có yêu cầu đặc biệt, hãy trả lời bằng ngôn ngữ của câu hỏi mà bạn nhận được
                - Từ hoặc câu văn sau khi đã sửa chính xác (ngôn ngữ của câu đã sửa là ngôn ngữ của câu được yêu cầu sửa), ví dụ, bạn được yêu cầu sửa 1 câu tiếng Anh, thì bạn phải trả lời lại 1 câu tiếng Anh đã sửa hoàn chỉnh.
                - markdown format, bôi đậm những chỗ đã sửa để highlight, phần giải thích nên được tổ chức tốt, dễ đọc, có outline...
                - Nếu câu văn không có lỗi gì, thì chỉ cần nói là không có lỗi, đừng cố bịa ra câu trả lời.`});
                
                // ### Thông tin bổ sung
                // **Giải thích lỗi và sửa lỗi:**
                // - Mô tả lỗi: Giải thích ngắn gọn lỗi mà người học đã mắc phải (ví dụ: sai ngữ pháp, sai chính tả, sử dụng từ không chính xác, v.v.).
                // - Nguyên nhân phổ biến: Cung cấp thông tin về lý do tại sao lỗi này thường xảy ra và làm sao để tránh nó.
                // - Cách sửa: Cung cấp giải pháp cụ thể để sửa lỗi.
                // - Ví dụ đúng: Cung cấp ví dụ minh họa cách sử dụng đúng.
                
                // **Quy tắc ngữ pháp liên quan:**
                // - Quy tắc ngữ pháp: Cung cấp quy tắc ngữ pháp liên quan đến lỗi để người học có thể nắm rõ hơn.
                // - Ghi chú ngữ pháp: Giải thích chi tiết hơn về các quy tắc ngữ pháp phức tạp nếu cần.
                
                            chatLog.push({
                              role: "user",
                              content: `You must always answer in Vietnamese, unless otherwise is requested.`
                            });
                
                            chatLog.push({
                              role: "user",
                              content: `OK, dưới đây là câu cần sửa (just correct English grammar, don't translate it):\n${selectionText}`
                            });
    
                            sendChatRequest(tabId, chatLog);
                            break;
    
                            case 'teach-me':
                              chatLog.push({
                                role: "system",
                                content: `You are a knowledgeable and engaging teacher. 
                                Your goal is to educate the user about various topics they might be interested in.
                                Make sure the content is well-organized and easy to read, with clear main headings and subheadings that provide detailed supplementary information to guide learners through each section, making it easy for them to follow along. 
                                Provide clear explanations, examples, and answer any questions the user may have. 
                                Make sure to break down complex concepts into simpler terms and relate them to real-world applications when possible.               
                                Be patient, encouraging, and responsive to the user's level of understanding. 
                                Adapt your teaching style based on the user's feedback and engagement. 
                                Always strive to make learning enjoyable and accessible.
                                IMPORTANT: Be honest, don't make things up.
                                IMPORTANT: You must always answer in Vietnamese, unless otherwise is requested.`
                              });
                  
                              chatLog.push({
                                role: "user",
                                content: `OK, please teach me this (always answer me in Vietnamese please from now):\n${selectionText}`
                              });
    
                              sendChatRequest(tabId, chatLog);
                              break;
                    } 
                  });                  
                }
  
                messageSent = true;
              });                       
            });
          }
  
      });
    });
  });
});
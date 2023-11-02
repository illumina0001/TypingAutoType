document.getElementById("startTyping").addEventListener("click", function() {
    const xpath = document.getElementById("xpathInput").value;
    const delay = parseInt(document.getElementById("delayInput").value) || 100;
    executeTyping(xpath, delay);
});

document.getElementById("startPredefinedTyping").addEventListener("click", function() {
    const predefinedXpath = "/html/body/div[2]/div/main/div/div[1]/div/div/div[2]/div[2]/div[1]/div/div/div";
    const delay = parseInt(document.getElementById("delayInput").value) || 100;
    executeTyping(predefinedXpath, delay);
});

function executeTyping(xpath, delay) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const tabId = tabs[0].id;

        // Extract text from XPath
        chrome.scripting.executeScript({
            target: {tabId: tabId},
            func: extractTextFromXPath,
            args: [xpath]
        }, function(results) {
            const combinedWords = results[0].result;
            if (combinedWords) {  // Only attempt typing if there's text extracted
                chrome.debugger.attach({tabId: tabId}, '1.2', function() {
                    typeText(tabId, combinedWords, 0, delay);
                });
            }
        });
    });
}
function extractTextFromXPath(xpath) {
    let element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

    if (!element) {
        console.error("Element not found using the provided XPath.");
        return '';
    } else {
        let wordDivs = element.querySelectorAll('.screenBasic-word');
        let words = [];
    
        wordDivs.forEach(wordDiv => {
            let letters = wordDiv.querySelectorAll('.letter');
            let word = '';
            letters.forEach(letter => {
                word += letter.textContent;
            });
            words.push(word.trim());
        });
        let combinedWords = words.join(' ');

        // Log the extracted text to the console
        console.log("Text to type:", combinedWords);

        return combinedWords; // Return the combinedWords
    }
}

// ... [Rest of the typing function remains the same]


function typeText(tabId, combinedWords, index, delay) {
    if (index >= combinedWords.length) {
        chrome.debugger.detach({tabId: tabId});
        return;
    }

    const charToType = combinedWords[index];
    let dispatchArgs;

    if (charToType === ' ') { // If the character is a space
        dispatchArgs = {
            type: 'keyDown',
            windowsVirtualKeyCode: 32,
            nativeVirtualKeyCode: 32,
            key: ' '
        };
    } else {
        dispatchArgs = {
            type: 'char',
            text: charToType
        };
    }

    chrome.debugger.sendCommand({tabId: tabId}, 'Input.dispatchKeyEvent', dispatchArgs, function() {
        if (charToType === ' ') { // If the character was a space, send the keyUp event
            chrome.debugger.sendCommand({tabId: tabId}, 'Input.dispatchKeyEvent', {
                type: 'keyUp',
                windowsVirtualKeyCode: 32,
                nativeVirtualKeyCode: 32,
                key: ' '
            }, function() {
                setTimeout(() => {
                    typeText(tabId, combinedWords, index + 1, delay);
                }, delay);
            });
        } else { // If the character wasn't a space, just continue
            setTimeout(() => {
                typeText(tabId, combinedWords, index + 1, delay);
            }, delay);
        }
    });
}


document.addEventListener('mouseup', (event) => {
  const selection = window.getSelection();
  const highlightedText = selection.toString().trim();

  if (highlightedText.length > 0) {
    const range = selection.getRangeAt(0);
    const parentElement = range.startContainer.parentElement;
    const paragraphContext = parentElement.closest('p, div, article')?.innerText || "";

    createFloatingButton(event.pageX, event.pageY, highlightedText, paragraphContext);
  }
});

function createFloatingButton(x, y, text, context) {
  removeFloatingButton();

  const btn = document.createElement('button');
  btn.id = 'tool-it-floating-btn';
  btn.innerText = 'Tool-It';
  
  btn.style.position = 'absolute';
  btn.style.zIndex = '999999';
  btn.style.left = `${x + 5}px`;
  btn.style.top = `${y - 35}px`; 

  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ 
        action: "openSidePanel",
        text: text,
        context: context
      });
    }

    removeFloatingButton();

    window.getSelection().empty();
  });

  document.body.appendChild(btn);
}

function removeFloatingButton() {
  const existingBtn = document.getElementById('tool-it-floating-btn');
  if (existingBtn) existingBtn.remove();
}

document.addEventListener('mousedown', (e) => {
  if (e.target.id !== 'tool-it-floating-btn') {
    removeFloatingButton();
  }
});
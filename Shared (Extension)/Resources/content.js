(() => {
  const getPageTitle = async (defaultFilename) => {
    let pageTitle = document.title;
    if (pageTitle) return pageTitle;

    try {
      pageTitle = await new Promise((resolve) => {
        const headElement = document.querySelector('head');
        if (!headElement) {
          resolve('');
          return;
        }

        const observer = new MutationObserver((mutations, obs) => {
          const titleElement = document.querySelector('title');
          if (titleElement && document.title) {
            obs.disconnect();
            resolve(document.title);
          }
        });

        observer.observe(headElement, { childList: true, subtree: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(document.title || defaultFilename);
        }, 3000);
      });

      return pageTitle;
    } catch (error) {
      console.error('Failed to get page title:', error);
      return defaultFilename;
    }
  };
  
  const sanitizeFileName = (str, defaultFilename, maxLength = 80) => {
    if (!str) return defaultFilename;
    
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;

    let sanitized = str
      .replace(/[<>:"/\\|?*]+/g, '_')
      .replace(/[\0-\x1F\x7F]/g, '')
      .replace(/\.{2,}/g, '.')
      .replace(/^[\.\- ]+|[.\- ]+$/g, '')
      .normalize('NFKC')
      .slice(0, maxLength);

    if (reservedNames.test(sanitized)) {
      sanitized = '_' + sanitized;
    }

    if (!sanitized || sanitized === '.' || sanitized === '..') {
      sanitized = defaultFilename;
    }

    return sanitized;
  };
  
  const getCurrentTimestamp = () => {
    const now = new Date();
    const langCode = window.navigator.language || 'en-US';
    const formatter = new Intl.DateTimeFormat(langCode, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const dateTime = {};
    parts.forEach(({ type, value }) => {
      dateTime[type] = value;
    });

    return `${dateTime.year}${dateTime.month}${dateTime.day}${dateTime.hour}${dateTime.minute}${dateTime.second}`;
  };

  const findMainContent = () => {
    const viewportHeight = window.innerHeight;
    const tallContainers = Array.from(document.body.querySelectorAll('div, article, section, main, td'))
      .map(el => {
        const rect = el.getBoundingClientRect();
        return {
          element: el,
          height: rect.height
        };
      })
      .filter(item => item.height > viewportHeight * 0.5)
      .sort((a, b) => b.height - a.height);

    const evaluateContainer = (container) => {
      const candidates = [];
      
      const evaluateNode = (node, depth = 0) => {
        if (depth > 5) return;
        
        let textContent = '';
        let textNodesCount = 0;
        let meaningfulTextNodes = 0;
        
        const walkTextNodes = (element) => {
          if (element.nodeType === Node.TEXT_NODE) {
            const text = element.textContent.trim();
            if (text.length > 0) {
              textContent += text + ' ';
              textNodesCount++;
              if (text.length > 15) {
                meaningfulTextNodes++;
              }
            }
          } else if (element.nodeType === Node.ELEMENT_NODE) {
            const tagName = element.tagName.toLowerCase();
            if (['script', 'style', 'nav', 'header', 'footer'].includes(tagName)) {
              return;
            }
            
            // 子要素を処理
            for (let i = 0; i < element.childNodes.length; i++) {
              walkTextNodes(element.childNodes[i]);
            }
          }
        };
        
        walkTextNodes(node);
        
        const directParagraphs = Array.from(node.children)
          .filter(child => child.tagName.toLowerCase() === 'p' && child.textContent.trim().length > 30);
          
        let maxConsecutiveParagraphs = 0;
        let currentConsecutive = 0;
        
        Array.from(node.children).forEach(child => {
          if (child.tagName.toLowerCase() === 'p' && child.textContent.trim().length > 30) {
            currentConsecutive++;
            maxConsecutiveParagraphs = Math.max(maxConsecutiveParagraphs, currentConsecutive);
          } else {
            currentConsecutive = 0;
          }
        });
        
        const textDensity = textContent.length / (node.innerHTML.length || 1);
        const textScore = textContent.length * 0.1;
        const textNodesScore = meaningfulTextNodes * 10;
        
        const paragraphScore = directParagraphs.length * 15;
        const consecutiveScore = maxConsecutiveParagraphs * 25;
        
        const totalScore = paragraphScore + consecutiveScore + textScore + textNodesScore;
        
        if (textContent.length > 100 || directParagraphs.length > 0) {
          candidates.push({
            element: node,
            totalParagraphs: directParagraphs.length,
            maxConsecutiveParagraphs,
            textLength: textContent.length,
            meaningfulTextNodes,
            textDensity,
            totalScore,
            depth: getElementDepth(node)
          });
        }
        
        Array.from(node.children).forEach(child => evaluateNode(child, depth + 1));
      };
      
      evaluateNode(container.element);
      return candidates;
    };
    
    const getElementDepth = (element) => {
      let depth = 0;
      let current = element;
      while (current !== document.body && current.parentElement) {
        depth++;
        current = current.parentElement;
      }
      return depth;
    };
    
    let allCandidates = [];
    tallContainers.forEach(container => {
      const containerCandidates = evaluateContainer(container);
      allCandidates.push(...containerCandidates);
    });
    
    if (allCandidates.length === 0) {
      const textHeavyElements = Array.from(document.body.querySelectorAll('div, article, section, main'))
        .filter(el => el.textContent.trim().length > 500)
        .sort((a, b) => b.textContent.length - a.textContent.length);
      
      if (textHeavyElements.length > 0) {
        return textHeavyElements[0];
      }
      
      return null;
    }
    
    allCandidates.sort((a, b) => {
      if (Math.abs(b.totalScore - a.totalScore) < 50) {
        return a.depth - b.depth;
      }
      return b.totalScore - a.totalScore;
    });
    
    return allCandidates[0].element;
  };

  const selectElementText = (element) => {
    window.getSelection().removeAllRanges();

    const range = document.createRange();
    range.selectNodeContents(element);

    const selection = window.getSelection();
    selection.addRange(range);
  };
  
  const extractMainText = () => {
    let mainContentElement = findMainContent();

    if (!mainContentElement) {
      return '';
    }

    selectElementText(mainContentElement);

    return mainContentElement.innerText.trim() || '';
  };

  browser.runtime.onMessage.addListener(async (request) => {
    if (request.action === 'saveSelectedText') {
      const selectedText = window.getSelection().toString().trim();

      if (!selectedText) {
        const contentConfirmString = request.labelStrings.contentConfirm || 'No text selected. Save the main content?';
        const contentConfirm = confirm(contentConfirmString);
        if (!contentConfirm) {
          return;
        }
      }

      const contentText = selectedText || extractMainText();
      
      if (!contentText) {
        const onErrorString = request.labelStrings.onError || 'The content couldn’t be found. Select it manually and try again.';
        alert(onErrorString);
        return;
      }
      
      const blob = new Blob([contentText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const defaultFilename = request.name || 'TextDrop';
      const pageTitle = await getPageTitle(defaultFilename);
      const sanitizePageTitle = sanitizeFileName(pageTitle, defaultFilename);
      const timestamp = getCurrentTimestamp();
      const filename = `${sanitizePageTitle}_${timestamp}.txt`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';

      document.documentElement.appendChild(a);
      a.click();

      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 500);
    }
    return true;
  });
})();

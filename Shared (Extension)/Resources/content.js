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

  // Thanks to Claude 3.7 Sonnet
  const extractMainText = () => {
    const docClone = document.cloneNode(true);
    const bodyClone = docClone.body;
    
    const noiseSelectors = [
      'nav', 'header', 'footer', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      'aside', '[role="complementary"]', '.sidebar', '.widget', '.advertisement', '.ad', '.ads',
      'form', 'button', '.social', '.share', '.comments', '.comment-section',
      '.hidden', '.invisible', '[aria-hidden="true"]', '.visually-hidden',
      'script', 'style', 'noscript', 'iframe',
      '.meta', '.metadata', '.author-info', '.published-date',
      '.menu', '.submenu', '.search', '.breadcrumb', '.pagination', '.pager', '.related',
      '.recommended', '.popular', '.trending', '.sponsored', '.advertisement',
      '.cookie-notice', '.notification', '.alert', '.banner', '.popup', '.modal',
      '.infobox', '.navbox', '.toc', '.hatnote', '.reference', '.references', '.reflist',
      '.edit-link', '.noprint', '.printfooter', '.catlinks', '.authority-control',
      '.breaking-news', '.most-read', '.newsletter-signup', '.subscription', '.paywall'
    ];
    
    noiseSelectors.forEach(selector => {
      try {
        bodyClone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // Ignore Error and Continue
      }
    });
    
    const scoreElement = (element) => {
      if (!element || !element.textContent) return 0;
      
      const text = element.textContent.trim();
      if (text.length < 50) return 0;
      
      let score = text.length;
      
      const paragraphs = element.querySelectorAll('p');
      if (paragraphs.length > 0) {
        score *= (1 + Math.min(1, paragraphs.length / 5));
        
        const longParagraphsCount = Array.from(paragraphs).filter(p => p.textContent.trim().length > 100).length;
        if (longParagraphsCount > 0) {
          score *= (1 + Math.min(1, longParagraphsCount / 3));
        }
      }
      
      const tagBonus = {
        'article': 2.5,
        'main': 2.0,
        'section': 1.5,
        'div': 1.0,
        'p': 0.8
      };
      
      const tagName = element.tagName.toLowerCase();
      if (tagBonus[tagName]) {
        score *= tagBonus[tagName];
      }
      
      const contentKeywords = ['content', 'article', 'post', 'entry', 'main', 'body', 'text', 'story', 'news'];
      const idLower = (element.id || '').toLowerCase();
      const classLower = (element.className || '').toLowerCase();
      
      for (const keyword of contentKeywords) {
        if (idLower.includes(keyword)) {
          score *= 1.5;
          break;
        }
      }
      
      for (const keyword of contentKeywords) {
        if (classLower.includes(keyword)) {
          score *= 1.3;
          break;
        }
      }
      
      const roleAttr = element.getAttribute('role');
      if (roleAttr === 'main' || roleAttr === 'article') {
        score *= 1.8;
      }
      
      const links = element.querySelectorAll('a');
      const linkTextLength = Array.from(links).reduce((total, link) => total + (link.textContent || '').length, 0);
      
      if (text.length > 0) {
        const linkDensity = linkTextLength / text.length;
        if (linkDensity > 0.5) {
          score *= (0.5 / linkDensity);
        } else if (linkDensity > 0.2) {
          score *= (1 - linkDensity);
        }
      }
      
      const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0 && paragraphs.length > 0) {
        const ratio = paragraphs.length / headings.length;
        if (ratio >= 2 && ratio <= 10) {
          score *= 1.2;
        }
      }
      
      const images = element.querySelectorAll('img');
      if (images.length > 0 && images.length < paragraphs.length) {
        score *= 1.1;
      }
      
      let depth = 0;
      let parent = element.parentElement;
      while (parent) {
        depth++;
        parent = parent.parentElement;
      }
      score /= (1 + Math.max(0, depth - 5) * 0.1);
      
      return score;
    };
    
    const potentialContainers = bodyClone.querySelectorAll('article, main, [role="main"], .article, .post, .content, #content, #main, section, .entry, .entry-content, div');
    
    let scoredElements = Array.from(potentialContainers)
      .filter(el => {
        const text = el.textContent.trim();
        return text.length > 150 && text.split(/\s+/).length > 30;
      })
      .map(el => ({
        element: el,
        score: scoreElement(el),
        text: el.textContent.trim()
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    
    const filteredElements = [];
    
    for (let i = 0; i < scoredElements.length; i++) {
      let shouldAdd = true;
      
      for (let j = 0; j < filteredElements.length; j++) {
        if (filteredElements[j].element.contains(scoredElements[i].element)) {
          shouldAdd = false;
          break;
        }
      }
      
      for (let j = i + 1; j < scoredElements.length; j++) {
        if (scoredElements[i].element.contains(scoredElements[j].element) &&
            scoredElements[j].score > scoredElements[i].score * 1.5) {
          shouldAdd = false;
          break;
        }
      }
      
      if (shouldAdd) {
        filteredElements.push(scoredElements[i]);
      }
    }
    
    let mainContentElement = filteredElements.length > 0 ? filteredElements[0].element.cloneNode(true) : null;
    
    if (!mainContentElement) {
      return 'No main content detected.';
    }
    
    const finalCleanupSelectors = [
      '.social-share', '.author-bio', '.timestamp', '.published-date', '.modified-date',
      '.rating', '.votes', '.like', '.dislike', '.comment-count', '.view-count',
      '.tags', '.categories', '.taxonomy', '.terms',
      '.edit', '.print', '.email', '.bookmark', '.save',
      'select', 'button', 'input'
    ];
    
    finalCleanupSelectors.forEach(selector => {
      try {
        mainContentElement.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // Ignore Error and Continue
      }
    });
    
    const headings = Array.from(mainContentElement.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const paragraphs = Array.from(mainContentElement.querySelectorAll('p'));
    let lists = Array.from(mainContentElement.querySelectorAll('ul, ol'));
    
    const validParagraphs = paragraphs.filter(p => p.textContent.trim().length > 30);
    const validLists = lists.filter(l => l.textContent.trim().length > 60);
    
    let mainTitle = '';
    const potentialTitles = [
      document.querySelector('h1'),
      document.querySelector('article h1'),
      document.querySelector('main h1'),
      document.querySelector('[role="main"] h1'),
      document.querySelector('article header h1'),
      document.querySelector('.article-title'),
      document.querySelector('.entry-title'),
      document.querySelector('.post-title')
    ].filter(Boolean);
    
    if (potentialTitles.length > 0) {
      mainTitle = potentialTitles[0].textContent.trim();
    }
    
    let formattedContent = '';
    
    if (mainTitle) {
      formattedContent += `# ${mainTitle}\n\n`;
    }
    
    if (validParagraphs.length > 0) {
      formattedContent += `${validParagraphs[0].textContent.trim()}\n\n`;
      validParagraphs[0].dataset.processed = 'true';
    }
    
    headings.forEach(heading => {
      const headingText = heading.textContent.trim();
      if (!headingText || headingText.length < 2) return;
      
      const level = parseInt(heading.tagName.substring(1));
      formattedContent += `\n${'#'.repeat(level)} ${headingText}\n\n`;
      
      let currentElement = heading.nextElementSibling;
      while (currentElement) {
        if (/^H[1-6]$/.test(currentElement.tagName)) {
          break;
        }
        
        if (currentElement.tagName === 'P' && currentElement.textContent.trim().length > 30 && !currentElement.dataset.processed) {
          formattedContent += `${currentElement.textContent.trim()}\n\n`;
          currentElement.dataset.processed = 'true';
        }
        
        if ((currentElement.tagName === 'UL' || currentElement.tagName === 'OL') && currentElement.textContent.trim().length > 60) {
          const listItems = Array.from(currentElement.querySelectorAll('li'))
            .map(li => `• ${li.textContent.trim()}`)
            .join('\n');
          formattedContent += `${listItems}\n\n`;
        }
        
        currentElement = currentElement.nextElementSibling;
      }
    });
    
    validParagraphs
      .filter(p => !p.dataset.processed)
      .forEach(p => {
        formattedContent += `${p.textContent.trim()}\n\n`;
      });
    
    return formattedContent.trim() || 'No main content detected.';
  };

  browser.runtime.onMessage.addListener(async (request) => {
    if (request.action === 'saveSelectedText') {
      const selectedText = window.getSelection().toString();
      const contentText = selectedText ? selectedText : extractMainText();
      // error handling and show alert dialog here with null text ...
      
      const blob = new Blob([contentText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const defaultFilename = request.name ? request.name : 'TextDrop';
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

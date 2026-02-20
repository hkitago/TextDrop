(() => {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;
  const isIOS = /iPhone|iPod/.test(userAgent);
  const isMacOS = platform.includes('Mac') && !isIPadOS;

  const DOWNLOAD_CLEANUP_DELAY_MS = 500;
  const DEFAULT_TEXT_MIME = 'text/plain;charset=UTF-8';
  const IOS_DOWNLOAD_MIME = 'application/octet-stream';

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
      console.warn('Failed to get page title:', error);
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

    // Page type detection
    const getPageType = () => {
      // URL-based check for common forum patterns
      const urlStr = window.location.href.toLowerCase();
      let url;

      try {
        url = new URL(urlStr);
      } catch (e) {
        console.warn('Invalid URL:', urlStr);
        return 'reading';
      }

      const forumHostnames = [
        'reddit.com',
        'stackoverflow.com',
        'stackexchange.com',
        'news.ycombinator.com',
        'quora.com',
        '4chan.org',
        '5ch.net',
        'tieba.baidu.com',
        'kin.naver.com',
        'gutefrage.net',
        'commentcamarche.net',
        'support.mozilla.org',
        'wordpress.org',
        'discussions.apple.com',
        'answers.microsoft.com'
      ];

      const forumPathPatterns = [
        /\/forum(\/|$)/i,
        /\/q(?:a|anda)(\/|$)/i,
        /\/discussion(\/|$)/i,
        /\/r\/[^/]+(\/|$)/i,
        /\/questions?(\/|$)/i,
        /\/threads?(\/|$)/i,
        /\/item\/\d+$/i,
        /\/t\/\d+/i,              // Discourse topic
        /\/c\/[^/]+(\/|$)/i,      // Discourse category
        /\/board\/[^/]+/i,
        /\/thread\/\d+/i
      ];

      const isForumUrl = (
        forumHostnames.some(host => url.hostname.includes(host)) ||
        forumPathPatterns.some(pattern => pattern.test(url.pathname))
      );

      if (isForumUrl) {
        // console.log(`Detected forum type via URL analysis: ${urlStr}`);
        return 'forum';
      }

      // Check for Open Graph or meta tags indicating forum/discussion
      const metaType = document.querySelector('meta[property="og:type"]');
      if (metaType && ['forum', 'discussion'].some(type => metaType.content.toLowerCase().includes(type))) {
        // console.log('Detected forum type via meta tag:', metaType.content);
        return 'forum';
      }

      // Check for reading-type indicators (stricter criteria)
      const articleOrMain = document.querySelector('article, main');
      const paragraphCount = document.querySelectorAll('p').length;
      const titleLength = document.title.length;
      const hasReadingStructure = articleOrMain && paragraphCount > 10 && titleLength > 30;
      if (hasReadingStructure) {
        // console.log(`Detected reading type via semantic structure (article/main: ${!!articleOrMain}, paragraphs: ${paragraphCount}, title length: ${titleLength})`);
        return 'reading';
      }

      // Analyze repeated containers for forum-like features
      const containers = document.querySelectorAll('div, article, section, table');
      let classFrequency = {};
      let maxRepeatedClass = 0;
      let repeatedClassName = '';

      containers.forEach(el => {
        const className = el.className;
        if (className) {
          classFrequency[className] = (classFrequency[className] || 0) + 1;
          if (classFrequency[className] > maxRepeatedClass) {
            maxRepeatedClass = classFrequency[className];
            repeatedClassName = className;
          }
        }
      });

      if (maxRepeatedClass > 3) { // Lowered threshold for some forums
        if (repeatedClassName.trim()) {
          const classes = repeatedClassName.split(/\s+/).map(cls => CSS.escape(cls)); // Escape for special chars
          const selector = '.' + classes.join('.');
          
          try {
            const repeatedContainers = document.querySelectorAll(selector);
            
            const hasForumFeatures = Array.from(repeatedContainers).some(container =>
              container.querySelectorAll('button, a[href*="#"], a[href*="reply"], a[href*="vote"], [data-comment-id], [data-post-id], [class*="vote"], [class*="comment"], [class*="comtr"]').length > 1 // Lowered to 1, added Hacker News selectors
            );
            if (hasForumFeatures) {
              // console.warn(`Detected forum type via repeated containers (class: ${repeatedClassName}, count: ${maxRepeatedClass}) with interactive elements`);
              return 'forum';
            }
          } catch (error) {
            console.warn('Error in querySelectorAll for repeated containers:', error.message, 'Selector:', selector);
          }
        }
      }

      // Log failure details for debugging
      // console.log(`Detected reading type (no strong forum indicators found; paragraphs: ${paragraphCount}, title length: ${titleLength}, max repeated class: ${maxRepeatedClass})`);
      return 'reading';
    };

    // Constants selection
    const CONTENT_TYPES = { ARTICLE: 'reading', FORUM: 'forum' };
    const getConstants = (contentType) => {
      const constantSets = {
        [CONTENT_TYPES.ARTICLE]: {
          linkDensityMultiplier: 10,
          linkTextRatioMultiplier: 100,
          linkTextRatioThreshold: 0.3,
          linkCountThreshold: 5,
          linkPenalty: 100,
          paragraphScore: 15,
          consecutiveScore: 25,
          textScore: 0.1,
          textNodesScore: 10,
          minTextLength: 100,
          minParagraphTextLength: 30,
          viewportHeightRatio: 0.3
        },
        [CONTENT_TYPES.FORUM]: {
          linkDensityMultiplier: 5,
          linkTextRatioMultiplier: 50,
          linkTextRatioThreshold: 0.6,      // Increased to tolerate more links
          linkCountThreshold: 15,           // Increased to allow more links
          linkPenalty: 30,                  // Reduced to lower penalty
          paragraphScore: 12,               // Increased to favor comment containers
          consecutiveScore: 20,             // Increased to favor thread containers
          textScore: 0.2,                   // Increased to prioritize text length
          textNodesScore: 10,               // Aligned with ARTICLE
          minTextLength: 30,                // Lowered for shorter threads
          minParagraphTextLength: 15,       // Lowered for short comments
          viewportHeightRatio: 0.15         // Lowered to include larger containers
        }
      };
      return constantSets[contentType] || constantSets[CONTENT_TYPES.ARTICLE];
    };

    // Check type for debugging
    // const pageType = getPageType();
    // console.log('pageType:', pageType);

    const config = getConstants(getPageType());
    const isElementVisible = (element) => {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return false;
      }

      let current = element;
      while (current && current !== document.documentElement) {
        const computedStyle = window.getComputedStyle(current);
        if (computedStyle.display === 'none') return false;
        if (computedStyle.visibility === 'hidden') return false;
        if (computedStyle.opacity === '0') return false;
        current = current.parentElement;
      }
      return true;
    };

    const getVisibleTallContainers = () => {
      return Array.from(
        document.querySelectorAll('body, div, article, section, main, td, p, table') // Added table for some webpages have old structure
      )
        .filter(el => isElementVisible(el))
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            element: el,
            height: rect.height
          };
        })
        .filter(item => item.height > viewportHeight * config.viewportHeightRatio);
    };

    const tallContainers = getVisibleTallContainers();

    const evaluateContainer = (container) => {
      const candidates = [];

      const evaluateNode = (node, depth = 0) => {
        if (depth > 5) return;
        if (!isElementVisible(node)) return;

        let textContent = '';
        let textNodesCount = 0;
        let meaningfulTextNodes = 0;
        let linkTextLength = 0;
        let totalTextLength = 0;

        const linkElements = node.querySelectorAll('a');
        const linkCount = linkElements.length;

        const walkTextNodes = (element) => {
          if (element.nodeType === Node.TEXT_NODE) {
            const text = element.textContent.trim();
            if (text.length > 0) {
              textContent += text + ' ';
              totalTextLength += text.length;
              textNodesCount++;
              if (text.length > 15) {
                meaningfulTextNodes++;
              }
            }
          } else if (element.nodeType === Node.ELEMENT_NODE) {
            const tagName = element.tagName.toLowerCase();
            if (['script', 'style', 'nav', 'header', 'footer'].includes(tagName)) return;
            if (!isElementVisible(element)) return;
            if (tagName === 'a') {
              const linkText = element.textContent.trim();
              linkTextLength += linkText.length;
            }
            for (let i = 0; i < element.childNodes.length; i++) {
              walkTextNodes(element.childNodes[i]);
            }
          }
        };

        walkTextNodes(node);

        const linkTextRatio = totalTextLength > 0 ? linkTextLength / totalTextLength : 0;
        const linkDensityScore = linkCount * config.linkDensityMultiplier + linkTextRatio * config.linkTextRatioMultiplier;
        const linkPenalty = linkTextRatio > config.linkTextRatioThreshold || linkCount > config.linkCountThreshold ? config.linkPenalty : 0;

        const directParagraphs = Array.from(node.children)
          .filter(child =>
            child.tagName.toLowerCase() === 'p' &&
            child.textContent.trim().length > config.minParagraphTextLength &&
            isElementVisible(child)
          );

        let maxConsecutiveParagraphs = 0;
        let currentConsecutive = 0;

        Array.from(node.children).forEach(child => {
          if (child.tagName.toLowerCase() === 'p' &&
              child.textContent.trim().length > config.minParagraphTextLength &&
              isElementVisible(child)) {
            currentConsecutive++;
            maxConsecutiveParagraphs = Math.max(maxConsecutiveParagraphs, currentConsecutive);
          } else {
            currentConsecutive = 0;
          }
        });

        const textDensity = textContent.length / (node.innerHTML.length || 1);
        const textScore = textContent.length * config.textScore;
        const textNodesScore = meaningfulTextNodes * config.textNodesScore;
        const paragraphScore = directParagraphs.length * config.paragraphScore;
        const consecutiveScore = maxConsecutiveParagraphs * config.consecutiveScore;

        const totalScore =
          paragraphScore +
          consecutiveScore +
          textScore +
          textNodesScore -
          linkDensityScore -
          linkPenalty;

        if (textContent.length > config.minTextLength || directParagraphs.length > 0) {
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

        Array.from(node.children)
          .filter(child => isElementVisible(child))
          .forEach(child => evaluateNode(child, depth + 1));
      };
      
      evaluateNode(container.element);
      return candidates;
    };
    
    const getElementDepth = (element) => {
      let depth = 0;
      let current = element;
      while (current !== document.documentElement && current.parentElement) {
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
      const textHeavyElements = Array.from(
        document.querySelectorAll('body, div, article, section, main, p, table') // Added table
      )
        .filter(el =>
          el.textContent.trim().length > config.minTextLength &&
          isElementVisible(el)
        )
        .sort((a, b) => b.textContent.length - a.textContent.length);
      
      if (textHeavyElements.length > 0) {
        return textHeavyElements[0];
      }
      
      return document.body;
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

    setTimeout(() => {
      selectElementText(mainContentElement);
    }, 1);

    return mainContentElement.innerText.trim() || '';
  };
  
  // For Youtube Transcription
  const clickTranscriptButton = () => {
    const container = document.querySelector('#button-container');
    const button = container?.querySelector('button');
    if (button) {
      button.click();
      waitForTranscriptAndExtract();
    } else {
      return '';
    }
  };

  const extractTranscriptText = () => {
    const container = document.querySelector('#segments-container');
    const segments = container?.querySelectorAll('yt-formatted-string.segment-text');
    if (!segments || segments.length === 0) {
      return '';
    }

    const texts = Array.from(segments).map(el => el.textContent.trim());
    const fullTranscript = texts.join(' ');

    return fullTranscript;
  };

  const waitForTranscriptAndExtract = (resolve, retry = 10) => {
    const container = document.querySelector('#segments-container');
    if (container) {
      const segments = container.querySelectorAll('yt-formatted-string.segment-text');
      const texts = Array.from(segments).map(el => el.textContent.trim());
      const fullTranscript = texts.join(' ');
      resolve(fullTranscript);
    } else if (retry > 0) {
      setTimeout(() => waitForTranscriptAndExtract(resolve, retry - 1), 1000);
    } else {
      resolve('');
    }
  };

  const waitForTranscriptButtonAndClick = () => {
    return new Promise((resolve, reject) => {
      const tryClick = () => {
        const container = document.querySelector('#button-container');
        const button = container?.querySelector('button');

        if (button) {
          button.click();
          waitForTranscriptAndExtract(resolve);
          return true;
        }

        return false;
      };

      if (tryClick()) return;

      const observer = new MutationObserver((_, obs) => {
        if (tryClick()) {
          obs.disconnect();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Transcript button not found'));
      }, 3000);
    });
  };

  const detectSandboxMode = () => {
    try {
      const d = document.domain;
      if (d) document.domain = d;
    } catch {
      return true;
    }
    
    try {
      document.cookie = 'sbx=1;max-age=60';
      if (!document.cookie.includes('sbx=1')) {
        return true;
      }
      document.cookie = 'sbx=;max-age=0';
    } catch {
      return true;
    }
    
    try {
      void window.top.location.href;
    } catch {
      return true;
    }
    
    return false;
  };
  
  /**
   * Detects if Real User Monitoring (RUM) scripts are present that may interfere
   * with programmatic file downloads using anchor element click() method.
   *
   * @returns {boolean} True if RUM scripts that interfere with downloads are detected
   */
  const detectRUM = () => {
    const currentHostname = window.location.hostname.toLowerCase();
    
    const interferingRUMIdentifiers = [
      'newrelic',        // New Relic RUM service
      'nr-data',         // New Relic data collection domain
      'bam.nr-data',     // New Relic Browser Agent Monitor
      'nrwrapper',       // New Relic function wrapper
      'nreum',           // New Relic End User Monitoring
      
      // Datadog RUM (potential interference)
//      'datadoghq',       // Datadog service domain
//      'dd_rum',          // Datadog RUM identifier
//      'ddrum',           // Datadog RUM short form
      
      // Dynatrace RUM (potential interference)
//      'dynatrace',       // Dynatrace service
//      'dtrum',           // Dynatrace RUM API
//      'ruxit',           // Legacy Dynatrace identifier
      
      // Elastic APM RUM (potential interference)
//      'elastic-apm',     // Elastic APM identifier
//      'apm-rum',         // Elastic APM RUM
      
      // AppDynamics (potential interference)
//      'appdynamics',     // AppDynamics service
//      'adrum',           // AppDynamics RUM
      
      // Splunk RUM (potential interference)
//      'splunk-rum',      // Splunk RUM
//      'signalfx',        // SignalFx (acquired by Splunk)
      
      // Other common RUM services
//      'hotjar',          // Hotjar session recording
//      'fullstory',       // FullStory session replay
//      'logrocket'        // LogRocket session replay
    ];
    
    if (interferingRUMIdentifiers.some(identifier => currentHostname.includes(identifier))) {
      return true;
    }

    const scriptElements = Array.from(document.scripts || []);
    for (const script of scriptElements) {
      const src = (script.src || '').toLowerCase();
      if (interferingRUMIdentifiers.some(identifier => src.includes(identifier))) {
        return true;
      }
    }

    const markerMeta = document.querySelector(
      'meta[name*="newrelic" i], meta[content*="newrelic" i], meta[name*="nreum" i], meta[content*="nreum" i]'
    );
    if (markerMeta) {
      return true;
    }

    return false;
  };
  
  browser.runtime.onMessage.addListener(async (request) => {
    if (request.action === 'saveSelectedText') {
      const isSandboxedPage = detectSandboxMode();
      const isRUMPage = detectRUM();
      
      const selectedText = window.getSelection().toString().trim();

      if (!selectedText && isSandboxedPage === false) {
        const contentConfirmString = request.labelStrings.contentConfirm || 'No text selected. Save the main content?';
        const contentConfirm = confirm(contentConfirmString);
        if (!contentConfirm) {
          return;
        }
      }
      
      let contentText = '';

      const hostname = window.location.hostname;
      if (!selectedText && (isMacOS && (hostname.includes('youtube.com') || hostname.includes('youtu.be')))) {
        try {
          contentText = await waitForTranscriptButtonAndClick();
        } catch (error) {
          console.warn('Error to get transcription:', error);
        }
      }
      
      if (!contentText) {
        contentText = selectedText || extractMainText();
      }
      
      if (!contentText && isSandboxedPage === false) {
        const onErrorString = request.labelStrings.onError || 'The content couldn’t be found. Select it manually and try again.';
        alert(onErrorString);
        return;
      }
      
      const encoding = document.characterSet || 'UTF-8';
      const defaultFilename = request.name || 'TextDrop';
      const pageTitle = await getPageTitle(defaultFilename);
      const sanitizePageTitle = sanitizeFileName(pageTitle, defaultFilename);
      const timestamp = getCurrentTimestamp();
      const filename = `${sanitizePageTitle}_${timestamp}.txt`;
      
      if (isSandboxedPage === true) {
        browser.runtime.sendMessage({
          action: 'createBlobTab',
          text: contentText,
          encoding: encoding,
          filename: filename
        });
        
        return;
      }

      const blobMimeType = isIOS ? IOS_DOWNLOAD_MIME : `text/plain;charset=${encoding.toUpperCase()}`;
      let blob;
      try {
        if (typeof contentText === 'string') {
          const encoder = new TextEncoder();
          const utf8Array = encoder.encode(contentText);
          blob = new Blob([utf8Array], { type: blobMimeType });
        } else if (contentText instanceof ArrayBuffer || contentText instanceof Uint8Array) {
          blob = new Blob([contentText], { type: blobMimeType });
        } else {
          blob = new Blob([String(contentText)], { type: blobMimeType });
        }
      } catch (error) {
        blob = new Blob([contentText], { type: isIOS ? IOS_DOWNLOAD_MIME : DEFAULT_TEXT_MIME });
      }

      const url = URL.createObjectURL(blob);
      
      if (isRUMPage === true) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'about:blank';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const iframeA = iframeDoc.createElement('a');
        iframeA.href = url;
        iframeA.download = filename;
        iframeA.style.display = 'none';

        iframeDoc.documentElement.appendChild(iframeA);
        iframeA.click();

        setTimeout(() => {
          iframe.remove();
          URL.revokeObjectURL(url);
        }, DOWNLOAD_CLEANUP_DELAY_MS);

        return;
      }
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.documentElement.appendChild(a);
      a.click();
      
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, DOWNLOAD_CLEANUP_DELAY_MS);
    }
  });
})();

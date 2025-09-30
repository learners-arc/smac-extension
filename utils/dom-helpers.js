/**
 * DOM Helpers Utility - Advanced DOM manipulation and interaction utilities
 * Provides human-like interactions with web page elements
 * 
 * Features:
 * - Human-like clicking with random coordinates and timing
 * - Natural typing simulation with realistic delays
 * - Element finding with fallback selectors and retry logic
 * - Focus management and event triggering
 * - Scroll and visibility handling
 * - Element state detection and validation
 */

class DOMHelpers {
    constructor() {
        this.config = {
            click: {
                delay: { min: 100, max: 300 },
                coordinates: {
                    offsetRange: 0.3, // 30% of element size for click randomization
                    minOffset: 5      // Minimum pixel offset from center
                }
            },
            typing: {
                eventDelay: 50,
                compositionEvents: true
            },
            scroll: {
                speed: 800,
                behavior: 'smooth'
            },
            wait: {
                element: 10000,
                animation: 500,
                default: 1000
            }
        };

        this.eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true
        };
    }

    /**
     * Find element with fallback selectors and retry logic
     * @param {Array|string} selectors - Array of selectors or single selector
     * @param {Object} options - Search options
     * @return {Promise<Element|null>} - Found element or null
     */
    async findElementWithFallback(selectors, options = {}) {
        const {
            timeout = this.config.wait.element,
            retries = 1,
            parent = document,
            visible = true,
            enabled = null
        } = options;

        const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

        for (let attempt = 0; attempt <= retries; attempt++) {
            for (const selector of selectorArray) {
                try {
                    const element = await this.waitForElement(selector, {
                        timeout: timeout / (retries + 1),
                        parent,
                        visible,
                        enabled
                    });

                    if (element) {
                        console.log(`[DOM Helpers] Found element with selector: ${selector}`);
                        return element;
                    }
                } catch (error) {
                    // Continue to next selector
                }
            }

            // Wait before retry
            if (attempt < retries) {
                await this.delay(500, 1000);
            }
        }

        console.warn('[DOM Helpers] No element found with any selector:', selectorArray);
        return null;
    }

    /**
     * Wait for element to appear in DOM
     * @param {string} selector - CSS selector
     * @param {Object} options - Wait options
     * @return {Promise<Element|null>} - Found element or null
     */
    async waitForElement(selector, options = {}) {
        const {
            timeout = this.config.wait.element,
            parent = document,
            visible = true,
            enabled = null
        } = options;

        return new Promise((resolve) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = parent.querySelector(selector);

                if (element) {
                    // Check visibility if required
                    if (visible && !this.isElementVisible(element)) {
                        if (Date.now() - startTime < timeout) {
                            setTimeout(checkElement, 100);
                            return;
                        }
                    }

                    // Check enabled state if required
                    if (enabled !== null && this.isElementDisabled(element) === enabled) {
                        if (Date.now() - startTime < timeout) {
                            setTimeout(checkElement, 100);
                            return;
                        }
                    }

                    resolve(element);
                    return;
                }

                if (Date.now() - startTime < timeout) {
                    setTimeout(checkElement, 100);
                } else {
                    resolve(null);
                }
            };

            checkElement();
        });
    }

    /**
     * Wait for any of multiple elements to appear
     * @param {Array} selectors - Array of CSS selectors
     * @param {Object} options - Wait options
     * @return {Promise<Element|null>} - First found element or null
     */
    async waitForAnyElement(selectors, options = {}) {
        const { timeout = this.config.wait.element, parent = document } = options;

        return new Promise((resolve) => {
            const startTime = Date.now();

            const checkElements = () => {
                for (const selector of selectors) {
                    const element = parent.querySelector(selector);
                    if (element && this.isElementVisible(element)) {
                        resolve(element);
                        return;
                    }
                }

                if (Date.now() - startTime < timeout) {
                    setTimeout(checkElements, 100);
                } else {
                    resolve(null);
                }
            };

            checkElements();
        });
    }

    /**
     * Perform human-like click on element
     * @param {Element} element - Element to click
     * @param {Object} options - Click options
     */
    async humanClick(element, options = {}) {
        const { delay = true, scroll = true } = options;

        try {
            // Scroll element into view if needed
            if (scroll) {
                await this.scrollIntoView(element);
                await this.delay(200, 400);
            }

            // Ensure element is clickable
            if (!this.isElementClickable(element)) {
                throw new Error('Element is not clickable');
            }

            // Get random click coordinates within element
            const coords = this.getRandomClickCoordinates(element);

            // Dispatch mouse events in sequence
            await this.dispatchMouseEvent(element, 'mousedown', coords);

            if (delay) {
                await this.delay(
                    this.config.click.delay.min,
                    this.config.click.delay.max
                );
            }

            await this.dispatchMouseEvent(element, 'mouseup', coords);
            await this.dispatchMouseEvent(element, 'click', coords);

            console.log('[DOM Helpers] Human click performed on element');

        } catch (error) {
            console.error('[DOM Helpers] Failed to perform human click:', error);
            throw error;
        }
    }

    /**
     * Get random coordinates within element for natural clicking
     * @param {Element} element - Target element
     * @return {Object} - Coordinates object {x, y}
     */
    getRandomClickCoordinates(element) {
        const rect = element.getBoundingClientRect();
        const { offsetRange, minOffset } = this.config.click.coordinates;

        // Calculate safe click area (avoiding edges)
        const safeWidth = rect.width * (1 - offsetRange);
        const safeHeight = rect.height * (1 - offsetRange);

        // Generate random offset within safe area
        const offsetX = (Math.random() - 0.5) * safeWidth;
        const offsetY = (Math.random() - 0.5) * safeHeight;

        // Ensure minimum offset from exact center
        const adjustedOffsetX = Math.abs(offsetX) < minOffset
            ? (offsetX >= 0 ? minOffset : -minOffset)
            : offsetX;
        const adjustedOffsetY = Math.abs(offsetY) < minOffset
            ? (offsetY >= 0 ? minOffset : -minOffset)
            : offsetY;

        return {
            x: rect.left + rect.width / 2 + adjustedOffsetX,
            y: rect.top + rect.height / 2 + adjustedOffsetY
        };
    }

    /**
     * Dispatch mouse event with coordinates
     * @param {Element} element - Target element
     * @param {string} eventType - Event type (mousedown, mouseup, click)
     * @param {Object} coords - Coordinates {x, y}
     */
    async dispatchMouseEvent(element, eventType, coords) {
        const event = new MouseEvent(eventType, {
            ...this.eventOptions,
            clientX: coords.x,
            clientY: coords.y,
            button: 0,
            buttons: eventType === 'mousedown' ? 1 : 0
        });

        element.dispatchEvent(event);
    }

    /**
     * Focus element with proper event handling
     * @param {Element} element - Element to focus
     */
    async focusElement(element) {
        try {
            // Scroll into view first
            await this.scrollIntoView(element);

            // Focus the element
            element.focus();

            // Dispatch focus events
            element.dispatchEvent(new FocusEvent('focusin', this.eventOptions));
            element.dispatchEvent(new FocusEvent('focus', this.eventOptions));

            // Wait for focus to settle
            await this.delay(100, 200);

            console.log('[DOM Helpers] Element focused successfully');

        } catch (error) {
            console.error('[DOM Helpers] Failed to focus element:', error);
            throw error;
        }
    }

    /**
     * Clear element content
     * @param {Element} element - Element to clear
     */
    async clearElement(element) {
        try {
            // Focus first
            await this.focusElement(element);

            // Different clearing strategies based on element type
            if (element.contentEditable === 'true') {
                // For contenteditable elements
                element.innerHTML = '';
                element.textContent = '';
            } else if (element.tagName.toLowerCase() === 'input' ||
                element.tagName.toLowerCase() === 'textarea') {
                // For input elements
                element.value = '';
            }

            // Select all and delete (universal approach)
            document.execCommand('selectAll');
            document.execCommand('delete');

            // Trigger input events
            await this.triggerInputEvents(element);

            console.log('[DOM Helpers] Element cleared successfully');

        } catch (error) {
            console.error('[DOM Helpers] Failed to clear element:', error);
        }
    }

    /**
     * Type a single character into element
     * @param {Element} element - Target element
     * @param {string} char - Character to type
     */
    async typeCharacter(element, char) {
        try {
            // Composition events for complex input
            if (this.config.typing.compositionEvents) {
                element.dispatchEvent(new CompositionEvent('compositionstart', {
                    ...this.eventOptions,
                    data: char
                }));
            }

            // Key events
            const keyboardEvent = {
                ...this.eventOptions,
                key: char,
                code: this.getKeyCode(char),
                charCode: char.charCodeAt(0),
                keyCode: char.charCodeAt(0)
            };

            element.dispatchEvent(new KeyboardEvent('keydown', keyboardEvent));
            element.dispatchEvent(new KeyboardEvent('keypress', keyboardEvent));

            // Insert character
            if (element.contentEditable === 'true') {
                // For contenteditable elements
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(char));
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // For input elements
                const start = element.selectionStart || 0;
                const end = element.selectionEnd || 0;
                const value = element.value || '';
                element.value = value.substring(0, start) + char + value.substring(end);
                element.selectionStart = element.selectionEnd = start + 1;
            }

            element.dispatchEvent(new KeyboardEvent('keyup', keyboardEvent));

            // Composition end
            if (this.config.typing.compositionEvents) {
                element.dispatchEvent(new CompositionEvent('compositionend', {
                    ...this.eventOptions,
                    data: char
                }));
            }

            // Input event
            element.dispatchEvent(new InputEvent('input', {
                ...this.eventOptions,
                data: char,
                inputType: 'insertText'
            }));

        } catch (error) {
            console.error('[DOM Helpers] Failed to type character:', error);
        }
    }

    /**
     * Trigger input events on element
     * @param {Element} element - Target element
     */
    async triggerInputEvents(element) {
        try {
            // Standard input events
            element.dispatchEvent(new Event('input', this.eventOptions));
            element.dispatchEvent(new Event('change', this.eventOptions));

            // Wait for events to settle
            await this.delay(this.config.typing.eventDelay);

        } catch (error) {
            console.error('[DOM Helpers] Failed to trigger input events:', error);
        }
    }

    /**
     * Scroll element into view
     * @param {Element} element - Element to scroll to
     */
    async scrollIntoView(element) {
        try {
            if (!this.isElementVisible(element)) {
                element.scrollIntoView({
                    behavior: this.config.scroll.behavior,
                    block: 'center',
                    inline: 'center'
                });

                // Wait for scroll animation
                await this.delay(this.config.wait.animation);
            }
        } catch (error) {
            console.error('[DOM Helpers] Failed to scroll element into view:', error);
        }
    }

    /**
     * Check if element is visible
     * @param {Element} element - Element to check
     * @return {boolean} - True if visible
     */
    isElementVisible(element) {
        if (!element) return false;

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0;
    }

    /**
     * Check if element is clickable
     * @param {Element} element - Element to check
     * @return {boolean} - True if clickable
     */
    isElementClickable(element) {
        if (!this.isElementVisible(element)) return false;

        const style = window.getComputedStyle(element);
        return style.pointerEvents !== 'none' && !this.isElementDisabled(element);
    }

    /**
     * Check if element is disabled
     * @param {Element} element - Element to check
     * @return {boolean} - True if disabled
     */
    isElementDisabled(element) {
        return element.disabled === true ||
            element.getAttribute('aria-disabled') === 'true' ||
            element.classList.contains('disabled');
    }

    /**
     * Get key code for character
     * @param {string} char - Character
     * @return {string} - Key code
     */
    getKeyCode(char) {
        const specialKeys = {
            ' ': 'Space',
            '\n': 'Enter',
            '\t': 'Tab',
            '\b': 'Backspace'
        };

        return specialKeys[char] || `Key${char.toUpperCase()}`;
    }

    /**
     * Create random delay
     * @param {number} min - Minimum delay in ms
     * @param {number} max - Maximum delay in ms (optional)
     * @return {Promise} - Promise that resolves after delay
     */
    delay(min, max = null) {
        const delay = max ? Math.floor(Math.random() * (max - min + 1)) + min : min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Wait for page to be idle (no network activity)
     * @param {number} timeout - Maximum wait time in ms
     * @return {Promise<boolean>} - True if page became idle
     */
    async waitForPageIdle(timeout = 5000) {
        return new Promise((resolve) => {
            let idleTimer = null;
            const startTime = Date.now();

            const resetTimer = () => {
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    resolve(true);
                }, 500); // Consider idle after 500ms of no activity
            };

            const onActivity = () => {
                if (Date.now() - startTime > timeout) {
                    resolve(false);
                    return;
                }
                resetTimer();
            };

            // Listen for various activity indicators
            document.addEventListener('DOMContentLoaded', onActivity);
            window.addEventListener('load', onActivity);

            // Start initial timer
            resetTimer();
        });
    }

    /**
     * Get element text content with fallback methods
     * @param {Element} element - Element to get text from
     * @return {string} - Text content
     */
    getElementText(element) {
        if (!element) return '';

        // Try different text extraction methods
        return element.textContent ||
            element.innerText ||
            element.value ||
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            '';
    }

    /**
     * Check if element contains text
     * @param {Element} element - Element to check
     * @param {string} text - Text to search for
     * @param {boolean} caseSensitive - Whether search is case sensitive
     * @return {boolean} - True if text is found
     */
    elementContainsText(element, text, caseSensitive = false) {
        const elementText = this.getElementText(element);
        const searchText = caseSensitive ? text : text.toLowerCase();
        const contentText = caseSensitive ? elementText : elementText.toLowerCase();

        return contentText.includes(searchText);
    }

    /**
     * Get comprehensive element info for debugging
     * @param {Element} element - Element to analyze
     * @return {Object} - Element information
     */
    getElementInfo(element) {
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            textContent: this.getElementText(element).substring(0, 50),
            isVisible: this.isElementVisible(element),
            isClickable: this.isElementClickable(element),
            isDisabled: this.isElementDisabled(element),
            rect: {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left
            },
            styles: {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                pointerEvents: style.pointerEvents
            }
        };
    }
}

// Create singleton instance
const domHelpers = new DOMHelpers();

export { DOMHelpers, domHelpers };
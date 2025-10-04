# <img src="https://raw.githubusercontent.com/hkitago/TextDrop/refs/heads/main/Shared%20(App)/Resources/Icon.png" height="36" valign="bottom"/> TextDrop for Safari Extension

This Safari extension instantly saves selected web text as a text file. Skip copy-pasting and launching text editors—just download with one click. If no text is selected, it auto-detects and saves the main content. A simple tool for efficient workflows.

Originally developed to help bypass token limits when working with generative AI services, this extension creates universal plain text files instead of formatted notes. This gives you complete flexibility to use your captured content with any application, AI service, or text processing tool without format restrictions. Perfect for researchers, developers, students, and everyday users who need web content in the most compatible format for maximum portability and versatility.

## Installation & Uninstallation

### Installation

To install the extension on iOS or iPadOS, go to Settings > Apps > Safari > Extensions, or enable the extension by toggling it on in the Manage Extensions option found in the Safari address bar.
For macOS, open Safari, go to Safari > Settings > Extensions, and enable the extension from there.

### Uninstallation

To uninstall the extension, similarly to the installation process, toggle the extension off, or remove it completely by selecting the extension icon on the Home Screen and choosing "Delete app".

## Usage

1. Load a web page.
2. Select the text on the web page you wish to save. This step is optional as advanced auto-detection intelligently identifies content types (articles, forum discussions, YouTube transcripts) and extracts the relevant text automatically, saving you from manually selecting complex threaded conversations or lengthy video transcriptions.
3. Click the extension icon next to the address bar, or on macOS, use the "TextDrop" command from the context menu.
4. Depending on your website settings, you may need to approve a file download prompt. Save the text file to your preferred location.

> [!IMPORTANT]
> On rare occasions in iOS, the button leading to the download file may disappear. If this happens, tap the address bar, then close that view to return. The toolbar icon will reappear, and you can access the download from there.

> [!NOTE]
> For certain pages with download restrictions, clicking the extension button will open a new tab with platform-specific behavior:
> 
> **[macOS]**  
> A download permission prompt will appear. Please allow the download immediately, as this tab will automatically close after approximately 5 seconds. You will return to the original tab once it closes.
> 
> **[iOS/iPadOS]**  
> The extracted text will be displayed. Select the text, tap "Share," then choose "Save to Files" from the share menu to save it to your desired location. Additionally, depending on the type of restrictions, the "View" button may not appear in the download prompt due to browser implementation differences.

## Version History

### 1.2.7 - 2025-10-10

- Updated for the latest OS with new user interface and theme-optimized icons

### 1.2.6 - 2025-09-10

- Improved content detection by excluding hidden elements for a more accurate experience
- Enhanced support for detecting text and forum pages to better identify relevant content
- Fixed an issue where YouTube transcripts were incorrectly prioritized over selected text as comments, ensuring accurate content downloads

### 1.2.5 - 2025-07-16

- Fixed an issue where downloads failed on pages with security restrictions (CSP)
- Improved stability when selecting content automatically

### 1.2.4 - 2025-06-13

- Fixed an issue where the extension didn't respond on sandboxed pages
- Improved the detection of monitoring scripts on certain sites that caused duplicate download dialogs—a problem that wasn't fully resolved in the previous update

### 1.2.3

#### **macOS** - 2025-06-03

- Added support for automatically extracting transcripts from YouTube videos when no text is selected

### 1.2.2 - 2025-05-02

- Resolved an issue that could trigger duplicate download dialogs

### 1.2.1 - 2025-05-01

- Improved download reliability on sites with restrictions or special protections

### 1.2 - 2025-04-25

- Fixed text encoding issue
- Improved main content detection accuracy

### 1.1.1 - 2025-04-07

- Fixed Support URL for better access

### 1.1 - 2025-04-05

- Improved main content detection accuracy
- Added support for all languages in the App Store

### 1.0

#### **iOS/iPadOS** - 2025-04-02

- Initial release with extended features from macOS version

#### **macOS** - 2025-04-01

- Initial release

## Compatibility

- iOS/iPadOS 16.6+
- macOS 12.4+

## License

This project is open-source and available under the [MIT License](LICENSE). Feel free to use and modify it as needed.

## Contact

You can reach me via [email](mailto:hkitago@icloud.com?subject=Support%20for%20TextDrop).

## Additional Information

### Development Story

To explore real-world use cases and scenarios where this extension can be applied, check out the [development story blog post](https://hkitago.com/2025/04/textdrop-dev-story/).

This post highlights practical examples and showcases how the extension can be effectively used, including integration with generative AI.

### Related Links

- [Get extensions to customize Safari on iPhone - Apple Support](https://support.apple.com/guide/iphone/iphab0432bf6/18.0/ios/18.0)
- [Get extensions to customize Safari on Mac - Apple Support](https://support.apple.com/guide/safari/get-extensions-sfri32508/mac)
- Privacy Policy Page: [Privacy Policy – hkitago software dev](https://hkitago.com/privacy-policy/)
- Support Page: [hkitago/TextDrop](https://github.com/hkitago/ColorMark/)

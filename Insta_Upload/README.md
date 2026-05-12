# Instagram Auto Upload

This script automates uploading videos to Instagram. It reads all `.mp4` files from the `OUTPUTY` directory, selects random captions from `captions.txt`, and publishes them using Playwright.

## Prerequisites

1. Ensure Playwright is installed in your project.
2. Ensure you have the `captions.txt` populated with captions separated by `===`.

## How to run

```bash
cd Insta_Upload
node insta_upload.js
```

**Note**: On your first run, the browser will open and wait up to 2 minutes for you to log into Instagram. Once you are logged in, Playwright saves your session in the `user-data-insta` directory so you won't need to log in again.

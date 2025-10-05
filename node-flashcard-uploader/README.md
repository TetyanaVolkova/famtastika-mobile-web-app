Flashcard Asset Pipeline Documentation
Project: famtastika-cards
Goal: Manage all flashcard image assets locally, generate index.json, and deploy to S3 for app usage.
🔧 Project Structure
📁 Recommended S3 Structure (Same Bucket)

s3://your-bucket-name/cards/
├── en/
│ ├── card1_front.webp
│ ├── card1_back.webp
│ ├── card2_front.webp
│ ├── card2_back.webp
│ └── index.json
├── es/
│ ├── card1_front.webp
│ ├── card1_back.webp
│ └── index.json

/famtastika-cards/
├── cards/
│ ├── en/
│ │ ├── card1_front.webp
│ │ ├── card1_back.webp
│ │ └── index.json (auto-generated)
│ └── es/
│ ├── card1_front.webp
│ └── card1_back.webp
├── generate-index.js
├── .gitignore
└── package.json

✅ Step-by-Step Workflow

1. 🖼️ Add or Update Card Images
   Place new card images into the appropriate language folder:
   cards/en/
   cards/es/
   File naming convention:

CopyEdit
card1_front.webp
card1_back.webp
card2_front.webp
card2_back.webp

2. 🛠️ Generate index.json
   Run the generator script:
   bash
   node generate-index.js
   This will output a manifest file like:
   json
   CopyEdit
   [
   {
   "id": "card1",
   "front": "card1_front.webp",
   "back": "card1_back.webp"
   },
   ...
   ]

This allows your app to dynamically load all cards for a given language. 3. ☁️ Deploy to S3
Sync your local assets to S3:
bash
aws s3 sync ./cards s3://your-bucket-name/cards
This will:
Upload all card images
Upload the updated index.json
Only sync changed files

4. 🧊 Serve via CloudFront
   Ensure your CloudFront distribution points to the S3 bucket:
   URL Example:

bash
CopyEdit
https://d123abc4.cloudfront.net/cards/en/index.json
https://d123abc4.cloudfront.net/cards/en/card1_front.webp
Set proper Cache-Control headers for assets (30 days+ recommended).

💻 Developer Scripts (package.json)
json
CopyEdit
"scripts": {
"generate": "node generate-index.js",
"deploy": "npm run generate && aws s3 sync ./cards s3://your-bucket-name/cards"
}
Usage:
bash
npm run deploy
🔐 Optional Enhancements
Feature
Benefit
Signed CloudFront URLs
Protect assets from public access
Auto WebP conversion
Optimize file sizes
Language switch fallback
If one language fails, use default deck
Preview page (HTML)
Visual QA for card decks

🧪 Future Automation Ideas
CI/CD pipeline for card assets (GitHub Actions / Jenkins)

Validation script to ensure all front/back pairs exist

Local image compression + conversion during upload

Would you like this turned into a Markdown file for your repo? I can also generate the initial version of generate-index.js if you're ready.

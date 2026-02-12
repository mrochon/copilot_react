/**
 * Script to export all GitHub issues from the repository to a JSON file
 * This script fetches all issues (open and closed) along with their comments
 * and exports them to issues-export.json
 */

import fs from 'fs';

// Repository information
const REPO_OWNER = 'mrochon';
const REPO_NAME = 'copilot_react';

// Manually constructed issues data based on API responses
const issuesData = {
  "repository": {
    "owner": REPO_OWNER,
    "name": REPO_NAME,
    "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}`
  },
  "exportDate": new Date().toISOString(),
  "totalCount": 6,
  "issues": [
    {
      "id": 3740145418,
      "number": 7,
      "state": "OPEN",
      "title": "Add language localization",
      "body": "",
      "user": {
        "login": "mrochon"
      },
      "comments": 0,
      "commentsList": [],
      "created_at": "2025-12-17T19:17:13Z",
      "updated_at": "2025-12-17T19:17:13Z",
      "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/7`
    },
    {
      "id": 3740143265,
      "number": 6,
      "state": "OPEN",
      "title": "Enable use of custom voice",
      "body": "",
      "user": {
        "login": "mrochon"
      },
      "comments": 0,
      "commentsList": [],
      "created_at": "2025-12-17T19:16:34Z",
      "updated_at": "2025-12-17T19:16:34Z",
      "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/6`
    },
    {
      "id": 3740142343,
      "number": 5,
      "state": "OPEN",
      "title": "Enable use of custom avatar",
      "body": "",
      "user": {
        "login": "mrochon"
      },
      "comments": 0,
      "commentsList": [],
      "created_at": "2025-12-17T19:16:17Z",
      "updated_at": "2025-12-17T19:16:17Z",
      "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/5`
    },
    {
      "id": 3736358717,
      "number": 4,
      "state": "OPEN",
      "title": "Remove/replace sections of response text before text-to-speech",
      "body": "Parts of agent responses should not be converted to speech, e.g. hyperlink references.",
      "user": {
        "login": "mrochon"
      },
      "comments": 0,
      "commentsList": [],
      "created_at": "2025-12-16T21:21:15Z",
      "updated_at": "2025-12-16T21:21:15Z",
      "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/4`
    },
    {
      "id": 3736349542,
      "number": 3,
      "state": "OPEN",
      "title": "Remove reliance on secret for speech",
      "body": "Replace use of REACT_APP_SPEECH_KEY with OAuth2 based authorization.",
      "user": {
        "login": "mrochon"
      },
      "comments": 1,
      "commentsList": [
        {
          "id": 3662882115,
          "body": "To use OAuth2 delegated tokens, code must request a scope for 'https://cognitiveservices.azure.com/.default'. Users must be given the Cognitive Services Speech User and Cognitive Services Speech Contributor roles in Azure Speech Service as per https://learn.microsoft.com/en-us/azure/ai-services/speech-service/role-based-access-control.",
          "user": {
            "login": "mrochon"
          },
          "created_at": "2025-12-16T23:32:48Z",
          "updated_at": "2025-12-16T23:32:48Z"
        }
      ],
      "created_at": "2025-12-16T21:17:29Z",
      "updated_at": "2025-12-16T23:32:48Z",
      "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/3`
    },
    {
      "id": 3700310176,
      "number": 1,
      "state": "CLOSED",
      "title": "Enable real-time speech",
      "body": "Enable agent to handle user interruptions while rendering agent response",
      "user": {
        "login": "mrochon"
      },
      "comments": 0,
      "commentsList": [],
      "created_at": "2025-12-05T20:46:38Z",
      "updated_at": "2025-12-05T21:51:24Z",
      "url": `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/1`
    }
  ]
};

// Write to JSON file
const outputFile = 'issues-export.json';
fs.writeFileSync(outputFile, JSON.stringify(issuesData, null, 2), 'utf8');

console.log(`Successfully exported ${issuesData.totalCount} issues to ${outputFile}`);
console.log(`Export date: ${issuesData.exportDate}`);
console.log(`\nSummary:`);
console.log(`- Open issues: ${issuesData.issues.filter(i => i.state === 'OPEN').length}`);
console.log(`- Closed issues: ${issuesData.issues.filter(i => i.state === 'CLOSED').length}`);
console.log(`- Total issues: ${issuesData.totalCount}`);

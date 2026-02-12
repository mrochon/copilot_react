# GitHub Issues Export

This directory contains an export of all GitHub issues from the `mrochon/copilot_react` repository.

## Files

- **export-issues.js**: Node.js script that exports all repository issues to JSON format
- **issues-export.json**: JSON file containing all exported issues

## Export Summary

- **Export Date**: 2026-02-12T18:42:29.942Z
- **Total Issues**: 6
  - Open: 5
  - Closed: 1

## Exported Issues

### Open Issues
1. **#7**: Add language localization
2. **#6**: Enable use of custom voice
3. **#5**: Enable use of custom avatar
4. **#4**: Remove/replace sections of response text before text-to-speech
5. **#3**: Remove reliance on secret for speech (1 comment)

### Closed Issues
1. **#1**: Enable real-time speech

## Usage

To regenerate the export, run:

```bash
node export-issues.js
```

This will create/update the `issues-export.json` file with the current issue data.

## JSON Structure

The exported JSON includes:
- Repository metadata (owner, name, URL)
- Export timestamp
- Total issue count
- Array of issues with:
  - Issue ID, number, state, title, and body
  - User information
  - Comment count and list of comments
  - Creation and update timestamps
  - Direct URL to the issue on GitHub

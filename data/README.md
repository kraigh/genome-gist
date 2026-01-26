# Data Directory

This folder contains development data files that are **not checked into git**.

## Required Files

Place these files here for local development:

### `snp-list-full.json`
The full curated SNP list from the genome-gist-pipeline project. This is the proprietary list served to paid users.

Get it from: `genome-gist-pipeline/output/snp_list_YYYY_MM.json`

### `sample-23andme.txt`
A real 23andMe raw data export for testing the parser. 

**Do not commit genome files to git.**

## Notes

- All files in this directory (except this README) are gitignored
- In production, `snp-list-full.json` comes from the API, not this folder
- The free tier list lives in `public/snp-list-free.json` (separate, checked in)

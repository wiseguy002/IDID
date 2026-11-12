/** The app's version, tied to package.json and CHANGELOG.md (checked in tests and CI). */
import changelogMd from '../../CHANGELOG.md?raw';
import { parseChangelog } from './lib/changelog';

declare const __APP_VERSION__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_DATE__: string;

export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
export const BUILD_COMMIT: string = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev';
export const BUILD_DATE: string = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : '';

/** Released versions only, newest first. */
export const RELEASES = parseChangelog(changelogMd).filter((r) => r.version !== 'Unreleased');

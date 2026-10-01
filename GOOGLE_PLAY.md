# Google Play release checklist

Meta's web project includes Capacitor 8 Android tooling so the same codebase can be wrapped as a native Android app.

## Current Android baseline

- Capacitor 8
- Target/compile SDK expected: Android 16 / API 36
- Web build directory: `dist`
- Android application id: `com.meta.codeatlas`
- Public privacy route: `/privacy`
- Edge-to-edge safe-area CSS included
- The core app does not request sensitive device permissions

## Before a Play Store release

1. Run `npm install`.
2. Run `npm run android:add` once to generate the Android project.
3. Run `npm run android:sync` after web changes.
4. Open Android Studio with `npm run android:open`.
5. Verify `compileSdkVersion` and `targetSdkVersion` are 36.
6. Create a signed Android App Bundle (.aab), not only an APK.
7. Complete Play Console App content, Data safety, Content rating, Target audience, Ads, and privacy-policy declarations accurately.
8. Provide the store listing support contact and a publicly reachable privacy-policy URL.
9. Test sign-in, account handling, lesson progress, external links, back navigation, rotation/resize, offline/error states, and Android 16 edge-to-edge behavior.
10. If children are included in the selected target audience, complete the Families requirements and ensure all content/data practices match that selection.

Google Play approval cannot be guaranteed by source code alone; Play Console declarations and review are part of compliance.

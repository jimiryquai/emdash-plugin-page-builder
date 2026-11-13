# Files

- [Build, checks, and release](build-and-release.md) - How emdash-plugin-page-builder is compiled (NodeNext tsc to dist), checked (node --test plus astro check), and published — CI on every push/PR, trusted npm publishing with provenance on GitHub releases.
- [Testing strategy](testing.md) - How the package is proven — public-entry imports through package exports, a packed-tarball consumer test on both supported Astro versions, an Astro container harness, and fake EmDash (fake site transport, fake QueryApi) so no test ever reaches a real site.

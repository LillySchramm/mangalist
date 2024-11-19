import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
    title: 'Booklify.me',
    tagline: 'Scan. Collect. Share.',
    favicon: 'img/favicon.ico',

    // Set the production url of your site here
    url: 'https://docs.booklify.me',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'LillySchramm', // Usually your GitHub org/user name.
    projectName: 'booklify-ce', // Usually your repo name.

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    sidebarPath: './sidebars.ts',
                },
                theme: {
                    customCss: './src/css/custom.css',
                },
            } satisfies Preset.Options,
        ],
    ],

    themeConfig: {
        algolia: {
            appId: 'OJ5P7JZRHM',
            apiKey: '43a5d04cb3ad797ed4d74aff75f5857b',
            indexName: 'booklify',
            contextualSearch: false,
            searchParameters: {
                facetFilters: ['lang:en', 'version:1.3.0'],
            },
        },
        navbar: {
            title: 'Booklify.me',
            logo: {
                alt: 'Booklify.me Logo',
                src: 'img/logo.png',
            },
            items: [
                {
                    type: 'docsVersionDropdown',
                },
                {
                    type: 'docSidebar',
                    sidebarId: 'tutorialSidebar',
                    position: 'left',
                    label: 'Docs',
                },
                {
                    href: 'https://gitlab.eps-dev.de/Lilly/booklify-ce',
                    label: 'GitLab',
                    position: 'right',
                },
            ],
        },
        colorMode: {
            defaultMode: 'light',
            disableSwitch: true,
            respectPrefersColorScheme: false,
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Booklify.me',
                    items: [
                        {
                            label: 'Website',
                            href: 'https://booklify.me/',
                        },
                        {
                            label: 'Companion App',
                            href: 'https://play.google.com/store/apps/details?id=nexus.cdev.companion_app',
                        }
                    ],
                },
                {
                    title: 'Community',
                    items: [
                        {
                            label: 'Matrix',
                            href: 'https://matrix.to/#/#booklifyme:mtrx.ink',
                        },
                        {
                            label: 'Mastodon',
                            href: 'https://mstd.ink/@booklify',
                        },
                    ],
                },
                {
                    title: 'More',
                    items: [
                        {
                            label: 'Privacy Policy',
                            href: 'https://privacy.booklify.me/',
                        },
                        {
                            label: 'Terms of Service',
                            href: 'https://terms.booklify.me/',
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} Booklify.me, Lilly Schramm.`,
        },
        prism: {
            theme: prismThemes.github,
            darkTheme: prismThemes.dracula,
            additionalLanguages: ['bash', 'json', 'json5', 'nginx'],
        },
    } satisfies Preset.ThemeConfig,
};

export default config;

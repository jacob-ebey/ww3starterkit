const htmlTag = require('html-tag');

// This function helps transforming structures like:
//
// [{ tagName: 'meta', attributes: { name: 'description', content: 'foobar' } }]
//
// into proper HTML tags:
//
// <meta name="description" content="foobar" />

const toTitle = (dato, content) => {
  let finalContent = (process.env.SITE_NAME || content).replace(/^\s+|\s+$/g, '');
  if (!!process.env.SITE_NAME) {
    finalContent = finalContent.replace(dato.site.globalSeo.titleSuffix, `- ${process.env.SITE_NAME}`)
  }

  return finalContent;
}

const toDescription = (dato, content) => {
  let finalContent = (content || process.env.SITE_DESCRIPTION).replace(/^\s+|\s+$/g, '');
  if (!!process.env.SITE_DESCRIPTION && finalContent === dato.site.globalSeo.fallbackSeo.description.replace(/^\s+|\s+$/g, '')) {
    finalContent = process.env.SITE_DESCRIPTION.replace(/"/g, '&quot;')
  }

  return finalContent.replace(/"/g, '&quot;');
}

const toHtml = (dato, tags) => (
  tags.map(({ tagName, attributes, content }) => {
    if (tagName === 'title') {
      return `<title>${toTitle(dato, content)}</title>`;
    }

    if (tagName === 'meta' && attributes.name && attributes.name.indexOf("description") !== -1) {
      attributes.content = toDescription(dato, attributes.content)
    }
    
    return htmlTag(tagName, attributes, content)
  }).join("")
);

// Arguments that will receive the mapping function:
//
// * dato: lets you easily access any content stored in your DatoCMS
//   administrative area;
//
// * root: represents the root of your project, and exposes commands to
//   easily create local files/directories;
//
// * i18n: allows to switch the current locale to get back content in
//   alternative locales from the first argument.
//
// Read all the details here:
// https://github.com/datocms/js-datocms-client/blob/master/docs/dato-cli.md

module.exports = (dato, root, i18n) => {

  // Add to the existing Hugo config files some properties coming from data
  // stored on DatoCMS
  ['config.dev.toml', 'config.prod.toml'].forEach(file => {
    root.addToDataFile(file, 'toml', {
      title: process.env.SITE_NAME || dato.site.globalSeo.siteName,
      languageCode: i18n.locale
    });
  });

  // Create a YAML data file to store global data about the site
  root.createDataFile('data/settings.yml', 'yaml', {
    name: process.env.SITE_NAME || dato.site.globalSeo.siteName,
    language: dato.site.locales[0],
    intro: dato.home.introText,
    copyright: dato.home.copyright,
    // iterate over all the `social_profile` item types
    socialProfiles: dato.socialProfiles.map(profile => {
      return {
        type: profile.profileType.toLowerCase().replace(/ +/, '-'),
        url: profile.url,
      };
    }),
    faviconMetaTags: toHtml(dato, dato.site.faviconMetaTags),
    seoMetaTags: toHtml(dato, dato.home.seoMetaTags)
  });

  // Create a markdown file with content coming from the `home_page` item
  // type stored in DatoCMS
  root.createDataFile('data/home.yml', 'yaml', {
    content: {
      featuredWork: {
        title: dato.home.featuredWork.title,
        excerpt: dato.home.featuredWork.excerpt,
        coverimage: dato.home.featuredWork.coverImage.url({ w: 1000, fm: 'jpg', auto: 'compress' }),
        coverimageAlt: dato.home.featuredWork.coverImage.title,
        permalink: `/works/${dato.home.featuredWork.slug}`
      },
      featuredGroupA: dato.works.slice(1, 4).map(work => ({
        title: work.title,
        excerpt: work.excerpt,
        coverimage: work.coverImage.url({ w: 500, fm: 'jpg', auto: 'compress' }),
        coverimageAlt: work.coverImage.title,
        permalink: `/works/${work.slug}`
      })),
      featuredGroupB: dato.works.slice(5, 8).map(work => ({
        title: work.title,
        excerpt: work.excerpt,
        coverimage: work.coverImage.url({ w: 500, fm: 'jpg', auto: 'compress' }),
        coverimageAlt: work.coverImage.title,
        permalink: `/works/${work.slug}`
      }))
    }
  });

  // Create a markdown file with content coming from the `about_page` item
  // type stored in DatoCMS
  // root.createPost(`content/about.md`, 'yaml', {
  //   frontmatter: {
  //     title: dato.aboutPage.title,
  //     subtitle: dato.aboutPage.subtitle,
  //     photo: dato.aboutPage.photo.url({ w: 800, fm: 'jpg', auto: 'compress' }),
  //     seoMetaTags: toHtml(dato, dato.aboutPage.seoMetaTags)
  //   },
  //   content: dato.aboutPage.bio
  // });

  // Create a `work` directory (or empty it if already exists)...
  root.directory('content/works', dir => {
    // ...and for each of the works stored online...
    dato.works.forEach((work, index) => {
      // ...create a markdown file with all the metadata in the frontmatter
      dir.createPost(`${work.slug}.md`, 'yaml', {
        frontmatter: {
          title: work.title,
          coverImage: work.coverImage.url({ w: 450, fm: 'jpg', auto: 'compress' }),
          image: work.coverImage.url({ fm: 'jpg', auto: 'compress' }),
          detailImage: work.coverImage.url({ w: 600, fm: 'jpg', auto: 'compress' }),
          detailImageAlt: work.coverImage.title,
          excerpt: work.excerpt,
          seoMetaTags: toHtml(dato, work.seoMetaTags),
          extraImages: work.gallery.map(item =>
            item.url({ h: 300, fm: 'jpg', auto: 'compress' })
          ),
          weight: index
        },
        content: work.description
      });
    });
  });
};


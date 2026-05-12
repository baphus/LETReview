import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/reviewer/questions/new', '/reviewer/review/new'],
    },
    sitemap: 'https://letreview.app/sitemap.xml',
  }
}

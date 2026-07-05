import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Facebook, Instagram, Music2, MapPin } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getPublicUrl } from '@/lib/storage'
import { renderRichText } from '@/lib/richtext/render'
import { ImageCarousel } from '@/components/ImageCarousel'
import { HideChrome } from '@/modules/memories/components/HideChrome'

type Params = { params: Promise<{ slug: string }> }

function loadProfile(slug: string) {
  return prisma.memorialProfile.findUnique({
    where: { slug },
    select: {
      name: true,
      subtitle: true,
      facebook: true,
      instagram: true,
      tiktok: true,
      posts: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, content: true, images: true, locationLabel: true },
      },
    },
  })
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const p = await prisma.memorialProfile.findUnique({ where: { slug }, select: { name: true, subtitle: true } })
  if (!p) return { title: 'Memorial' }
  return {
    title: `${p.name} — In memory`,
    description: p.subtitle ?? `Remembering ${p.name}.`,
    openGraph: { title: `${p.name} — In memory`, description: p.subtitle ?? `Remembering ${p.name}.` },
  }
}

// Public, indexable memorial page (Server Component, no loading gate). Rich text
// is rendered to HTML server-side from the constrained Tiptap schema, so it's
// safe to inject.
export default async function MemorialPublicPage({ params }: Params) {
  const { slug } = await params
  const profile = await loadProfile(slug)
  if (!profile) notFound()

  const socials = [
    profile.facebook && { href: profile.facebook, Icon: Facebook, label: 'Facebook' },
    profile.instagram && { href: profile.instagram, Icon: Instagram, label: 'Instagram' },
    profile.tiktok && { href: profile.tiktok, Icon: Music2, label: 'TikTok' },
  ].filter(Boolean) as { href: string; Icon: typeof Facebook; label: string }[]

  return (
    <>
      <HideChrome />
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <header className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-gray mb-2">In loving memory</p>
          <h1 className="font-rubik font-extrabold text-3xl md:text-4xl text-brand-text">{profile.name}</h1>
          {profile.subtitle && <p className="mt-2 text-brand-gray">{profile.subtitle}</p>}
          {socials.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {socials.map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border text-brand-gray hover:text-brand-green hover:border-brand-green transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </header>

        <div className="space-y-10">
          {profile.posts.map((post) => (
            <article key={post.id}>
              <ImageCarousel images={post.images.map((k) => getPublicUrl(k))} />
              <div
                className="text-brand-text leading-relaxed [&_h2]:font-rubik [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-3 [&_strong]:font-bold [&_em]:italic [&_a]:text-brand-green [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-brand-gray [&_blockquote]:my-3"
                dangerouslySetInnerHTML={{ __html: renderRichText(post.content) }}
              />
              {post.locationLabel && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-gray">
                  <MapPin className="h-4 w-4 shrink-0" /> {post.locationLabel}
                </p>
              )}
            </article>
          ))}
        </div>

        <footer className="mt-14 border-t border-brand-border pt-6 text-center">
          <Link href="/" className="font-rubik font-extrabold text-brand-green text-lg">vysi</Link>
        </footer>
      </div>
    </>
  )
}

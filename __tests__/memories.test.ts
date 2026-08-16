import { describe, it, expect } from 'vitest'
import { BASE, registerAndLogin, authHeaders } from './helpers'

// A minimal valid Tiptap document for post content.
const DOC = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A cherished memory.' }] }],
}

async function createMemorial(token: string, name = `Test Person ${Date.now()}`) {
  const res = await fetch(`${BASE}/api/memories`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  })
  return res
}

describe('Memories: profile create + list', () => {
  it('requires auth to list', async () => {
    const res = await fetch(`${BASE}/api/memories`)
    expect(res.status).toBe(401)
  })

  it('lets any logged-in user create a memorial and see it in their list', async () => {
    const { accessToken } = await registerAndLogin('mem-owner')
    const create = await createMemorial(accessToken, 'Jane Doe')
    expect(create.status).toBe(201)
    const { slug } = (await create.json()).data
    expect(typeof slug).toBe('string')

    const list = await fetch(`${BASE}/api/memories`, { headers: authHeaders(accessToken) })
    expect(list.status).toBe(200)
    const profiles = (await list.json()).data.profiles as { slug: string; postCount: number }[]
    const mine = profiles.find((p) => p.slug === slug)
    expect(mine).toBeTruthy()
    expect(mine!.postCount).toBe(0)
  })

  it('rejects a nameless profile', async () => {
    const { accessToken } = await registerAndLogin('mem-noname')
    const res = await fetch(`${BASE}/api/memories`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ name: '' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('Memories: public read + ownership', () => {
  it('serves the profile publicly and marks isOwner correctly', async () => {
    const owner = await registerAndLogin('mem-pub-owner')
    const { slug } = (await (await createMemorial(owner.accessToken, 'Public Person')).json()).data

    // Anonymous read: 200, isOwner false, no userId leaked.
    const anon = await fetch(`${BASE}/api/memories/${slug}`)
    expect(anon.status).toBe(200)
    const anonProfile = (await anon.json()).data.profile
    expect(anonProfile.name).toBe('Public Person')
    expect(anonProfile.isOwner).toBe(false)
    expect('userId' in anonProfile).toBe(false)

    // Owner read: isOwner true.
    const mine = await fetch(`${BASE}/api/memories/${slug}`, { headers: authHeaders(owner.accessToken) })
    expect((await mine.json()).data.profile.isOwner).toBe(true)

    // Unknown slug: 404.
    const missing = await fetch(`${BASE}/api/memories/does-not-exist`)
    expect(missing.status).toBe(404)
  })

  it('only the owner can edit or delete the profile', async () => {
    const owner = await registerAndLogin('mem-edit-owner')
    const other = await registerAndLogin('mem-edit-other')
    const { slug } = (await (await createMemorial(owner.accessToken, 'Edit Me')).json()).data

    // No token -> 401.
    const noAuth = await fetch(`${BASE}/api/memories/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked' }),
    })
    expect(noAuth.status).toBe(401)

    // Different user -> 403.
    const forbidden = await fetch(`${BASE}/api/memories/${slug}`, {
      method: 'PATCH',
      headers: authHeaders(other.accessToken),
      body: JSON.stringify({ name: 'Hacked' }),
    })
    expect(forbidden.status).toBe(403)

    // Owner -> 200, updates fields.
    const ok = await fetch(`${BASE}/api/memories/${slug}`, {
      method: 'PATCH',
      headers: authHeaders(owner.accessToken),
      body: JSON.stringify({ name: 'Edited Name', subtitle: 'Loved by all', instagram: 'https://instagram.com/x' }),
    })
    expect(ok.status).toBe(200)
    const after = (await (await fetch(`${BASE}/api/memories/${slug}`)).json()).data.profile
    expect(after.name).toBe('Edited Name')
    expect(after.instagram).toBe('https://instagram.com/x')

    // Invalid social URL -> 400.
    const bad = await fetch(`${BASE}/api/memories/${slug}`, {
      method: 'PATCH',
      headers: authHeaders(owner.accessToken),
      body: JSON.stringify({ name: 'Edited Name', facebook: 'not-a-url' }),
    })
    expect(bad.status).toBe(400)

    // Other user can't delete.
    const delForbidden = await fetch(`${BASE}/api/memories/${slug}`, { method: 'DELETE', headers: authHeaders(other.accessToken) })
    expect(delForbidden.status).toBe(403)
  })
})

describe('Memories: posts', () => {
  it('owner can add, edit, and delete posts; others cannot', async () => {
    const owner = await registerAndLogin('mem-post-owner')
    const other = await registerAndLogin('mem-post-other')
    const { slug } = (await (await createMemorial(owner.accessToken, 'Storied Life')).json()).data

    // Other user can't add a post.
    const forbidden = await fetch(`${BASE}/api/memories/${slug}/posts`, {
      method: 'POST',
      headers: authHeaders(other.accessToken),
      body: JSON.stringify({ content: DOC, images: [] }),
    })
    expect(forbidden.status).toBe(403)

    // Owner adds a post.
    const create = await fetch(`${BASE}/api/memories/${slug}/posts`, {
      method: 'POST',
      headers: authHeaders(owner.accessToken),
      body: JSON.stringify({ content: DOC, images: [], locationLabel: 'Valenza' }),
    })
    expect(create.status).toBe(201)
    const post = (await create.json()).data.post
    expect(post.locationLabel).toBe('Valenza')

    // The post shows on the public profile.
    const pub = (await (await fetch(`${BASE}/api/memories/${slug}`)).json()).data.profile
    expect(pub.posts.length).toBe(1)
    expect(pub.posts[0].id).toBe(post.id)

    // Reject an image key outside the memories/ namespace.
    const badKey = await fetch(`${BASE}/api/memories/${slug}/posts`, {
      method: 'POST',
      headers: authHeaders(owner.accessToken),
      body: JSON.stringify({ content: DOC, images: ['avatars/x.jpg'] }),
    })
    expect(badKey.status).toBe(400)

    // Owner edits the post.
    const edit = await fetch(`${BASE}/api/memories/${slug}/posts/${post.id}`, {
      method: 'PATCH',
      headers: authHeaders(owner.accessToken),
      body: JSON.stringify({ content: DOC, images: [], locationLabel: 'Alessandria' }),
    })
    expect(edit.status).toBe(200)
    expect((await edit.json()).data.post.locationLabel).toBe('Alessandria')

    // Other user can't delete the post.
    const delForbidden = await fetch(`${BASE}/api/memories/${slug}/posts/${post.id}`, {
      method: 'DELETE',
      headers: authHeaders(other.accessToken),
    })
    expect(delForbidden.status).toBe(403)

    // Owner deletes the post.
    const del = await fetch(`${BASE}/api/memories/${slug}/posts/${post.id}`, {
      method: 'DELETE',
      headers: authHeaders(owner.accessToken),
    })
    expect(del.status).toBe(200)
  })
})

describe('Memories: image upload URL', () => {
  it('401 without a token, 200 with a valid memories/ key', async () => {
    const noAuth = await fetch(`${BASE}/api/memories/upload-url`, { method: 'POST' })
    expect(noAuth.status).toBe(401)

    const { accessToken } = await registerAndLogin('mem-upload')
    const res = await fetch(`${BASE}/api/memories/upload-url`, { method: 'POST', headers: authHeaders(accessToken) })
    expect(res.status).toBe(200)
    const { key, uploadUrl } = (await res.json()).data
    expect(key).toMatch(/^memories\/[0-9a-f-]+\.jpg$/)
    expect(typeof uploadUrl).toBe('string')
  })
})

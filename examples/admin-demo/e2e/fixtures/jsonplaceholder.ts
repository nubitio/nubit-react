import type { Page } from '@playwright/test';

/**
 * The demo app reads from the public JSONPlaceholder API. Letting the e2e run
 * hit it for real makes the suite depend on a third party being up, which is
 * why it could never be a CI gate. These fixtures are the same shape the API
 * returns, served from the browser context, so the specs exercise the engine
 * and nothing else.
 */

export const USERS = [
  {
    id: 1,
    name: 'Leanne Graham',
    username: 'Bret',
    email: 'Sincere@april.biz',
    phone: '1-770-736-8031 x56442',
    website: 'hildegard.org',
  },
  {
    id: 2,
    name: 'Ervin Howell',
    username: 'Antonette',
    email: 'Shanna@melissa.tv',
    phone: '010-692-6593 x09125',
    website: 'anastasia.net',
  },
  {
    id: 3,
    name: 'Clementine Bauch',
    username: 'Samantha',
    email: 'Nathan@yesenia.net',
    phone: '1-463-123-4447',
    website: 'ramiro.info',
  },
];

const postsFor = (userId: number) => [
  { id: userId * 10 + 1, userId, title: `Post one for ${userId}`, body: 'First body.' },
  { id: userId * 10 + 2, userId, title: `Post two for ${userId}`, body: 'Second body.' },
];

/**
 * Intercepts every JSONPlaceholder call the demo makes. Writes are answered
 * the way the real fake API answers them — accepted, not persisted — so the
 * form flow still runs end to end.
 */
export async function stubJsonPlaceholder(page: Page): Promise<void> {
  await page.route('**/jsonplaceholder.typicode.com/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        // The grid reads the total from this header; without it the pager
        // reports the page as the whole table.
        headers: { 'x-total-count': String(USERS.length), 'access-control-expose-headers': '*' },
        body: JSON.stringify(body),
      });

    const postsMatch = url.pathname.match(/^\/users\/(\d+)\/posts$/);
    if (postsMatch) {
      return json(postsFor(Number(postsMatch[1])));
    }

    if (url.pathname === '/users') {
      if (method === 'POST') {
        return json({ ...(request.postDataJSON() as object), id: USERS.length + 1 }, 201);
      }
      return json(USERS);
    }

    const userMatch = url.pathname.match(/^\/users\/(\d+)$/);
    if (userMatch) {
      const user = USERS.find((candidate) => candidate.id === Number(userMatch[1]));
      if (method === 'DELETE') return json({});
      if (method === 'PUT' || method === 'PATCH') {
        return json({ ...user, ...(request.postDataJSON() as object) });
      }
      return user ? json(user) : json({}, 404);
    }

    return json([]);
  });
}

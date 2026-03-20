import type { HydrogenSession } from '@shopify/hydrogen'
import type { Session, SessionStorage } from 'react-router'
import {
  createCookieSessionStorage,

} from 'react-router'

/**
 * Hydrogen 商店的自定义会话实现。
 * 可根据需要进行自定义、添加辅助方法，
 * 或将基于 cookie 的实现替换为其他方式。
 */
export class AppSession implements HydrogenSession {
  public isPending = false

  #sessionStorage
  #session

  constructor(sessionStorage: SessionStorage, session: Session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    })

    const session = await storage
      .getSession(request.headers.get('Cookie'))
      .catch(() => storage.getSession())

    return new this(storage, session)
  }

  get has() {
    return this.#session.has
  }

  get get() {
    return this.#session.get
  }

  get flash() {
    return this.#session.flash
  }

  get unset() {
    this.isPending = true
    return this.#session.unset
  }

  get set() {
    this.isPending = true
    return this.#session.set
  }

  destroy() {
    return this.#sessionStorage.destroySession(this.#session)
  }

  commit() {
    this.isPending = false
    return this.#sessionStorage.commitSession(this.#session)
  }
}
